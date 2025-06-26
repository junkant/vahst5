import { writable } from 'svelte/store';
import type { Readable } from 'svelte/store';

export interface Client {
  id: string;
  name: string;
  // add other client fields
}

function createClientsStore() {
  const { subscribe, set, update } = writable<Client[]>([]);

  return {
    subscribe,
    addClient: (client: Client) => update(list => [...list, client]),
    removeClient: (id: string) => update(list => list.filter(c => c.id !== id)),
    setClients: (clients: Client[]) => set(clients),
    clearClients: () => set([])
  };
}

let clientsStore: ReturnType<typeof createClientsStore>;

/**
 * Returns the singleton Clients store.
 */
export function useClients(): Readable<Client[]> & {
  addClient(client: Client): void;
  removeClient(id: string): void;
  setClients(clients: Client[]): void;
  clearClients(): void;
} {
  if (!clientsStore) {
    clientsStore = createClientsStore();
  }
  return clientsStore;
}