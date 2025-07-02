<!-- src/routes/(app)/clients/new/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { useClients } from '$lib/stores/client.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const clients = useClients();
  const auth = useAuth();
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
  
  // Validation
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
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim(),
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        zip: formData.zip.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        tags: formData.tags.filter(tag => tag.trim()),
      };
      
      const newClient = await clients.createClient(clientData);
      
      // Select the newly created client
      clients.selectClient(newClient);
      
      // Navigate back to clients list or client detail
      goto('/clients');
      
    } catch (error) {
      console.error('Error creating client:', error);
      errors.general = error instanceof Error ? error.message : 'Failed to create client';
    } finally {
      isLoading = false;
    }
  }
  
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
  
  function goBack() {
    goto('/clients');
  }
</script>

<div class="flex flex-col h-full bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b border-gray-200 p-4">
    <div class="flex items-center space-x-3">
      <button
        onclick={goBack}
        class="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-lg"
        disabled={isLoading}
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div>
        <h1 class="text-xl font-semibold text-gray-900">Add New Client</h1>
        <p class="text-sm text-gray-500">Create a new client profile</p>
      </div>
    </div>
  </div>
  
  <!-- Form -->
  <div class="flex-1 overflow-y-auto p-4">
    <form onsubmit={handleSubmit} class="max-w-2xl space-y-6">
      
      <!-- General Error -->
      {#if errors.general}
        <div class="bg-red-50 border border-red-200 rounded-lg p-3">
          <p class="text-sm text-red-800">{errors.general}</p>
        </div>
      {/if}
      
      <!-- Basic Information -->
      <div class="bg-white rounded-lg p-4 space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">Basic Information</h2>
        
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
      </div>
      
      <!-- Address Information -->
      <div class="bg-white rounded-lg p-4 space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">Address</h2>
        
        <!-- Address -->
        <div>
          <label for="client-address" class="block text-sm font-medium text-gray-700 mb-1">
            Street Address
          </label>
          <textarea
            id="client-address"
            bind:value={formData.address}
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="123 Main St"
            disabled={isLoading}
          ></textarea>
        </div>
        
        <!-- City, State, Zip -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              placeholder="State"
              disabled={isLoading}
            />
          </div>
          <div>
            <label for="client-zip" class="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code
            </label>
            <input
              id="client-zip"
              type="text"
              bind:value={formData.zip}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="12345"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
      
      <!-- Additional Information -->
      <div class="bg-white rounded-lg p-4 space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">Additional Information</h2>
        
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
              class="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
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
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any special notes or instructions about this client"
            disabled={isLoading}
          ></textarea>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="bg-white rounded-lg p-4">
        <div class="flex gap-3">
          <button
            type="button"
            onclick={goBack}
            class="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      </div>
    </form>
  </div>
</div>