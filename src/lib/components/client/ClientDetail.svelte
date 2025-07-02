<!--
  @component ClientDetail
  @description Modal for viewing and editing client details with lazy loaded sections
  @usage <ClientDetail {client} bind:open />
-->
<script lang="ts">
  import { useClients } from '$lib/stores/client.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
  import type { Client } from '$lib/stores/client.svelte';
  
  interface Props {
    client: Client;
    open: boolean;
  }
  
  let { client, open = $bindable(false) }: Props = $props();
  
  const clients = useClients();
  const toast = useToast();
  
  let isEditing = $state(false);
  let editedClient = $state({ ...client });
  let isLoading = $state(false);
  
  // Lazy loaded components
  let ClientHistory: any = null;
  let ClientJobs: any = null;
  let ClientNotes: any = null;
  
  // Track expanded sections
  let expandedSections = $state({
    info: true,
    history: false,
    jobs: false,
    notes: false
  });
  
  // Update editedClient when client prop changes
  $effect(() => {
    editedClient = { ...client };
  });
  
  async function handleSave() {
    isLoading = true;
    try {
      await clients.updateClient(editedClient.id, editedClient);
      toast.success('Client updated successfully');
      isEditing = false;
      open = false;
    } catch (error) {
      toast.error('Failed to update client');
    } finally {
      isLoading = false;
    }
  }
  
  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    isLoading = true;
    try {
      await clients.deleteClient(client.id);
      toast.success('Client deleted successfully');
      open = false;
    } catch (error) {
      toast.error('Failed to delete client');
    } finally {
      isLoading = false;
    }
  }
  
  // Lazy load heavy sections
  async function toggleSection(section: keyof typeof expandedSections) {
    expandedSections[section] = !expandedSections[section];
    
    // Load components on demand
    if (expandedSections[section]) {
      switch (section) {
        case 'history':
          if (!ClientHistory) {
            const module = await import('./ClientHistory.svelte');
            ClientHistory = module.default;
          }
          break;
        case 'jobs':
          if (!ClientJobs) {
            const module = await import('./ClientJobs.svelte');
            ClientJobs = module.default;
          }
          break;
        case 'notes':
          if (!ClientNotes) {
            const module = await import('./ClientNotes.svelte');
            ClientNotes = module.default;
          }
          break;
      }
    }
  }
  
  function closeModal() {
    if (!isLoading) {
      open = false;
      isEditing = false;
      editedClient = { ...client };
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
</script>

{#if open}
  <div 
    class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    onclick={(e) => e.target === e.currentTarget && closeModal()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="client-detail-title"
  >
    <div class="bg-white w-full sm:max-w-2xl sm:rounded-xl rounded-t-xl max-h-[90vh] flex flex-col animate-slide-up sm:animate-fade-in">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 id="client-detail-title" class="text-xl font-semibold text-gray-900">
          {isEditing ? 'Edit Client' : 'Client Details'}
        </h2>
        <button 
          onclick={closeModal}
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close"
          disabled={isLoading}
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <!-- Basic Info Section -->
        <div class="p-4 space-y-4">
          <button
            onclick={() => toggleSection('info')}
            class="w-full flex items-center justify-between text-left"
          >
            <h3 class="text-lg font-medium text-gray-900">Basic Information</h3>
            <svg 
              class="w-5 h-5 text-gray-400 transition-transform {expandedSections.info ? 'rotate-180' : ''}"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {#if expandedSections.info}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-expand">
              <!-- Name -->
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                {#if isEditing}
                  <input
                    type="text"
                    bind:value={editedClient.name}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                  />
                {:else}
                  <p class="text-gray-900">{client.name}</p>
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
                    disabled={isLoading}
                  />
                {:else}
                  <p class="text-gray-900">{client.email || 'Not provided'}</p>
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
                    disabled={isLoading}
                  />
                {:else}
                  <p class="text-gray-900">{client.phone || 'Not provided'}</p>
                {/if}
              </div>
              
              <!-- Address -->
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
                {#if isEditing}
                  <input
                    type="text"
                    bind:value={editedClient.address}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                  />
                {:else}
                  <p class="text-gray-900">{client.address}</p>
                {/if}
              </div>
              
              <!-- Status -->
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full {client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                  {client.status}
                </span>
              </div>
            </div>
          {/if}
        </div>
        
        <!-- History Section (Lazy Loaded) -->
        <div class="border-t border-gray-200 p-4">
          <button
            onclick={() => toggleSection('history')}
            class="w-full flex items-center justify-between text-left"
          >
            <h3 class="text-lg font-medium text-gray-900">Service History</h3>
            <svg 
              class="w-5 h-5 text-gray-400 transition-transform {expandedSections.history ? 'rotate-180' : ''}"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {#if expandedSections.history}
            {#if ClientHistory}
              <div class="mt-4 animate-expand">
                <ClientHistory {client} />
              </div>
            {:else}
              <div class="mt-4 h-32 bg-gray-100 rounded-lg animate-pulse"></div>
            {/if}
          {/if}
        </div>
        
        <!-- Jobs Section (Lazy Loaded) -->
        <div class="border-t border-gray-200 p-4">
          <button
            onclick={() => toggleSection('jobs')}
            class="w-full flex items-center justify-between text-left"
          >
            <h3 class="text-lg font-medium text-gray-900">Active Jobs</h3>
            <svg 
              class="w-5 h-5 text-gray-400 transition-transform {expandedSections.jobs ? 'rotate-180' : ''}"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {#if expandedSections.jobs}
            {#if ClientJobs}
              <div class="mt-4 animate-expand">
                <ClientJobs {client} />
              </div>
            {:else}
              <div class="mt-4 h-32 bg-gray-100 rounded-lg animate-pulse"></div>
            {/if}
          {/if}
        </div>
        
        <!-- Notes Section (Lazy Loaded) -->
        <div class="border-t border-gray-200 p-4">
          <button
            onclick={() => toggleSection('notes')}
            class="w-full flex items-center justify-between text-left"
          >
            <h3 class="text-lg font-medium text-gray-900">Notes</h3>
            <svg 
              class="w-5 h-5 text-gray-400 transition-transform {expandedSections.notes ? 'rotate-180' : ''}"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {#if expandedSections.notes}
            {#if ClientNotes}
              <div class="mt-4 animate-expand">
                <ClientNotes {client} />
              </div>
            {:else}
              <div class="mt-4 h-32 bg-gray-100 rounded-lg animate-pulse"></div>
            {/if}
          {/if}
        </div>
      </div>
      
      <!-- Footer -->
      <div class="border-t border-gray-200 p-4">
        {#if isEditing}
          <div class="flex gap-3">
            <button
              onclick={() => isEditing = false}
              class="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onclick={handleSave}
              class="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        {:else}
          <div class="flex gap-3">
            <button
              onclick={() => isEditing = true}
              class="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit Client
            </button>
            <button
              onclick={handleDelete}
              class="py-2 px-4 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              disabled={isLoading}
            >
              Delete
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes expand {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-expand {
    animation: expand 0.2s ease-out;
  }
</style>