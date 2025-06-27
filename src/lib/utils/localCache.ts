// src/lib/utils/localCache.ts
import type { Client } from '$lib/types';

const DB_NAME = 'vahst-offline-db';
const DB_VERSION = 1;

interface CachedData<T = any> {
  id: string;
  data: T;
  timestamp: number;
  tenantId: string;
}

class LocalCache {
  private db: IDBDatabase | null = null;

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
        const stores = ['clients', 'jobs', 'invoices', 'team'];
        
        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('tenantId', 'tenantId', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
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

  // Generic methods for any collection
  async set<T>(storeName: string, id: string, data: T, tenantId: string): Promise<void> {
    const db = await this.getDb();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    const cachedData: CachedData<T> = {
      id,
      data,
      timestamp: Date.now(),
      tenantId
    };

    return new Promise((resolve, reject) => {
      const request = store.put(cachedData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | null> {
    const db = await this.getDb();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result as CachedData<T> | undefined;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string, tenantId: string): Promise<T[]> {
    const db = await this.getDb();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index('tenantId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(tenantId);
      request.onsuccess = () => {
        const results = request.result as CachedData<T>[];
        resolve(results.map(r => r.data));
      };
      request.onerror = () => reject(request.error);
    });
  }

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

  // Convenience methods for specific collections
  async setClient(client: Client, tenantId: string): Promise<void> {
    return this.set('clients', client.id, client, tenantId);
  }

  async getClient(id: string): Promise<Client | null> {
    return this.get<Client>('clients', id);
  }

  async getAllClients(tenantId: string): Promise<Client[]> {
    return this.getAll<Client>('clients', tenantId);
  }

  // Clean up old cached data
  async cleanOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const db = await this.getDb();
    const stores = ['clients', 'jobs', 'invoices', 'team'];
    const cutoffTime = Date.now() - maxAge;

    for (const storeName of stores) {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index('timestamp');

      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    }
  }
}

// Export singleton instance
export const localCache = new LocalCache();

// Initialize on import
if (typeof window !== 'undefined') {
  localCache.init().catch(console.error);
}