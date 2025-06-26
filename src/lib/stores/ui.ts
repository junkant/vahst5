import { writable } from 'svelte/store';
import type { Readable } from 'svelte/store';

export interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
}

function createUIStore() {
  const defaultState: UIState = { theme: 'light', sidebarOpen: false };
  const { subscribe, update, set } = writable<UIState>(defaultState);

  return {
    subscribe,
    toggleTheme: () => update(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' })),
    openSidebar: () => update(s => ({ ...s, sidebarOpen: true })),
    closeSidebar: () => update(s => ({ ...s, sidebarOpen: false })),
    resetUI: () => set(defaultState)
  };
}

let uiStore: ReturnType<typeof createUIStore>;

/**
 * Returns the singleton UI store.
 */
export function useUI(): Readable<UIState> & {
  toggleTheme(): void;
  openSidebar(): void;
  closeSidebar(): void;
  resetUI(): void;
} {
  if (!uiStore) {
    uiStore = createUIStore();
  }
  return uiStore;
}
