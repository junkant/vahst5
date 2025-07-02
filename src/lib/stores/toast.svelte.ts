// src/lib/stores/toast.svelte.ts
import { browser } from '$app/environment';

// Types
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  createdAt: number;
  pauseOnHover?: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
}

// Configuration
const MAX_TOASTS = 5;
const DEFAULT_DURATION = 5000;
const DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 6000,
  info: 5000,
  warning: 5000
};

class ToastStore {
  // State
  toasts = $state<Toast[]>([]);
  isPaused = $state(false);
  
  // Internal state
  private timers = new Map<string, NodeJS.Timeout>();
  private idCounter = 0;
  
  // Performance metrics in dev
  private toastCount = 0;
  private startTime = Date.now();
  
  constructor() {
    // Initialize in browser only
    if (browser) {
      this.initialize();
    }
  }
  
  private initialize() {
    // Log performance metrics in dev
    if (import.meta.env.DEV) {
      setInterval(() => {
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        console.log(`🍞 Toast Store: ${this.toastCount} toasts shown in ${uptime}s`);
      }, 60000); // Every minute
    }
    
    // Listen for page visibility changes to pause/resume toasts
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAll();
      } else {
        this.resumeAll();
      }
    });
  }
  
  // Public methods
  success(title: string, description?: string, options?: Partial<Toast>) {
    return this.show('success', title, description, options);
  }
  
  error(title: string, description?: string, options?: Partial<Toast>) {
    return this.show('error', title, description, options);
  }
  
  info(title: string, description?: string, options?: Partial<Toast>) {
    return this.show('info', title, description, options);
  }
  
  warning(title: string, description?: string, options?: Partial<Toast>) {
    return this.show('warning', title, description, options);
  }
  
  // Show a toast with automatic queue management
  private show(
    type: ToastType, 
    title: string, 
    description?: string,
    options?: Partial<Toast>
  ): string {
    // Generate unique ID
    const id = `toast-${++this.idCounter}-${Date.now()}`;
    
    // Create toast object
    const toast: Toast = {
      id,
      type,
      title,
      description,
      duration: options?.duration || DURATIONS[type],
      createdAt: Date.now(),
      pauseOnHover: options?.pauseOnHover ?? true,
      action: options?.action,
      ...options
    };
    
    // Check queue limit
    if (this.toasts.length >= MAX_TOASTS) {
      // Remove oldest non-error toast first
      const oldestIndex = this.toasts.findIndex(t => t.type !== 'error');
      if (oldestIndex !== -1) {
        this.remove(this.toasts[oldestIndex].id);
      } else {
        // If all are errors, remove the oldest one
        this.remove(this.toasts[0].id);
      }
    }
    
    // Add to queue
    this.toasts = [...this.toasts, toast];
    
    // Track metrics
    this.toastCount++;
    
    // Auto-dismiss if duration is set
    if (toast.duration && toast.duration > 0) {
      this.scheduleRemoval(id, toast.duration);
    }
    
    // Log in dev mode
    if (import.meta.env.DEV) {
      console.log(`🍞 ${this.getEmoji(type)} ${title}`, description || '');
    }
    
    return id;
  }
  
  // Remove a specific toast
  remove(id: string) {
    // Clear any existing timer
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    
    // Remove from array
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
  
  // Clear all toasts
  clear() {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    
    // Clear toasts
    this.toasts = [];
  }
  
  // Clear toasts by type
  clearByType(type: ToastType) {
    const toastsToRemove = this.toasts.filter(t => t.type === type);
    toastsToRemove.forEach(t => this.remove(t.id));
  }
  
  // Update a toast
  update(id: string, updates: Partial<Toast>) {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index !== -1) {
      this.toasts[index] = { ...this.toasts[index], ...updates };
      
      // Reschedule removal if duration changed
      if (updates.duration !== undefined) {
        const timer = this.timers.get(id);
        if (timer) {
          clearTimeout(timer);
          this.timers.delete(id);
        }
        
        if (updates.duration > 0) {
          this.scheduleRemoval(id, updates.duration);
        }
      }
    }
  }
  
  // Pause auto-dismiss for a specific toast
  pause(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
  
  // Resume auto-dismiss for a specific toast
  resume(id: string) {
    const toast = this.toasts.find(t => t.id === id);
    if (toast && toast.duration && toast.duration > 0) {
      // Calculate remaining time
      const elapsed = Date.now() - toast.createdAt;
      const remaining = Math.max(0, toast.duration - elapsed);
      
      if (remaining > 0) {
        this.scheduleRemoval(id, remaining);
      } else {
        this.remove(id);
      }
    }
  }
  
  // Pause all toasts
  private pauseAll() {
    this.isPaused = true;
    this.toasts.forEach(toast => this.pause(toast.id));
  }
  
  // Resume all toasts
  private resumeAll() {
    this.isPaused = false;
    this.toasts.forEach(toast => this.resume(toast.id));
  }
  
  // Schedule removal of a toast
  private scheduleRemoval(id: string, duration: number) {
    const timer = setTimeout(() => {
      this.remove(id);
    }, duration);
    
    this.timers.set(id, timer);
  }
  
  // Get emoji for toast type (dev mode)
  private getEmoji(type: ToastType): string {
    const emojis: Record<ToastType, string> = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };
    return emojis[type];
  }
  
  // Promise-based toast for async operations
  async promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ): Promise<T> {
    const loadingId = this.info(messages.loading, 'Please wait...', { duration: 0 });
    
    try {
      const result = await promise;
      this.remove(loadingId);
      
      const successMessage = typeof messages.success === 'function' 
        ? messages.success(result) 
        : messages.success;
      
      this.success(successMessage);
      return result;
    } catch (error) {
      this.remove(loadingId);
      
      const errorMessage = typeof messages.error === 'function'
        ? messages.error(error)
        : messages.error;
      
      this.error(errorMessage);
      throw error;
    }
  }
  
  // Cleanup method
  cleanup() {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    
    // Clear toasts
    this.toasts = [];
    
    // Reset state
    this.isPaused = false;
    
    if (import.meta.env.DEV) {
      console.log('🍞 Toast Store cleaned up');
    }
  }
}

// Export singleton instance
let toastStore: ToastStore;

export function useToast() {
  if (!toastStore) {
    toastStore = new ToastStore();
  }
  return toastStore;
}

// Export types
export type { Toast, ToastType };