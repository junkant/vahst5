<!-- src/routes/(app)/clients/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import ClientDetail from '$lib/components/client/ClientDetail.svelte';
  import NewClientForm from '$lib/components/client/NewClientForm.svelte';
  import { useClients } from '$lib/stores/client.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { goto } from '$app/navigation';
  import Icon from '$lib/components/icons/Icon.svelte';
  import PermissionGate from '$lib/components/permissions/PermissionGate.svelte';
  
  const clients = useClients();
  const tenant = useTenant();
  
  // State management with runes
  let searchQuery = $state('');
  let statusFilter = $state('all');
  let showClientDetail = $state(false);
  let showNewClientForm = $state(false);

  // Initialize when component mounts
  onMount(() => {
    // Initialize client store with current tenant
    if (tenant.current?.id) {
      clients.subscribeTenant(tenant.current.id);
    }
  });

  // Watch for tenant changes
  let lastTenantId = $state<string | null>(null);
  $effect(() => {
    if (tenant.current?.id && tenant.current.id !== lastTenantId) {
      lastTenantId = tenant.current.id;
      clients.subscribeTenant(tenant.current.id);
    }
  });

  // Derived state for filtered clients
  const filteredClients = $derived(() => {
    let result = [...clients.clients];
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(client => client.status === statusFilter);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(client => 
        client.name.toLowerCase().includes(query) ||
        client.address?.toLowerCase().includes(query) ||
        client.phone?.includes(query) ||
        client.email?.toLowerCase().includes(query)
      );
    }
    
    return result;
  });

  // Functions
  function selectClient(client: any) {
    clients.selectClient(client);
    showClientDetail = true;
  }

  function editClient(client: any) {
    goto(`/clients/${client.id}`);
  }

  function closeClientDetail() {
    showClientDetail = false;
  }

  function openNewClientForm() {
    showNewClientForm = true;
  }

  function getStatusColor(status: string) {
    switch(status) {
      case 'active': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'inactive': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  }
  
  function formatDate(date: Date | undefined) {
    if (!date) return 'Never';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }
</script>

<div class="h-full bg-gray-50 dark:bg-gray-900 flex flex-col">
  <!-- Header -->
  <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Clients</h1>
      <div class="flex space-x-2">
        <PermissionGate action="user_management_create_client">
          <button 
            onclick={openNewClientForm}
            class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
          >
            <Icon name="plus" class="w-4 h-4" />
            <span>Add Client</span>
          </button>
        </PermissionGate>
      </div>
    </div>
    
    <!-- Search -->
    <div class="mb-3">
      <div class="relative">
        <Icon name="search" class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search clients by name, phone, or address..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>
    </div>
    
    <!-- Status Filter -->
    <div class="flex space-x-2">
      <button
        onclick={() => statusFilter = 'all'}
        class="px-3 py-1 rounded-full text-sm font-medium transition-colors
               {statusFilter === 'all' 
                 ? 'bg-blue-600 text-white' 
                 : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
      >
        All ({clients.clients.length})
      </button>
      <button
        onclick={() => statusFilter = 'active'}
        class="px-3 py-1 rounded-full text-sm font-medium transition-colors
               {statusFilter === 'active' 
                 ? 'bg-green-600 text-white' 
                 : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
      >
        Active ({clients.clients.filter(c => c.status === 'active').length})
      </button>
      <button
        onclick={() => statusFilter = 'inactive'}
        class="px-3 py-1 rounded-full text-sm font-medium transition-colors
               {statusFilter === 'inactive' 
                 ? 'bg-red-600 text-white' 
                 : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
      >
        Inactive ({clients.clients.filter(c => c.status === 'inactive').length})
      </button>
    </div>
  </div>

  <!-- Client List -->
  <div class="flex-1 overflow-y-auto p-4">
    {#if clients.isLoadingClients}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    {:else if clients.error}
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div class="flex items-center">
          <Icon name="warning" class="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
          <p class="text-sm text-red-800 dark:text-red-300">{clients.error}</p>
        </div>
      </div>
    {:else if filteredClients().length === 0}
      <div class="text-center py-12">
        <div class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="users" class="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          {searchQuery || statusFilter !== 'all' ? 'No clients found' : 'No clients yet'}
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          {searchQuery || statusFilter !== 'all' 
            ? 'Try adjusting your search or filters' 
            : 'Get started by adding your first client'}
        </p>
        {#if !searchQuery && statusFilter === 'all'}
          <PermissionGate action="user_management_create_client">
            <button 
              onclick={openNewClientForm}
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Add Your First Client
            </button>
          </PermissionGate>
        {/if}
      </div>
    {:else}
      <div class="space-y-3">
        {#each filteredClients() as client (client.id)}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-1">
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">{client.name}</h3>
                  <span class="px-2 py-1 rounded-full text-xs {getStatusColor(client.status)}">
                    {client.status}
                  </span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">{client.address || 'No address'}</p>
                <div class="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
                  {#if client.phone}
                    <span class="flex items-center gap-1">
                      <Icon name="phone" class="w-4 h-4" size={2} />
                      {client.phone}
                    </span>
                  {/if}
                  {#if client.email}
                    <span class="flex items-center gap-1">
                      <Icon name="mail" class="w-4 h-4" size={2} />
                      {client.email}
                    </span>
                  {/if}
                </div>
                {#if client.lastServiceDate}
                  <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Last service: {formatDate(client.lastServiceDate)}
                  </p>
                {/if}
                
                <!-- Tags -->
                {#if client.tags && client.tags.length > 0}
                  <div class="flex flex-wrap gap-1 mt-2">
                    {#each client.tags.slice(0, 3) as tag}
                      <span class="px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                        {tag}
                      </span>
                    {/each}
                    {#if client.tags.length > 3}
                      <span class="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        +{client.tags.length - 3} more
                      </span>
                    {/if}
                  </div>
                {/if}
              </div>
              
              <!-- Action Buttons -->
              <div class="flex items-center space-x-2 ml-4">
                <button
                  onclick={() => selectClient(client)}
                  class="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Select {client.name}"
                  title="Select client"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <PermissionGate action="user_management_edit_client">
                  <button
                    onclick={() => editClient(client)}
                    class="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                    aria-label="Edit {client.name}"
                    title="Edit client"
                  >
                    <Icon name="edit" class="w-5 h-5" size={2} />
                  </button>
                </PermissionGate>
              </div>
            </div>
            
            {#if client.notes}
              <div class="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                <p class="text-xs text-yellow-800 dark:text-yellow-300">📝 {client.notes}</p>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Client Detail Modal -->
{#if showClientDetail && clients.selectedClient}
  <ClientDetail 
    client={clients.selectedClient} 
    bind:open={showClientDetail}
    onClose={closeClientDetail}
  />
{/if}

<!-- New Client Form Modal -->
<NewClientForm bind:open={showNewClientForm} />