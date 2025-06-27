// src/lib/stores/client.svelte.ts
import { type Unsubscribe } from 'firebase/firestore';
import { subscribeToClients, subscribeToClientJobs, type Client, type Job } from '$lib/firebase/firestore';
import { localCache } from '$lib/utils/localCache';
import { browser } from '$app/environment';

interface ClientStore {
  clients: Client[];
  selectedClient: Client | null;
  clientJobs: Job[];
  isLoading: boolean;
  isLoadingJobs: boolean;
  error: string | null;
  hasClients: boolean;
  recentClients: Client[];
  isOffline: boolean;
  selectClient: (client: Client | null) => void;
  clearSelection: () => void;
  restoreSelection: () => void;
  searchClients: (query: string) => Client[];
  getRecentClients: (count?: number) => Client[];
  getById: (id: string) => Client | undefined;
}

class ClientStoreImpl {
  // State
  clients = $state<Client[]>([]);
  selectedClient = $state<Client | null>(null);
  clientJobs = $state<Job[]>([]);
  isLoadingClients = $state(false);
  isLoadingJobs = $state(false);
  error = $state<string | null>(null);
  recentClientIds = $state<string[]>([]);
  isOffline = $state(false);
  
  // Cache state
  private cachedClients = $state<Client[]>([]);
  private lastSync = $state<number>(0);
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  // Subscriptions
  private unsubscribeClients: Unsubscribe | null = null;
  private unsubscribeJobs: Unsubscribe | null = null;
  private currentTenantId: string | undefined = undefined;

  constructor() {
    this.loadRecentClientIds();
    this.initializeOfflineDetection();
    this.startPeriodicCacheCleanup();
  }

  // Initialize offline detection
  private initializeOfflineDetection() {
    if (!browser) return;
    
    this.isOffline = !navigator.onLine;
    
    window.addEventListener('online', () => {
      this.isOffline = false;
      // Sync when back online
      if (this.currentTenantId) {
        this.syncWithServer(this.currentTenantId);
      }
    });
    
    window.addEventListener('offline', () => {
      this.isOffline = true;
      // Load from cache when offline
      if (this.currentTenantId) {
        this.loadFromCache(this.currentTenantId);
      }
    });
  }

  // Start periodic cache cleanup (every hour)
  private startPeriodicCacheCleanup() {
    if (!browser) return;
    
    this.syncInterval = setInterval(() => {
      localCache.cleanOldData().catch(console.error);
    }, 60 * 60 * 1000); // 1 hour
  }

