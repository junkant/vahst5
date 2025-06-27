// src/lib/stores/client.svelte.ts
import { type Unsubscribe } from 'firebase/firestore';
import { subscribeToClients, subscribeToClientJobs, type Client, type Job } from '$lib/firebase/firestore';

interface ClientStore {
  clients: Client[];
  selectedClient: Client | null;
  clientJobs: Job[];
  isLoading: boolean;
  isLoadingJobs: boolean;
  error: string | null;
  hasClients: boolean;
  recentClients: Client[];
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

  // Subscriptions
  private unsubscribeClients: Unsubscribe | null = null;
  private unsubscribeJobs: Unsubscribe | null = null;

  constructor() {
    this.loadRecentClientIds();
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

  // Initialize tenant subscription
  subscribeTenant(tenantId: string | undefined) {
    if (tenantId) {
      this.isLoadingClients = true;
      this.error = null;
      
      // Cleanup previous subscription
      if (this.unsubscribeClients) {
        this.unsubscribeClients();
      }
      
      // Subscribe to tenant's clients
      this.unsubscribeClients = subscribeToClients(
        tenantId,
        (updatedClients) => {
          this.clients = updatedClients;
          this.isLoadingClients = false;
          
          // Check if selected client still exists
          if (this.selectedClient && !updatedClients.find(c => c.id === this.selectedClient!.id)) {
            this.selectedClient = null;
          }
        },
        { 
          limit: 50, 
          orderBy: { field: 'updatedAt', direction: 'desc' } 
        }
      );
    } else {
      // No tenant, clear clients
      this.clients = [];
      this.selectedClient = null;
      this.clientJobs = [];
      this.isLoadingClients = false;
      
      if (this.unsubscribeClients) {
        this.unsubscribeClients();
        this.unsubscribeClients = null;
      }
    }
  }

  // Subscribe to client jobs
  subscribeClientJobs(tenantId: string | undefined, clientId: string | undefined) {
    if (tenantId && clientId) {
      this.isLoadingJobs = true;
      
      // Cleanup previous subscription
      if (this.unsubscribeJobs) {
        this.unsubscribeJobs();
      }
      
      // Subscribe to client's jobs
      this.unsubscribeJobs = subscribeToClientJobs(
        tenantId,
        clientId,
        (jobs) => {
          this.clientJobs = jobs;
          this.isLoadingJobs = false;
        }
      );
    } else {
      this.clientJobs = [];
      this.isLoadingJobs = false;
      
      if (this.unsubscribeJobs) {
        this.unsubscribeJobs();
        this.unsubscribeJobs = null;
      }
    }
  }

  // Actions
  selectClient = (client: Client | null) => {
    this.selectedClient = client;
    
    // Persist selection in session storage
    if (client) {
      sessionStorage.setItem('selectedClientId', client.id);
      
      // Add to recent clients (max 5)
      const filtered = this.recentClientIds.filter(id => id !== client.id);
      this.recentClientIds = [client.id, ...filtered].slice(0, 5);
      this.saveRecentClientIds();
    } else {
      sessionStorage.removeItem('selectedClientId');
    }
  }

  clearSelection = () => {
    this.selectedClient = null;
    this.clientJobs = [];
    sessionStorage.removeItem('selectedClientId');
  }

  // Restore selected client from session storage
  restoreSelection = () => {
    const savedClientId = sessionStorage.getItem('selectedClientId');
    if (savedClientId && this.clients.length > 0) {
      const client = this.clients.find(c => c.id === savedClientId);
      if (client) {
        this.selectClient(client);
      }
    }
  }

  // Search/filter clients
  searchClients = (query: string): Client[] => {
    const searchTerm = query.toLowerCase();
    return this.clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm) ||
      client.address?.toLowerCase().includes(searchTerm) ||
      client.phone?.includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm)
    );
  }

  // Get recent clients (actual client objects, not just IDs)
  getRecentClients = (count: number = 5): Client[] => {
    const recent: Client[] = [];
    
    // Map stored IDs to actual client objects
    for (const id of this.recentClientIds) {
      const client = this.clients.find(c => c.id === id);
      if (client) {
        recent.push(client);
      }
      if (recent.length >= count) break;
    }
    
    return recent;
  }

  getById = (id: string) => this.clients.find(c => c.id === id);

  // Cleanup
  cleanup() {
    if (this.unsubscribeClients) {
      this.unsubscribeClients();
    }
    if (this.unsubscribeJobs) {
      this.unsubscribeJobs();
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
    
    // Computed values
    get hasClients() { return clientStore.clients.length > 0; },
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

// For backward compatibility with components expecting useClient
export const useClient = useClients;