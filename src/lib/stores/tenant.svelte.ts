// src/lib/stores/tenant.svelte.ts
// Tenant store that works without importing auth store

export interface Tenant {
  id: string;
  name: string;
  type?: string | null;
  plan?: 'starter' | 'professional' | 'enterprise';
  settings: any;
  limits?: {
    users: number;
    clients: string;
    jobs: string;
    storage?: number;
  };
  createdAt: Date;
  updatedAt?: Date;
  ownerId: string;
}

// This is a placeholder store that will be replaced by auth store values at runtime
export function useTenant() {
  // We'll use a trick to get the auth store without importing it
  // The auth store will be available in the global scope by the time this runs
  
  const getAuthStore = () => {
    // This will be replaced at runtime with actual auth store
    if (typeof window !== 'undefined' && (window as any).__authStore) {
      return (window as any).__authStore;
    }
    
    // Fallback - return stub values
    return {
      tenant: null,
      tenants: [],
      isLoading: false,
      error: null,
      user: null,
      hasTenant: false,
      isOwner: false,
      setTenant: async () => {},
      createBusiness: async () => {},
      updateTenant: async () => {},
    };
  };
  
  return {
    get current() {
      return getAuthStore().tenant;
    },
    
    get all() {
      return getAuthStore().tenants;
    },
    
    get isLoading() {
      return getAuthStore().isLoading;
    },
    
    get error() {
      return getAuthStore().error;
    },
    
    get userRole() {
      const store = getAuthStore();
      if (!store.tenant || !store.user) return null;
      return store.tenant.ownerId === store.user.uid ? 'owner' : 'member';
    },
    
    get hasTenant() {
      return getAuthStore().hasTenant;
    },
    
    get isOwner() {
      return getAuthStore().isOwner;
    },
    
    async switch(tenantId: string) {
      const store = getAuthStore();
      const tenant = store.tenants.find((t: Tenant) => t.id === tenantId);
      if (tenant) {
        await store.setTenant(tenant);
      } else {
        throw new Error('Tenant not found');
      }
    },
    
    async create(tenantData: Partial<Tenant>) {
      const store = getAuthStore();
      return store.createBusiness(tenantData.name || 'New Business', tenantData.type);
    },
    
    async update(tenantId: string, updates: Partial<Tenant>) {
      const store = getAuthStore();
      return store.updateTenant(tenantId, updates);
    },
    
    hasPermission(permission: string): boolean {
      return getAuthStore().isOwner;
    },
    
    getUserRole(tenantId?: string): string | null {
      const store = getAuthStore();
      const id = tenantId || store.tenant?.id;
      if (!id) return null;
      
      const tenant = store.tenants.find((t: Tenant) => t.id === id);
      if (!tenant) return null;
      
      return tenant.ownerId === store.user?.uid ? 'owner' : 'member';
    },
    
    cleanup() {
      // No-op
    },
    
    initialize() {
      // No-op
    }
  };
}

// Helper to register auth store globally (call this from your auth store)
export function registerAuthStore(authStore: any) {
  if (typeof window !== 'undefined') {
    (window as any).__authStore = authStore;
  }
}