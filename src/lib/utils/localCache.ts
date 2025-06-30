// src/lib/utils/localCache.ts
import type { Client } from '$lib/firebase/firestore';
import type { Job } from '$lib/firebase/firestore';
import { imageCompressor } from './imageCompressor';

const DB_NAME = 'vahst-offline-db';
const DB_VERSION = 2; // Increment version for new indexes

interface CachedData<T = any> {
  id: string;
  data: T;
  timestamp: number;
  tenantId: string;
  size?: number; // Track size of cached data
}

interface CacheOptions {
  maxAge?: number; // Max age in milliseconds
  maxItems?: number; // Max number of items to cache
  compress?: boolean; // Whether to compress data
}

class LocalCache {
  private db: IDBDatabase | null = null;
  private readonly DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly JOB_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores for different data types
        const stores = ['clients', 'jobs', 'invoices', 'team', 'images'];
        
        stores.forEach(storeName => {
          let store: IDBObjectStore;
          
          if (!db.objectStoreNames.contains(storeName)) {
            store = db.createObjectStore(storeName, { keyPath: 'id' });
          } else {
            store = (event.currentTarget as IDBOpenDBRequest).transaction!.objectStore(storeName);
          }
          
          // Create indexes
          if (!store.indexNames.contains('tenantId')) {
            store.createIndex('tenantId', 'tenantId', { unique: false });
          }
          if (!store.indexNames.contains('timestamp')) {
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
          
          // Add date index for jobs
          if (storeName === 'jobs' && !store.indexNames.contains('scheduledDate')) {
            store.createIndex('scheduledDate', 'data.scheduledDate', { unique: false });
          }
        });
      };
    });
  }

  async getDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  // Generic methods with size tracking
  async set<T>(
    storeName: string, 
    id: string, 
    data: T, 
    tenantId: string,
    options: CacheOptions = {}
  ): Promise<void> {
    const db = await this.getDb();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    // Calculate data size
    const dataStr = JSON.stringify(data);
    const size = new Blob([dataStr]).size;

    const cachedData: CachedData<T> = {
      id,
      data,
      timestamp: Date.now(),
      tenantId,
      size
    };

    return new Promise((resolve, reject) => {
      const request = store.put(cachedData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get with age check
  async get<T>(
    storeName: string, 
    id: string,
    maxAge?: number
  ): Promise<T | null> {
    const db = await this.getDb();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result as CachedData<T> | undefined;
        
        if (!result) {
          resolve(null);
          return;
        }

        // Check age if specified
        if (maxAge && Date.now() - result.timestamp > maxAge) {
          resolve(null);
          return;
        }

        resolve(result.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get all with filtering and pagination
  async getAll<T>(
    storeName: string, 
    tenantId: string,
    options: {
      maxAge?: number;
      limit?: number;
      offset?: number;
      orderBy?: 'timestamp' | 'scheduledDate';
      direction?: 'prev' | 'next';
    } = {}
  ): Promise<T[]> {
    const db = await this.getDb();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index('tenantId');

    return new Promise((resolve, reject) => {
      const results: T[] = [];
      const maxAge = options.maxAge || this.getMaxAge(storeName);
      const cutoffTime = Date.now() - maxAge;
      
      let count = 0;
      const offset = options.offset || 0;
      const limit = options.limit || Infinity;

      const request = index.openCursor(
        IDBKeyRange.only(tenantId),
        options.direction || 'next'
      );

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const cached = cursor.value as CachedData<T>;
          
          // Check age
          if (cached.timestamp >= cutoffTime) {
            // Skip until offset
            if (count >= offset && results.length < limit) {
              results.push(cached.data);
            }
            count++;
          }
          
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Delete a specific item
  async delete(storeName: string, id: string): Promise<void> {
    const db = await this.getDb();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Clear entire store
  async clear(storeName: string): Promise<void> {
    const db = await this.getDb();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ✅ ENHANCED: Client-specific methods with proper Date handling and deep serialization
  async setClient(client: Client, tenantId: string): Promise<void> {
    try {
      // Create a deeply serializable version of the client for IndexedDB
      const serializableClient = this.makeSerializable({
        ...client,
        createdAt: client.createdAt instanceof Date ? client.createdAt.toISOString() : client.createdAt,
        updatedAt: client.updatedAt instanceof Date ? client.updatedAt.toISOString() : client.updatedAt,
        lastServiceDate: client.lastServiceDate 
          ? (client.lastServiceDate instanceof Date ? client.lastServiceDate.toISOString() : client.lastServiceDate)
          : null,
        // Ensure tags is a simple array of strings
        tags: Array.isArray(client.tags) ? client.tags.filter(tag => typeof tag === 'string') : [],
        // Ensure customFields is a plain object
        customFields: client.customFields ? JSON.parse(JSON.stringify(client.customFields)) : {}
      });
      
      return this.set('clients', client.id, serializableClient, tenantId);
    } catch (error) {
      console.warn('Failed to cache client:', error);
      throw error;
    }
  }

  async getClient(id: string): Promise<Client | null> {
    const client = await this.get<any>('clients', id);
    if (!client) return null;

    // Convert back to proper Client object with Date instances
    return {
      ...client,
      createdAt: typeof client.createdAt === 'string' ? new Date(client.createdAt) : client.createdAt,
      updatedAt: typeof client.updatedAt === 'string' ? new Date(client.updatedAt) : client.updatedAt,
      lastServiceDate: client.lastServiceDate 
        ? (typeof client.lastServiceDate === 'string' ? new Date(client.lastServiceDate) : client.lastServiceDate)
        : null
    } as Client;
  }

  async getAllClients(tenantId: string): Promise<Client[]> {
    try {
      const cachedClients = await this.getAll<any>('clients', tenantId);
      
      // Convert back to proper Client objects with Date instances
      return cachedClients.map(client => ({
        ...client,
        createdAt: typeof client.createdAt === 'string' ? new Date(client.createdAt) : client.createdAt,
        updatedAt: typeof client.updatedAt === 'string' ? new Date(client.updatedAt) : client.updatedAt,
        lastServiceDate: client.lastServiceDate 
          ? (typeof client.lastServiceDate === 'string' ? new Date(client.lastServiceDate) : client.lastServiceDate)
          : null
      })) as Client[];
    } catch (error) {
      console.warn('Failed to load cached clients:', error);
      return [];
    }
  }

  // ✅ ENHANCED: Job-specific methods with 30-day limit and Date handling
  async setJob(job: Job, tenantId: string): Promise<void> {
    try {
      // Create a serializable version of the job
      const serializableJob = this.makeSerializable({
        ...job,
        scheduledDate: job.scheduledDate instanceof Date ? job.scheduledDate.toISOString() : job.scheduledDate,
        completedDate: job.completedDate instanceof Date ? job.completedDate.toISOString() : job.completedDate
      });
      
      return this.set('jobs', job.id, serializableJob, tenantId);
    } catch (error) {
      console.warn('Failed to cache job:', error);
      throw error;
    }
  }

  async getRecentJobs(tenantId: string, days: number = 30): Promise<Job[]> {
    try {
      const maxAge = days * 24 * 60 * 60 * 1000;
      const cachedJobs = await this.getAll<any>('jobs', tenantId, { maxAge });
      
      // Convert back to proper Job objects with Date instances
      return cachedJobs.map(job => ({
        ...job,
        scheduledDate: job.scheduledDate ? new Date(job.scheduledDate) : undefined,
        completedDate: job.completedDate ? new Date(job.completedDate) : undefined
      })) as Job[];
    } catch (error) {
      console.warn('Failed to load cached jobs:', error);
      return [];
    }
  }

  // ✅ NEW: Generic cacheData method for backward compatibility
  async cacheData<T>(
    collection: string, 
    id: string, 
    data: T, 
    tenantId: string
  ): Promise<void> {
    return this.set(collection, id, data, tenantId);
  }

  // ✅ NEW: Remove data method for cleanup
  async removeData(collection: string, id: string, tenantId: string): Promise<void> {
    return this.delete(collection, id);
  }

  // Image caching with compression
  async cacheImage(
    id: string,
    file: File | Blob,
    tenantId: string,
    thumbnail: boolean = true
  ): Promise<void> {
    const db = await this.getDb();
    
    // Compress image
    const compressed = await imageCompressor.compressImage(file, {
      maxWidth: thumbnail ? 400 : 1920,
      maxHeight: thumbnail ? 400 : 1080,
      quality: thumbnail ? 0.7 : 0.85
    });

    // Store compressed image
    const transaction = db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');

    const cachedData: CachedData<string> = {
      id,
      data: compressed.dataUrl,
      timestamp: Date.now(),
      tenantId,
      size: compressed.size
    };

    return new Promise((resolve, reject) => {
      const request = store.put(cachedData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Clean up old cached data with progress callback
  async cleanOldData(
    onProgress?: (progress: number, store: string) => void
  ): Promise<number> {
    const db = await this.getDb();
    const stores = ['clients', 'jobs', 'invoices', 'team', 'images'];
    let totalDeleted = 0;

    for (let i = 0; i < stores.length; i++) {
      const storeName = stores[i];
      const maxAge = this.getMaxAge(storeName);
      const cutoffTime = Date.now() - maxAge;

      const deletedCount = await this.cleanStore(db, storeName, cutoffTime);
      totalDeleted += deletedCount;

      if (onProgress) {
        onProgress(((i + 1) / stores.length) * 100, storeName);
      }
    }

    return totalDeleted;
  }

  // Clean a specific store
  private async cleanStore(
    db: IDBDatabase,
    storeName: string,
    cutoffTime: number
  ): Promise<number> {
    return new Promise((resolve) => {
      let deletedCount = 0;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index('timestamp');

      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve(deletedCount);
    });
  }

  // Get storage size for a specific tenant
  async getTenantStorageSize(tenantId: string): Promise<number> {
    const db = await this.getDb();
    const stores = ['clients', 'jobs', 'invoices', 'team', 'images'];
    let totalSize = 0;

    for (const storeName of stores) {
      if (db.objectStoreNames.contains(storeName)) {
        const size = await this.getStoreSize(db, storeName, tenantId);
        totalSize += size;
      }
    }

    return totalSize;
  }

  private async getStoreSize(
    db: IDBDatabase,
    storeName: string,
    tenantId: string
  ): Promise<number> {
    return new Promise((resolve) => {
      let size = 0;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index('tenantId');
      const request = index.openCursor(IDBKeyRange.only(tenantId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const cached = cursor.value as CachedData;
          size += cached.size || 0;
          cursor.continue();
        } else {
          resolve(size);
        }
      };

      request.onerror = () => resolve(0);
    });
  }

  // Get max age for different stores
  private getMaxAge(storeName: string): number {
    switch (storeName) {
      case 'jobs':
        return this.JOB_MAX_AGE; // 30 days for jobs
      case 'images':
        return 14 * 24 * 60 * 60 * 1000; // 14 days for images
      default:
        return this.DEFAULT_MAX_AGE; // 7 days for others
    }
  }

  // Clear all data for a tenant
  async clearTenantData(tenantId: string): Promise<void> {
    const db = await this.getDb();
    const stores = ['clients', 'jobs', 'invoices', 'team', 'images'];

    for (const storeName of stores) {
      if (db.objectStoreNames.contains(storeName)) {
        await this.clearTenantStore(db, storeName, tenantId);
      }
    }
  }

  // ✅ NEW: Deep serialization helper to handle complex objects
  private makeSerializable(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.makeSerializable(item));
    }
    
    if (typeof obj === 'object') {
      // Handle plain objects only
      if (obj.constructor === Object || obj.constructor === undefined) {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = this.makeSerializable(value);
        }
        return result;
      }
      // For non-plain objects, try to convert to string or return null
      return obj.toString ? obj.toString() : null;
    }
    
    // Primitive values (string, number, boolean)
    return obj;
  }

  private async clearTenantStore(
    db: IDBDatabase,
    storeName: string,
    tenantId: string
  ): Promise<void> {
    return new Promise((resolve) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index('tenantId');
      const request = index.openCursor(IDBKeyRange.only(tenantId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
    });
  }
}

// Export singleton instance
export const localCache = new LocalCache();

// Initialize on import
if (typeof window !== 'undefined') {
  localCache.init().catch(console.error);
}