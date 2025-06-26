<script>
  let { open = $bindable(false) } = $props();
  
  // Form state
  let formData = $state({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });
  
  function handleSubmit(event) {
    event.preventDefault();
    console.log('Creating new client:', formData);
    // TODO: Implement actual client creation
    open = false;
    
    // Reset form
    formData = {
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: ''
    };
  }
  
  function closeDialog() {
    open = false;
  }
  
  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  }
</script>

{#if open}
  <!-- Overlay -->
  <div 
    class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
    onclick={handleOverlayClick}
    onkeydown={(e) => e.key === 'Escape' && closeDialog()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="client-form-title"
  >
    <!-- Modal -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 id="client-form-title" class="text-xl font-semibold">Add New Client</h2>
        <button 
          onclick={closeDialog}
          class="text-gray-400 hover:text-gray-600"
          aria-label="Close form"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Form -->
      <form onsubmit={handleSubmit} class="p-4 space-y-4">
        <div>
          <label for="client-name" class="block text-sm font-medium text-gray-700 mb-1">
            Client Name *
          </label>
          <input
            id="client-name"
            type="text"
            bind:value={formData.name}
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter client name"
          />
        </div>
        
        <div>
          <label for="client-email" class="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="client-email"
            type="email"
            bind:value={formData.email}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="client@example.com"
          />
        </div>
        
        <div>
          <label for="client-phone" class="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            id="client-phone"
            type="tel"
            bind:value={formData.phone}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="(555) 123-4567"
          />
        </div>
        
        <div>
          <label for="client-address" class="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <textarea
            id="client-address"
            bind:value={formData.address}
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="123 Main St, City, State"
          ></textarea>
        </div>
        
        <div>
          <label for="client-notes" class="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="client-notes"
            bind:value={formData.notes}
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any special notes or instructions"
          ></textarea>
        </div>
        
        <div class="flex gap-3 pt-4">
          <button
            type="button"
            onclick={closeDialog}
            class="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Client
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}