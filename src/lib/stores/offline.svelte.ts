// src/lib/stores/offline.svelte.ts
import { db } from '$lib/firebase/config';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { useAuth } from './auth.svelte';

interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'batch';
  collection: string;
  documentId?: string;
  data: any;
  timestamp: number;
  retries: number;
  tenantId?: string;
}

interface SyncConflict {
  operation: OfflineOperation;
  localData: any;
  serverData: any;
  resolution?: 'local' | 'server' | 'merge';
  mergedData?: any;
}

type ConflictResolutionStrategy = 'client-wins' | 'server-wins' | 'manual' | 'merge-fields';

interface ConflictResolver {
  strategy: ConflictResolutionStrategy;
  mergeFunction?: (local: any, server: any) => any;
  conflictFields?: string[]; // Fields that should trigger conflict detection
}

// Default conflict resolvers for different collections
const defaultResolvers: Record<string, ConflictResolver> = {
  clients: {
    strategy: 'merge-fields',
    conflictFields: ['name', 'email', 'phone', 'address'],
    mergeFunction: (local: any, server: any) => {
      // For clients, prefer local changes but keep server timestamps
      return {
        ...server,
        ...local,
        updatedAt: serverTimestamp(),
        _syncedAt: serverTimestamp()
      };
    }
  },
  jobs: {
    strategy: 'server-wins', // Jobs are more critical, avoid conflicts
    conflictFields: ['status', 'assignedTo', 'scheduledDate']
  },
  invoices: {
    strategy: 'server-wins', // Financial data should be consistent
    conflictFields: ['amount', 'status', 'items']
  }
};

// Svelte 5 state using runes
let isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);
let offlineQueue = $state<OfflineOperation[]>([]);
let isSyncing = $state(false);
let syncErrors = $state<Error[]>([]);
let conflicts = $state<SyncConflict[]>([]);
let conflictResolver = $state<ConflictResolver>(defaultResolvers.clients);
let backgroundSyncSupported = $state(false);
let lastSyncAttempt = $state<number>(0);

// Initialize function to be called from a component
function initializeOfflineStore() {
  if (typeof window !== 'undefined') {
    // Check for background sync support
    backgroundSyncSupported = 'serviceWorker' in navigator && 'SyncManager' in window;
    
    // Set up online/offline listeners
    window.addEventListener('online', () => {
      isOnline = true;
      processOfflineQueue();
    });
    
    window.addEventListener('offline', () => {
      isOnline = false;
    });
    
    // Load offline queue from localStorage
    const savedQueue = localStorage.getItem('offlineQueue');
    if (savedQueue) {
      try {
        offlineQueue = JSON.parse(savedQueue);
      } catch (e) {
        console.error('Failed to load offline queue:', e);
      }
    }
    
    // Listen for sync messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_START') {
          processOfflineQueue();
        }
      });
    }
    
    // Process queue on initialization if online and has pending operations
    if (isOnline && offlineQueue.length > 0) {
      // Delay to ensure auth is ready
      setTimeout(() => processOfflineQueue(), 1000);
    }
  }
}

// Call initialization immediately if in browser
if (typeof window !== 'undefined') {
  initializeOfflineStore();
}

// Register background sync
async function registerBackgroundSync() {
  if (!backgroundSyncSupported || !('serviceWorker' in navigator)) return;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await registration.sync.register('sync-offline-operations');
      if (import.meta.env.DEV) {
        console.log('Background sync registered');
      }
    }
  } catch (error) {
    console.error('Failed to register background sync:', error);
  }
}

// Save queue to localStorage - to be called from effect
function saveQueueToStorage() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
  }
}

// Notify about sync status
function notifySync(status: 'success' | 'error' | 'progress', operation?: OfflineOperation) {
  if (typeof window === 'undefined') return;
  
  // Post message to service worker for cross-tab sync
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SYNC_STATUS',
      status,
      operation: operation ? {
        type: operation.type,
        collection: operation.collection,
        id: operation.documentId
      } : undefined,
      queueLength: offlineQueue.length
    });
  }
  
  // Dispatch custom event for UI updates
  window.dispatchEvent(new CustomEvent('offline-sync', {
    detail: { status, operation, queueLength: offlineQueue.length }
  }));
}

