// src/lib/stores/network.svelte.ts
import { browser } from '$app/environment';

interface NetworkState {
  isOnline: boolean;
  isSlowConnection: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
}

class NetworkStore {
  // Use $state for reactive properties
  #isOnline = $state<boolean>(browser ? navigator.onLine : true);
  #isSlowConnection = $state<boolean>(false);
  #effectiveType = $state<'slow-2g' | '2g' | '3g' | '4g' | undefined>(undefined);

  constructor() {
    if (browser) {
      this.initializeListeners();
      this.checkConnectionSpeed();
    }
  }

  private initializeListeners() {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.#isOnline = true;
    });

    window.addEventListener('offline', () => {
      this.#isOnline = false;
    });

    // Connection change detection
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', () => {
          this.checkConnectionSpeed();
        });
      }
    }
  }

  private checkConnectionSpeed() {
    if (!browser) return;

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.#effectiveType = connection.effectiveType;
        this.#isSlowConnection = 
          connection.effectiveType === 'slow-2g' || 
          connection.effectiveType === '2g' ||
          connection.saveData === true;
      }
    }
  }

  // Public getters using proper Svelte 5 syntax
  get isOnline(): boolean {
    return this.#isOnline;
  }

  get isSlowConnection(): boolean {
    return this.#isSlowConnection;
  }

  get effectiveType(): string | undefined {
    return this.#effectiveType;
  }
}

// Create and export singleton instance
let instance: NetworkStore;

export function useNetwork(): NetworkStore {
  if (!instance) {
    instance = new NetworkStore();
  }
  return instance;
}