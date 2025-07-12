// src/lib/stores/ui.svelte.ts
// Enhanced UI store with system theme detection and keyboard shortcuts

import { browser } from '$app/environment';

// Svelte 5 state using runes
let theme = $state<'light' | 'dark' | 'system'>('system');
let systemTheme = $state<'light' | 'dark'>('light');
let sidebarOpen = $state(false);
let bottomTabIndex = $state(0);
let searchQuery = $state('');
let notificationCount = $state(0);
let isLoading = $state(false);
let loadingMessage = $state('');

// Computed effective theme
let effectiveTheme = $derived(theme === 'system' ? systemTheme : theme);

// Create broadcast channel for multi-tab sync
let themeChannel: BroadcastChannel | null = null;
let mediaQuery: MediaQueryList | null = null;

// Store references for cleanup
let cleanupFunctions: (() => void)[] = [];

// Initialize theme from localStorage and setup multi-tab sync
if (browser) {
  // Get saved theme preference
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
  if (savedTheme) {
    theme = savedTheme;
  }
  
  // Detect system theme preference
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemTheme = mediaQuery.matches ? 'dark' : 'light';
  
  // Apply initial theme
  applyTheme();
  
  // Listen for system theme changes
  const handleSystemThemeChange = (e: MediaQueryListEvent) => {
    systemTheme = e.matches ? 'dark' : 'light';
    // Re-apply theme if using system preference
    if (theme === 'system') {
      applyTheme();
    }
  };
  
  mediaQuery.addEventListener('change', handleSystemThemeChange);
  
  // Add cleanup for this listener
  cleanupFunctions.push(() => {
    mediaQuery?.removeEventListener('change', handleSystemThemeChange);
  });
  
  // Setup BroadcastChannel for multi-tab sync
  try {
    themeChannel = new BroadcastChannel('theme-sync');
    themeChannel.onmessage = (event) => {
      if (event.data.theme) {
        theme = event.data.theme;
        // Don't call persistTheme here to avoid infinite loop
        applyTheme();
      }
    };
  } catch (e) {
    // BroadcastChannel not supported, fallback to storage event
    window.addEventListener('storage', (e) => {
      if (e.key === 'theme' && e.newValue) {
        theme = e.newValue as 'light' | 'dark' | 'system';
        // Don't call persistTheme here to avoid infinite loop
        applyTheme();
      }
    });
  }
  
  // Keyboard shortcut is handled in +layout.svelte
}

// Apply theme to document
function applyTheme() {
  if (browser) {
    // Add transitioning class for smooth theme change
    document.documentElement.classList.add('transitioning');
    
    const isDark = effectiveTheme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#0f172a' : '#ffffff');
    }
    
    // Remove transitioning class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove('transitioning');
    }, 200);
  }
}

// Persist theme changes when theme changes
// Since we can't use $effect in .svelte.ts files, we'll handle this in the setter functions
function persistTheme() {
  if (browser) {
    localStorage.setItem('theme', theme);
    applyTheme();
    
    // Broadcast theme change to other tabs
    if (themeChannel) {
      themeChannel.postMessage({ theme });
    }
  }
}

// UI Actions
function toggleTheme() {
  theme = effectiveTheme === 'light' ? 'dark' : 'light';
  persistTheme();
}

function cycleTheme() {
  if (theme === 'light') {
    theme = 'dark';
  } else if (theme === 'dark') {
    theme = 'system';
  } else {
    theme = 'light';
  }
  persistTheme();
}

function setTheme(newTheme: 'light' | 'dark' | 'system') {
  theme = newTheme;
  persistTheme();
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
  theme = 'system';
  sidebarOpen = false;
  bottomTabIndex = 0;
  searchQuery = '';
  notificationCount = 0;
  isLoading = false;
  loadingMessage = '';
}

// Cleanup function for broadcast channel and other resources
function cleanup() {
  if (themeChannel) {
    themeChannel.close();
    themeChannel = null;
  }
  // Run all cleanup functions
  cleanupFunctions.forEach(fn => fn());
  cleanupFunctions = [];
}



// Export the store hook
export function useUI() {
  return {
    // State getters
    get theme() { return theme; },
    get effectiveTheme() { return effectiveTheme; },
    get systemTheme() { return systemTheme; },
    get sidebarOpen() { return sidebarOpen; },
    get bottomTabIndex() { return bottomTabIndex; },
    get searchQuery() { return searchQuery; },
    get notificationCount() { return notificationCount; },
    get isLoading() { return isLoading; },
    get loadingMessage() { return loadingMessage; },
    
    // Theme actions
    toggleTheme,
    cycleTheme,
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
