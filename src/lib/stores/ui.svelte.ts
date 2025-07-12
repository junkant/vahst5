// src/lib/stores/ui.ts

import { browser } from '$app/environment';

// Svelte 5 state using runes
let theme = $state<'light' | 'dark'>('light');
let sidebarOpen = $state(false);
let bottomTabIndex = $state(0);
let searchQuery = $state('');
let notificationCount = $state(0);
let isLoading = $state(false);
let loadingMessage = $state('');

// Create broadcast channel for multi-tab sync
let themeChannel: BroadcastChannel | null = null;

// Initialize theme from localStorage and setup multi-tab sync
if (browser) {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
  if (savedTheme) {
    theme = savedTheme;
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }
  
  // Setup BroadcastChannel for multi-tab sync
  try {
    themeChannel = new BroadcastChannel('theme-sync');
    themeChannel.onmessage = (event) => {
      if (event.data.theme) {
        theme = event.data.theme;
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
    };
  } catch (e) {
    // BroadcastChannel not supported, fallback to storage event
    window.addEventListener('storage', (e) => {
      if (e.key === 'theme' && e.newValue) {
        theme = e.newValue as 'light' | 'dark';
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
    });
  }
}

// UI Actions
function toggleTheme() {
  theme = theme === 'light' ? 'dark' : 'light';
  if (browser) {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    
    // Broadcast theme change to other tabs
    if (themeChannel) {
      themeChannel.postMessage({ theme });
    }
  }
}

function setTheme(newTheme: 'light' | 'dark') {
  theme = newTheme;
  if (browser) {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    
    // Broadcast theme change to other tabs
    if (themeChannel) {
      themeChannel.postMessage({ theme });
    }
  }
}

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
}

function openSidebar() {
  sidebarOpen = true;
}

function closeSidebar() {
  sidebarOpen = false;
}

function setBottomTab(index: number) {
  bottomTabIndex = index;
}

function setSearchQuery(query: string) {
  searchQuery = query;
}

function incrementNotifications() {
  notificationCount++;
}

function clearNotifications() {
  notificationCount = 0;
}

function showLoading(message?: string) {
  isLoading = true;
  loadingMessage = message || '';
}

function hideLoading() {
  isLoading = false;
  loadingMessage = '';
}

function resetUI() {
  theme = 'light';
  sidebarOpen = false;
  bottomTabIndex = 0;
  searchQuery = '';
  notificationCount = 0;
  isLoading = false;
  loadingMessage = '';
}

// Cleanup function for broadcast channel
function cleanup() {
  if (themeChannel) {
    themeChannel.close();
    themeChannel = null;
  }
}

// Export the store hook
export function useUI() {
  return {
    // State getters
    get theme() { return theme; },
    get sidebarOpen() { return sidebarOpen; },
    get bottomTabIndex() { return bottomTabIndex; },
    get searchQuery() { return searchQuery; },
    get notificationCount() { return notificationCount; },
    get isLoading() { return isLoading; },
    get loadingMessage() { return loadingMessage; },
    
    // Theme actions
    toggleTheme,
    setTheme,
    
    // Sidebar actions
    toggleSidebar,
    openSidebar,
    closeSidebar,
    
    // Bottom navigation
    setBottomTab,
    
    // Search
    setSearchQuery,
    
    // Notifications
    incrementNotifications,
    clearNotifications,
    get hasNotifications() { return notificationCount > 0; },
    
    // Loading state
    showLoading,
    hideLoading,
    
    // Reset
    resetUI,
    
    // Cleanup
    cleanup
  };
}