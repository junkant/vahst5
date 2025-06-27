// src/lib/stores/client.svelte.ts
import { onSnapshot, collection, query, where, orderBy, limit, type Unsubscribe } from 'firebase/firestore';
import { db } from '$lib/firebase/config';
import { useAuth } from './auth.svelte';
import { subscribeToClients, subscribeToClientJobs, type Client, type Job } from '$lib/firebase/firestore';

// Get auth instance
const auth = useAuth();

// Svelte 5 state using runes
let clients = $state<Client[]>([]);
let selectedClient = $state<Client | null>(null);
let clientJobs = $state<Job[]>([]);
let isLoadingClients = $state(false);
let isLoadingJobs = $state(false);
let error = $state<string | null>(null);
let recentClientIds = $state<string[]>([]);

// Store subscriptions
let unsubscribeClients: Unsubscribe | null = null;
let unsubscribeJobs: Unsubscribe | null = null;

// Load recent client IDs from localStorage
function loadRecentClientIds() {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('recentClientIds');
    if (stored) {
      try {
        recentClientIds = JSON.parse(stored);
      } catch (e) {
        recentClientIds = [];
      }
    }
  }
}

// Save recent client IDs to localStorage
function saveRecentClientIds() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('recentClientIds', JSON.stringify(recentClientIds));
  }
}

// Initialize recent clients on load
loadRecentClientIds();

// Subscribe to clients when tenant changes
$effect(() => {
  const tenant = auth.tenant;
  
  if (tenant?.id) {
    isLoadingClients = true;
    error = null;
    
    // Cleanup previous subscription
    if (unsubscribeClients) {
      unsubscribeClients();
    }
    
    // Subscribe to tenant's clients
    unsubscribeClients = subscribeToClients(
      tenant.id,
      (updatedClients) => {
        clients = updatedClients;
        isLoadingClients = false;
        
        // Check if selected client still exists
        if (selectedClient && !updatedClients.find(c => c.id === selectedClient.id)) {
          selectedClient = null;
        }
      },
      { 
        limit: 50, 
        orderBy: { field: 'updatedAt', direction: 'desc' } 
      }
    );
  } else {
    // No tenant, clear clients
    clients = [];
    selectedClient = null;
    clientJobs = [];
    isLoadingClients = false;
  }
  
  // Cleanup on effect destroy
  return () => {
    if (unsubscribeClients) {
      unsubscribeClients();
    }
  };
});

// Subscribe to selected client's jobs
$effect(() => {
  const tenant = auth.tenant;
  const client = selectedClient;
  
  if (tenant?.id && client?.id) {
    isLoadingJobs = true;
    
    // Cleanup previous subscription
    if (unsubscribeJobs) {
      unsubscribeJobs();
    }
    
    // Subscribe to client's jobs
    unsubscribeJobs = subscribeToClientJobs(
      tenant.id,
      client.id,
      (jobs) => {
        clientJobs = jobs;
        isLoadingJobs = false;
      }
    );
  } else {
    clientJobs = [];
    isLoadingJobs = false;
  }
  
  // Cleanup on effect destroy
  return () => {
    if (unsubscribeJobs) {
      unsubscribeJobs();
    }
  };
});

// Actions
function selectClient(client: Client | null) {
  selectedClient = client;
  
  // Persist selection in session storage
  if (client) {
    sessionStorage.setItem('selectedClientId', client.id);
    
    // Add to recent clients (max 5)
    const filtered = recentClientIds.filter(id => id !== client.id);
    recentClientIds = [client.id, ...filtered].slice(0, 5);
    saveRecentClientIds();
  } else {
    sessionStorage.removeItem('selectedClientId');
  }
}

function clearSelection() {
  selectedClient = null;
  clientJobs = [];
  sessionStorage.removeItem('selectedClientId');
}

// Restore selected client from session storage
function restoreSelection() {
  const savedClientId = sessionStorage.getItem('selectedClientId');
  if (savedClientId && clients.length > 0) {
    const client = clients.find(c => c.id === savedClientId);
    if (client) {
      selectClient(client);
    }
  }
}

// Search/filter clients
function searchClients(query: string): Client[] {
  const searchTerm = query.toLowerCase();
  return clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm) ||
    client.address?.toLowerCase().includes(searchTerm) ||
    client.phone?.includes(searchTerm) ||
    client.email?.toLowerCase().includes(searchTerm)
  );
}

// Get recent clients (actual client objects, not just IDs)
function getRecentClients(count: number = 5): Client[] {
  const recent: Client[] = [];
  
  // Map stored IDs to actual client objects
  for (const id of recentClientIds) {
    const client = clients.find(c => c.id === id);
    if (client) {
      recent.push(client);
    }
    if (recent.length >= count) break;
  }
  
  return recent;
}

// Export the store hook
export function useClients() {
  return {
    // State getters
    get clients() { return clients; },
    get selectedClient() { return selectedClient; },
    get clientJobs() { return clientJobs; },
    get isLoading() { return isLoadingClients; },
    get isLoadingJobs() { return isLoadingJobs; },
    get error() { return error; },
    
    // Computed values
    get hasClients() { return clients.length > 0; },
    get recentClients() { return getRecentClients(); },
    
    // Actions
    selectClient,
    clearSelection,
    restoreSelection,
    searchClients,
    getRecentClients,
    
    // Find client by ID
    getById: (id: string) => clients.find(c => c.id === id)
  };
}

// For backward compatibility with components expecting useClient
export const useClient = useClients;