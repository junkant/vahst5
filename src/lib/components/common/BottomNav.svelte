<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useUI } from '$lib/stores/ui';
  
  const ui = useUI();
  
  const tabs = [
    { label: 'Clients', icon: 'users', path: '/clients' },
    { label: 'Today', icon: 'calendar', path: '/today' },
    { label: 'Add', icon: 'plus', path: '/quick-add', primary: true },
    { label: 'Tools', icon: 'wrench', path: '/tools' },
    { label: 'More', icon: 'menu', path: '/more' }
  ];
  
  $effect(() => {
    // Update selected tab based on current path
    const currentPath = $page.url.pathname;
    const index = tabs.findIndex(tab => currentPath.startsWith(tab.path));
    if (index !== -1) {
      ui.setBottomTab(index);
    }
  });
</script>

<nav class="bg-white border-t border-gray-200 safe-bottom">
  <div class="flex items-center justify-around px-2 py-1">
    {#each tabs as tab, index}
      <button 
        class="flex flex-col items-center justify-center py-2 px-3 rounded-lg
               transition-all duration-200 relative group
               {ui.bottomTabIndex === index ? 'text-primary-600' : 'text-gray-500'}
               {tab.primary ? 'scale-110' : ''}"
        on:click={() => {
          ui.setBottomTab(index);
          goto(tab.path);
        }}>
        
        <!-- Icon -->
        <div class="relative">
          {#if tab.icon === 'users'}
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          {:else if tab.icon === 'calendar'}
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          {:else if tab.icon === 'plus'}
            <div class="bg-primary-600 text-white rounded-full p-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" 
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          {:else if tab.icon === 'wrench'}
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          {:else if tab.icon === 'menu'}
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          {/if}
        </div>
        
        <!-- Label -->
        <span class="text-xs mt-1 font-medium">
          {tab.label}
        </span>
        
        <!-- Active indicator -->
        {#if ui.bottomTabIndex === index && !tab.primary}
          <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 
                      bg-primary-600 rounded-full"></div>
        {/if}
      </button>
    {/each}
  </div>
</nav>