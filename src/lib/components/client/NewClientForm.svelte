<!-- src/lib/components/client/NewClientForm.svelte -->
<script lang="ts">
  import { useClients } from '$lib/stores/client.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  let { open = $bindable(false) } = $props();
  
  const clients = useClients();
  const tenant = useTenant();
  
  // Form state
  let formData = $state({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
    tags: [] as string[],
    status: 'active' as 'active' | 'inactive'
  });
  
  let isLoading = $state(false);
  let errors = $state<Record<string, string>>({});
  let tagInput = $state('');
  
  // Validation functions
  function validateForm() {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    }
    
    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    
    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }
  
  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  function isValidPhone(phone: string): boolean {
    return /^[\d\s\-\(\)\+]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }
  
  async function handleSubmit(event: Event) {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (!tenant.current) {
      errors.general = 'No business selected. Please select a business first.';
      return;
    }
    
    isLoading = true;
    errors = {};
    
    try {
      const clientData = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim(),
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        zip: formData.zip.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        tags: formData.tags.filter(tag => tag.trim()),
        status: formData.status
      };
      
      const newClient = await clients.createClient(clientData);
      
      // Select the newly created client
      clients.selectClient(newClient);
      
      // Reset form
      resetForm();
      
      // Close modal
      open = false;
      
      console.log('✅ Client created and selected:', newClient.name);
      
    } catch (error) {
      console.error('❌ Error creating client:', error);
      errors.general = error instanceof Error ? error.message : 'Failed to create client';
    } finally {
      isLoading = false;
    }
  }
  
  function resetForm() {
    formData = {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      notes: '',
      tags: [],
      status: 'active'
    };
    tagInput = '';
    errors = {};
  }
  
  function closeDialog() {
    if (!isLoading) {
      resetForm();
      open = false;
    }
  }
  
  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !isLoading) {
      closeDialog();
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !isLoading) {
      closeDialog();
    }
  }
  
  // Tag management
  function addTag() {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      formData.tags = [...formData.tags, tag];
      tagInput = '';
    }
  }
  
  function removeTag(tagToRemove: string) {
    formData.tags = formData.tags.filter(tag => tag !== tagToRemove);
  }
  
  function handleTagKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag();
    }
  }
</script>

{#if open}
  <!-- Overlay -->
  <div 
    class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
    onclick={handleOverlayClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="client-form-title"
  >
    <!-- Modal -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 id="client-form-title" class="text-xl font-semibold">Add New Client</h2>
        <button 
          onclick={closeDialog}
          class="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          aria-label="Close form"
          disabled={isLoading}
        >
          <Icon name="close" class="w-6 h-6" />
        </button>
      </div>
      
      <!-- Form -->
      <div class="overflow-y-auto max-h-[calc(90vh-140px)]">
        <form onsubmit={handleSubmit} class="p-4 space-y-4">
          
          <!-- General Error -->
          {#if errors.general}
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
              <p class="text-sm text-red-800">{errors.general}</p>
            </div>
          {/if}
          
          <!-- Client Name -->
          <div>
            <label for="client-name" class="block text-sm font-medium text-gray-700 mb-1">
              Client Name *
            </label>
            <input
              id="client-name"
              type="text"
              bind:value={formData.name}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.name ? 'border-red-300' : ''}"
              placeholder="Enter client name"
              disabled={isLoading}
              required
            />
            {#if errors.name}
              <p class="text-sm text-red-600 mt-1">{errors.name}</p>
            {/if}
          </div>
          
          <!-- Email -->
          <div>
            <label for="client-email" class="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="client-email"
              type="email"
              bind:value={formData.email}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.email ? 'border-red-300' : ''}"
              placeholder="client@example.com"
              disabled={isLoading}
            />
            {#if errors.email}
              <p class="text-sm text-red-600 mt-1">{errors.email}</p>
            {/if}
          </div>
          
          <!-- Phone -->
          <div>
            <label for="client-phone" class="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              id="client-phone"
              type="tel"
              bind:value={formData.phone}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.phone ? 'border-red-300' : ''}"
              placeholder="(555) 123-4567"
              disabled={isLoading}
            />
            {#if errors.phone}
              <p class="text-sm text-red-600 mt-1">{errors.phone}</p>
            {/if}
          </div>
          
          <!-- Address -->
          <div>
            <label for="client-address" class="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <textarea
              id="client-address"
              bind:value={formData.address}
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 {errors.address ? 'border-red-300' : ''}"
              placeholder="123 Main St"
              disabled={isLoading}
              required
            ></textarea>
            {#if errors.address}
              <p class="text-sm text-red-600 mt-1">{errors.address}</p>
            {/if}
          </div>
          
          <!-- City, State, Zip -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="client-city" class="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                id="client-city"
                type="text"
                bind:value={formData.city}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="City"
                disabled={isLoading}
              />
            </div>
            <div>
              <label for="client-state" class="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                id="client-state"
                type="text"
                bind:value={formData.state}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="NC"
                disabled={isLoading}
              />
            </div>
          </div>
          
          <!-- ZIP -->
          <div>
            <label for="client-zip" class="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code
            </label>
            <input
              id="client-zip"
              type="text"
              bind:value={formData.zip}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="28202"
              disabled={isLoading}
            />
          </div>
          
          <!-- Tags -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div class="flex flex-wrap gap-2 mb-2">
              {#each formData.tags as tag}
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  {tag}
                  <button
                    type="button"
                    onclick={() => removeTag(tag)}
                    class="ml-1 text-blue-600 hover:text-blue-800"
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </span>
              {/each}
            </div>
            <div class="flex space-x-2">
              <input
                bind:value={tagInput}
                onkeydown={handleTagKeydown}
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a tag and press Enter"
                disabled={isLoading}
              />
              <button
                type="button"
                onclick={addTag}
                class="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                disabled={isLoading}
              >
                Add
              </button>
            </div>
          </div>
          
          <!-- Notes -->
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
              disabled={isLoading}
            ></textarea>
          </div>
          
          <!-- Status -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <div class="flex space-x-4">
              <label class="flex items-center">
                <input
                  type="radio"
                  bind:group={formData.status}
                  value="active"
                  class="mr-2"
                  disabled={isLoading}
                />
                <span class="text-sm text-gray-700">Active</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  bind:group={formData.status}
                  value="inactive"
                  class="mr-2"
                  disabled={isLoading}
                />
                <span class="text-sm text-gray-700">Inactive</span>
              </label>
            </div>
          </div>
        </form>
      </div>
      
      <!-- Footer -->
      <div class="border-t border-gray-200 p-4">
        <div class="flex gap-3">
          <button
            type="button"
            onclick={closeDialog}
            class="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            onclick={handleSubmit}
            class="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}