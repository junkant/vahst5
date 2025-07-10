<!-- src/routes/(app)/tasks/new/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useClients } from '$lib/stores/client.svelte';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { onMount } from 'svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { toast } from '$lib/utils/toast';
  import type { CreateTaskInput } from '$lib/types/task';
  
  const clients = useClients();
  const taskStore = useJobStore();
  const tenant = useTenant();
  const auth = useAuth();
  
  // Form state
  let title = $state('');
  let description = $state('');
  let selectedClientId = $state('');
  let serviceType = $state('');
  let priority = $state<'low' | 'normal' | 'high' | 'emergency'>('normal');
  let scheduledDate = $state('');
  let scheduledTime = $state('');
  let estimatedDuration = $state(60); // minutes
  let assignedTo = $state<string[]>([]);
  
  // UI state
  let isSubmitting = $state(false);
  let showClientSearch = $state(false);
  let clientSearchQuery = $state('');
  
  // Get client ID from URL or use selected client
  onMount(() => {
    const urlClientId = $page.url.searchParams.get('client');
    if (urlClientId && clients.clients.some(c => c.id === urlClientId)) {
      selectedClientId = urlClientId;
    } else if (clients.selectedClient) {
      selectedClientId = clients.selectedClient.id;
    }
  });
  
  // Watch for selected client changes
  $effect(() => {
    if (clients.selectedClient && !selectedClientId) {
      selectedClientId = clients.selectedClient.id;
    }
  });
  
  // Filter clients based on search
  const filteredClients = $derived(() => {
    if (!clientSearchQuery) return clients.clients;
    const query = clientSearchQuery.toLowerCase();
    return clients.clients.filter(client => 
      client.name.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.includes(query)
    );
  });
  
  // Get selected client
  const selectedClient = $derived(() => 
    clients.clients.find(c => c.id === selectedClientId)
  );
  
  // Handle form submission
  async function handleSubmit(e: Event) {
    e.preventDefault();
    
    if (!selectedClientId) {
      toast.error('Please select a client');
      return;
    }
    
    if (!title.trim()) {
      toast.error('Please enter a task title');
      return;
    }
    
    if (!scheduledDate || !scheduledTime) {
      toast.error('Please select a date and time');
      return;
    }
    
    isSubmitting = true;
    
    try {
      // Combine date and time
      const scheduledStart = new Date(`${scheduledDate}T${scheduledTime}`);
      const scheduledEnd = new Date(scheduledStart.getTime() + estimatedDuration * 60000);
      
      const taskData: CreateTaskInput = {
        clientId: selectedClientId,
        title: title.trim(),
        description: description.trim(),
        serviceType: serviceType || 'General',
        priority,
        scheduledStart,
        scheduledEnd,
        assignedTo,
        address: selectedClient?.address
      };
      
      const newTask = await taskStore.createTask(taskData);
      
      toast.success('Task created successfully');
      goto(`/tasks/${newTask.id}`);
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      isSubmitting = false;
    }
  }
  
  // Service types
  const serviceTypes = [
    'HVAC',
    'Plumbing',
    'Electrical',
    'General Maintenance',
    'Inspection',
    'Installation',
    'Repair',
    'Other'
  ];
  
  // Initialize store with tenant
  $effect(() => {
    if (tenant.current?.id) {
      taskStore.setTenant(tenant.current.id);
    }
  });
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
    <div class="px-4 py-3">
      <div class="flex items-center">
        <button
          onclick={() => history.back()}
          class="mr-3 p-2 -ml-2 rounded-lg hover:bg-gray-100"
        >
          <Icon name="chevronLeft" class="w-5 h-5" />
        </button>
        <h1 class="text-xl font-semibold text-gray-900">New Task</h1>
      </div>
    </div>
    
    <!-- Selected Client Banner -->
    {#if selectedClient || clients.selectedClient}
      <div class="bg-blue-50 border-t border-blue-100 px-4 py-2">
        <div class="flex items-center justify-between">
          <p class="text-sm text-blue-800">
            Working with: <span class="font-semibold">{selectedClient?.name || clients.selectedClient?.name}</span>
          </p>
          <button
            type="button"
            onclick={() => { 
              selectedClientId = ''; 
              clients.selectClient(null);
            }}
            class="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Change Client
          </button>
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Form -->
  <form onsubmit={handleSubmit} class="p-4 space-y-4">
    <!-- Client Selection (only show if no client selected) -->
    {#if !selectedClient && !clients.selectedClient}
      <div class="bg-white rounded-lg shadow-sm p-4">
        <div class="block text-sm font-medium text-gray-700 mb-2">
          Select Client
        </div>
        <button
          type="button"
          onclick={() => showClientSearch = true}
          class="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg
                 hover:border-gray-400 text-gray-600 hover:text-gray-700"
        >
          <Icon name="plus" class="w-5 h-5 mx-auto mb-1" />
          Select Client
        </button>
      </div>
    {/if}
    
    <!-- Title -->
    <div class="bg-white rounded-lg shadow-sm p-4">
      <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
        Task Title *
      </label>
      <input
        id="title"
        type="text"
        bind:value={title}
        required
        placeholder="e.g., Annual HVAC Maintenance"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg
               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
    
    <!-- Description -->
    <div class="bg-white rounded-lg shadow-sm p-4">
      <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
        Description
      </label>
      <textarea
        id="description"
        bind:value={description}
        rows="3"
        placeholder="Add any additional details..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg
               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      ></textarea>
    </div>
    
    <!-- Service Type & Priority -->
    <div class="bg-white rounded-lg shadow-sm p-4 space-y-4">
      <div>
        <label for="serviceType" class="block text-sm font-medium text-gray-700 mb-2">
          Service Type
        </label>
        <select
          id="serviceType"
          bind:value={serviceType}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select type...</option>
          {#each serviceTypes as type}
            <option value={type}>{type}</option>
          {/each}
        </select>
      </div>
      
      <div>
        <div class="block text-sm font-medium text-gray-700 mb-2">
          Priority
        </div>
        <div class="grid grid-cols-4 gap-2">
          {#each ['low', 'normal', 'high', 'emergency'] as p}
            <button
              type="button"
              onclick={() => priority = p}
              class="py-2 px-3 rounded-lg text-sm font-medium transition-colors
                     {priority === p 
                       ? p === 'emergency' ? 'bg-red-600 text-white' 
                         : p === 'high' ? 'bg-orange-600 text-white'
                         : p === 'normal' ? 'bg-blue-600 text-white'
                         : 'bg-gray-600 text-white'
                       : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          {/each}
        </div>
      </div>
    </div>
    
    <!-- Schedule -->
    <div class="bg-white rounded-lg shadow-sm p-4 space-y-4">
      <h3 class="font-medium text-gray-900">Schedule</h3>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="date" class="block text-sm font-medium text-gray-700 mb-2">
            Date *
          </label>
          <input
            id="date"
            type="date"
            bind:value={scheduledDate}
            required
            min={new Date().toISOString().split('T')[0]}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label for="time" class="block text-sm font-medium text-gray-700 mb-2">
            Time *
          </label>
          <input
            id="time"
            type="time"
            bind:value={scheduledTime}
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div>
        <label for="duration" class="block text-sm font-medium text-gray-700 mb-2">
          Estimated Duration
        </label>
        <div class="flex items-center space-x-2">
          <input
            id="duration"
            type="number"
            bind:value={estimatedDuration}
            min="15"
            step="15"
            class="w-24 px-3 py-2 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span class="text-gray-600">minutes</span>
        </div>
      </div>
    </div>
    
    <!-- Submit Button -->
    <div class="pt-4">
      <button
        type="submit"
        disabled={isSubmitting}
        class="w-full py-3 bg-blue-600 text-white rounded-lg font-medium
               hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
               transition-colors"
      >
        {isSubmitting ? 'Creating...' : 'Create Task'}
      </button>
    </div>
  </form>
  
  <!-- Client Search Modal -->
  {#if showClientSearch}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
      <div class="bg-white rounded-t-xl w-full max-h-[80vh] flex flex-col">
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold">Select Client</h2>
            <button
              type="button"
              onclick={() => showClientSearch = false}
              class="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Icon name="x" class="w-5 h-5" />
            </button>
          </div>
          
          <input
            type="text"
            bind:value={clientSearchQuery}
            placeholder="Search clients..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div class="flex-1 overflow-y-auto">
          {#if filteredClients.length === 0}
            <div class="p-8 text-center text-gray-500">
              No clients found
            </div>
          {:else}
            <div class="divide-y divide-gray-200">
              {#each filteredClients as client}
                <button
                  type="button"
                  onclick={() => {
                    selectedClientId = client.id;
                    showClientSearch = false;
                    clientSearchQuery = '';
                  }}
                  class="w-full p-4 text-left hover:bg-gray-50"
                >
                  <p class="font-medium text-gray-900">{client.name}</p>
                  {#if client.address}
                    <p class="text-sm text-gray-600">
                      {client.address.street}, {client.address.city}
                    </p>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>