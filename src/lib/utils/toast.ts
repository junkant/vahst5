// src/lib/utils/toast.ts
import { createToaster } from '@melt-ui/svelte';
import { get } from 'svelte/store';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastData {
  message: string;
  type: ToastType;
}

// Create the Melt UI toaster instance
const toasterInstance = createToaster<ToastData>();

// Export elements for the UI component
export const toasterElements = toasterInstance.elements;
export const toasterStates = toasterInstance.states;

class OptimizedToast {
  private toaster = toasterInstance;
  private isInitialized = false;
  
  // Console emojis for fallback/debugging
  private emojis = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };
  
  // Duration configuration
  private durations = {
    success: 5000,
    error: 7000,
    info: 5000,
    warning: 6000
  };

  constructor() {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      this.isInitialized = true;
    }
  }

  success(message: string) {
    this.show('success', message);
  }
  
  error(message: string) {
    this.show('error', message);
  }
  
  info(message: string) {
    this.show('info', message);
  }
  
  warning(message: string) {
    this.show('warning', message);
  }
  
  private show(type: ToastType, message: string) {
    // Always log to console for debugging
    if (import.meta.env.DEV) {
      console.log(`${this.emojis[type]} ${message}`);
    }
    
    // Show toast if initialized (in browser)
    if (this.isInitialized && this.toaster) {
      try {
        this.toaster.helpers.addToast({
          data: {
            message,
            type
          },
          closeDelay: this.durations[type]
        });
      } catch (error) {
        // Fallback to console if toast system fails
        console.warn('Toast system error:', error);
        console.log(`${this.emojis[type]} ${message}`);
      }
    }
  }
  
  // Helper method to clear all toasts
  clear() {
    if (this.isInitialized && this.toaster) {
      const currentToasts = get(this.toaster.states.toasts);
      currentToasts.forEach(toast => {
        this.toaster.helpers.removeToast(toast.id);
      });
    }
  }
}

// Export singleton instance
export const toast = new OptimizedToast();