// Effect cleanup utility for Svelte 5
import { onDestroy } from 'svelte';

/**
 * Utility for managing cleanup functions in Svelte 5 components
 * Helps prevent memory leaks and HMR issues
 */
export class EffectCleanup {
  private cleanups: (() => void)[] = [];
  private isDestroyed = false;
  
  constructor(autoDestroy = true) {
    if (autoDestroy) {
      // Automatically clean up when component is destroyed
      onDestroy(() => this.destroy());
    }
  }
  
  /**
   * Add a cleanup function
   */
  add(cleanup: (() => void) | void | undefined): void {
    if (this.isDestroyed) {
      console.warn('Attempted to add cleanup after destruction');
      return;
    }
    
    if (typeof cleanup === 'function') {
      this.cleanups.push(cleanup);
    }
  }
  
  /**
   * Add a timeout and automatically clean it up
   */
  addTimeout(id: ReturnType<typeof setTimeout>): void {
    this.add(() => clearTimeout(id));
  }
  
  /**
   * Add an interval and automatically clean it up
   */
  addInterval(id: ReturnType<typeof setInterval>): void {
    this.add(() => clearInterval(id));
  }
  
  /**
   * Add an event listener and automatically remove it
   */
  addEventListener<T extends EventTarget>(
    target: T,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ): void {
    target.addEventListener(event, handler, options);
    this.add(() => target.removeEventListener(event, handler, options));
  }
  
  /**
   * Add a store subscription and automatically unsubscribe
   */
  addSubscription(unsubscribe: (() => void) | undefined): void {
    if (typeof unsubscribe === 'function') {
      this.add(unsubscribe);
    }
  }
  
  /**
   * Clean up all registered functions
   */
  destroy(): void {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    
    // Run cleanups in reverse order (LIFO)
    for (let i = this.cleanups.length - 1; i >= 0; i--) {
      try {
        this.cleanups[i]();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }
    
    this.cleanups = [];
  }
}

/**
 * Create an effect cleanup manager for the current component
 */
export function createCleanup(autoDestroy = true): EffectCleanup {
  return new EffectCleanup(autoDestroy);
}

/**
 * Safe effect wrapper that ensures cleanup
 */
export function safeEffect(
  fn: () => (() => void) | void,
  cleanup?: EffectCleanup
): void {
  const cleanupManager = cleanup || new EffectCleanup();
  
  $effect(() => {
    const result = fn();
    if (typeof result === 'function') {
      cleanupManager.add(result);
    }
  });
}
