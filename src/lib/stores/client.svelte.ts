// src/lib/stores/client.svelte.ts - Enhanced version with missing methods
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
  setDoc,
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
    if (typeof window !== 'undefined' && this.currentTenantId) {
      const stored = localStorage.getItem(`recentClientIds_${this.currentTenantId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Only update if different to prevent infinite loops
          if (JSON.stringify(parsed) !== JSON.stringify(this.recentClientIds)) {
            this.recentClientIds = parsed;
          }
        } catch (e) {
          this.recentClientIds = [];
        }
      } else {
        this.recentClientIds = [];
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
        // Convert cached data back to proper Client objects with Date instances
        this.cachedClients = cachedClients.map(client => ({
          ...client,
          createdAt: client.createdAt instanceof Date ? client.createdAt : new Date(client.createdAt),
          updatedAt: client.updatedAt instanceof Date ? client.updatedAt : new Date(client.updatedAt),
          lastServiceDate: client.lastServiceDate 
            ? (client.lastServiceDate instanceof Date ? client.lastServiceDate : new Date(client.lastServiceDate))
            : undefined
        }));
        this.clients = this.cachedClients;
        
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
        try {
          // Use your existing setClient method which handles serialization
          await localCache.setClient(client, this.currentTenantId);
        } catch (clientCacheError) {
          console.warn(`Failed to cache client ${client.id}:`, clientCacheError);
        }
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
    
    // TODO: Re-enable after creating Firestore index
    // For now, just set empty array to avoid index error
    this.clientJobs = [];
    console.log('Job subscription disabled pending Firestore index creation');
    
    /* TEMPORARILY DISABLED - UNCOMMENT AFTER CREATING FIRESTORE INDEX
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
    */
  }

  // Select a client with tenant validation
  selectClient(client: Client | null) {
    // SECURITY: Clear selection if switching to null or client from different tenant
    if (!client) {
      this.selectedClient = null;
      this.clientJobs = [];
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedClientId');
      }
      return;
    }

    // SECURITY: Only allow selecting clients from current tenant
    const isValidClient = this.clients.some(c => c.id === client.id);
    if (!isValidClient) {
      console.warn(`🚨 Attempted to select client ${client.id} not in current tenant`);
      this.selectedClient = null;
      return;
    }

    this.selectedClient = client;
    
    // Update recent clients for current tenant only
    if (this.currentTenantId) {
      this.addToRecentClients(client.id);
      
      // Save to localStorage with tenant prefix
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedClientId', client.id);
        localStorage.setItem('selectedClientTenant', this.currentTenantId);
      }
      
      // Subscribe to client's jobs (disabled for now)
      // this.subscribeToClientJobs(client.id);
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

  // ✅ NEW: Create a new client with enhanced error handling
  async createClient(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    if (!this.currentTenantId) {
      throw new Error('No business selected. Please select a business first.');
    }

    try {
      this.error = null;

      // Prepare client data with required fields
      const newClientData = {
        name: clientData.name.trim(),
        email: clientData.email?.trim() || null,
        phone: clientData.phone?.trim() || null,
        address: clientData.address.trim(),
        city: clientData.city?.trim() || null,
        state: clientData.state?.trim() || null,
        zip: clientData.zip?.trim() || null,
        notes: clientData.notes?.trim() || null,
        tags: Array.isArray(clientData.tags) ? clientData.tags.filter(tag => typeof tag === 'string' && tag.trim()) : [],
        status: clientData.status || 'active',
        lastServiceDate: null,
        preferredTechnician: null,
        customFields: {}
      };

      // If offline, cache for later sync
      if (this.isOffline) {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const tempClient: Client = {
          id: tempId,
          ...newClientData,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Add to local clients list
        this.clients = [tempClient, ...this.clients];
        
        // Cache in IndexedDB for offline support
        try {
          await localCache.setClient(tempClient, this.currentTenantId);
        } catch (cacheError) {
          console.warn('Failed to cache client offline:', cacheError);
          // Continue without caching
        }
        
        // Queue for sync when online
        await this.queueOfflineOperation({
          type: 'create',
          collection: 'clients',
          data: newClientData,
          tempId
        });

        return tempClient;
      }

      // Online: Create in Firebase
      const clientRef = doc(collection(db, `tenants/${this.currentTenantId}/clients`));
      
      // Filter out null values for Firebase (but keep empty strings for optional fields)
      const clientToCreate = Object.fromEntries(
        Object.entries({
          ...newClientData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }).filter(([_, value]) => value !== null)
      );

      await setDoc(clientRef, clientToCreate);

      // Create client object with current timestamp for immediate UI update
      const newClient: Client = {
        id: clientRef.id,
        ...newClientData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add to local state immediately (Firebase subscription will sync later)
      this.clients = [newClient, ...this.clients];

      // Add to recent clients
      this.addToRecentClients(newClient.id);

      console.log('✅ Client created successfully:', newClient.name);
      return newClient;

    } catch (error) {
      console.error('❌ Error creating client:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create client. Please try again.';
      
      this.error = errorMessage;
      throw new Error(errorMessage);
    }
  }

  // ✅ NEW: Update an existing client
  async updateClient(clientId: string, updates: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<Client> {
    if (!this.currentTenantId) {
      throw new Error('No business selected');
    }

    try {
      this.error = null;

      // Find existing client
      const existingClient = this.clients.find(c => c.id === clientId);
      if (!existingClient) {
        throw new Error('Client not found');
      }

      // Prepare updates
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      // If offline, cache for later sync
      if (this.isOffline) {
        // Update local state
        this.clients = this.clients.map(c => 
          c.id === clientId ? { ...c, ...updateData } : c
        );
        
        // Update selected client if it's the one being edited
        if (this.selectedClient?.id === clientId) {
          this.selectedClient = { ...this.selectedClient, ...updateData };
        }

        // Queue for sync when online
        await this.queueOfflineOperation({
          type: 'update',
          collection: 'clients',
          documentId: clientId,
          data: { ...updates, updatedAt: serverTimestamp() }
        });

        return { ...existingClient, ...updateData };
      }

      // Online: Update in Firebase
      const clientRef = doc(db, `tenants/${this.currentTenantId}/clients`, clientId);
      await updateDoc(clientRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Update local state
      const updatedClient = { ...existingClient, ...updateData };
      this.clients = this.clients.map(c => 
        c.id === clientId ? updatedClient : c
      );
      
      // Update selected client if it's the one being edited
      if (this.selectedClient?.id === clientId) {
        this.selectedClient = updatedClient;
      }

      console.log('✅ Client updated successfully:', updatedClient.name);
      return updatedClient;

    } catch (error) {
      console.error('❌ Error updating client:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to update client. Please try again.';
      
      this.error = errorMessage;
      throw new Error(errorMessage);
    }
  }

  // ✅ NEW: Delete a client
  async deleteClient(clientId: string): Promise<void> {
    if (!this.currentTenantId) {
      throw new Error('No business selected');
    }

    try {
      this.error = null;

      // Find existing client
      const existingClient = this.clients.find(c => c.id === clientId);
      if (!existingClient) {
        throw new Error('Client not found');
      }

      // If offline, cache for later sync
      if (this.isOffline) {
        // Remove from local state
        this.clients = this.clients.filter(c => c.id !== clientId);
        
        // Clear selected client if it was deleted
        if (this.selectedClient?.id === clientId) {
          this.selectedClient = null;
        }

        // Queue for sync when online (only if not a temp ID)
        if (!clientId.startsWith('temp_')) {
          await this.queueOfflineOperation({
            type: 'delete',
            collection: 'clients',
            documentId: clientId,
            data: null
          });
        }

        return;
      }

      // Online: Delete from Firebase
      const clientRef = doc(db, `tenants/${this.currentTenantId}/clients`, clientId);
      await deleteDoc(clientRef);

      // Update local state
      this.clients = this.clients.filter(c => c.id !== clientId);
      
      // Clear selected client if it was deleted
      if (this.selectedClient?.id === clientId) {
        this.selectedClient = null;
      }

      // Remove from recent clients
      this.removeFromRecentClients(clientId);

      console.log('✅ Client deleted successfully:', existingClient.name);

    } catch (error) {
      console.error('❌ Error deleting client:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to delete client. Please try again.';
      
      this.error = errorMessage;
      throw new Error(errorMessage);
    }
  }

  // ✅ NEW: Helper methods for offline support
  private async queueOfflineOperation(operation: {
    type: 'create' | 'update' | 'delete';
    collection: string;
    documentId?: string;
    data: any;
    tempId?: string;
  }): Promise<void> {
    const queueKey = `offline_operations_${this.currentTenantId}`;
    const existingOperations = JSON.parse(localStorage.getItem(queueKey) || '[]');
    
    const operationWithTimestamp = {
      ...operation,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    };
    
    existingOperations.push(operationWithTimestamp);
    localStorage.setItem(queueKey, JSON.stringify(existingOperations));
  }

  private addToRecentClients(clientId: string): void {
    if (!clientId) return;
    
    // Remove if already exists, then add to front
    this.recentClientIds = [
      clientId,
      ...this.recentClientIds.filter(id => id !== clientId)
    ].slice(0, 10); // Keep only last 10
    
    this.saveRecentClientIds();
  }

  private removeFromRecentClients(clientId: string): void {
    this.recentClientIds = this.recentClientIds.filter(id => id !== clientId);
    this.saveRecentClientIds();
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