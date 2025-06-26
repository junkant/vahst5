<!-- src/routes/+page.svelte -->
<script>
import { createDialog, createAccordion, melt } from '@melt-ui/svelte';

// Mock data for the demo
const currentUser = { name: "Mike Thompson", role: "Field Technician" };
const currentTenant = { name: "Joe's HVAC", plan: "Professional" };

// Today's clients data
const todaysClients = [
  {
    id: 1,
    name: "Johnson Residence",
    address: "123 Oak Street",
    phone: "(555) 123-4567",
    status: "scheduled",
    time: "9:00 AM",
    service: "AC Repair",
    priority: "high",
    equipment: ["Carrier AC Unit - 2019", "Thermostat - Nest"],
    lastVisit: "2 weeks ago",
    notes: "Gate code: 1234. Dog in backyard."
  },
  {
    id: 2,
    name: "Smith Office Building",
    address: "456 Business Park Dr",
    phone: "(555) 234-5678",
    status: "in-progress",
    time: "11:30 AM",
    service: "Maintenance Check",
    priority: "medium",
    equipment: ["Commercial HVAC - 2020", "Backup Generator"],
    lastVisit: "1 month ago",
    notes: "Contact building manager first."
  },
  {
    id: 3,
    name: "Williams Family",
    address: "789 Maple Avenue",
    phone: "(555) 345-6789",
    status: "pending",
    time: "2:00 PM",
    service: "Installation",
    priority: "low",
    equipment: [],
    lastVisit: "Never",
    notes: "New customer - heat pump installation."
  }
];

// State management
let activeTab = 'clients';
let selectedClient = null;

// UI Components
const {
  elements: { trigger: clientTrigger, overlay: clientOverlay, content: clientContent, close: clientClose },
  states: { open: clientOpen }
} = createDialog({ closeOnOutsideClick: true });

const {
  elements: { trigger: quickTrigger, overlay: quickOverlay, content: quickContent, close: quickClose },
  states: { open: quickOpen }
} = createDialog({ closeOnOutsideClick: true });

const {
  elements: { root: accordionRoot, item: accordionItem, trigger: accordionTrigger, content: accordionContent },
  helpers: { isSelected }
} = createAccordion({
  type: 'multiple',
  defaultValue: ['info']
});

// Functions
function selectClient(client) {
  selectedClient = client;
  clientOpen.set(true);
}