  // Load recent client IDs from localStorage
  private loadRecentClientIds() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('recentClientIds');
      if (stored) {
        try {
          this.recentClientIds = JSON.parse(stored);
        } catch (e) {
          this.recentClientIds = [];
        }
      }
    }
  }

  // Save recent client IDs to localStorage
  private saveRecentClientIds() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('recentClientIds', JSON.stringify(this.recentClientIds));
    }
  }

  // Load clients from IndexedDB cache
  private async loadFromCache(tenantId: string) {
    try {
      this.isLoadingClients = true;
      const cachedClients = await localCache.getAllClients(tenantId);
      
      if (cachedClients.length > 0) {
        this.cachedClients = cachedClients;
        this.clients = cachedClients;
        
        // Only log cache loads in development
        if (import.meta.env.DEV) {
          console.log(`Loaded ${cachedClients.length} clients from cache`);
        }
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    } finally {
      this.isLoadingClients = false;
    }
  }

  // Sync clients with server and update cache
  private async syncWithServer(tenantId: string) {
    if (this.isOffline) return;
    
    try {
      // Update cache with current clients
      for (const client of this.clients) {
        await localCache.setClient(client, tenantId);
      }
      this.lastSync = Date.now();
      
      // Only log successful syncs in development
      if (import.meta.env.DEV) {
        console.log('Synced clients to cache');
      }
    } catch (error) {
      console.error('Error syncing to cache:', error);
    }
  }

  // Initialize tenant subscription
  subscribeTenant(tenantId: string | undefined) {
    if (tenantId) {
      this.currentTenantId = tenantId;
      this.isLoadingClients = true;
      this.error = null;
      
      // Cleanup previous subscription
      if (this.unsubscribeClients) {
        this.unsubscribeClients();
      }
      
      // Load from cache first (immediate response)
      this.loadFromCache(tenantId);
      
      // Then subscribe to real-time updates if online
      if (!this.isOffline) {
        this.unsubscribeClients = subscribeToClients(
          tenantId,
          async (updatedClients) => {
            this.clients = updatedClients;
            this.isLoadingClients = false;
            
            // Update cache in background
            this.syncWithServer(tenantId);
            
            // Check if selected client still exists
            if (this.selectedClient && !updatedClients.find(c => c.id === this.selectedClient!.id)) {
              this.selectedClient = null;
              this.saveSelectedClientId(null);
            }
          },
          (error) => {
            // Only log errors if we're online (offline errors are expected)
            if (!this.isOffline) {
              console.error('Error subscribing to clients:', error);
              this.error = error.message;
            }
            this.isLoadingClients = false;
            
            // Fall back to cache on error
            this.loadFromCache(tenantId);
          }
        );
      }
    } else {
      // Clear state when no tenant
      this.clients = [];
      this.selectedClient = null;
      this.clientJobs = [];
      this.isLoadingClients = false;
      this.isLoadingJobs = false;
      this.error = null;
    }
  }

  // Subscribe to jobs for selected client
  subscribeClientJobs(tenantId: string | undefined, clientId: string | undefined) {
    // Cleanup previous subscription
    if (this.unsubscribeJobs) {
      this.unsubscribeJobs();
      this.unsubscribeJobs = null;
    }
    
    if (tenantId && clientId && !this.isOffline) {
      this.isLoadingJobs = true;
      
      this.unsubscribeJobs = subscribeToClientJobs(
        tenantId,
        clientId,
        (jobs) => {
          this.clientJobs = jobs;
          this.isLoadingJobs = false;
          
          // TODO: Cache jobs in IndexedDB
        },
        (error) => {
          // Only log errors if we're online (offline errors are expected)
          if (!this.isOffline) {
            console.error('Error subscribing to client jobs:', error);
          }
          this.isLoadingJobs = false;
          
          // TODO: Load jobs from cache on error
        }
      );
    } else {
      this.clientJobs = [];
      this.isLoadingJobs = false;
    }
  }

  // Select a client
  selectClient = (client: Client | null) => {
    this.selectedClient = client;
    this.saveSelectedClientId(client?.id || null);
    
    // Update recent clients
    if (client) {
      this.recentClientIds = [
        client.id,
        ...this.recentClientIds.filter(id => id !== client.id)
      ].slice(0, 10);
      this.saveRecentClientIds();
    }
  }

  // Clear client selection
  clearSelection = () => {
    this.selectedClient = null;
    this.clientJobs = [];
    this.saveSelectedClientId(null);
  }

  // Restore previous selection
  restoreSelection = () => {
    const savedId = this.getSelectedClientId();
    if (savedId) {
      const client = this.clients.find(c => c.id === savedId);
      if (client) {
        this.selectClient(client);
      }
    }
  }

  // Save selected client ID to sessionStorage
  private saveSelectedClientId(id: string | null) {
    if (typeof window !== 'undefined') {
      if (id) {
        sessionStorage.setItem('selectedClientId', id);
      } else {
        sessionStorage.removeItem('selectedClientId');
      }
    }
  }

  // Get selected client ID from sessionStorage
  private getSelectedClientId(): string | null {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('selectedClientId');
    }
    return null;
  }

  // Search clients by name
  searchClients = (query: string): Client[] => {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return this.clients;
    
    // Search in both online and cached clients when offline
    const clientsToSearch = this.isOffline && this.cachedClients.length > 0 
      ? this.cachedClients 
      : this.clients;
    
    return clientsToSearch.filter(client => 
      client.name.toLowerCase().includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm) ||
      client.phone?.includes(searchTerm)
    );
  }

  // Get recent clients
  getRecentClients = (count: number = 5): Client[] => {
    const recentClients: Client[] = [];
    const clientsToSearch = this.isOffline && this.cachedClients.length > 0 
      ? this.cachedClients 
      : this.clients;
    
    for (const id of this.recentClientIds) {
      const client = clientsToSearch.find(c => c.id === id);
      if (client) {
        recentClients.push(client);
        if (recentClients.length >= count) break;
      }
    }
    
    return recentClients;
  }

  // Get client by ID
  getById = (id: string): Client | undefined => {
    const clientsToSearch = this.isOffline && this.cachedClients.length > 0 
      ? this.cachedClients 
      : this.clients;
    
    return clientsToSearch.find(c => c.id === id);
  }

  // Cleanup on destroy
  destroy() {
    if (this.unsubscribeClients) {
      this.unsubscribeClients();
    }
    if (this.unsubscribeJobs) {
      this.unsubscribeJobs();
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Create singleton instance
let clientStore: ClientStoreImpl | null = null;

// Export the store hook
export function useClients(): ClientStore {
  if (!clientStore) {
    clientStore = new ClientStoreImpl();
  }

  return {
    // State getters
    get clients() { return clientStore.clients; },
    get selectedClient() { return clientStore.selectedClient; },
    get clientJobs() { return clientStore.clientJobs; },
    get isLoading() { return clientStore.isLoadingClients; },
    get isLoadingJobs() { return clientStore.isLoadingJobs; },
    get error() { return clientStore.error; },
    get isOffline() { return clientStore.isOffline; },
    
    // Computed values
    get hasClients() { return clientStore.clients.length > 0 || (clientStore.isOffline && clientStore.cachedClients.length > 0); },
    get recentClients() { return clientStore.getRecentClients(); },
    
    // Actions
    selectClient: clientStore.selectClient,
    clearSelection: clientStore.clearSelection,
    restoreSelection: clientStore.restoreSelection,
    searchClients: clientStore.searchClients,
    getRecentClients: clientStore.getRecentClients,
    getById: clientStore.getById
  };
}

// Function to initialize subscriptions (call from component)
export function initializeClientStore(tenantId: string | undefined) {
  if (clientStore) {
    clientStore.subscribeTenant(tenantId);
  }
}

// Function to update client jobs subscription
export function updateClientJobsSubscription(tenantId: string | undefined, clientId: string | undefined) {
  if (clientStore) {
    clientStore.subscribeClientJobs(tenantId, clientId);
  }
}

// Cleanup function
export function cleanupClientStore() {
  if (clientStore) {
    clientStore.destroy();
    clientStore = null;
  }
}

// For backward compatibility with components expecting useClient
export const useClient = useClients;