// src/lib/utils/offlineQueue.ts
// Offline queue for Firebase operations with conflict resolution

import { localCache } from './localCache';

export interface OfflineOperation {
  id: string;
  timestamp: number;
  tenantId: string;
  userId: string;
  type: 'create' | 'update' | 'delete' | 'custom';
  collection: string;
  documentId?: string;
  localId?: string; // For offline-created documents
  action?: string; // For custom operations
  data: any;
  retries: number;
  lastError?: string;
}

class OfflineQueue {
  private readonly QUEUE_KEY = 'vahst_offline_queue';
  private readonly MAX_RETRIES = 3;
  private processing = false;
  
  // Add operation to queue
  async addOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retries' | 'tenantId' | 'userId'>): Promise<void> {
    const queue = await this.getQueue();
    
    const newOperation: OfflineOperation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      tenantId: '', // Will be set by the store
      userId: '', // Will be set by the store
      retries: 0
    };
    
    queue.push(newOperation);
    await this.saveQueue(queue);
    
    // Attempt to process immediately if online
    if (navigator.onLine) {
      this.processQueue('', ''); // Tenant and user will be provided by caller
    }
  }
  
  // Get queue from local storage
  private async getQueue(): Promise<OfflineOperation[]> {
    try {
      const stored = localStorage.getItem(this.QUEUE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error reading offline queue:', error);
    }
    return [];
  }
  
  // Save queue to local storage
  private async saveQueue(queue: OfflineOperation[]): Promise<void> {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
      
      // If storage is full, remove oldest operations
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        const trimmedQueue = queue.slice(-50); // Keep last 50 operations
        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(trimmedQueue));
      }
    }
  }
  
  // Process queued operations
  async processQueue(tenantId: string, userId: string): Promise<void> {
    if (this.processing || !navigator.onLine) return;
    
    this.processing = true;
    
    try {
      const queue = await this.getQueue();
      const remainingOperations: OfflineOperation[] = [];
      
      for (const operation of queue) {
        // Skip operations from other tenants
        if (operation.tenantId && operation.tenantId !== tenantId) {
          remainingOperations.push(operation);
          continue;
        }
        
        // Update tenant and user if not set
        if (!operation.tenantId) {
          operation.tenantId = tenantId;
          operation.userId = userId;
        }
        
        try {
          await this.processOperation(operation);
          console.log(`Processed offline operation: ${operation.type} ${operation.collection}`);
        } catch (error) {
          console.error('Error processing operation:', error);
          
          operation.retries++;
          operation.lastError = error instanceof Error ? error.message : 'Unknown error';
          
          if (operation.retries < this.MAX_RETRIES) {
            remainingOperations.push(operation);
          } else {
            console.error(`Dropping operation after ${this.MAX_RETRIES} retries:`, operation);
            
            // Store failed operations for manual review
            await this.storeFailedOperation(operation);
          }
        }
      }
      
      await this.saveQueue(remainingOperations);
    } finally {
      this.processing = false;
    }
  }
  
  // Process individual operation
  private async processOperation(operation: OfflineOperation): Promise<void> {
    // Import Firebase functions dynamically to avoid circular dependencies
    const { createTask, updateTask, deleteTask, addTaskPhoto, addTaskNote } = await import('$lib/firebase/tasks');
    
    switch (operation.type) {
      case 'create':
        if (operation.collection === 'tasks' || operation.collection === 'jobs') {
          const newTask = await createTask(
            operation.tenantId,
            operation.data,
            operation.userId
          );
          
          // Update local references if needed
          if (operation.localId) {
            await this.updateLocalReferences(operation.localId, newTask.id);
          }
        }
        break;
        
      case 'update':
        if ((operation.collection === 'tasks' || operation.collection === 'jobs') && operation.documentId) {
          await updateTask(
            operation.tenantId,
            operation.documentId,
            operation.data,
            operation.userId
          );
        }
        break;
        
      case 'delete':
        if ((operation.collection === 'tasks' || operation.collection === 'jobs') && operation.documentId) {
          await deleteTask(
            operation.tenantId,
            operation.documentId,
            operation.userId
          );
        }
        break;
        
      case 'custom':
        if ((operation.collection === 'tasks' || operation.collection === 'jobs') && operation.documentId) {
          switch (operation.action) {
            case 'addPhoto':
              // Upload photo to Firebase Storage first
              const { photo, imageBlob } = operation.data;
              // TODO: Upload to Firebase Storage
              await addTaskPhoto(
                operation.tenantId,
                operation.documentId,
                photo,
                operation.userId
              );
              break;
              
            case 'addNote':
              await addTaskNote(
                operation.tenantId,
                operation.documentId,
                operation.data,
                operation.userId
              );
              break;
          }
        }
        break;
    }
  }
  
  // Update local references after successful sync
  private async updateLocalReferences(localId: string, remoteId: string): Promise<void> {
    // Update any cached data that references the local ID
    const queue = await this.getQueue();
    const updatedQueue = queue.map(op => {
      if (op.documentId === localId) {
        return { ...op, documentId: remoteId };
      }
      return op;
    });
    await this.saveQueue(updatedQueue);
  }
  
  // Store failed operations for manual review
  private async storeFailedOperation(operation: OfflineOperation): Promise<void> {
    const FAILED_KEY = 'vahst_failed_operations';
    try {
      const stored = localStorage.getItem(FAILED_KEY);
      const failed = stored ? JSON.parse(stored) : [];
      failed.push({
        ...operation,
        failedAt: new Date().toISOString()
      });
      
      // Keep only last 100 failed operations
      const trimmed = failed.slice(-100);
      localStorage.setItem(FAILED_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Error storing failed operation:', error);
    }
  }
  
  // Get failed operations for review
  async getFailedOperations(): Promise<Array<OfflineOperation & { failedAt: string }>> {
    const FAILED_KEY = 'vahst_failed_operations';
    try {
      const stored = localStorage.getItem(FAILED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading failed operations:', error);
      return [];
    }
  }
  
  // Clear failed operations
  async clearFailedOperations(): Promise<void> {
    localStorage.removeItem('vahst_failed_operations');
  }
  
  // Get queue size
  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }
  
  // Clear entire queue (use with caution)
  async clearQueue(): Promise<void> {
    await this.saveQueue([]);
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();
