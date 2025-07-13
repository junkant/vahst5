<!-- src/lib/components/client/ClientDetail.svelte -->
<!--
  @component ClientDetail
  @description Optimized modal for viewing and editing client details with lazy loaded sections
  @usage <ClientDetail {client} bind:open />
-->
<script lang="ts">
  import { useClients } from '$lib/stores/client.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
  import { onMount } from 'svelte';
  import type { Client } from '$lib/stores/client.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import PermissionGate from '$lib/components/permissions/PermissionGate.svelte';
  
  interface Props {
    client: Client;
    open: boolean;
  }
  
  let { client, open = $bindable(false) }: Props = $props();
  
  const clients = useClients();
  const toast = useToast();
  
  // State management
  let isEditing = $state(false);
  let editedClient = $state({ ...client });
  let isLoading = $state(false);
  let isSaving = $state(false);
  
  // Lazy loaded components with proper typing
  let ClientHistory = $state<any>(null);
  let ClientTasks = $state<any>(null);
  let ClientNotes = $state<any>(null);
  
  // Track expanded sections with only info open by default
  let expandedSections = $state({
    info: true,
    history: false,
    jobs: false,
    notes: false
  });
  
  // Performance monitoring in dev
  let renderStart = 0;
  if (import.meta.env.DEV) {
    renderStart = performance.now();
  }
  
  // Update editedClient when client prop changes
  $effect(() => {
    if (client) {
      editedClient = { ...client };
    }
  });
  
  // Handle save with optimistic updates
  async function handleSave() {
    if (isSaving) return;
    
    isSaving = true;
    
    // Validate required fields
    if (!editedClient.name?.trim()) {
      toast.error('Client name is required');
      isSaving = false;
      return;
    }
    
    if (!editedClient.address?.trim()) {
      toast.error('Client address is required');
      isSaving = false;
      return;
    }
    
    try {
      await clients.updateClient(editedClient.id, editedClient);
      toast.success('Client updated successfully');
      isEditing = false;
      
      // Update the original client object
      Object.assign(client, editedClient);
    } catch (error) {
      toast.error('Failed to update client');
      console.error('Update error:', error);
    } finally {
      isSaving = false;
    }
  }
  
  // Handle delete with confirmation
  async function handleDelete() {
    if (isLoading) return;
    
    const confirmed = confirm(
      `Are you sure you want to delete ${client.name}? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    isLoading = true;
    try {
      await clients.deleteClient(client.id);
      toast.success('Client deleted successfully');
      open = false;
    } catch (error) {
      toast.error('Failed to delete client');
      console.error('Delete error:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Lazy load heavy sections with error handling
  async function toggleSection(section: keyof typeof expandedSections) {
    expandedSections[section] = !expandedSections[section];
    
    // Load components on demand
    if (expandedSections[section]) {
      try {
        switch (section) {
          case 'history':
            if (!ClientHistory) {
              const module = await import('./ClientHistory.svelte');
              ClientHistory = module.default;
            }
            break;
          case 'jobs':
            if (!ClientTasks) {
              const module = await import('./ClientTasks.svelte');
              ClientTasks = module.default;
            }
            break;
          case 'notes':
            if (!ClientNotes) {
              const module = await import('./ClientNotes.svelte');
              ClientNotes = module.default;
            }
            break;
        }
      } catch (error) {
        console.error(`Failed to load ${section} component:`, error);
        toast.error(`Failed to load ${section} section`);
        expandedSections[section] = false;
      }
    }
  }
  
  // Cancel editing
  function cancelEdit() {
    if (!isSaving) {
      isEditing = false;
      editedClient = { ...client };
    }
  }
  
  // Close modal with cleanup
  function closeModal() {
    if (!isLoading && !isSaving) {
      open = false;
      isEditing = false;
      editedClient = { ...client };
      
      // Reset expanded sections for next open
      expandedSections = {
        info: true,
        history: false,
        jobs: false,
        notes: false
      };
    }
  }
  
  // Handle escape key
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !isEditing) {
      closeModal();
    }
  }
  
  // Cleanup on unmount
  $effect(() => {
    return () => {
      if (isEditing) {
        isEditing = false;
      }
    };
  });
  
  // Performance monitoring
  if (import.meta.env.DEV) {
    onMount(() => {
      console.log(`✨ ClientDetail mounted in ${performance.now() - renderStart}ms`);
    });
  }
</script>

{#if open}
  <div 
    class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    onclick={(e) => e.target === e.currentTarget && closeModal()}
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="client-detail-title"
    tabindex="-1"
  >
    <div class="bg-white w-full sm:max-w-2xl sm:rounded-xl rounded-t-xl max-h-[90vh] flex flex-col animate-slide-up sm:animate-fade-in">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 id="client-detail-title" class="text-xl font-semibold text-gray-900">
          {isEditing ? 'Edit Client' : 'Client Details'}
        </h2>
        <div class="flex items-center gap-2">
          {#if !isEditing}
            <PermissionGate action="user_management_edit_client">
              <button
                onclick={() => isEditing = true}
                class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Edit client"
                disabled={isLoading}
              >
                <Icon name="edit" class="w-5 h-5" size={2} />
              </button>
            </PermissionGate>
          {/if}
          <button 
            onclick={closeModal}
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
            disabled={isLoading || isSaving}
          >
            <Icon name="close" class="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>
      
      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto">
        <!-- Basic Info Section -->
        <div class="p-4">
          <button
            onclick={() => toggleSection('info')}
            class="w-full flex items-center justify-between text-left mb-4"
          >
            <h3 class="text-lg font-medium text-gray-900">Basic Information</h3>
            <Icon name="chevronDown" class="w-5 h-5 text-gray-400 transition-transform {expandedSections.info ? 'rotate-180' : ''}" />
          </button>
          
          {#if expandedSections.info}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-expand">
              <!-- Name -->
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Name <span class="text-red-500">*</span>
                </label>
                {#if isEditing}
                  <input
                    type="text"
                    bind:value={editedClient.name}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSaving}
                    required
                  />
                {:else}
                  <p class="text-gray-900 font-medium">{client.name}</p>
                {/if}
              </div>
              
              <!-- Email -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                {#if isEditing}
                  <input
                    type="email"
                    bind:value={editedClient.email}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSaving}
                    placeholder="client@example.com"
                  />
                {:else}
                  <p class="text-gray-900">
                    {#if client.email}
                      <a href="mailto:{client.email}" class="text-blue-600 hover:underline">
                        {client.email}
                      </a>
                    {:else}
                      <span class="text-gray-500">Not provided</span>
                    {/if}
                  </p>
                {/if}
              </div>
              
              <!-- Phone -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                {#if isEditing}
                  <input
                    type="tel"
                    bind:value={editedClient.phone}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSaving}
                    placeholder="(123) 456-7890"
                  />
                {:else}
                  <p class="text-gray-900">
                    {#if client.phone}
                      <a href="tel:{client.phone}" class="text-blue-600 hover:underline">
                        {client.phone}
                      </a>
                    {:else}
                      <span class="text-gray-500">Not provided</span>
                    {/if}
                  </p>
                {/if}
              </div>
              
              <!-- Address -->
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Address <span class="text-red-500">*</span>
                </label>
                {#if isEditing}
                  <input
                    type="text"
                    bind:value={editedClient.address}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSaving}
                    required
                  />
                {:else}
                  <p class="text-gray-900">{client.address}</p>
                {/if}
              </div>
              
              <!-- City, State, Zip -->
              {#if isEditing}
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    bind:value={editedClient.city}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSaving}
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    bind:value={editedClient.state}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSaving}
                    maxlength="2"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                  <input
                    type="text"
                    bind:value={editedClient.zip}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSaving}
                    pattern="[0-9]{5}(-[0-9]{4})?"
                  />
                </div>
              {/if}
              
              <!-- Status -->
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full 
                            {client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                  {client.status}
                </span>
              </div>
              
              <!-- Created Date -->
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Created</label>
                <p class="text-gray-900">
                  {new Date(client.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          {/if}
        </div>
        
        <!-- History Section (Lazy Loaded) -->
        <div class="border-t border-gray-200 p-4">
          <button
            onclick={() => toggleSection('history')}
            class="w-full flex items-center justify-between text-left"
            aria-expanded={expandedSections.history}
            aria-controls="client-history"
          >
            <h3 class="text-lg font-medium text-gray-900">Service History</h3>
            <Icon name="chevronDown" class="w-5 h-5 text-gray-400 transition-transform {expandedSections.history ? 'rotate-180' : ''}" />
          </button>
          
          <div id="client-history">
            {#if expandedSections.history}
              {#if ClientHistory}
                <div class="mt-4 animate-expand">
                  <ClientHistory {client} />
                </div>
              {:else}
                <div class="mt-4 space-y-2">
                  <div class="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                  <div class="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                  <div class="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                </div>
              {/if}
            {/if}
          </div>
        </div>
        
        <!-- Jobs Section (Lazy Loaded) -->
        <div class="border-t border-gray-200 p-4">
          <button
            onclick={() => toggleSection('jobs')}
            class="w-full flex items-center justify-between text-left"
            aria-expanded={expandedSections.jobs}
            aria-controls="client-jobs"
          >
            <h3 class="text-lg font-medium text-gray-900">Active Tasks</h3>
            <Icon name="chevronDown" class="w-5 h-5 text-gray-400 transition-transform {expandedSections.jobs ? 'rotate-180' : ''}" />
          </button>
          
          <div id="client-jobs">
            {#if expandedSections.jobs}
              {#if ClientTasks}
                <div class="mt-4 animate-expand">
                  <ClientTasks {client} />
                </div>
              {:else}
                <div class="mt-4 space-y-2">
                  <div class="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
                  <div class="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
                </div>
              {/if}
            {/if}
          </div>
        </div>
        
        <!-- Notes Section (Lazy Loaded) -->
        <div class="border-t border-gray-200 p-4">
          <button
            onclick={() => toggleSection('notes')}
            class="w-full flex items-center justify-between text-left"
            aria-expanded={expandedSections.notes}
            aria-controls="client-notes"
          >
            <h3 class="text-lg font-medium text-gray-900">Notes</h3>
            <Icon name="chevronDown" class="w-5 h-5 text-gray-400 transition-transform {expandedSections.notes ? 'rotate-180' : ''}" />
          </button>
          
          <div id="client-notes">
            {#if expandedSections.notes}
              {#if ClientNotes}
                <div class="mt-4 animate-expand">
                  <ClientNotes {client} />
                </div>
              {:else}
                <div class="mt-4">
                  <div class="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
                </div>
              {/if}
            {/if}
          </div>
        </div>
      </div>
      
      <!-- Footer Actions -->
      <div class="border-t border-gray-200 p-4 bg-gray-50">
        {#if isEditing}
          <div class="flex gap-2">
            <button
              onclick={handleSave}
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving || isLoading}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onclick={cancelEdit}
              class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 
                     transition-colors disabled:opacity-50"
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        {:else}
          <div class="flex gap-2">
            <PermissionGate action="user_management_edit_client">
              <button
                onclick={() => isEditing = true}
                class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                Edit Client
              </button>
            </PermissionGate>
            <PermissionGate action="user_management_delete_client">
              <button
                onclick={handleDelete}
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                       transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </PermissionGate>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Slide up animation for mobile */
  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  
  /* Fade in animation for desktop */
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
  
  /* Expand animation for sections */
  @keyframes expand {
    from {
      opacity: 0;
      max-height: 0;
    }
    to {
      opacity: 1;
      max-height: 1000px;
    }
  }
  
  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }
  
  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }
  
  .animate-expand {
    animation: expand 0.3s ease-out;
  }
  
  /* Pulse animation for loading states */
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: .5;
    }
  }
  
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
</style>