// Check for conflicts before executing operation
async function checkForConflicts(operation: OfflineOperation): Promise<SyncConflict | null> {
  const { collection, documentId, data, tenantId } = operation;
  
  if (operation.type !== 'update' || !documentId) {
    return null; // Only check conflicts for updates
  }
  
  try {
    // Get current server data
    const docRef = doc(db, `tenants/${tenantId}/${collection}`, documentId);
    const serverDoc = await getDoc(docRef);
    
    if (!serverDoc.exists()) {
      return null; // Document doesn't exist on server
    }
    
    const serverData = serverDoc.data();
    const resolver = defaultResolvers[collection] || defaultResolvers.clients;
    
    // Check if there's a conflict based on timestamps
    const localTimestamp = data._localTimestamp || operation.timestamp;
    const serverTimestamp = serverData.updatedAt?.toMillis() || 0;
    
    if (serverTimestamp > localTimestamp) {
      // Server has newer data, potential conflict
      const hasConflictingFields = resolver.conflictFields?.some(field => {
        return data[field] !== undefined && data[field] !== serverData[field];
      });
      
      if (hasConflictingFields) {
        return {
          operation,
          localData: data,
          serverData,
          resolution: resolver.strategy === 'manual' ? undefined : resolver.strategy
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking for conflicts:', error);
    return null;
  }
}

// Resolve conflict based on strategy
async function resolveConflict(conflict: SyncConflict): Promise<any> {
  const resolver = defaultResolvers[conflict.operation.collection] || defaultResolvers.clients;
  
  switch (conflict.resolution || resolver.strategy) {
    case 'client-wins':
      return conflict.localData;
      
    case 'server-wins':
      return null; // Don't apply local changes
      
    case 'merge-fields':
      if (resolver.mergeFunction) {
        return resolver.mergeFunction(conflict.localData, conflict.serverData);
      }
      // Fallback to client-wins if no merge function
      return conflict.localData;
      
    case 'manual':
      // Add to conflicts array for user resolution
      conflicts = [...conflicts, conflict];
      throw new Error('Manual conflict resolution required');
      
    default:
      return conflict.localData;
  }
}

// Execute operation with retry logic
async function executeOperationWithRetry(operation: OfflineOperation, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await executeOperation(operation);
      return; // Success
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error instanceof Error && error.message.includes('permission')) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Process offline queue with conflict detection and background sync
async function processOfflineQueue() {
  if (!isOnline || isSyncing || offlineQueue.length === 0) return;
  
  const auth = useAuth();
  if (!auth.user || !auth.tenant) {
    console.warn('Cannot sync: No authenticated user or tenant');
    return;
  }
  
  isSyncing = true;
  syncErrors = []; // Clear previous errors
  lastSyncAttempt = Date.now();
  
  // Notify sync start
  notifySync('progress');
  
  // Process queue in order
  while (offlineQueue.length > 0 && isOnline) {
    const operation = offlineQueue[0];
    
    try {
      // Add tenant context if not present
      if (!operation.tenantId && auth.tenant) {
        operation.tenantId = auth.tenant.id;
      }
      
      // Check for conflicts
      const conflict = await checkForConflicts(operation);
      
      if (conflict) {
        const resolvedData = await resolveConflict(conflict);
        if (resolvedData) {
          // Update operation with resolved data
          operation.data = resolvedData;
        } else {
          // Skip this operation (server wins)
          offlineQueue = offlineQueue.slice(1);
          saveQueueToStorage();
          continue;
        }
      }
      
      // Execute the operation with retry
      await executeOperationWithRetry(operation);
      
      // Remove from queue on success
      offlineQueue = offlineQueue.slice(1);
      saveQueueToStorage();
      
      // Notify successful sync
      notifySync('success', operation);
    } catch (error) {
      console.error('Failed to sync offline operation:', error);
      
      // Handle manual conflict resolution
      if (error instanceof Error && error.message === 'Manual conflict resolution required') {
        // Move to end of queue to process other operations
        offlineQueue = [...offlineQueue.slice(1), operation];
        saveQueueToStorage();
        continue;
      }
      
      // Increment retry count
      operation.retries++;
      
      // Calculate backoff delay
      const backoffDelay = Math.min(1000 * Math.pow(2, operation.retries), 30000); // Max 30 seconds
      
      // Remove if too many retries
      if (operation.retries > 5) {
        console.error('Giving up on operation after 5 retries:', operation);
        syncErrors = [...syncErrors, error as Error];
        offlineQueue = offlineQueue.slice(1);
        notifySync('error', operation);
      } else {
        // Move to end of queue with delay
        offlineQueue = [...offlineQueue.slice(1), operation];
        
        // Wait before continuing if online
        if (isOnline) {
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
      saveQueueToStorage();
      
      // Stop processing on error if offline
      if (!isOnline) break;
    }
  }
  
  isSyncing = false;
  
  // Final notification
  if (offlineQueue.length === 0 && syncErrors.length === 0) {
    notifySync('success');
  } else if (syncErrors.length > 0) {
    notifySync('error');
  }
  
  // Register background sync if queue still has items
  if (offlineQueue.length > 0 && !isOnline) {
    await registerBackgroundSync();
  }
  
  // Notify service worker of completion
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: offlineQueue.length === 0 ? 'SYNC_COMPLETE' : 'SYNC_FAILED'
    });
  }
}

// Execute a queued operation
async function executeOperation(operation: OfflineOperation) {
  const { type, collection, documentId, data, tenantId } = operation;
  
  if (!tenantId) {
    throw new Error('No tenant ID for operation');
  }
  
  // Build the correct path based on collection
  const collectionPath = `tenants/${tenantId}/${collection}`;
  
  switch (type) {
    case 'create': {
      const docId = documentId || doc(db, collectionPath).id;
      const docRef = doc(db, collectionPath, docId);
      await setDoc(docRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        _syncedAt: serverTimestamp()
      });
      break;
    }
    
    case 'update': {
      if (!documentId) throw new Error('Document ID required for update');
      const docRef = doc(db, collectionPath, documentId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
        _syncedAt: serverTimestamp()
      });
      break;
    }
    
    case 'delete': {
      if (!documentId) throw new Error('Document ID required for delete');
      const docRef = doc(db, collectionPath, documentId);
      await deleteDoc(docRef);
      break;
    }
    
    case 'batch': {
      const batch = writeBatch(db);
      for (const op of data.operations) {
        const docRef = doc(db, collectionPath, op.documentId);
        switch (op.type) {
          case 'set':
            batch.set(docRef, { ...op.data, _syncedAt: serverTimestamp() });
            break;
          case 'update':
            batch.update(docRef, { ...op.data, _syncedAt: serverTimestamp() });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      }
      await batch.commit();
      break;
    }
    
    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
}

// Add operation to queue with timestamp and background sync
function addToQueue(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retries'>) {
  const auth = useAuth();
  const newOperation: OfflineOperation = {
    ...operation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retries: 0,
    tenantId: operation.tenantId || auth.tenant?.id
  };
  
  // Add local timestamp to data for conflict detection
  if (newOperation.data && (newOperation.type === 'create' || newOperation.type === 'update')) {
    newOperation.data._localTimestamp = Date.now();
  }
  
  offlineQueue = [...offlineQueue, newOperation];
  saveQueueToStorage();
  
  // Try to process immediately if online
  if (isOnline) {
    processOfflineQueue();
  } else {
    // Register background sync when offline
    registerBackgroundSync();
  }
}

// Helper functions for common operations
function queueCreate(collection: string, data: any, documentId?: string) {
  addToQueue({ type: 'create', collection, data, documentId });
}

function queueUpdate(collection: string, documentId: string, data: any) {
  addToQueue({ type: 'update', collection, documentId, data });
}

function queueDelete(collection: string, documentId: string) {
  addToQueue({ type: 'delete', collection, documentId });
}

// Clear the queue
function clearQueue() {
  offlineQueue = [];
  syncErrors = [];
  conflicts = [];
  saveQueueToStorage();
  notifySync('success');
}

// Resolve a manual conflict
function resolveManualConflict(conflictId: string, resolution: 'local' | 'server' | 'merge', mergedData?: any) {
  const conflictIndex = conflicts.findIndex(c => c.operation.id === conflictId);
  if (conflictIndex === -1) return;
  
  const conflict = conflicts[conflictIndex];
  conflicts = conflicts.filter((_, i) => i !== conflictIndex);
  
  if (resolution === 'local') {
    // Re-queue the operation with local data
    addToQueue({
      type: conflict.operation.type,
      collection: conflict.operation.collection,
      documentId: conflict.operation.documentId,
      data: conflict.localData
    });
  } else if (resolution === 'merge' && mergedData) {
    // Re-queue with merged data
    addToQueue({
      type: conflict.operation.type,
      collection: conflict.operation.collection,
      documentId: conflict.operation.documentId,
      data: mergedData
    });
  }
  // If 'server', we just remove the conflict and don't re-queue
}

// Export the store hook
export function useOffline() {
  return {
    // State getters
    get isOnline() { return isOnline; },
    get queueLength() { return offlineQueue.length; },
    get queue() { return offlineQueue; },
    get isSyncing() { return isSyncing; },
    get syncErrors() { return syncErrors; },
    get conflicts() { return conflicts; },
    get backgroundSyncSupported() { return backgroundSyncSupported; },
    get lastSyncAttempt() { return lastSyncAttempt; },
    
    // Actions
    addToQueue,
    queueCreate,
    queueUpdate,
    queueDelete,
    processQueue: processOfflineQueue,
    clearQueue,
    saveQueueToStorage,
    resolveManualConflict,
    registerBackgroundSync,
    
    // Configuration
    setConflictResolver: (collection: string, resolver: ConflictResolver) => {
      defaultResolvers[collection] = resolver;
    },
    
    // Computed values
    get hasQueuedOperations() { return offlineQueue.length > 0; },
    get hasSyncErrors() { return syncErrors.length > 0; },
    get hasConflicts() { return conflicts.length > 0; }
  };
}