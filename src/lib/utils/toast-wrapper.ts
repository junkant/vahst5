// Toast wrapper for non-component files
// This provides a way to use the toast system from regular TypeScript files

import { useToast } from '$lib/stores/toast.svelte';
import { browser } from '$app/environment';

// Create a singleton instance
const toastInstance = browser ? useToast() : null;

export const toast = {
  success(title: string, description?: string) {
    if (toastInstance) {
      toastInstance.success(title, description);
    }
  },
  
  error(title: string, description?: string) {
    if (toastInstance) {
      toastInstance.error(title, description);
    }
  },
  
  info(title: string, description?: string) {
    if (toastInstance) {
      toastInstance.info(title, description);
    }
  },
  
  warning(title: string, description?: string) {
    if (toastInstance) {
      toastInstance.warning(title, description);
    }
  }
};
