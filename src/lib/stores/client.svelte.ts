// src/lib/stores/client.svelte.ts - Enhanced version with security & performance
import { BaseStore } from './base.store';
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
  limit,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from '$lib/firebase/config';
import { localCache } from '$lib/utils/localCache';
import { browser } from '$app/environment';

// Constants
const MAX_RECENT_CLIENTS = 10;
const CACHE_SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour
const MAX_CLIENT_NAME_LENGTH = 100;
const MAX_NOTES_LENGTH = 1000;
const MAX_TAGS = 10;
const DEBOUNCE_DELAY = 300;

// Validation schemas
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s\-\+\(\)]+$/;
const ZIP_REGEX = /^\d{5}(-\d{4})?$/;

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

export interface Task {
  id: string;
  clientId: string;
  title: string;
  status: string;
  scheduledStart?: Date;
  scheduledDate?: Date; // For backward compatibility
  completedDate?: Date;
}

// Validation functions
function validateClientData(data: Partial<Client>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!data.name?.trim()) {
    errors.push('Client name is required');
  } else if (data.name.length > MAX_CLIENT_NAME_LENGTH) {
    errors.push(`Client name must be less than ${MAX_CLIENT_NAME_LENGTH} characters`);
  }

  if (!data.address?.trim()) {
    errors.push('Address is required');
  }

  // Optional field validation
  if (data.email && !EMAIL_REGEX.test(data.email)) {
    errors.push('Invalid email format');
  }

  if (data.phone && !PHONE_REGEX.test(data.phone)) {
    errors.push('Invalid phone number format');
  }

  if (data.zip && !ZIP_REGEX.test(data.zip)) {
    errors.push('Invalid ZIP code format');
  }

  if (data.notes && data.notes.length > MAX_NOTES_LENGTH) {
    errors.push(`Notes must be less than ${MAX_NOTES_LENGTH} characters`);
  }

  if (data.tags && data.tags.length > MAX_TAGS) {
    errors.push(`Maximum ${MAX_TAGS} tags allowed`);
  }

  return { isValid: errors.length === 0, errors };
}

// Sanitize input to prevent XSS
function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim();
}

class ClientStore extends BaseStore {
  // State
  clients = $state<Client[]>([]);
  selectedClient = $state<Client | null>(null);
  clientTasks = $state<Task[]>([]);
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
  private unsubscribeTasks: Unsubscribe | null = null;

  // Performance: Per-business client selection memory
  private businessClientMap = new Map<string, string>(); // tenantId -> clientId
  
  // Performance: Debounce timers
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Security: Track failed operations
  private failedOperations = new Map<string, number>(); // operationId -> retryCount

  constructor() {
    super();
    this.loadBusinessClientMap();
    this.loadRecentClientIds();
    this.initializeOfflineDetection();
    this.startPeriodicCacheCleanup();
  }
  
  // Initialize the store
  init() {
    if (this.initialized) return;
    this.initialized = true;
    // Initialization is handled in constructor and subscribeTenant
  }
  
  // Reset the store state
  reset() {
    this.clients = [];
    this.selectedClient = null;
    this.clientTasks = [];
    this.isLoadingClients = false;
    this.isLoadingJobs = false;
    this.error = null;
    this.recentClientIds = [];
    this.isOffline = false;
    this.currentTenantId = null;
    this.cachedClients = [];
    this.lastSync = 0;
    this.businessClientMap.clear();
    this.failedOperations.clear();
  }

  // Load business-client mapping from localStorage
  private loadBusinessClientMap() {
    if (!browser) return;
    
    try {
      const saved = localStorage.getItem('businessClientMap');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.businessClientMap = new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.error('Failed to load business client map:', e);
    }
  }

