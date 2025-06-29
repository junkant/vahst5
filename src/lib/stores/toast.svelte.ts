// src/lib/stores/toast.svelte.ts
import { createToaster } from '@melt-ui/svelte';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  title: string;
  description?: string;
  type: ToastType;
}

// Create the Melt UI toaster
const {
  elements,
  helpers,
  states,
  actions
} = createToaster<ToastData>();

// Helper functions with proper auto-dismiss
export const toast = {
  success(title: string, description?: string) {
    helpers.addToast({
      data: {
        title,
        description,
        type: 'success'
      },
      closeDelay: 5000 // Auto-dismiss after 5 seconds
    });
  },
  
  error(title: string, description?: string) {
    helpers.addToast({
      data: {
        title,
        description,
        type: 'error'
      },
      closeDelay: 7000 // Errors stay longer
    });
  },
  
  info(title: string, description?: string) {
    helpers.addToast({
      data: {
        title,
        description,
        type: 'info'
      },
      closeDelay: 5000
    });
  },
  
  warning(title: string, description?: string) {
    helpers.addToast({
      data: {
        title,
        description,
        type: 'warning'
      },
      closeDelay: 6000
    });
  }
};

// Export Melt UI elements and states for the component
export const toaster = elements.toaster;
export const toasts = states.toasts;