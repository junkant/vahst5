// src/lib/utils/toast.ts
// Simple toast notification system

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

class ToastManager {
  private toasts: Toast[] = [];
  private listeners: ((toasts: Toast[]) => void)[] = [];
  
  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }
  
  subscribe(listener: (toasts: Toast[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.toasts]);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  private show(message: string, type: Toast['type'], duration = 3000) {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = { id, message, type, duration };
    
    this.toasts.push(toast);
    this.notify();
    
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }
  
  dismiss(id: string) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notify();
  }
  
  success(message: string, duration?: number) {
    this.show(message, 'success', duration);
  }
  
  error(message: string, duration?: number) {
    this.show(message, 'error', duration);
  }
  
  info(message: string, duration?: number) {
    this.show(message, 'info', duration);
  }
  
  warning(message: string, duration?: number) {
    this.show(message, 'warning', duration);
  }
  
  clear() {
    this.toasts = [];
    this.notify();
  }
}

export const toast = new ToastManager();
