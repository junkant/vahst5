// src/lib/stores/index.ts
import { useAuth } from './auth.svelte';
import { useClients } from './client.svelte';
import { useJobStore } from './task.svelte';
import { useTenant } from './tenant.svelte';
import { useOffline } from './offline.svelte';
import { useNotifications } from './notifications.svelte';
import { useToast } from './toast.svelte';

// Store cleanup tracking
const activeStores = new Set<{ cleanup?: () => void; destroy?: () => void }>();

// Initialize stores in correct order
export function initializeStores() {
  const auth = useAuth();
  const tenant = useTenant();
  const clients = useClients();
  const tasks = useJobStore();
  const offline = useOffline();
  
  // Track stores for cleanup
  activeStores.add(auth);
  activeStores.add(tenant);
  activeStores.add(clients);
  activeStores.add(tasks);
  activeStores.add(offline);
  
  // Set up hierarchy - auth changes propagate down
  $effect(() => {
    // When auth changes, update tenant
    if (auth.tenant) {
      tenant.setCurrentTenant?.(auth.tenant);
    } else {
      tenant.reset?.();
    }
  });
  
  // When tenant changes, update downstream stores
  $effect(() => {
    const currentTenant = tenant.current || auth.tenant;
    
    if (currentTenant) {
      // Update client store
      clients.subscribeTenant(currentTenant.id);
      
      // Update task store
      if ('setTenant' in tasks) {
        tasks.setTenant(currentTenant.id);
      } else if ('initializeTenant' in tasks) {
        tasks.initializeTenant(currentTenant.id);
      }
    } else {
      // Clean up stores when no tenant
      clients.cleanup?.();
      tasks.cleanup?.();
    }
  });
  
  return { 
    auth, 
    tenant, 
    clients, 
    tasks, 
    offline,
    notifications: useNotifications(),
    toast: useToast()
  };
}

// Cleanup all stores
export function cleanupStores() {
  // Clean up in reverse order of initialization
  const storesToClean = Array.from(activeStores).reverse();
  
  storesToClean.forEach(store => {
    try {
      if ('destroy' in store && typeof store.destroy === 'function') {
        store.destroy();
      } else if ('cleanup' in store && typeof store.cleanup === 'function') {
        store.cleanup();
      }
    } catch (error) {
      console.error('Error cleaning up store:', error);
    }
  });
  
  // Clear the set
  activeStores.clear();
}

// Re-export individual stores
export { useAuth } from './auth.svelte';
export { useClients } from './client.svelte';
export { useJobStore } from './task.svelte';
export { useTenant } from './tenant.svelte';
export { useOffline } from './offline.svelte';
export { useNotifications } from './notifications.svelte';
export { useToast } from './toast.svelte';
export { useUI } from './ui.svelte';
export { useNetwork } from './network.svelte';
export { useVoice } from './voice.svelte';