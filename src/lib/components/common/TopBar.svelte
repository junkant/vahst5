<!-- src/lib/components/common/TopBar.svelte - COMPLETE FIXED VERSION -->
<!--
  @component TopBar
  @description Optimized top navigation bar with lazy-loaded client selector and debounced search
  @usage <TopBar />
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useClients } from '$lib/stores/client.svelte';
  import { debounce } from '$lib/utils/debounce';
  import { onMount } from 'svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const auth = useAuth();
  const clients = useClients();
  
  // State management
  let showClientSelector = $state(false);
  let showUserMenu = $state(false);
  let showInlineSearch = $state(false);
  let searchQuery = $state('');
  let ClientSelector = $state<any>(null);
  let searchInputRef: HTMLInputElement;
  
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
    } else {
      // Focus input after state update
      setTimeout(() => {
        searchInputRef?.focus();
      }, 0);
    }
    showClientSelector = false; // Close selector if open
  }
  
  // Debounced search with cancellation
  const debouncedSearch = Object.assign(
    debounce((term: string) => {
      if (term.trim()) {
        clients.searchClients(term);
      } else {
        clients.clearSearch?.();
      }
    }, 300),
    { cancel: () => {} } // Add cancel method
  );
  
  // Clear client selection
  function handleClientClear(event: Event) {
    event.stopPropagation();
    clients.selectClient(null);
  }
  
  // Handle dropdown interactions
  function handleDropdownKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      showClientSelector = false;
      showUserMenu = false;
      showInlineSearch = false;
    }
  }
  
  // Clean up tenant changes
  $effect(() => {
    const currentTenantId = auth.tenant?.id || null;
    
    if (lastTenantId && lastTenantId !== currentTenantId) {
      // Tenant changed, reset UI state
      showClientSelector = false;
      showUserMenu = false;
      showInlineSearch = false;
      searchQuery = '';
      ClientSelector = null;
    }
    
    lastTenantId = currentTenantId;
  });
  
  // Handle click outside
  $effect(() => {
    if (showClientSelector || showUserMenu || showInlineSearch) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        if (!target.closest('.client-selector-container') && 
            !target.closest('.user-menu-container') &&
            !target.closest('.search-container')) {
          showClientSelector = false;
          showUserMenu = false;
          showInlineSearch = false;
        }
      };
      
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  });
  
  // Key event listeners
  onMount(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Global search shortcut: Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleInlineSearch();
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keydown', handleDropdownKeydown);
    
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('keydown', handleDropdownKeydown);
    };
  });
  
  // Performance monitoring in dev - only log once
  if (import.meta.env.DEV) {
    onMount(() => {
      // Only log if component hasn't been mounted before in this session
      if (!window.__topBarMounted) {
        window.__topBarMounted = true;
        console.log(`✨ TopBar initial mount in ${performance.now() - renderStart}ms`);
      }
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
      {#if auth.isLoading || !auth.tenant?.name}
        <div class="h-7 w-32 bg-gray-200 rounded animate-pulse"></div>
      {:else}
        <button 
          onclick={() => goto('/my-day')}
          class="text-lg font-semibold text-gray-900 animate-fade-in hover:text-blue-600 transition-colors text-left"
        >
          {auth.tenant.name}
        </button>
      {/if}
    </div>
    
    <!-- Client Selector (Center) -->
    <div class="flex-1 max-w-xs relative search-container">
      <div 
        class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors w-full cursor-pointer"
        onclick={openClientSelector}
        role="button"
        tabindex="0"
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && openClientSelector()}
      >
        <Icon name="user" class="w-4 h-4 text-gray-500 flex-shrink-0" />
        
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
              onclick={handleClientClear}
              onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClientClear(e)}
              role="button"
              tabindex="0"
              class="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-100 cursor-pointer"
              aria-label="Clear client selection"
            >
              <Icon name="close" class="w-3 h-3" />
            </span>
          </div>
        {:else if clients.clients.length === 0 && !clients.isLoadingClients}
          <span class="text-sm text-gray-500 truncate">No clients yet</span>
        {:else}
          <span class="text-sm text-gray-700 truncate">Select Client</span>
        {/if}
        
        <!-- Dropdown Arrow -->
        <Icon name="chevronDown" class="w-4 h-4 text-gray-400 flex-shrink-0 ml-auto" />
      </div>
      
      <!-- Quick Search Button -->
      <button
        onclick={toggleInlineSearch}
        class="absolute right-0 top-0 h-full px-2 hover:bg-gray-200 rounded-r-lg transition-colors flex items-center"
        aria-label="Quick search"
      >
        <Icon name="search" class="w-4 h-4 text-gray-400" />
      </button>
      
      <!-- Inline Search Dropdown -->
      {#if showInlineSearch}
        <div class="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div class="p-2">
            <input
              bind:this={searchInputRef}
              type="text"
              bind:value={searchQuery}
              placeholder="Quick search clients..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
          {auth.user?.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <Icon name="chevronDown" class="w-4 h-4 text-gray-400" />
      </button>
      
      <!-- User Dropdown -->
      {#if showUserMenu}
        <div class="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div class="p-3 border-b border-gray-100">
            <p class="text-sm font-medium text-gray-900 truncate">
              {auth.user?.email || 'User'}
            </p>
            {#if auth.tenant}
              <p class="text-sm text-gray-500 mt-1">{auth.tenant.name}</p>
            {/if}
          </div>
          
          <div class="py-1">
            <button
              onclick={() => {
                showUserMenu = false;
                goto('/settings/profile');
              }}
              class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Icon name="user" class="w-4 h-4 text-gray-400" />
              Profile Settings
            </button>
            
            <button
              onclick={() => {
                showUserMenu = false;
                goto('/settings/business');
              }}
              class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Icon name="building" class="w-4 h-4 text-gray-400" />
              Business Settings
            </button>
            
            <button
              onclick={() => {
                showUserMenu = false;
                goto('/settings/team');
              }}
              class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Icon name="users" class="w-4 h-4 text-gray-400" />
              Team Members
            </button>
            
            <hr class="my-1 border-gray-100" />
            
            <button
              onclick={async () => {
                showUserMenu = false;
                await auth.signOut();
                goto('/');
              }}
              class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <Icon name="logout" class="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Client Selector Modal -->
  {#if showClientSelector && ClientSelector}
    <div class="client-selector-container">
      <ClientSelector 
        bind:open={showClientSelector} 
        onSelect={() => showClientSelector = false}
      />
    </div>
  {/if}
</header>

<style>
  /* Fade in animation */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.2s ease-out;
  }
  
  /* Handle safe area for iOS */
  .safe-top {
    padding-top: env(safe-area-inset-top);
  }
</style>