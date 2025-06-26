// src/lib/stores/ui.ts

// Svelte 5 state using runes
let theme = $state<'light' | 'dark'>('light');
let sidebarOpen = $state(false);
let bottomTabIndex = $state(0);
let searchQuery = $state('');
let notificationCount = $state(0);
let isLoading = $state(false);
let loadingMessage = $state('');

// Initialize theme from localStorage
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
  if (savedTheme) {
    theme = savedTheme;
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }
}

// Persist theme changes
$effect(() => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
});

// UI Actions
function toggleTheme() {
  theme = theme === 'light' ? 'dark' : 'light';
}

function setTheme(newTheme: 'light' | 'dark') {
  theme = newTheme;
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
    resetUI
  };
}