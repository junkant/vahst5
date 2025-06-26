import { writable } from 'svelte/store';
import type { Readable } from 'svelte/store';

function createOfflineStore() {
  const { subscribe, set } = writable<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : false);

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => set(true));
    window.addEventListener('offline', () => set(false));
  }

  return { subscribe };
}

let offlineStore: ReturnType<typeof createOfflineStore>;

/**
 * Returns a Readable<boolean> that tracks navigator.onLine.
 */
export function useOffline(): Readable<boolean> {
  if (!offlineStore) {
    offlineStore = createOfflineStore();
  }
  return offlineStore;
}
