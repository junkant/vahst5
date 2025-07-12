<!-- src/lib/components/client/ClientSelector.svelte -->
<script lang="ts">
  import { useClients } from '$lib/stores/client.svelte';
  import { goto } from '$app/navigation';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  let { open = $bindable(false) } = $props();
  
  const client = useClients();
  
  let searchQuery = $state('');
  
  // Filter clients based on search
  const filteredClients = $derived(() => {
    if (!searchQuery.trim()) return client.clients;
    
    const query = searchQuery.toLowerCase();
    return client.clients.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.address?.toLowerCase().includes(query) ||
      c.phone?.includes(query) ||
      c.email?.toLowerCase().includes(query)
    );
  });
  
  function selectClientAndClose(selectedClient: any) {
    client.selectClient(selectedClient);
    open = false;
    searchQuery = '';
  }
  
  function editClient(clientToEdit: any, event: Event) {
    event.stopPropagation(); // Prevent client selection
    open = false; // Close modal
    searchQuery = '';
    goto(`/clients/${clientToEdit.id}`);
  }
  
  function closeModal() {
    open = false;
    searchQuery = '';
  }
  
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }
  
  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
</script>

{#if open}
  <div 
    class="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    onclick={handleOverlayClick}
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="client-selector-title"
    tabindex="-1"
  >
    <div class="bg-white dark:bg-gray-800 w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[80vh] flex flex-col animate-slide-up sm:animate-fade-in">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 id="client-selector-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Select Client
        </h2>
        <button 
          onclick={closeModal}
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Close"
        >
          <Icon name="close" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
      
      <!-- Search -->
      <div class="p-4 border-b border-gray-100 dark:border-gray-700">
        <div class="relative">
          <Icon name="search" class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search clients..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      </div>
      
      <!-- Client List -->
      <div class="flex-1 overflow-y-auto">
        {#if client.recentClients.length > 0 && !searchQuery}
          <div class="p-2">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase px-2 py-1">Recent</p>
            {#each client.recentClients as recentClient}
              <!-- Changed from button to div to avoid nested buttons -->
              <div
                onclick={() => selectClientAndClose(recentClient)}
                onkeydown={(e) => e.key === 'Enter' && selectClientAndClose(recentClient)}
                class="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3 cursor-pointer group"
                role="button"
                tabindex="0"
              >
                <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-blue-600 dark:text-blue-400 font-medium">
                    {recentClient.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-gray-100 truncate">{recentClient.name}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{recentClient.address}</p>
                </div>
                <div class="flex items-center space-x-2">
                  <!-- Edit Button -->
                  <button
                    onclick={(e) => editClient(recentClient, e)}
                    class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    aria-label="Edit {recentClient.name}"
                  >
                    <Icon name="edit" class="w-4 h-4" size={2} />
                  </button>
                  {#if client.selectedClient?.id === recentClient.id}
                    <Icon name="checkCircleFilled" class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
        
        <div class="p-2">
          {#if !searchQuery && client.recentClients.length > 0}
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase px-2 py-1">All Clients</p>
          {/if}
          {#each filteredClients() as clientItem (clientItem.id)}
            <!-- Changed from button to div to avoid nested buttons -->
            <div
              onclick={() => selectClientAndClose(clientItem)}
              onkeydown={(e) => e.key === 'Enter' && selectClientAndClose(clientItem)}
              class="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3 cursor-pointer group"
              role="button"
              tabindex="0"
            >
              <div class="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
              <span class="text-gray-600 dark:text-gray-400 font-medium">
                  {clientItem.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 dark:text-gray-100 truncate">{clientItem.name}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{clientItem.address}</p>
              </div>
              <div class="flex items-center space-x-2">
                <!-- Edit Button -->
                <button
                  onclick={(e) => editClient(clientItem, e)}
                  class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  aria-label="Edit {clientItem.name}"
                >
                  <Icon name="edit" class="w-4 h-4" size={2} />
                </button>
                {#if client.selectedClient?.id === clientItem.id}
                  <Icon name="checkCircleFilled" class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                {/if}
              </div>
            </div>
          {/each}
          
          {#if filteredClients().length === 0}
            <div class="text-center py-8">
              <Icon name="users" class="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                {searchQuery ? 'No clients found' : 'No clients yet'}
              </h3>
              <p class="text-gray-500 dark:text-gray-400 mb-4">
                {searchQuery ? 'Try a different search' : 'Add your first client to get started'}
              </p>
              {#if !searchQuery}
                <button 
                  onclick={() => {
                    closeModal();
                    goto('/clients/new');
                  }}
                  class="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Add Client
                </button>
              {/if}
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Footer -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-700">
        <button 
          onclick={() => {
            closeModal();
            goto('/clients/new');
          }}
          class="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
        >
          Add New Client
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  
  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }
  
  @media (min-width: 640px) {
    @keyframes fade-in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    .sm\:animate-fade-in {
      animation: fade-in 0.2s ease-out;
    }
  }
</style>