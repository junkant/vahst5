<!-- src/routes/(app)/clients/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import ClientDetail from '$lib/components/client/ClientDetail.svelte';
  import NewClientForm from '$lib/components/client/NewClientForm.svelte';
  import { useClients } from '$lib/stores/client.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  
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
    
    // Restore previous client selection if any
    clients.restoreSelection();
  });

  // Watch for tenant changes - prevent infinite loops AND clear invalid selections
  let lastTenantId = $state<string | null>(null);
  $effect(() => {
    if (tenant.current?.id && tenant.current.id !== lastTenantId) {
      const oldTenantId = lastTenantId;
      lastTenantId = tenant.current.id;
      
      // Clear selected client immediately on tenant change
      if (oldTenantId !== null && clients.selectedClient) {
        clients.selectClient(null);
      }
      
      clients.subscribeTenant(tenant.current.id);
    }
  });
  
  // Validate selected client belongs to current tenant
  const validSelectedClient = $derived(() => {
    if (!clients.selectedClient || !tenant.current?.id) {
      return null;
    }
    
    // Ensure selected client exists in current tenant's client list
    const isValid = clients.clients.some(c => c.id === clients.selectedClient?.id);
    return isValid ? clients.selectedClient : null;
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
        client.address.toLowerCase().includes(query) ||
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

  function closeClientDetail() {
    showClientDetail = false;
  }

  function openNewClientForm() {
    showNewClientForm = true;
  }

  function getStatusColor(status: string) {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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

<div class="h-full bg-gray-50">
  <!-- Enhanced Header with Add Client Button -->
  <div class="bg-white border-b border-gray-200 p-4">
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-xl font-semibold text-gray-900">Clients</h1>
      <div class="flex space-x-2">
        <button 
          onclick={openNewClientForm}
          class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Add Client
        </button>
        <a 
          href="/clients/new"
          class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Full Form
        </a>
      </div>
    </div>
    
    <!-- Search -->
    <div class="mb-3">
      <div class="relative">
        <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search clients by name, phone, or address..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
      >
        All ({clients.clients.length})
      </button>
      <button
        onclick={() => statusFilter = 'active'}
        class="px-3 py-1 rounded-full text-sm font-medium transition-colors
               {statusFilter === 'active' 
                 ? 'bg-green-600 text-white' 
                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
      >
        Active ({clients.clients.filter(c => c.status === 'active').length})
      </button>
      <button
        onclick={() => statusFilter = 'inactive'}
        class="px-3 py-1 rounded-full text-sm font-medium transition-colors
               {statusFilter === 'inactive' 
                 ? 'bg-red-600 text-white' 
                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
      >
        Inactive ({clients.clients.filter(c => c.status === 'inactive').length})
      </button>
    </div>
    
    <!-- Selected Client Info -->
    {#if validSelectedClient}
      <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-blue-900">
              Selected: {validSelectedClient.name}
            </p>
            <p class="text-xs text-blue-700">{validSelectedClient.address}</p>
          </div>
          <button 
            onclick={() => clients.selectClient(null)}
            class="text-blue-600 hover:text-blue-800 text-sm"
          >
            Clear
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Client List -->
  <div class="flex-1 overflow-y-auto p-4 pb-24">
    {#if clients.isLoadingClients}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    {:else if clients.error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p class="text-sm text-red-800">{clients.error}</p>
        </div>
      </div>
    {:else if filteredClients.length === 0}
      <div class="text-center py-12">
        <div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          {searchQuery || statusFilter !== 'all' ? 'No clients found' : 'No clients yet'}
        </h3>
        <p class="text-gray-500 mb-4">
          {searchQuery || statusFilter !== 'all' 
            ? 'Try adjusting your search or filters' 
            : 'Get started by adding your first client'}
        </p>
        {#if !searchQuery && statusFilter === 'all'}
          <button 
            onclick={openNewClientForm}
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Add Your First Client
          </button>
        {/if}
      </div>
    {:else}
      <div class="space-y-3">
        {#each filteredClients as client (client.id)}
          <button
            onclick={() => selectClient(client)}
            class="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow text-left"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-1">
                  <h3 class="font-semibold text-gray-900">{client.name}</h3>
                  <span class="px-2 py-1 rounded-full text-xs {getStatusColor(client.status)}">
                    {client.status}
                  </span>
                  {#if clients.isOffline}
                    <span class="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                      Offline
                    </span>
                  {/if}
                </div>
                <p class="text-sm text-gray-600 mb-1">{client.address}</p>
                {#if client.phone}
                  <p class="text-sm text-gray-500">{client.phone}</p>
                {/if}
                {#if client.email}
                  <p class="text-sm text-gray-500">{client.email}</p>
                {/if}
                {#if client.lastServiceDate}
                  <p class="text-xs text-gray-400 mt-1">
                    Last service: {formatDate(client.lastServiceDate)}
                  </p>
                {:else}
                  <p class="text-xs text-gray-400 mt-1">No previous service</p>
                {/if}
                
                <!-- Tags -->
                {#if client.tags && client.tags.length > 0}
                  <div class="flex flex-wrap gap-1 mt-2">
                    {#each client.tags.slice(0, 3) as tag}
                      <span class="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                        {tag}
                      </span>
                    {/each}
                    {#if client.tags.length > 3}
                      <span class="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                        +{client.tags.length - 3} more
                      </span>
                    {/if}
                  </div>
                {/if}
              </div>
              <div class="text-right">
                <div class="w-2 h-2 {client.status === 'active' ? 'bg-green-400' : 'bg-gray-400'} rounded-full"></div>
              </div>
            </div>
            
            {#if client.notes}
              <div class="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                <p class="text-xs text-yellow-800">📝 {client.notes}</p>
              </div>
            {/if}
          </button>
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