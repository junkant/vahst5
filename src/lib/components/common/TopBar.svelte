<!-- src/lib/components/common/TopBar.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useClients } from '$lib/stores/client.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import ClientSelector from '$lib/components/client/ClientSelector.svelte';
  
  const auth = useAuth();
  const clients = useClients();
  const tenant = useTenant();
  
  let showClientSelector = $state(false);
  let showUserMenu = $state(false);
  
  // Track tenant changes
  let lastTenantId = $state<string | null>(null);
  
  // Monitor tenant changes and force clear client selection
  $effect(() => {
    const currentTenantId = tenant.current?.id || null;
    
    if (currentTenantId !== lastTenantId) {
      const oldTenantId = lastTenantId;
      lastTenantId = currentTenantId;
      
      // Force clear any selected client when tenant changes
      if (oldTenantId !== null && clients.selectedClient) {
        clients.selectClient(null);
      }
      
      // Force reload clients for new tenant
      if (currentTenantId) {
        clients.subscribeTenant(currentTenantId);
      }
    }
  });
  
  async function handleSignOut() {
    await auth.signOut();
    goto('/');
  }
  
  function navigateToSettings() {
    showUserMenu = false;
    goto('/settings');
  }
  
  function handleClientClear() {
    clients.selectClient(null);
  }
  
  function openClientSelector() {
    showClientSelector = true;
  }
  
  function closeAllDropdowns() {
    showUserMenu = false;
  }
</script>

<header class="bg-white border-b border-gray-200 safe-top">
  <div class="flex items-center justify-between gap-3 px-4 py-3">
    
    <!-- Business Name (Left) -->
    <div class="flex-shrink-0 min-w-[120px]">
      {#if auth.isLoading || !tenant.current?.name}
        <div class="h-7 w-32 bg-gray-200 rounded animate-pulse"></div>
      {:else}
        <button 
          onclick={() => goto('/my-day')}
          class="text-lg font-semibold text-gray-900 animate-fade-in hover:text-blue-600 transition-colors text-left"
        >
          {tenant.current.name}
        </button>
      {/if}
    </div>
    
    <!-- Client Selector (Center) -->
    <button 
      class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex-1 max-w-xs relative"
      onclick={openClientSelector}
    >
      <svg class="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      
      <!-- Client Display -->
      {#if clients.isLoadingClients}
        <span class="text-sm text-gray-500 truncate">Loading clients...</span>
      {:else if clients.selectedClient}
        <div class="flex items-center space-x-2 flex-1 min-w-0">
          <span class="text-sm text-gray-700 truncate font-medium">
            {clients.selectedClient.name}
          </span>
          <!-- Clear button -->
          <span
            onclick={(e) => {
              e.stopPropagation();
              handleClientClear();
            }}
            class="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
            role="button"
            tabindex="0"
            aria-label="Clear client selection"
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                handleClientClear();
              }
            }}
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        </div>
      {:else if clients.clients.length === 0 && !clients.isLoadingClients}
        <span class="text-sm text-gray-500 truncate">No clients yet</span>
      {:else}
        <span class="text-sm text-gray-700 truncate">Select Client</span>
      {/if}
      
      <!-- Dropdown Arrow -->
      <svg class="w-4 h-4 text-gray-400 flex-shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
      
      <!-- Client count indicator -->
      {#if clients.clients.length > 0 && !clients.isLoadingClients}
        <span class="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {clients.clients.length > 99 ? '99+' : clients.clients.length}
        </span>
      {/if}
    </button>
    
    <!-- User Menu (Right) -->
    <div class="relative">
      <button 
        onclick={() => showUserMenu = !showUserMenu}
        class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
          {auth.user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {#if showUserMenu}
        <div class="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[200px] z-50">
          <!-- User Info -->
          <div class="px-3 py-2 border-b border-gray-100 mb-2">
            <p class="text-sm font-medium text-gray-900">
              {auth.user?.email}
            </p>
            <div class="flex items-center justify-between mt-1">
              <p class="text-xs text-gray-500">
                {tenant.current?.name || 'No Business'}
              </p>
              {#if tenant.userRole}
                <span class="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                  {tenant.userRole.charAt(0).toUpperCase() + tenant.userRole.slice(1)}
                </span>
              {/if}
            </div>
          </div>
          
          <!-- Menu Items -->
          <button 
            onclick={navigateToSettings}
            class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings & Switch Business
          </button>
          
          <hr class="my-2 border-gray-100" />
          
          <button 
            onclick={handleSignOut}
            class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors flex items-center"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l-4-4m0 0l4-4m-4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      {/if}
    </div>
  </div>
</header>

<!-- Modals -->
<ClientSelector bind:open={showClientSelector} />

<!-- Click outside to close dropdowns -->
{#if showUserMenu}
  <button 
    class="fixed inset-0 z-40" 
    onclick={closeAllDropdowns}
    aria-label="Close menu"
  ></button>
{/if}

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
</style>