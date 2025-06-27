<!-- src/lib/components/client/ClientSelector.svelte -->
<script>
  import { useClients } from '$lib/stores/client.svelte';
  import { goto } from '$app/navigation';
  
  let { open = $bindable(false) } = $props();
  
  const client = useClients();
  let searchQuery = $state('');
  
  let filteredClients = $derived(
    searchQuery 
      ? client.searchClients(searchQuery)
      : client.clients
  );
  
  function selectClientAndClose(selectedClient) {
    client.selectClient(selectedClient);
    open = false;
    searchQuery = '';
  }
  
  function addNewClient() {
    open = false;
    goto('/clients/new');
  }
</script>

{#if open}
  <button 
    class="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center"
    onclick={() => open = false}
    onkeydown={(e) => e.key === 'Escape' && (open = false)}
    aria-label="Close client selector"
    type="button"
  >
    <div 
      class="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col animate-slide-in"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Select a client"
    >
      <!-- Header -->
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-gray-900">Select Client</h2>
          <button
            onclick={() => open = false}
            class="p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close dialog"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Search -->
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search clients..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <!-- Client List -->
      <div class="flex-1 overflow-y-auto">
        {#if client.recentClients.length > 0 && !searchQuery}
          <div class="p-2">
            <p class="text-xs font-medium text-gray-500 uppercase px-2 py-1">Recent</p>
            {#each client.recentClients as recentClient}
              <button
                onclick={() => selectClientAndClose(recentClient)}
                class="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3"
              >
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-blue-600 font-medium">
                    {recentClient.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 truncate">{recentClient.name}</p>
                  <p class="text-sm text-gray-500 truncate">{recentClient.address}</p>
                </div>
                {#if client.selectedClient?.id === recentClient.id}
                  <svg class="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
        
        <div class="p-2">
          {#if !searchQuery && client.recentClients.length > 0}
            <p class="text-xs font-medium text-gray-500 uppercase px-2 py-1">All Clients</p>
          {/if}
          {#each filteredClients as clientItem}
            <button
              onclick={() => selectClientAndClose(clientItem)}
              class="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3"
            >
              <div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-gray-600 font-medium">
                  {clientItem.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">{clientItem.name}</p>
                <p class="text-sm text-gray-500 truncate">{clientItem.address}</p>
              </div>
              {#if client.selectedClient?.id === clientItem.id}
                <svg class="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              {/if}
            </button>
          {/each}
          
          {#if filteredClients.length === 0}
            <div class="text-center py-8">
              <p class="text-gray-500">No clients found</p>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Footer -->
      <div class="p-4 border-t border-gray-200">
        <button
          onclick={addNewClient}
          class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Client
        </button>
      </div>
    </div>
  </div>
{/if}