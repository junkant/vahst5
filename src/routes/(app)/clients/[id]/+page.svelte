<!-- src/routes/(app)/clients/[id]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useClients } from '$lib/stores/client.svelte';
  import { onMount } from 'svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const clients = useClients();
  
  // Get client ID from route params
  const clientId = $derived($page.params.id);
  
  // State
  let client = $state(null);
  let isLoading = $state(true);
  let error = $state('');
  let isEditing = $state(false);
  let isSaving = $state(false);
  let newTag = $state('');
  let currentClientId = $state('');
  
  // Form data for editing
  let formData = $state({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
    tags: []
  });
  
  // Load client when component mounts
  onMount(async () => {
    await loadClient();
  });
  
  // Watch for client ID changes
  $effect(() => {
    if (clientId && clientId !== currentClientId) {
      currentClientId = clientId;
      loadClient();
    }
  });
  
  async function loadClient() {
    isLoading = true;
    error = '';
    
    try {
      const foundClient = clients.clients.find(c => c.id === clientId);
      
      if (foundClient) {
        client = foundClient;
        // Populate form with existing data
        formData = {
          name: foundClient.name || '',
          email: foundClient.email || '',
          phone: foundClient.phone || '',
          address: foundClient.address || '',
          city: foundClient.city || '',
          state: foundClient.state || '',
          zip: foundClient.zip || '',
          notes: foundClient.notes || '',
          tags: foundClient.tags || []
        };
      } else {
        error = 'Client not found';
        client = null;
      }
    } catch (err) {
      error = 'Failed to load client';
      console.error('Load error:', err);
    } finally {
      isLoading = false;
    }
  }
  
  function toggleEdit() {
    if (isEditing) {
      // Cancel editing - restore original values
      formData = {
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zip: client.zip || '',
        notes: client.notes || '',
        tags: client.tags || []
      };
    }
    isEditing = !isEditing;
  }
  
  async function handleSave() {
    if (!formData.name.trim()) {
      error = 'Client name is required';
      return;
    }
    
    try {
      isSaving = true;
      error = '';
      
      await clients.updateClient(client.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zip: formData.zip.trim(),
        notes: formData.notes.trim(),
        tags: formData.tags
      });
      
      // Update local client object
      client = {
        ...client,
        ...formData
      };
      
      isEditing = false;
    } catch (err) {
      error = err.message || 'Failed to update client';
      console.error('Update error:', err);
    } finally {
      isSaving = false;
    }
  }
  
  function addTag() {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      formData.tags = [...formData.tags, newTag.trim()];
      newTag = '';
    }
  }
  
  function removeTag(tag: string) {
    formData.tags = formData.tags.filter(t => t !== tag);
  }
  
  function goBack() {
    goto('/clients');
  }
  
  function callClient() {
    if (client?.phone) {
      window.location.href = `tel:${client.phone}`;
    }
  }
  
  function emailClient() {
    if (client?.email) {
      window.location.href = `mailto:${client.email}`;
    }
  }
  
  function getDirections() {
    if (client?.address) {
      // Build full address string
      const fullAddress = [
        client.address,
        client.city,
        client.state,
        client.zip
      ].filter(Boolean).join(', ');
      
      window.open(`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`, '_blank');
    }
  }
  
  function startJob() {
    goto(`/jobs/new?client=${client.id}`);
  }
</script>

