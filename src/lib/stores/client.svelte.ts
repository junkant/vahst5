// src/lib/stores/client.svelte.ts
import { 
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from '$lib/firebase/config';
import { localCache } from '$lib/utils/localCache';
import { browser } from '$app/environment';

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  tags?: string[];
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  lastServiceDate?: Date;
  preferredTechnician?: string;
  customFields?: Record<string, any>;
}

export interface Job {
  id: string;
  clientId: string;
  title: string;
  status: string;
  scheduledDate?: Date;
  completedDate?: Date;
}

class ClientStore {
  // State
  clients = $state<Client[]>([]);
  selectedClient = $state<Client | null>(null);
  clientJobs = $state<Job[]>([]);
  isLoadingClients = $state(false);
  isLoadingJobs = $state(false);
  error = $state<string | null>(null);
  recentClientIds = $state<string[]>([]);
  isOffline = $state(false);
  
  // Tenant context
  private currentTenantId = $state<string | null>(null);
  
  // Cache state
  private cachedClients = $state<Client[]>([]);
  private lastSync = $state<number>(0);
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  // Subscriptions
  private unsubscribeClients: Unsubscribe | null = null;
  private unsubscribeJobs: Unsubscribe | null = null;

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
      if (this.currentTenantId) {
        this.syncWithServer();
      }
    });
    
    window.addEventListener('offline', () => {
      this.isOffline = true;
      if (this.currentTenantId) {
        this.loadFromCache();
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
      const stored = localStorage.getItem(`recentClientIds_${this.currentTenantId}`);
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
    if (typeof window !== 'undefined' && this.currentTenantId) {
      localStorage.setItem(
        `recentClientIds_${this.currentTenantId}`, 
        JSON.stringify(this.recentClientIds)
      );
    }
  }

  // Load clients from IndexedDB cache
  private async loadFromCache() {
    if (!this.currentTenantId) return;
    
    try {
      this.isLoadingClients = true;
      const cachedClients = await localCache.getAllClients(this.currentTenantId);
      
      if (cachedClients.length > 0) {
        this.cachedClients = cachedClients;
        this.clients = cachedClients;
        
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
  private async syncWithServer() {
    if (this.isOffline || !this.currentTenantId) return;
    
    try {
      for (const client of this.clients) {
        await localCache.setClient(client, this.currentTenantId);
      }
      this.lastSync = Date.now();
      
      if (import.meta.env.DEV) {
        console.log('Synced clients to cache');
      }
    } catch (error) {
      console.error('Error syncing to cache:', error);
    }
  }

  // Initialize tenant subscription
  subscribeTenant(tenantId: string | null) {
    // Clean up previous subscriptions
    this.cleanup();
    
    if (!tenantId) {
      this.clients = [];
      this.selectedClient = null;
      this.clientJobs = [];
      this.currentTenantId = null;
      return;
    }
    
    this.currentTenantId = tenantId;
    this.isLoadingClients = true;
    this.error = null;
    
    // Load recent client IDs for this tenant
    this.loadRecentClientIds();
    
    // Load from cache first (immediate response)
    this.loadFromCache();
    
    // Then subscribe to real-time updates
    try {
      const clientsRef = collection(db, `tenants/${tenantId}/clients`);
      const clientsQuery = query(
        clientsRef,
        where('status', '==', 'active'),
        orderBy('name')
      );
      
      this.unsubscribeClients = onSnapshot(
        clientsQuery,
        (snapshot) => {
          const clients: Client[] = [];
          snapshot.forEach((doc) => {
            clients.push({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate() || new Date(),
              updatedAt: doc.data().updatedAt?.toDate() || new Date(),
              lastServiceDate: doc.data().lastServiceDate?.toDate()
            } as Client);
          });
          
          this.clients = clients;
          this.isLoadingClients = false;
          
          // Sync to cache in background
          this.syncWithServer();
        },
        (error) => {
          console.error('Error fetching clients:', error);
          this.error = error.message;
          this.isLoadingClients = false;
          
          // Fall back to cache on error
          if (this.clients.length === 0) {
            this.clients = this.cachedClients;
          }
        }
      );
    } catch (error) {
      console.error('Error setting up client subscription:', error);
      this.error = error instanceof Error ? error.message : 'Failed to load clients';
      this.isLoadingClients = false;
    }
  }

  // Subscribe to jobs for selected client
  subscribeToClientJobs(clientId: string) {
    if (!this.currentTenantId) return;
    
    // Clean up previous job subscription
    if (this.unsubscribeJobs) {
      this.unsubscribeJobs();
      this.unsubscribeJobs = null;
    }
    
    if (!clientId) {
      this.clientJobs = [];
      return;
    }
    
    this.isLoadingJobs = true;
    
    try {
      const jobsRef = collection(db, `tenants/${this.currentTenantId}/jobs`);
      const jobsQuery = query(
        jobsRef,
        where('clientId', '==', clientId),
        orderBy('scheduledDate', 'desc')
      );
      
      this.unsubscribeJobs = onSnapshot(
        jobsQuery,
        (snapshot) => {
          const jobs: Job[] = [];
          snapshot.forEach((doc) => {
            jobs.push({
              id: doc.id,
              ...doc.data(),
              scheduledDate: doc.data().scheduledDate?.toDate(),
              completedDate: doc.data().completedDate?.toDate()
            } as Job);
          });
          
          this.clientJobs = jobs;
          this.isLoadingJobs = false;
        },
        (error) => {
          console.error('Error fetching client jobs:', error);
          this.isLoadingJobs = false;
        }
      );
    } catch (error) {
      console.error('Error setting up jobs subscription:', error);
      this.isLoadingJobs = false;
    }
  }

  // Select a client
  selectClient(client: Client | null) {
    this.selectedClient = client;
    
    if (client) {
      // Update recent clients
      this.recentClientIds = [
        client.id,
        ...this.recentClientIds.filter(id => id !== client.id)
      ].slice(0, 10); // Keep last 10
      
      this.saveRecentClientIds();
      
      // Subscribe to client's jobs
      this.subscribeToClientJobs(client.id);
      
      // Save to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedClientId', client.id);
      }
    } else {
      // Clear selection
      this.clientJobs = [];
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedClientId');
      }
    }
  }

  // Clear selection
  clearSelection() {
    this.selectClient(null);
  }

  // Restore selection from localStorage
  restoreSelection() {
    if (typeof window !== 'undefined' && this.clients.length > 0) {
      const savedId = localStorage.getItem('selectedClientId');
      if (savedId) {
        const client = this.clients.find(c => c.id === savedId);
        if (client) {
          this.selectClient(client);
        }
      }
    }
  }

  // Search clients
  searchClients(query: string): Client[] {
    const searchTerm = query.toLowerCase();
    return this.clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm) ||
      client.phone?.includes(searchTerm) ||
      client.address?.toLowerCase().includes(searchTerm)
    );
  }

  // Get recent clients
  get recentClients(): Client[] {
    return this.recentClientIds
      .map(id => this.clients.find(c => c.id === id))
      .filter(Boolean) as Client[];
  }

  // Get client by ID
  getById(id: string): Client | undefined {
    return this.clients.find(c => c.id === id);
  }

  // CRUD Operations with tenant context
  async createClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!this.currentTenantId) {
      throw new Error('No tenant selected');
    }
    
    try {
      const docRef = await addDoc(
        collection(db, `tenants/${this.currentTenantId}/clients`),
        {
          ...data,
          tenantId: this.currentTenantId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  async updateClient(id: string, data: Partial<Client>) {
    if (!this.currentTenantId) {
      throw new Error('No tenant selected');
    }
    
    try {
      const docRef = doc(db, `tenants/${this.currentTenantId}/clients`, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  async deleteClient(id: string) {
    if (!this.currentTenantId) {
      throw new Error('No tenant selected');
    }
    
    try {
      await deleteDoc(doc(db, `tenants/${this.currentTenantId}/clients`, id));
      
      // Clear selection if deleting selected client
      if (this.selectedClient?.id === id) {
        this.clearSelection();
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  // Cleanup subscriptions
  cleanup() {
    if (this.unsubscribeClients) {
      this.unsubscribeClients();
      this.unsubscribeClients = null;
    }
    
    if (this.unsubscribeJobs) {
      this.unsubscribeJobs();
      this.unsubscribeJobs = null;
    }
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Computed properties
  get hasClients() {
    return this.clients.length > 0;
  }

  get isLoading() {
    return this.isLoadingClients;
  }
}

// Create singleton instance
let clientStore: ClientStore | null = null;

export function useClients() {
  if (!clientStore) {
    clientStore = new ClientStore();
  }
  return clientStore;
}

// Initialize client store with tenant
export function initializeClientStore(tenantId: string) {
  const store = useClients();
  store.subscribeTenant(tenantId);
}

// Update client jobs subscription
export function updateClientJobsSubscription(tenantId: string, clientId: string) {
  const store = useClients();
  if (store.currentTenantId === tenantId) {
    store.subscribeToClientJobs(clientId);
  }
}