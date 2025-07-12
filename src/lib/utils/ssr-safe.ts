// src/lib/utils/ssr-safe.ts
// SSR-safe store initialization utilities
import { browser } from '$app/environment';

/**
 * Safely initialize stores on client-side only
 * Prevents SSR errors when stores use browser APIs
 */
export function clientOnly<T>(fn: () => T): T | null {
  if (browser) {
    return fn();
  }
  return null;
}

/**
 * Safe cleanup function that checks if method exists
 * Prevents errors during SSR or when store isn't initialized
 */
export function safeCleanup(store: any, cleanupMethod = 'cleanup'): void {
  if (store && typeof store[cleanupMethod] === 'function') {
    store[cleanupMethod]();
  }
}

/**
 * Create a store initialization function that's SSR-safe
 */
export function createSSRSafeStore<T>(
  createFn: () => T,
  cleanupFn?: (store: T) => void
): {
  get: () => T | null;
  cleanup: () => void;
} {
  let store: T | null = null;
  
  return {
    get() {
      if (browser && !store) {
        store = createFn();
      }
      return store;
    },
    
    cleanup() {
      if (store) {
        if (cleanupFn) {
          cleanupFn(store);
        } else if (typeof (store as any).cleanup === 'function') {
          (store as any).cleanup();
        }
        store = null;
      }
    }
  };
}