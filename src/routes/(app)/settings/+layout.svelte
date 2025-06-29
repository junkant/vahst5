<!-- src/routes/(app)/settings/+layout.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  
  let { children } = $props();
  
  const menuItems = [
    { href: '/settings/profile', label: 'Profile', icon: '👤' },
    { href: '/settings/notifications', label: 'Notifications', icon: '🔔' },
    { href: '/settings/storage', label: 'Storage', icon: '💾' },
    { href: '/settings/team', label: 'Team', icon: '👥' },
    { href: '/settings/billing', label: 'Billing', icon: '💳' },
    { href: '/settings/preferences', label: 'Preferences', icon: '⚙️' }
  ];
  
  // Use $derived for reactive state in runes mode
  let currentPath = $derived($page.url.pathname);
  
  // Navigation handler
  function navigateTo(path: string) {
    goto(path);
  }
</script>

<div class="min-h-screen bg-gray-50 pb-20">
  <div class="bg-white shadow-sm">
    <div class="px-4 py-4">
      <h1 class="text-2xl font-bold text-gray-900">Settings</h1>
    </div>
  </div>
  
  <div class="max-w-4xl mx-auto p-4">
    <!-- Settings Menu -->
    <nav class="mb-6" aria-label="Settings navigation">
      <ul class="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
        {#each menuItems as item}
          <li>
            <button
              onclick={() => navigateTo(item.href)}
              class="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors
                     {currentPath === item.href ? 'bg-blue-50 border-l-4 border-blue-500' : ''}"
              aria-current={currentPath === item.href ? 'page' : undefined}
            >
              <div class="flex items-center space-x-3">
                <span class="text-2xl" aria-hidden="true">{item.icon}</span>
                <span class="font-medium text-gray-900">{item.label}</span>
              </div>
              <svg 
                class="h-5 w-5 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  stroke-width="2" 
                  d="M9 5l7 7-7 7" 
                />
              </svg>
            </button>
          </li>
        {/each}
      </ul>
    </nav>
    
    <!-- Settings Content -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      {@render children()}
    </div>
  </div>
</div>