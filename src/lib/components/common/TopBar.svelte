<!-- src/lib/components/common/TopBar.svelte -->
<!--
  @component TopBar
  @description Optimized top navigation bar with lazy-loaded client selector and debounced search
  @usage <TopBar />
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useClients } from '$lib/stores/client.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { debounce } from '$lib/utils/debounce';
  import { onMount } from 'svelte';
  
  const auth = useAuth();
  const clients = useClients();
  const tenant = useTenant();
  
  // State management
  let showClientSelector = $state(false);
  let showUserMenu = $state(false);
  let showInlineSearch = $state(false);
  let searchQuery = $state('');
  let ClientSelector = $state<any>(null);
  
  // Track tenant changes for cleanup
  let lastTenantId = $state<string | null>(null);
  
  // Performance monitoring in dev
  let renderStart = 0;
  if (import.meta.env.DEV) {
    renderStart = performance.now();
  }
  
  // Lazy load ClientSelector on demand
  async function openClientSelector() {
    if (!ClientSelector) {
      try {
        const module = await import('$lib/components/client/ClientSelector.svelte');
        ClientSelector = module.default;
      } catch (error) {
        console.error('Failed to load ClientSelector:', error);
        return;
      }
    }
    showClientSelector = true;
    showInlineSearch = false; // Close inline search if open
  }
  
  // Toggle inline search
  function toggleInlineSearch() {
    showInlineSearch = !showInlineSearch;
    if (!showInlineSearch) {
      searchQuery = '';
      debouncedSearch.cancel?.(); // Cancel any pending searches
    }
    showClientSelector = false; // Close selector if open
  }
  
  // Debounced search with cancellation
  const debouncedSearch = Object.assign(
    debounce((term: string) => {
      if (term.trim()) {
        clients.searchClients(term);
      } else {
        clients.clearSearch?.(); // Clear search results if implemented
      }
    }, 300),
    { cancel: () => {} } // Add cancel method placeholder
  );
  
  // Watch for search query changes
  $effect(() => {
    if (showInlineSearch) {
      debouncedSearch(searchQuery);
    }
  });
  
  // Monitor tenant changes and handle cleanup
  $effect(() => {
    const currentTenantId = tenant.current?.id || null;
    
    if (currentTenantId !== lastTenantId) {
      const oldTenantId = lastTenantId;
      lastTenantId = currentTenantId;
      
      // Clear selected client when tenant changes
      if (oldTenantId !== null && clients.selectedClient) {
        clients.selectClient(null);
      }
      
      // Subscribe to new tenant
      if (currentTenantId) {
        clients.subscribeTenant(currentTenantId);
      }
      
      // Reset search state
      searchQuery = '';
      showInlineSearch = false;
    }
  });
  
  // Handle sign out
  async function handleSignOut() {
    closeAllDropdowns();
    await auth.signOut();
    goto('/');
  }
  
  // Navigate to settings
  function navigateToSettings() {
    closeAllDropdowns();
    goto('/settings');
  }
  
  // Clear client selection
  function handleClientClear() {
    clients.selectClient(null);
    searchQuery = '';
  }
  
  // Close all dropdowns
  function closeAllDropdowns() {
    showUserMenu = false;
    showClientSelector = false;
    showInlineSearch = false;
    searchQuery = '';
  }
  
  // Handle clicks outside dropdowns
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container') && showUserMenu) {
      showUserMenu = false;
    }
    if (!target.closest('.search-container') && showInlineSearch) {
      showInlineSearch = false;
      searchQuery = '';
    }
  }
  
  // Cleanup on unmount
  $effect(() => {
    // Add global click listener
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      closeAllDropdowns();
      debouncedSearch.cancel?.();
      document.removeEventListener('click', handleClickOutside);
    };
  });
  
  // Performance monitoring
  if (import.meta.env.DEV) {
    onMount(() => {
      console.log(`✨ TopBar mounted in ${performance.now() - renderStart}ms`);
    });
  }
  
  // Filtered clients for inline search
  const filteredClients = $derived(() => {
    if (!showInlineSearch || !searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return clients.clients.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.address?.toLowerCase().includes(query) ||
      c.phone?.includes(query) ||
      c.email?.toLowerCase().includes(query)
    ).slice(0, 5); // Limit to 5 results for performance
  });
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
    <div class="flex-1 max-w-xs relative search-container">
      <button 
        class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors w-full"
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
            <button
              onclick={(e) => {
                e.stopPropagation();
                handleClientClear();
              }}
              class="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-100"
              aria-label="Clear client selection"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
      </button>
      
      <!-- Quick Search Button -->
      <button
        onclick={toggleInlineSearch}
        class="absolute right-0 top-0 h-full px-2 hover:bg-gray-200 rounded-r-lg transition-colors flex items-center"
        aria-label="Quick search"
      >
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
      
      <!-- Inline Search Dropdown -->
      {#if showInlineSearch}
        <div class="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div class="p-2">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Quick search clients..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              autofocus
            />
          </div>
          
          {#if filteredClients().length > 0}
            <div class="border-t border-gray-100">
              {#each filteredClients() as client}
                <button
                  onclick={() => {
                    clients.selectClient(client);
                    toggleInlineSearch();
                  }}
                  class="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span class="text-blue-600 text-xs font-medium">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                    {#if client.address}
                      <p class="text-xs text-gray-500 truncate">{client.address}</p>
                    {/if}
                  </div>
                </button>
              {/each}
              <button
                onclick={openClientSelector}
                class="w-full px-3 py-2 text-center text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100"
              >
                View all clients
              </button>
            </div>
          {:else if searchQuery.trim()}
            <div class="px-3 py-4 text-center text-sm text-gray-500">
              No clients found
            </div>
          {/if}
        </div>
      {/if}
    </div>
    
    <!-- User Menu (Right) -->
    <div class="relative user-menu-container">
      <button 
        onclick={() => showUserMenu = !showUserMenu}
        class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="User menu"
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
            <p class="text-sm font-medium text-gray-900 truncate">
              {auth.user?.email}
            </p>
            <div class="flex items-center justify-between mt-1">
              <p class="text-xs text-gray-500 truncate">
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
            class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
          
          <button 
            onclick={handleSignOut}
            class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Lazy loaded client selector modal -->
  {#if showClientSelector && ClientSelector}
    <ClientSelector bind:open={showClientSelector} />
  {/if}
</header>

<style>
  /* Fade in animation */
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }
  
  /* Safe area for notch/status bar */
  .safe-top {
    padding-top: env(safe-area-inset-top);
  }
</style>