<div class="flex flex-col h-full bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b border-gray-200 p-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <button
          onclick={goBack}
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <Icon name="chevronLeft" class="w-5 h-5" />
        </button>
        <h1 class="text-xl font-semibold text-gray-900">
          {isLoading ? 'Loading...' : client ? client.name : 'Client Details'}
        </h1>
      </div>
      
      {#if !isLoading && client}
        <button
          onclick={toggleEdit}
          class="px-4 py-2 {isEditing ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white'} rounded-lg font-medium transition-colors hover:opacity-90"
          disabled={isSaving}
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      {/if}
    </div>
  </div>
  
  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4">
    {#if isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    {:else if error && !client}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{error}</p>
        <button 
          onclick={goBack}
          class="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Go back to clients
        </button>
      </div>
    {:else if client}
      <div class="space-y-4">
        <!-- Error Display -->
        {#if error}
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-sm text-red-800">{error}</p>
          </div>
        {/if}
        
        <!-- Quick Actions (visible when not editing) -->
        {#if !isEditing}
          <div class="bg-white rounded-lg p-4">
            <h2 class="font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onclick={startJob}
                class="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex flex-col items-center"
              >
                <Icon name="plus" class="w-5 h-5 mb-1" />
                <span class="text-sm">New Job</span>
              </button>
              
              <button
                onclick={callClient}
                class="p-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors flex flex-col items-center"
                disabled={!client.phone}
              >
                <Icon name="phone" class="w-5 h-5 mb-1" size={2} />
                <span class="text-sm">Call</span>
              </button>
              
              <button
                onclick={emailClient}
                class="p-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors flex flex-col items-center"
                disabled={!client.email}
              >
                <Icon name="mail" class="w-5 h-5 mb-1" size={2} />
                <span class="text-sm">Email</span>
              </button>
              
              <button
                onclick={getDirections}
                class="p-3 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors flex flex-col items-center"
                disabled={!client.address}
              >
                <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span class="text-sm">Directions</span>
              </button>
            </div>
          </div>
        {/if}
        
        <!-- Client Information -->
        <div class="bg-white rounded-lg p-4 space-y-4">
          <h2 class="font-semibold text-gray-900">Client Information</h2>
          
          {#if isEditing}
            <!-- Edit Mode -->
            <div class="space-y-4">
              <!-- Name -->
              <div>
                <label for="client-name" class="block text-sm font-medium text-gray-700 mb-1">
                  Name <span class="text-red-500">*</span>
                </label>
                <input
                  id="client-name"
                  type="text"
                  bind:value={formData.name}
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isSaving}
                />
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSaving}
                />
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSaving}
                />
              </div>
              
              <!-- Address -->
              <div>
                <label for="client-address" class="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  id="client-address"
                  type="text"
                  bind:value={formData.address}
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSaving}
                />
              </div>
              
              <!-- City, State, Zip Row -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <!-- City -->
                <div>
                  <label for="client-city" class="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    id="client-city"
                    type="text"
                    bind:value={formData.city}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSaving}
                  />
                </div>
                
                <!-- State -->
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
                    disabled={isSaving}
                  />
                </div>
                
                <!-- Zip -->
                <div>
                  <label for="client-zip" class="block text-sm font-medium text-gray-700 mb-1">
                    Zip Code
                  </label>
                  <input
                    id="client-zip"
                    type="text"
                    bind:value={formData.zip}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="12345"
                    disabled={isSaving}
                  />
                </div>
              </div>
              
              <!-- Tags -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                {#if formData.tags.length > 0}
                  <div class="flex flex-wrap gap-2 mb-2">
                    {#each formData.tags as tag}
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tag}
                        <button
                          type="button"
                          onclick={() => removeTag(tag)}
                          class="ml-1 hover:text-blue-600"
                          disabled={isSaving}
                        >
                          ×
                        </button>
                      </span>
                    {/each}
                  </div>
                {/if}
                <div class="flex gap-2">
                  <input
                    type="text"
                    bind:value={newTag}
                    onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add a tag"
                    disabled={isSaving}
                  />
                  <button
                    type="button"
                    onclick={addTag}
                    class="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    disabled={isSaving}
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
                  disabled={isSaving}
                ></textarea>
              </div>
              
              <!-- Save Button -->
              <div class="pt-4">
                <button
                  onclick={handleSave}
                  class="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          {:else}
            <!-- View Mode -->
            <div class="space-y-3">
              <div>
                <p class="text-sm text-gray-500">Email</p>
                <p class="font-medium text-gray-900">{client.email || 'Not provided'}</p>
              </div>
              
              <div>
                <p class="text-sm text-gray-500">Phone</p>
                <p class="font-medium text-gray-900">{client.phone || 'Not provided'}</p>
              </div>
              
              <div>
                <p class="text-sm text-gray-500">Address</p>
                <p class="font-medium text-gray-900">
                  {#if client.address}
                    {client.address}<br>
                    {#if client.city || client.state || client.zip}
                      {[client.city, client.state, client.zip].filter(Boolean).join(', ')}
                    {/if}
                  {:else}
                    Not provided
                  {/if}
                </p>
              </div>
              
              {#if client.tags && client.tags.length > 0}
                <div>
                  <p class="text-sm text-gray-500 mb-2">Tags</p>
                  <div class="flex flex-wrap gap-2">
                    {#each client.tags as tag}
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tag}
                      </span>
                    {/each}
                  </div>
                </div>
              {/if}
              
              {#if client.notes}
                <div>
                  <p class="text-sm text-gray-500">Notes</p>
                  <p class="font-medium text-gray-900 whitespace-pre-wrap">{client.notes}</p>
                </div>
              {/if}
            </div>
          {/if}
        </div>
        
        <!-- Job History -->
        {#if !isEditing}
          <div class="bg-white rounded-lg p-4">
            <h2 class="font-semibold text-gray-900 mb-3">Recent Jobs</h2>
            <p class="text-sm text-gray-500">No jobs yet</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>