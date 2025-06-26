import { writable, type Writable } from 'svelte/store';
import { subscribeToClients, subscribeToClientJobs } from '$lib/firebase/firestore';
import { currentTenant } from './auth';
import { get } from 'svelte/store';

export const clients: Writable<any[]> = writable([]);
export const selectedClient: Writable<any> = writable(null);
export const clientJobs: Writable<any[]> = writable([]);
export const isLoadingClients: Writable<boolean> = writable(false);

let unsubscribeClients: (() => void) | null = null;
let unsubscribeJobs: (() => void) | null = null;

export function initClientSubscriptions() {
  const tenant = get(currentTenant);

  if (tenant?.id) {
    isLoadingClients.set(true);

    if (unsubscribeClients) unsubscribeClients();
    unsubscribeClients = subscribeToClients(
      tenant.id,
      (updatedClients) => {
        clients.set(updatedClients);
        isLoadingClients.set(false);
      },
      { limit: 50, orderBy: { field: 'updatedAt', direction: 'desc' } }
    );
  }
}

export function subscribeToJobsForClient() {
  const tenant = get(currentTenant);
  const client = get(selectedClient);

  if (tenant?.id && client?.id) {
    if (unsubscribeJobs) unsubscribeJobs();
    unsubscribeJobs = subscribeToClientJobs(
      tenant.id,
      client.id,
      (jobs) => clientJobs.set(jobs)
    );
  }
}

export function selectClient(client: any) {
  selectedClient.set(client);
  sessionStorage.setItem('selectedClientId', client.id);
  subscribeToJobsForClient();
}

export function clearSelection() {
  selectedClient.set(null);
  clientJobs.set([]);
  sessionStorage.removeItem('selectedClientId');
}