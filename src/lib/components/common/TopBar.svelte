<!-- src/lib/components/common/TopBar.svelte -->
<script>
  import { createPopover, melt } from '@melt-ui/svelte';
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useClients } from '$lib/stores/client.svelte';
  import ClientSelector from '$lib/components/client/ClientSelector.svelte';
  import TenantSwitcher from '$lib/components/tenant/TenantSwitcher.svelte';
  
  const auth = useAuth();
  const clients = useClients();
  
  let showClientSelector = $state(false);
  let showTenantSwitcher = $state(false);
  
  // User menu popover
  const userMenu = createPopover({
    positioning: { placement: 'bottom-end' }
  });
  
  async function handleSignOut() {
    await auth.logout();
    goto('/login');
  }
  
  function navigateToSettings() {
    goto('/settings');
  }
  
  function openTenantSwitcher() {
    showTenantSwitcher = true;
  }
</script>

<header class="bg-white border-b border-gray-200 safe-top">
  <div class="flex items-center justify-between gap-3 px-4 py-3">
    <!-- Logo/Brand with Tenant Name -->
    <div class="flex items-center gap-3 flex-shrink-0">
      <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
        <span class="text-white font-bold text-sm">V</span>
      </div>
      <div>
        <h1 class="text-lg font-semibold text-gray-900">Vahst</h1>
        <button 
          class="text-xs text-gray-500 hover:text-gray-700"
          onclick={openTenantSwitcher}
        >
          {auth.tenant?.name || 'Select Business'}
        </button>
      </div>
    </div>
    
    <!-- Client Selector (Center) -->
    <button 
      class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex-1 max-w-xs"
      onclick={() => showClientSelector = true}
    >
      <svg class="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span class="text-sm text-gray-700 truncate">
        {clients.selectedClient?.name || 'Select Client'}
      </span>
      <svg class="w-4 h-4 text-gray-400 flex-shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    
    <!-- User Menu -->
    <button use:melt={$userMenu.elements.trigger}
            class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 
                   transition-colors">
      <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center 
                  justify-center text-white font-medium">
        {auth.user?.email?.[0]?.toUpperCase() || 'U'}
      </div>
      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    
    {#if $userMenu.states.open}
      <div use:melt={$userMenu.elements.content}
           class="bg-white rounded-lg shadow-lg border border-gray-200 
                  p-2 min-w-[200px] z-50">
        <div class="px-3 py-2 border-b border-gray-100 mb-2">
          <p class="text-sm font-medium text-gray-900">
            {auth.user?.email}
          </p>
          <p class="text-xs text-gray-500">
            {auth.tenant?.name}
          </p>
        </div>
        
        <button 
          onclick={navigateToSettings}
          class="w-full text-left px-3 py-2 text-sm text-gray-700 
                 hover:bg-gray-100 rounded transition-colors"
        >
          Settings
        </button>
        <button 
          onclick={openTenantSwitcher}
          class="w-full text-left px-3 py-2 text-sm text-gray-700 
                 hover:bg-gray-100 rounded transition-colors"
        >
          Switch Tenant
        </button>
        <hr class="my-2 border-gray-100" />
        <button 
          onclick={handleSignOut}
          class="w-full text-left px-3 py-2 text-sm text-red-600 
                 hover:bg-red-50 rounded transition-colors"
        >
          Sign Out
        </button>
      </div>
    {/if}
  </div>
</header>

<!-- Modals -->
<ClientSelector bind:open={showClientSelector} />
<TenantSwitcher bind:open={showTenantSwitcher} />