function getStatusColor(status) {
  switch(status) {
    case 'scheduled': return 'bg-blue-100 text-blue-800';
    case 'in-progress': return 'bg-green-100 text-green-800';
    case 'completed': return 'bg-gray-100 text-gray-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getPriorityColor(priority) {
  switch(priority) {
    case 'high': return 'border-l-red-500';
    case 'medium': return 'border-l-yellow-500';
    case 'low': return 'border-l-green-500';
    default: return 'border-l-gray-500';
  }
}

// Mock functions for demo
function startJob(client) {
  console.log('Starting job for:', client.name);
  clientOpen.set(false);
}

function callClient(client) {
  console.log('Calling:', client.phone);
}

function getDirections(client) {
  console.log('Getting directions to:', client.address);
}
</script>

<!-- Main App Container -->
<div class="h-screen bg-gray-50 flex flex-col overflow-hidden">
  
  <!-- Header -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-sm">V</span>
        </div>
        <div>
          <h1 class="text-lg font-semibold text-gray-900">Vahst</h1>
          <p class="text-xs text-gray-500">{currentTenant.name}</p>
        </div>
      </div>
      
      <div class="flex items-center space-x-3">
        <span class="text-sm text-gray-600">Welcome, {currentUser.name}</span>
        <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <span class="text-gray-600 text-sm font-medium">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content Area -->
  <main class="flex-1 overflow-hidden">
    
    {#if activeTab === 'clients'}
      <!-- Clients View -->
      <div class="h-full overflow-y-auto pb-20">
        <div class="p-4">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-900">Today's Schedule</h2>
            <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              {todaysClients.length} clients
            </span>
          </div>
          
          <!-- Client Cards -->
          <div class="space-y-3">
            {#each todaysClients as client}
              <button 
                class="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 border-l-4 {getPriorityColor(client.priority)} hover:shadow-md transition-shadow text-left"
                on:click={() => selectClient(client)}
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
                    <p class="text-sm text-gray-500">{client.time} • {client.service}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-medium text-gray-900">{client.time}</p>
                    <p class="text-xs text-gray-500">{client.priority} priority</p>
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
        </div>
      </div>
      
    {:else if activeTab === 'schedule'}
      <!-- Schedule View -->
      <div class="h-full flex items-center justify-center">
        <div class="text-center p-8">
          <div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-2xl">📅</span>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Schedule View</h3>
          <p class="text-gray-500">Calendar and route optimization coming soon</p>
        </div>
      </div>
      
    {:else if activeTab === 'jobs'}
      <!-- Jobs View -->
      <div class="h-full flex items-center justify-center">
        <div class="text-center p-8">
          <div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-2xl">🔧</span>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Active Jobs</h3>
          <p class="text-gray-500">Job management interface coming soon</p>
        </div>
      </div>
      
    {:else if activeTab === 'more'}
      <!-- More/Tools View -->
      <div class="p-4 pb-20">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Tools & Settings</h2>
        
        <div class="grid grid-cols-2 gap-4">
          <!-- Tool Cards -->
          <button class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <span class="text-xl">💰</span>
            </div>
            <h3 class="font-medium text-gray-900">Invoicing</h3>
            <p class="text-xs text-gray-500 mt-1">Generate & send invoices</p>
          </button>
          
          <button class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <span class="text-xl">📊</span>
            </div>
            <h3 class="font-medium text-gray-900">Reports</h3>
            <p class="text-xs text-gray-500 mt-1">Performance analytics</p>
          </button>
          
          <button class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <span class="text-xl">⚙️</span>
            </div>
            <h3 class="font-medium text-gray-900">Settings</h3>
            <p class="text-xs text-gray-500 mt-1">App preferences</p>
          </button>
          
          <button class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <span class="text-xl">🆘</span>
            </div>
            <h3 class="font-medium text-gray-900">Support</h3>
            <p class="text-xs text-gray-500 mt-1">Help & contact</p>
          </button>
        </div>
      </div>
    {/if}
  </main>

  <!-- Bottom Navigation Dock -->
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
    <div class="flex items-center justify-around">
      
      <!-- Clients Tab -->
      <button 
        class="flex flex-col items-center py-2 px-3 rounded-lg transition-colors {activeTab === 'clients' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}"
        on:click={() => activeTab = 'clients'}
      >
        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span class="text-xs">Clients</span>
      </button>
      
      <!-- Schedule Tab -->
      <button 
        class="flex flex-col items-center py-2 px-3 rounded-lg transition-colors {activeTab === 'schedule' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}"
        on:click={() => activeTab = 'schedule'}
      >
        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="text-xs">Schedule</span>
      </button>
      
      <!-- Quick Action (Center) -->
      <button 
        use:melt={$quickTrigger}
        class="flex flex-col items-center py-2 px-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
      
      <!-- Jobs Tab -->
      <button 
        class="flex flex-col items-center py-2 px-3 rounded-lg transition-colors {activeTab === 'jobs' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}"
        on:click={() => activeTab = 'jobs'}
      >
        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span class="text-xs">Jobs</span>
      </button>
      
      <!-- More Tab -->
      <button 
        class="flex flex-col items-center py-2 px-3 rounded-lg transition-colors {activeTab === 'more' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}"
        on:click={() => activeTab = 'more'}
      >
        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
        <span class="text-xs">More</span>
      </button>
      
    </div>
  </nav>
</div>

<!-- Client Details Dialog -->
{#if $clientOpen && selectedClient}
  <div use:melt={$clientOverlay} class="fixed inset-0 bg-black bg-opacity-50 z-40"></div>
  <div 
    use:melt={$clientContent}
    class="fixed inset-x-4 top-20 bottom-20 bg-white rounded-lg shadow-xl z-50 overflow-hidden flex flex-col"
  >
    <!-- Dialog Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-900">{selectedClient.name}</h2>
      <button use:melt={$clientClose} class="text-gray-400 hover:text-gray-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    
    <!-- Dialog Content -->
    <div class="flex-1 overflow-y-auto">
      <div use:melt={$accordionRoot} class="divide-y divide-gray-200">
        
        <!-- Client Info Section -->
        <div use:melt={$accordionItem('info')}>
          <button 
            use:melt={$accordionTrigger('info')}
            class="w-full px-4 py-3 text-left font-medium hover:bg-gray-50 flex justify-between items-center"
          >
            Client Information
            <span class="transform transition-transform {$isSelected('info') ? 'rotate-180' : ''}">▼</span>
          </button>
          {#if $isSelected('info')}
            <div use:melt={$accordionContent('info')} class="px-4 py-3 bg-gray-50 space-y-3">
              <div>
                <p class="text-sm font-medium text-gray-900">Address</p>
                <p class="text-sm text-gray-600">{selectedClient.address}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900">Phone</p>
                <p class="text-sm text-gray-600">{selectedClient.phone}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900">Last Visit</p>
                <p class="text-sm text-gray-600">{selectedClient.lastVisit}</p>
              </div>
              {#if selectedClient.notes}
                <div>
                  <p class="text-sm font-medium text-gray-900">Notes</p>
                  <p class="text-sm text-gray-600">{selectedClient.notes}</p>
                </div>
              {/if}
            </div>
          {/if}
        </div>
        
        <!-- Equipment Section -->
        <div use:melt={$accordionItem('equipment')}>
          <button 
            use:melt={$accordionTrigger('equipment')}
            class="w-full px-4 py-3 text-left font-medium hover:bg-gray-50 flex justify-between items-center"
          >
            Equipment ({selectedClient.equipment.length})
            <span class="transform transition-transform {$isSelected('equipment') ? 'rotate-180' : ''}">▼</span>
          </button>
          {#if $isSelected('equipment')}
            <div use:melt={$accordionContent('equipment')} class="px-4 py-3 bg-gray-50">
              {#if selectedClient.equipment.length > 0}
                <div class="space-y-2">
                  {#each selectedClient.equipment as equipment}
                    <div class="bg-white p-3 rounded border border-gray-200">
                      <p class="text-sm font-medium text-gray-900">{equipment}</p>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="text-sm text-gray-500">No equipment registered</p>
              {/if}
            </div>
          {/if}
        </div>
        
        <!-- Service History Section -->
        <div use:melt={$accordionItem('history')}>
          <button 
            use:melt={$accordionTrigger('history')}
            class="w-full px-4 py-3 text-left font-medium hover:bg-gray-50 flex justify-between items-center"
          >
            Service History
            <span class="transform transition-transform {$isSelected('history') ? 'rotate-180' : ''}">▼</span>
          </button>
          {#if $isSelected('history')}
            <div use:melt={$accordionContent('history')} class="px-4 py-3 bg-gray-50">
              <p class="text-sm text-gray-500">Service history will appear here</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
    
    <!-- Action Buttons -->
    <div class="p-4 border-t border-gray-200 space-y-2">
      <button 
        on:click={() => startJob(selectedClient)}
        class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
      >
        Start Job
      </button>
      <div class="grid grid-cols-2 gap-2">
        <button 
          on:click={() => callClient(selectedClient)}
          class="bg-green-100 hover:bg-green-200 text-green-800 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
        >
          📞 Call
        </button>
        <button 
          on:click={() => getDirections(selectedClient)}
          class="bg-blue-100 hover:bg-blue-200 text-blue-800 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
        >
          🗺️ Directions
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Quick Actions Dialog -->
{#if $quickOpen}
  <div use:melt={$quickOverlay} class="fixed inset-0 bg-black bg-opacity-50 z-40"></div>
  <div 
    use:melt={$quickContent}
    class="fixed bottom-24 left-4 right-4 bg-white rounded-lg shadow-xl z-50 p-4"
  >
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
    <div class="grid grid-cols-2 gap-3">
      <button class="bg-blue-100 hover:bg-blue-200 text-blue-800 py-3 px-4 rounded-lg text-sm font-medium transition-colors">
        📝 New Job
      </button>
      <button class="bg-green-100 hover:bg-green-200 text-green-800 py-3 px-4 rounded-lg text-sm font-medium transition-colors">
        ➕ Add Client
      </button>
      <button class="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-3 px-4 rounded-lg text-sm font-medium transition-colors">
        💰 Create Invoice
      </button>
      <button class="bg-purple-100 hover:bg-purple-200 text-purple-800 py-3 px-4 rounded-lg text-sm font-medium transition-colors">
        📊 View Reports
      </button>
    </div>
    <button 
      use:melt={$quickClose}
      class="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
    >
      Cancel
    </button>
  </div>
{/if}