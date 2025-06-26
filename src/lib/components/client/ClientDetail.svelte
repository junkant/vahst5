<script>
  import { createDialog, createAccordion, melt } from '@melt-ui/svelte';
  
  let { 
    client = $bindable(), 
    open = $bindable(false),
    onClose = () => {}
  } = $props();
  
  const dialog = createDialog({
    forceVisible: open,
    onOpenChange: ({ curr }) => {
      open = curr;
      if (!curr) onClose();
      return curr;
    }
  });
  
  const {
    elements: { root: accordionRoot, item: accordionItem, trigger: accordionTrigger, content: accordionContent },
    helpers: { isSelected }
  } = createAccordion({
    type: 'multiple',
    defaultValue: ['info']
  });
  
  // Functions
  function startJob() {
    console.log('Starting job for:', client.name);
    open = false;
  }
  
  function callClient() {
    if (client.phone) {
      window.open(`tel:${client.phone}`);
    }
  }
  
  function getDirections() {
    if (client.address) {
      const encodedAddress = encodeURIComponent(client.address);
      window.open(`https://maps.google.com/?q=${encodedAddress}`);
    }
  }
  
  function emailClient() {
    if (client.email) {
      window.open(`mailto:${client.email}`);
    }
  }
</script>

{#if $dialog.states.open && client}
  <div use:melt={$dialog.elements.overlay} class="fixed inset-0 bg-black bg-opacity-50 z-40"></div>
  <div 
    use:melt={$dialog.elements.content}
    class="fixed inset-x-4 top-20 bottom-20 bg-white rounded-lg shadow-xl z-50 overflow-hidden flex flex-col"
  >
    <!-- Dialog Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-900">{client.name}</h2>
      <button 
        use:melt={$dialog.elements.close} 
        class="text-gray-400 hover:text-gray-600"
        aria-label="Close client details"
      >
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
                <p class="text-sm text-gray-600">{client.address}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900">Phone</p>
                <p class="text-sm text-gray-600">{client.phone}</p>
              </div>
              {#if client.email}
                <div>
                  <p class="text-sm font-medium text-gray-900">Email</p>
                  <p class="text-sm text-gray-600">{client.email}</p>
                </div>
              {/if}
              <div>
                <p class="text-sm font-medium text-gray-900">Last Visit</p>
                <p class="text-sm text-gray-600">{client.lastVisit}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900">Status</p>
                <span class="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                  {client.status}
                </span>
              </div>
              {#if client.notes}
                <div>
                  <p class="text-sm font-medium text-gray-900">Notes</p>
                  <p class="text-sm text-gray-600">{client.notes}</p>
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
            Equipment ({client.equipment?.length || 0})
            <span class="transform transition-transform {$isSelected('equipment') ? 'rotate-180' : ''}">▼</span>
          </button>
          {#if $isSelected('equipment')}
            <div use:melt={$accordionContent('equipment')} class="px-4 py-3 bg-gray-50">
              {#if client.equipment && client.equipment.length > 0}
                <div class="space-y-2">
                  {#each client.equipment as equipment}
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
        onclick={startJob}
        class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
      >
        Start Job
      </button>
      <div class="grid grid-cols-3 gap-2">
        <button 
          onclick={callClient}
          class="bg-green-100 hover:bg-green-200 text-green-800 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          aria-label="Call client"
        >
          📞 Call
        </button>
        <button 
          onclick={emailClient}
          class="bg-blue-100 hover:bg-blue-200 text-blue-800 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          aria-label="Email client"
        >
          ✉️ Email
        </button>
        <button 
          onclick={getDirections}
          class="bg-purple-100 hover:bg-purple-200 text-purple-800 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          aria-label="Get directions"
        >
          🗺️ Directions
        </button>
      </div>
    </div>
  </div>
{/if}