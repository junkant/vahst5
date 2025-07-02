// src/lib/stores/toast.svelte.ts
import { createToaster, type ToastT } from '@melt-ui/svelte';

const MAX_TOASTS = 5;
const TOAST_DURATION = 5000;

type ToastData = {
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info' | 'warning';
};

class ToastStore {
  private toaster = createToaster<ToastData>();
  
  get states() {
    return this.toaster.states;
  }
  
  get helpers() {
    return this.toaster.helpers;
  }
  
  private show(type: ToastData['type'], message: string, description?: string) {
    // Limit toast queue to prevent memory issues
    const currentToasts = get(this.toaster.states.toasts);
    if (currentToasts.length >= MAX_TOASTS) {
      // Remove oldest toast
      this.toaster.helpers.removeToast(currentToasts[0].id);
    }
    
    this.toaster.helpers.addToast({
      data: {
        title: message,
        description,
        type
      },
      duration: TOAST_DURATION
    });
  }
  
  success(message: string, description?: string) {
    this.show('success', message, description);
  }
  
  error(message: string, description?: string) {
    this.show('error', message, description);
  }
  
  info(message: string, description?: string) {
    this.show('info', message, description);
  }
  
  warning(message: string, description?: string) {
    this.show('warning', message, description);
  }
  
  // Clear all toasts
  clearAll() {
    const currentToasts = get(this.toaster.states.toasts);
    currentToasts.forEach(toast => {
      this.toaster.helpers.removeToast(toast.id);
    });
  }
}

// Export singleton instance
export const toastStore = new ToastStore();
export const useToast = () => toastStore;