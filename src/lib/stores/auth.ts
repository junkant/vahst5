import { writable } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';

// Define your User type (extend as needed)
export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token?: string;
}

function createAuthStore() {
  const initialState: AuthState = { user: null };
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    login: (user: User, token: string) => set({ user, token }),
    logout: () => set(initialState),
    clearToken: () => update(state => ({ ...state, token: undefined }))
  };
}

let authStore: ReturnType<typeof createAuthStore>;

/**
 * Returns the singleton Auth store.
 */
export function useAuth(): Readable<AuthState> & {
  login(user: User, token: string): void;
  logout(): void;
  clearToken(): void;
} {
  if (!authStore) {
    authStore = createAuthStore();
  }
  return authStore;
}