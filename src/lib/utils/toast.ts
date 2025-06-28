// src/lib/utils/toast.ts
// Lightweight toast utility with no external dependencies

type ToastType = 'success' | 'error' | 'info' | 'warning';

class SimpleToast {
  success(message: string) {
    this.log('success', message);
  }
  
  error(message: string) {
    this.log('error', message);
  }
  
  info(message: string) {
    this.log('info', message);
  }
  
  warning(message: string) {
    this.log('warning', message);
  }
  
  private log(type: ToastType, message: string) {
    // Simple console logging for now
    // This keeps the app working without external dependencies
    const emoji = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };
    
    console.log(`${emoji[type]} ${message}`);
    
    // You can later replace this with a custom Svelte component
    // that shows actual toast notifications in your UI
  }
}

export const toast = new SimpleToast();