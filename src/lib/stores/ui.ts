import { writable, type Writable } from 'svelte/store';

export const sidebarOpen: Writable<boolean> = writable(false);
export const bottomTabIndex: Writable<number> = writable(0);
export const searchQuery: Writable<string> = writable('');
export const notificationCount: Writable<number> = writable(0);

export function toggleSidebar() {
  sidebarOpen.update((open) => !open);
}

export function setBottomTab(index: number) {
  bottomTabIndex.set(index);
}

export function setSearchQuery(query: string) {
  searchQuery.set(query);
}

export function incrementNotifications() {
  notificationCount.update((n) => n + 1);
}

export function clearNotifications() {
  notificationCount.set(0);
}
