<script>
  import { onMount } from 'svelte';
  import ClientDetail from '$lib/components/client/ClientDetail.svelte';
  import NewClientForm from '$lib/components/client/NewClientForm.svelte';
  
  // Mock data for now - replace with real data later
  const mockClients = [
    {
      id: 1,
      name: "Johnson Residence",
      address: "123 Oak Street",
      phone: "(555) 123-4567",
      email: "johnson@email.com",
      lastVisit: "2 weeks ago",
      status: "active",
      notes: "Gate code: 1234. Dog in backyard.",
      equipment: ["Carrier AC Unit - 2019", "Thermostat - Nest"]
    },
    {
      id: 2,
      name: "Smith Office Building", 
      address: "456 Business Park Dr",
      phone: "(555) 234-5678",
      email: "manager@smithoffice.com",
      lastVisit: "1 month ago",
      status: "active",
      notes: "Contact building manager first.",
      equipment: ["Commercial HVAC - 2020", "Backup Generator"]
    },
    {
      id: 3,
      name: "Williams Family",
      address: "789 Maple Avenue", 
      phone: "(555) 345-6789",
      email: "williams@email.com",
      lastVisit: "Never",
      status: "new",
      notes: "New customer - heat pump installation.",
      equipment: []
    }
  ];

  // State management with runes
  let searchQuery = $state('');
  let selectedClient = $state(null);
  let showClientDetail = $state(false);
  let showNewClientForm = $state(false);
  let clients = $state(mockClients);

  // Derived state for filtered clients
  let filteredClients = $derived(() => {
    if (!searchQuery.trim()) return clients;
    
    return clients.filter(client => 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery)
    );
  });

  // Functions
  function selectClient(client) {
    selectedClient = client;
    showClientDetail = true;
  }

  function closeClientDetail() {
    showClientDetail = false;
    selectedClient = null;
  }

  function openNewClientForm() {
    showNewClientForm = true;
  }

  function closeNewClientForm() {
    showNewClientForm = false;
  }

  function getStatusColor(status) {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'new': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
</script>

<div class="h-full bg-gray-50">
  <!-- Header -->
  <div class="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-xl font-semibold text-gray-900">Clients</h1>
      <button 
        onclick={openNewClientForm}
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        + Add Client
      </button>
    </div>
    
    <!-- Search -->
    <div class="relative">
      <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search clients..."
        class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  </div>

  <!-- Client List -->
  <div class="flex-1 overflow-y-auto p-4 pb-24">
    {#if filteredClients.length === 0}
      <div class="text-center py-12">
        <div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          {searchQuery ? 'No clients found' : 'No clients yet'}
        </h3>
        <p class="text-gray-500 mb-4">
          {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first client'}
        </p>
        {#if !searchQuery}
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
                </div>
                <p class="text-sm text-gray-600 mb-1">{client.address}</p>
                <p class="text-sm text-gray-500">{client.phone}</p>
                {#if client.lastVisit !== 'Never'}
                  <p class="text-xs text-gray-400 mt-1">Last visit: {client.lastVisit}</p>
                {/if}
              </div>
              <div class="text-right">
                <div class="w-2 h-2 bg-green-400 rounded-full"></div>
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
{#if showClientDetail && selectedClient}
  <ClientDetail 
    client={selectedClient} 
    bind:open={showClientDetail}
    onClose={closeClientDetail}
  />
{/if}

<!-- New Client Form Modal -->
<NewClientForm bind:open={showNewClientForm} />