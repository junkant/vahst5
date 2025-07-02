// src/lib/utils/cleanup.ts
export class CleanupManager {
  private cleanups: (() => void)[] = [];
  
  add(cleanup: () => void) {
    this.cleanups.push(cleanup);
  }
  
  addTimeout(id: ReturnType<typeof setTimeout>) {
    this.add(() => clearTimeout(id));
  }
  
  addInterval(id: ReturnType<typeof setInterval>) {
    this.add(() => clearInterval(id));
  }
  
  addEventListener(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ) {
    target.addEventListener(event, handler, options);
    this.add(() => target.removeEventListener(event, handler, options));
  }
  
  cleanup() {
    this.cleanups.forEach(fn => fn());
    this.cleanups = [];
  }
}

// Usage:
// const cleanup = new CleanupManager();
// cleanup.addEventListener(window, 'resize', handleResize);
// $effect(() => () => cleanup.cleanup());