  // Save business-client mapping
  private saveBusinessClientMap() {
    if (!browser) return;
    
    try {
      const obj = Object.fromEntries(this.businessClientMap);
      localStorage.setItem('businessClientMap', JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save business client map:', e);
    }
  }

  // Initialize offline detection
  private initializeOfflineDetection() {
    if (!browser) return;
    
    this.isOffline = !navigator.onLine;
    
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  // Debounced sync with server
  private debouncedSync() {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    
    this.syncDebounceTimer = setTimeout(() => {
      this.syncWithServer();
    }, DEBOUNCE_DELAY);
  }

  // Start periodic cache cleanup
  private startPeriodicCacheCleanup() {
    if (!browser) return;
    
    this.syncInterval = setInterval(() => {
      localCache.cleanOldData().catch(console.error);
    }, CACHE_SYNC_INTERVAL);
  }

  // Load recent client IDs from localStorage with validation
  private loadRecentClientIds() {
    if (!browser || !this.currentTenantId) return;
    
    const stored = localStorage.getItem(`recentClientIds_${this.currentTenantId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate it's an array of strings
        if (Array.isArray(parsed) && parsed.every(id => typeof id === 'string')) {
          this.recentClientIds = parsed.slice(0, MAX_RECENT_CLIENTS);
        }
      } catch (e) {
        this.recentClientIds = [];
      }
    }
  }

  // Save recent client IDs to localStorage
  private saveRecentClientIds() {
    if (!browser || !this.currentTenantId) return;
    
    localStorage.setItem(
      `recentClientIds_${this.currentTenantId}`, 
      JSON.stringify(this.recentClientIds.slice(0, MAX_RECENT_CLIENTS))
    );
  }

  // Load clients from IndexedDB cache
  private async loadFromCache() {
    if (!this.currentTenantId) return;
    
    try {
      this.isLoadingClients = true;
      const cachedClients = await localCache.getAllClients(this.currentTenantId);
      
      if (cachedClients.length > 0) {
        // Validate and convert cached data
        this.cachedClients = cachedClients
          .filter(client => client.id && client.name) // Basic validation
          .map(client => ({
            ...client,
            createdAt: client.createdAt instanceof Date ? client.createdAt : new Date(client.createdAt),
            updatedAt: client.updatedAt instanceof Date ? client.updatedAt : new Date(client.updatedAt),
            lastServiceDate: client.lastServiceDate 
              ? (client.lastServiceDate instanceof Date ? client.lastServiceDate : new Date(client.lastServiceDate))
              : undefined
          }));
        this.clients = this.cachedClients;
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
      // Only sync if data has changed
      const currentHash = this.getClientsHash();
      const lastSyncHash = localStorage.getItem(`lastSyncHash_${this.currentTenantId}`);
      
      if (currentHash === lastSyncHash) {
        return; // No changes to sync
      }
      
      // Batch cache updates for performance
      const batchPromises = this.clients.map(client => 
        localCache.setClient(client, this.currentTenantId!).catch(err => {
          console.warn(`Failed to cache client ${client.id}:`, err);
        })
      );
      
      await Promise.all(batchPromises);
      
      this.lastSync = Date.now();
      localStorage.setItem(`lastSyncHash_${this.currentTenantId}`, currentHash);
      
    } catch (error) {
      console.error('Error syncing to cache:', error);
    }
  }

  // Generate hash of clients for change detection
  private getClientsHash(): string {
    const clientsString = JSON.stringify(
      this.clients.map(c => ({ id: c.id, updatedAt: c.updatedAt }))
    );
    return btoa(clientsString).slice(0, 20); // Simple hash
  }

  // Initialize tenant subscription with security checks
  subscribeTenant(tenantId: string | null) {
    // Security: Validate tenant ID format
    if (tenantId && !/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
      console.error('Invalid tenant ID format');
      return;
    }
    
    // Skip if already subscribed to the same tenant
    if (this.currentTenantId === tenantId && this.unsubscribeClients) {
      return;
    }
    
    // Clean up previous subscriptions only if tenant is changing
    if (this.currentTenantId !== tenantId && this.currentTenantId !== null) {
      // Call the instance method, not this.cleanup()
      if (this.unsubscribeClients) {
        this.unsubscribeClients();
        this.unsubscribeClients = null;
      }
      if (this.unsubscribeTasks) {
        this.unsubscribeTasks();
        this.unsubscribeTasks = null;
      }
    }
    
    if (!tenantId) {
      this.clients = [];
      this.selectedClient = null;
      this.clientTasks = [];
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
        orderBy('name'),
        // Performance: Consider pagination for large datasets
        // limit(100) // Uncomment if you have many clients
      );
      
      this.unsubscribeClients = onSnapshot(
        clientsQuery,
        (snapshot) => {
          const clients: Client[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            // Validate data from Firestore
            if (data.name && typeof data.name === 'string') {
              clients.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                lastServiceDate: data.lastServiceDate?.toDate()
              } as Client);
            }
          });
          
          this.clients = clients;
          this.isLoadingClients = false;
          
          // Restore previous selection for this business
          this.restoreBusinessClientSelection(tenantId);
          
          // Sync to cache in background (debounced)
          this.debouncedSync();
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

  // Subscribe to client tasks
  subscribeToClientTasks(clientId: string) {
    // Unsubscribe from previous tasks subscription
    if (this.unsubscribeTasks) {
      this.unsubscribeTasks();
      this.unsubscribeTasks = null;
    }
    
    if (!this.currentTenantId || !clientId) {
      this.clientTasks = [];
      return;
    }
    
    this.isLoadingJobs = true;
    
    try {
      const tasksRef = collection(db, `tenants/${this.currentTenantId}/tasks`);
      const tasksQuery = query(
        tasksRef,
        where('clientId', '==', clientId),
        orderBy('scheduledStart', 'desc'),
        limit(50)
      );
      
      this.unsubscribeTasks = onSnapshot(
        tasksQuery,
        (snapshot) => {
          const tasks: Task[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            tasks.push({
              id: doc.id,
              ...data,
              scheduledStart: data.scheduledStart?.toDate ? data.scheduledStart.toDate() : data.scheduledStart,
              scheduledDate: data.scheduledDate?.toDate ? data.scheduledDate.toDate() : data.scheduledDate,
              completedDate: data.completedDate?.toDate ? data.completedDate.toDate() : data.completedDate
            } as Task);
          });
          
          this.clientTasks = tasks;
          this.isLoadingJobs = false;
        },
        (error) => {
          console.error('Error fetching tasks:', error);
          this.isLoadingJobs = false;
          
          // If it's an index error, just set tasks to empty and continue
          if (error.message?.includes('requires an index')) {
            this.clientTasks = [];
            console.info('Tasks query requires a Firebase index. Please create the index using the link in the console.');
          }
        }
      );
    } catch (error) {
      console.error('Error setting up tasks subscription:', error);
      this.isLoadingJobs = false;
      this.clientTasks = [];
    }
  }

  // Restore client selection for a specific business
  private restoreBusinessClientSelection(tenantId: string) {
    const previousClientId = this.businessClientMap.get(tenantId);
    if (previousClientId && !this.selectedClient) {
      const previousClient = this.clients.find(c => c.id === previousClientId);
      if (previousClient) {
        this.selectClient(previousClient);
      }
    }
  }

  // Select a client with enhanced security and persistence
  selectClient(client: Client | null) {
    // Clear selection
    if (!client) {
      this.selectedClient = null;
      this.clientTasks = [];
      
      // Clear from business map
      if (this.currentTenantId) {
        this.businessClientMap.delete(this.currentTenantId);
        this.saveBusinessClientMap();
      }
      
      if (browser) {
        localStorage.removeItem('selectedClientId');
      }
      return;
    }

    // Security: Validate client belongs to current tenant
    const isValidClient = this.clients.some(c => c.id === client.id);
    if (!isValidClient) {
      console.error(`Security: Attempted to select client ${client.id} not in current tenant`);
      this.selectedClient = null;
      return;
    }

    // Security: Additional validation
    if (!client.id || typeof client.id !== 'string') {
      console.error('Security: Invalid client ID');
      return;
    }

    this.selectedClient = client;
    
    // Remember selection for this business
    if (this.currentTenantId) {
      this.businessClientMap.set(this.currentTenantId, client.id);
      this.saveBusinessClientMap();
      
      this.addToRecentClients(client.id);
      
      if (browser) {
        localStorage.setItem('selectedClientId', client.id);
        localStorage.setItem('selectedClientTenant', this.currentTenantId);
      }
      
      // Subscribe to client's tasks
      this.subscribeToClientTasks(client.id);
    }
  }

  // Search clients with debouncing
  searchClients(query: string): Client[] {
    if (!query || query.length < 2) return this.clients;
    
    const searchTerm = sanitizeString(query.toLowerCase());
    
    return this.clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm) ||
      client.phone?.includes(searchTerm) ||
      client.address?.toLowerCase().includes(searchTerm) ||
      client.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  // Get recent clients with validation
  get recentClients(): Client[] {
    return this.recentClientIds
      .slice(0, MAX_RECENT_CLIENTS)
      .map(id => this.clients.find(c => c.id === id))
      .filter(Boolean) as Client[];
  }

  // Create client with enhanced validation and security
  async createClient(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    if (!this.currentTenantId) {
      throw new Error('No business selected. Please select a business first.');
    }

    // Validate input data
    const validation = validateClientData(clientData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      this.error = null;

      // Sanitize input data
      const sanitizedData = {
        ...clientData,
        name: sanitizeString(clientData.name),
        email: clientData.email ? sanitizeString(clientData.email) : undefined,
        phone: clientData.phone ? sanitizeString(clientData.phone) : undefined,
        address: sanitizeString(clientData.address),
        city: clientData.city ? sanitizeString(clientData.city) : undefined,
        state: clientData.state ? sanitizeString(clientData.state) : undefined,
        zip: clientData.zip ? sanitizeString(clientData.zip) : undefined,
        notes: clientData.notes ? sanitizeString(clientData.notes) : undefined,
        tags: clientData.tags?.map(tag => sanitizeString(tag)).filter(Boolean),
        status: clientData.status || 'active'
      };

      // Prepare client data
      const newClientData = {
        ...sanitizedData,
        lastServiceDate: null,
        preferredTechnician: null,
        customFields: {}
      };

      // If offline, handle offline creation
      if (this.isOffline) {
        return await this.createClientOffline(newClientData);
      }

      // Online: Create in Firebase with retry logic
      const clientRef = doc(collection(db, `tenants/${this.currentTenantId}/clients`));
      
      const clientToCreate = Object.fromEntries(
        Object.entries({
          ...newClientData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }).filter(([_, value]) => value !== null && value !== undefined)
      );

      await setDoc(clientRef, clientToCreate);

      const newClient: Client = {
        id: clientRef.id,
        ...newClientData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add to local state
      this.clients = [newClient, ...this.clients];
      this.addToRecentClients(newClient.id);

      return newClient;

    } catch (error) {
      console.error('Error creating client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create client';
      this.error = errorMessage;
      throw new Error(errorMessage);
    }
  }

  // Handle offline client creation
  private async createClientOffline(clientData: any): Promise<Client> {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempClient: Client = {
      id: tempId,
      ...clientData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.clients = [tempClient, ...this.clients];
    
    try {
      await localCache.setClient(tempClient, this.currentTenantId!);
    } catch (cacheError) {
      console.warn('Failed to cache client offline:', cacheError);
    }
    
    await this.queueOfflineOperation({
      type: 'create',
      collection: 'clients',
      data: clientData,
      tempId
    });

    return tempClient;
  }

  // Update client with validation
  async updateClient(clientId: string, updates: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<Client> {
    if (!this.currentTenantId) {
      throw new Error('No business selected');
    }

    // Security: Validate client ID
    if (!clientId || typeof clientId !== 'string') {
      throw new Error('Invalid client ID');
    }

    // Validate update data
    const validation = validateClientData(updates);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      this.error = null;

      const existingClient = this.clients.find(c => c.id === clientId);
      if (!existingClient) {
        throw new Error('Client not found');
      }

      // Security: Verify client belongs to current tenant
      if (!this.clients.some(c => c.id === clientId)) {
        throw new Error('Unauthorized: Client does not belong to current business');
      }

      // Sanitize updates
      const sanitizedUpdates = Object.fromEntries(
        Object.entries(updates).map(([key, value]) => {
          if (typeof value === 'string') {
            return [key, sanitizeString(value)];
          }
          if (key === 'tags' && Array.isArray(value)) {
            return [key, value.map(tag => sanitizeString(tag))];
          }
          return [key, value];
        })
      );

      const updateData = {
        ...sanitizedUpdates,
        updatedAt: new Date()
      };

      if (this.isOffline) {
        return await this.updateClientOffline(clientId, updateData, existingClient);
      }

      // Online update
      const clientRef = doc(db, `tenants/${this.currentTenantId}/clients`, clientId);
      await updateDoc(clientRef, {
        ...sanitizedUpdates,
        updatedAt: serverTimestamp()
      });

      const updatedClient = { ...existingClient, ...updateData };
      this.updateLocalClient(clientId, updatedClient);

      return updatedClient;

    } catch (error) {
      console.error('Error updating client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update client';
      this.error = errorMessage;
      throw new Error(errorMessage);
    }
  }

  // Handle offline client update
  private async updateClientOffline(clientId: string, updateData: any, existingClient: Client): Promise<Client> {
    const updatedClient = { ...existingClient, ...updateData };
    this.updateLocalClient(clientId, updatedClient);

    await this.queueOfflineOperation({
      type: 'update',
      collection: 'clients',
      documentId: clientId,
      data: { ...updateData, updatedAt: serverTimestamp() }
    });

    return updatedClient;
  }

  // Update client in local state
  private updateLocalClient(clientId: string, updatedClient: Client) {
    this.clients = this.clients.map(c => 
      c.id === clientId ? updatedClient : c
    );
    
    if (this.selectedClient?.id === clientId) {
      this.selectedClient = updatedClient;
    }
  }

  // Delete client with security checks
  async deleteClient(clientId: string): Promise<void> {
    if (!this.currentTenantId) {
      throw new Error('No business selected');
    }

    // Security: Validate client ID
    if (!clientId || typeof clientId !== 'string') {
      throw new Error('Invalid client ID');
    }

    try {
      this.error = null;

      const existingClient = this.clients.find(c => c.id === clientId);
      if (!existingClient) {
        throw new Error('Client not found');
      }

      // Security: Verify ownership
      if (!this.clients.some(c => c.id === clientId)) {
        throw new Error('Unauthorized: Client does not belong to current business');
      }

      if (this.isOffline) {
        return await this.deleteClientOffline(clientId);
      }

      // Online delete
      const clientRef = doc(db, `tenants/${this.currentTenantId}/clients`, clientId);
      await deleteDoc(clientRef);

      this.removeLocalClient(clientId);

    } catch (error) {
      console.error('Error deleting client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete client';
      this.error = errorMessage;
      throw new Error(errorMessage);
    }
  }

  // Handle offline client deletion
  private async deleteClientOffline(clientId: string): Promise<void> {
    this.removeLocalClient(clientId);

    if (!clientId.startsWith('temp_')) {
      await this.queueOfflineOperation({
        type: 'delete',
        collection: 'clients',
        documentId: clientId,
        data: null
      });
    }
  }

  // Remove client from local state
  private removeLocalClient(clientId: string) {
    this.clients = this.clients.filter(c => c.id !== clientId);
    
    if (this.selectedClient?.id === clientId) {
      this.selectedClient = null;
    }

    this.removeFromRecentClients(clientId);
  }

  // Queue offline operation with retry logic
  private async queueOfflineOperation(operation: any): Promise<void> {
    const queueKey = `offline_operations_${this.currentTenantId}`;
    const existingOperations = JSON.parse(localStorage.getItem(queueKey) || '[]');
    
    const operationWithMetadata = {
      ...operation,
      timestamp: Date.now(),
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      retryCount: 0,
      tenantId: this.currentTenantId
    };
    
    existingOperations.push(operationWithMetadata);
    localStorage.setItem(queueKey, JSON.stringify(existingOperations));
  }

  // Add to recent clients with limit
  private addToRecentClients(clientId: string): void {
    if (!clientId) return;
    
    this.recentClientIds = [
      clientId,
      ...this.recentClientIds.filter(id => id !== clientId)
    ].slice(0, MAX_RECENT_CLIENTS);
    
    this.saveRecentClientIds();
  }

  // Remove from recent clients
  private removeFromRecentClients(clientId: string): void {
    this.recentClientIds = this.recentClientIds.filter(id => id !== clientId);
    this.saveRecentClientIds();
  }

  // Cleanup subscriptions and timers
  cleanup() {
    if (this.unsubscribeClients) {
      this.unsubscribeClients();
      this.unsubscribeClients = null;
    }
    
    if (this.unsubscribeTasks) {
      this.unsubscribeTasks();
      this.unsubscribeTasks = null;
    }
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    
    // Add cleanup functions to base store
    this.addCleanup(() => {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    });
  }
  
  // Event handlers for offline detection
  private handleOnline = () => {
    this.isOffline = false;
    if (this.currentTenantId) {
      this.debouncedSync();
    }
  };
  
  private handleOffline = () => {
    this.isOffline = true;
    if (this.currentTenantId) {
      this.loadFromCache();
    }
  };

  // Computed properties
  get hasClients() {
    return this.clients.length > 0;
  }

  get isLoading() {
    return this.isLoadingClients;
  }

  get clientCount() {
    return this.clients.length;
  }

  get activeClientCount() {
    return this.clients.filter(c => c.status === 'active').length;
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

// Update client tasks subscription
export function updateClientTasksSubscription(tenantId: string, clientId: string) {
  const store = useClients();
  if (store.currentTenantId === tenantId) {
    store.subscribeToClientTasks(clientId);
  }
}