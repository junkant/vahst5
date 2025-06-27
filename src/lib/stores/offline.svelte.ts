// src/lib/stores/offline.svelte.ts

interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  retries: number;
}

// Svelte 5 state using runes
let isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);
let offlineQueue = $state<OfflineOperation[]>([]);
let isSyncing = $state(false);

// Initialize function to be called from a component
function initializeOfflineStore() {
  if (typeof window !== 'undefined') {
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
    
    // Set up automatic save to localStorage
    // This will be called from a component with $effect
  }
}

// Call initialization immediately if in browser
if (typeof window !== 'undefined') {
  initializeOfflineStore();
}

// Save queue to localStorage - to be called from effect
function saveQueueToStorage() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
  }
}

// Process offline queue
async function processOfflineQueue() {
  if (!isOnline || isSyncing || offlineQueue.length === 0) return;
  
  isSyncing = true;
  
  // Process queue in order
  while (offlineQueue.length > 0 && isOnline) {
    const operation = offlineQueue[0];
    
    try {
      // Execute the operation
      await executeOperation(operation);
      
      // Remove from queue on success
      offlineQueue = offlineQueue.slice(1);
      saveQueueToStorage(); // Save after each successful operation
    } catch (error) {
      console.error('Failed to sync offline operation:', error);
      
      // Increment retry count
      operation.retries++;
      
      // Remove if too many retries
      if (operation.retries > 3) {
        console.error('Giving up on operation after 3 retries:', operation);
        offlineQueue = offlineQueue.slice(1);
      } else {
        // Move to end of queue
        offlineQueue = [...offlineQueue.slice(1), operation];
      }
      saveQueueToStorage(); // Save queue state
      
      // Stop processing on error
      break;
    }
  }
  
  isSyncing = false;
}

// Execute a queued operation
async function executeOperation(operation: OfflineOperation) {
  // This would be implemented based on your specific needs
  // For now, just simulate an async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('Executed offline operation:', operation);
}

// Add operation to queue
function addToQueue(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retries'>) {
  const newOperation: OfflineOperation = {
    ...operation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retries: 0
  };
  
  offlineQueue = [...offlineQueue, newOperation];
  saveQueueToStorage(); // Save immediately
  
  // Try to process immediately if online
  if (isOnline) {
    processOfflineQueue();
  }
}

// Clear the queue
function clearQueue() {
  offlineQueue = [];
  saveQueueToStorage();
}

// Export the store hook
export function useOffline() {
  return {
    // State getters
    get isOnline() { return isOnline; },
    get queueLength() { return offlineQueue.length; },
    get queue() { return offlineQueue; },
    get isSyncing() { return isSyncing; },
    
    // Actions
    addToQueue,
    processQueue: processOfflineQueue,
    clearQueue,
    saveQueueToStorage,
    
    // Computed values
    get hasQueuedOperations() { return offlineQueue.length > 0; }
  };
}