// src/lib/stores/base.store.ts
export abstract class BaseStore {
  protected cleanup: Array<() => void> = [];
  protected initialized = false;
  
  abstract init(): void | Promise<void>;
  
  protected addCleanup(fn: () => void) {
    this.cleanup.push(fn);
  }
  
  destroy() {
    this.cleanup.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });
    this.cleanup = [];
    this.initialized = false;
    this.reset();
  }
  
  abstract reset(): void;
}