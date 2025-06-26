<script>
  import { createCombobox, createDialog, melt } from '@melt-ui/svelte';
  import { useClients } from '$lib/stores/client';
  import { useUI } from '$lib/stores/ui';
  import ClientCard from '$lib/components/client/ClientCard.svelte';
  import ClientDetail from '$lib/components/client/ClientDetail.svelte';
  import NewClientForm from '$lib/components/client/NewClientForm.svelte';
  
  const clients = useClients();
  const ui = useUI();
  
  // Client search combobox
  const clientSearch = createCombobox({
    forceVisible: true,
    items: clients.clients,
    itemToString: (item) => item?.name || '',
    filter: (item, inputValue) => 
      item.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      item.address?.toLowerCase().includes(inputValue.toLowerCase())
  });
  
  // New client dialog
  const newClientDialog = createDialog();
  
  // Recent clients (last 5)
  $effect(() => {
    const recent = clients.clients.slice(0, 5);
  });
</script>

<div class="flex flex-col h-full bg-gray-50">
  <!-- Search Header -->
  <div class="bg-white border-b border-gray-200 p-4">
    <div class="relative">
      <input 
        use:melt={$clientSearch.elements.input}
        class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 
               rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 
               focus:border-transparent"
        placeholder="Search clients..."
      />
      <svg class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" 
           fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    
    <!-- Search results dropdown -->
    {#if $clientSearch.states.open && $clientSearch.states.items.length > 0}
      <div use:melt={$clientSearch.elements.menu}
           class="absolute left-4 right-4 mt-1 bg-white rounded-lg shadow-lg 
                  border border-gray-200 max-h-80 overflow-auto z-20">
        {#each $clientSearch.states.items as client, index}
          <button use:melt={$clientSearch.elements.option({ index })}
                  class="w-full px-4 py-3 flex items-center justify-between 
                         hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  on:click={() => clients.selectClient(client)}>
            <div class="text-left">
              <p class="font-medium text-gray-900">{client.name}</p>
              <p class="text-sm text-gray-500">{client.address}</p>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" 
                 viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 5l7 7-7 7" />
            </svg>
          </button>
        {/each}
      </div>
    {/if}
  </div>
  
  <!-- Content -->
  <div class="flex-1 overflow-y-auto">
    {#if clients.isLoading}
      <div class="flex items-center justify-center h-64">
        <div class="text-center">
          <div class="w-12 h-12 border-4 border-primary-600 border-t-transparent 
                      rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-gray-600">Loading clients...</p>
        </div>
      </div>
    {:else}
      <!-- Recent Clients -->
      <div class="p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-gray-900">Recent Clients</h2>
          <button use:melt={$newClientDialog.elements.trigger}
                  class="text-primary-600 text-sm font-medium">
            Add New
          </button>
        </div>
        
        <div class="space-y-3">
          {#each clients.clients.slice(0, 5) as client}
            <ClientCard {client} />
          {/each}
        </div>
        
        {#if clients.clients.length === 0}
          <div class="text-center py-12">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" 
                 stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No clients yet</h3>
            <p class="text-gray-500 mb-4">Add your first client to get started</p>
            <button use:melt={$newClientDialog.elements.trigger}
                    class="btn-primary">
              Add First Client
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  
  <!-- Selected Client Detail -->
  {#if clients.selectedClient}
    <ClientDetail client={clients.selectedClient} />
  {/if}
  
  <!-- New Client Dialog -->
  <NewClientForm bind:open={$newClientDialog.states.open} />
</div>