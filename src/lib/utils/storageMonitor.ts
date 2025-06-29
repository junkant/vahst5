// src/lib/utils/storageMonitor.ts
import { browser } from '$app/environment';

export interface StorageInfo {
  used: number;
  quota: number;
  percentage: number;
  breakdown: {
    indexedDB: number;
    cache: number;
    localStorage: number;
  };
}

export interface StorageBreakdown {
  clients: number;
  jobs: number;
  invoices: number;
  images: number;
  total: number;
}

class StorageMonitor {
  private DB_NAME = 'vahst-offline-db';

  // Get overall storage usage
  async getStorageInfo(): Promise<StorageInfo | null> {
    if (!browser || !navigator.storage?.estimate) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      
      const breakdown = await this.getStorageBreakdown();
      
      return {
        used,
        quota,
        percentage: quota > 0 ? (used / quota) * 100 : 0,
        breakdown: {
          indexedDB: breakdown.total,
          cache: await this.getCacheSize(),
          localStorage: this.getLocalStorageSize()
        }
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }

  // Get IndexedDB breakdown by collection
  async getStorageBreakdown(): Promise<StorageBreakdown> {
    const breakdown: StorageBreakdown = {
      clients: 0,
      jobs: 0,
      invoices: 0,
      images: 0,
      total: 0
    };

    try {
      const db = await this.openDB();
      const stores = ['clients', 'jobs', 'invoices', 'team'];
      
      for (const storeName of stores) {
        if (db.objectStoreNames.contains(storeName)) {
          const size = await this.getStoreSize(db, storeName);
          breakdown[storeName as keyof StorageBreakdown] = size;
          breakdown.total += size;
        }
      }
      
      db.close();
    } catch (error) {
      console.error('Error getting storage breakdown:', error);
    }

    return breakdown;
  }

  // Get size of a specific object store
  private async getStoreSize(db: IDBDatabase, storeName: string): Promise<number> {
    return new Promise((resolve) => {
      let size = 0;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          // Estimate size by serializing the data
          const dataSize = new Blob([JSON.stringify(cursor.value)]).size;
          size += dataSize;
          cursor.continue();
        } else {
          resolve(size);
        }
      };

      request.onerror = () => resolve(0);
    });
  }

  // Get cache storage size
  private async getCacheSize(): Promise<number> {
    if (!browser || !caches) return 0;

    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }

  // Get localStorage size
  private getLocalStorageSize(): number {
    if (!browser) return 0;

    let size = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage[key].length + key.length;
      }
    }
    return size * 2; // Multiply by 2 for UTF-16 encoding
  }

  // Clear specific data types
  async clearCache(type: 'all' | 'old' | 'images'): Promise<void> {
    switch (type) {
      case 'all':
        await this.clearAllCache();
        break;
      case 'old':
        await this.clearOldData();
        break;
      case 'images':
        await this.clearImageCache();
        break;
    }
  }

  private async clearAllCache(): Promise<void> {
    // Clear IndexedDB (except essential data)
    const db = await this.openDB();
    const stores = ['clients', 'jobs', 'invoices'];
    
    for (const storeName of stores) {
      if (db.objectStoreNames.contains(storeName)) {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        await store.clear();
      }
    }
    
    db.close();

    // Clear caches
    if (caches) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  }

  private async clearOldData(): Promise<void> {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const db = await this.openDB();
    const stores = ['jobs', 'invoices'];
    
    for (const storeName of stores) {
      if (db.objectStoreNames.contains(storeName)) {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const index = store.index('timestamp');
        
        const range = IDBKeyRange.upperBound(thirtyDaysAgo);
        const request = index.openCursor(range);
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      }
    }
    
    db.close();
  }

  private async clearImageCache(): Promise<void> {
    if (!caches) return;
    
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      if (cacheName.includes('images') || cacheName.includes('photos')) {
        await caches.delete(cacheName);
      }
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Format bytes to human readable
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Check if storage is getting full
  isStorageLow(info: StorageInfo): boolean {
    return info.percentage > 80;
  }

  // Request persistent storage
  async requestPersistentStorage(): Promise<boolean> {
    if (!browser || !navigator.storage?.persist) {
      return false;
    }

    try {
      return await navigator.storage.persist();
    } catch (error) {
      console.error('Error requesting persistent storage:', error);
      return false;
    }
  }
}

export const storageMonitor = new StorageMonitor();