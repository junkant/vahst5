import { browser } from '$app/environment';
import { subscribeToAuthState } from '$lib/firebase/auth';
import { getUserTenants } from '$lib/firebase/firestore';
import { writable } from 'svelte/store';

const user = writable(null);
const tenant = writable(null);
const tenants = writable([]);
const isLoading = writable(true);

if (browser) {
  subscribeToAuthState(async (u) => {
    user.set(u);
    if (u) {
      const tenantList = await getUserTenants(u.uid);
      tenants.set(tenantList);

      if (tenantList.length > 0) {
        tenant.set(tenantList[0]);
        localStorage.setItem('selectedTenantId', tenantList[0].id);
      }
    } else {
      tenant.set(null);
      tenants.set([]);
    }
    isLoading.set(false);
  });
}

export function useAuth() {
  return { user, tenant, tenants, isLoading, setTenant: tenant.set };
}
