<!-- src/routes/(app)/settings/+layout.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  let { children } = $props();
  
  const menuItems = [
    { 
      href: '/settings/profile', 
      label: 'Profile',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    },
    { 
      href: '/settings/notifications', 
      label: 'Notifications',
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
    },
    { 
      href: '/settings/storage', 
      label: 'Storage',
      icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z'
    },
    { 
      href: '/settings/team', 
      label: 'Team',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
    },
    { 
      href: '/settings/billing', 
      label: 'Billing',
      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
    },
    { 
      href: '/settings/preferences', 
      label: 'Preferences',
      icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4'
    },
    { 
      href: '/settings/permissions', 
      label: 'Permissions',
      icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
    }
  ];
  
  // Use $derived for reactive state in runes mode
  let currentPath = $derived($page.url.pathname);
  
  // Navigation handler
  function navigateTo(path: string) {
    goto(path);
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-200">
  <div class="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/50 transition-colors duration-200">
    <div class="px-4 py-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
      
      <!-- Horizontal Navigation Menu -->
      <nav class="mt-4 -mx-4 px-4 overflow-x-auto" aria-label="Settings navigation">
        <div class="flex gap-2 min-w-max pb-2">
          {#each menuItems as item}
            <button 
              onclick={() => navigateTo(item.href)} 
              class="flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 min-w-[64px] group
                     {currentPath === item.href 
                       ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50' 
                       : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'}"
              aria-current={currentPath === item.href ? 'page' : undefined}
            >
              <svg 
                class="w-6 h-6 mb-1 transition-transform duration-200 group-hover:scale-110" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
              </svg>
              <span class="text-xs font-medium">{item.label}</span>
            </button>
          {/each}
        </div>
      </nav>
    </div>
  </div>
  
  <div class="max-w-4xl mx-auto p-4">
    <!-- Settings Content -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/30 p-6 transition-colors duration-200">
      {#key currentPath}
        <div class="animate-fade-in">
          {@render children()}
        </div>
      {/key}
    </div>
  </div>
</div>

<style>
  /* Hide scrollbar for cleaner appearance */
  nav::-webkit-scrollbar {
    height: 6px;
  }
  
  nav::-webkit-scrollbar-track {
    background: transparent;
  }
  
  nav::-webkit-scrollbar-thumb {
    @apply bg-gray-300 dark:bg-gray-600 rounded-full;
  }
  
  nav::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-400 dark:bg-gray-500;
  }
  
  /* Fallback for Firefox */
  nav {
    scrollbar-width: thin;
    scrollbar-color: theme('colors.gray.300') transparent;
  }
  
  :global(.dark) nav {
    scrollbar-color: theme('colors.gray.600') transparent;
  }
  
  /* Fade in animation */
  .animate-fade-in {
    animation: fadeIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
