<script lang="ts">
  import { useClients } from '$lib/stores/client.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import type { Task, CreateTaskInput } from '$lib/types/task';
  
  interface Props {
    task?: Task | null;
    initialDate?: string;
    initialTime?: string;
    initialClientId?: string;
    onSubmit: (taskData: CreateTaskInput) => void | Promise<void>;
    onCancel: () => void;
    submitLabel?: string;
    isSubmitting?: boolean;
    compact?: boolean; // For modal use
  }
  
  let { 
    task = null,
    initialDate = '',
    initialTime = '',
    initialClientId = '',
    onSubmit,
    onCancel,
    submitLabel = 'Create Task',
    isSubmitting = false,
    compact = false
  }: Props = $props();
  
  const clients = useClients();
  const tenantStore = useTenant();
  const auth = useAuth();
  
  // UI state
  let showClientSearch = $state(false);
  let clientSearchQuery = $state('');
  
  // Form state
  let title = $state(task?.title || '');
  let description = $state(task?.description || '');
  let clientId = $state(task?.clientId || initialClientId || clients.selectedClient?.id || '');
  let serviceType = $state(task?.serviceType || 'General');
  let priority = $state<'low' | 'normal' | 'high' | 'emergency'>(task?.priority || 'normal');
  let scheduledDate = $state(initialDate || '');
  let scheduledTime = $state(initialTime || '');
  let estimatedDuration = $state(60); // minutes
  let assignedTo = $state<string[]>(task?.assignedTo || []);
  
  // Initialize stores if needed
  $effect(() => {
    if (tenantStore.current?.id && clients.clients.length === 0) {
      clients.loadClients();
    }
  });
  
  // Initialize date/time if not provided
  $effect(() => {
    if (!scheduledDate && !task) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      scheduledDate = tomorrow.toISOString().split('T')[0];
      scheduledTime = '09:00';
    }
  });
  
  // If editing, calculate duration from scheduledStart and scheduledEnd
  $effect(() => {
    if (task?.scheduledStart && task?.scheduledEnd) {
      const start = task.scheduledStart instanceof Date ? task.scheduledStart : task.scheduledStart.toDate();
      const end = task.scheduledEnd instanceof Date ? task.scheduledEnd : task.scheduledEnd.toDate();
      estimatedDuration = Math.round((end.getTime() - start.getTime()) / 60000);
      
      scheduledDate = start.toISOString().split('T')[0];
      scheduledTime = start.toTimeString().slice(0, 5);
    }
  });
  
  // Get all clients (not just filtered by tenant)
  let allClients = $derived(clients.clients);
  
  // Debug - log client count
  $effect(() => {
    console.log('TaskForm - Total clients:', allClients.length);
    console.log('TaskForm - Filtered clients:', filteredClients.length);
  });
  
  // Filter clients based on search
  let filteredClients = $derived(
    !clientSearchQuery 
      ? allClients 
      : allClients.filter(client => 
          client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
          client.email?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
          client.phone?.includes(clientSearchQuery)
        )
  );
  
  // Get team members for assignment
  let teamMembers = $derived(tenantStore.teamMembers || []);
  
  // Service types - unified list
  const serviceTypes = [
    'General',
    'HVAC',
    'Plumbing',
    'Electrical',
    'Maintenance',
    'Inspection',
    'Installation',
    'Repair',
    'Emergency',
    'Other'
  ];
  
  // Get selected client details
  let selectedClient = $derived(allClients.find(c => c.id === clientId));
  
  // Validate form
  let isValid = $derived(
    title.trim().length >= 3 &&
    clientId &&
    scheduledDate &&
    scheduledTime
  );
  
  // Duration options
  const durationOptions = [
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' },
    { value: 240, label: '4 hours' },
    { value: 480, label: 'Full day' }
  ];
  
  async function handleSubmit(e: Event) {
    e.preventDefault();
    
    if (!isValid || isSubmitting) return;
    
    // Combine date and time for scheduled start
    const scheduledStart = new Date(`${scheduledDate}T${scheduledTime}`);
    const scheduledEnd = new Date(scheduledStart.getTime() + estimatedDuration * 60000);
    
    const taskData: CreateTaskInput = {
      clientId,
      title: title.trim(),
      description: description.trim(),
      serviceType,
      priority,
      scheduledStart,
      scheduledEnd,
      assignedTo,
      address: selectedClient?.address
    };
    
    await onSubmit(taskData);
  }
  
  // Handle escape key
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && showClientSearch) {
      showClientSearch = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<form onsubmit={handleSubmit} class="{compact ? 'space-y-3' : 'space-y-4'}">
  <!-- Title -->
  <div>
    <label for="task-title" class="block text-sm font-medium text-gray-700 mb-1">
      Title <span class="text-red-500">*</span>
    </label>
    <input
      id="task-title"
      type="text"
      bind:value={title}
      placeholder="e.g., Annual HVAC Maintenance"
      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      required
    />
  </div>
  
  <!-- Client Selection -->
  <div>
    <label for="task-client" class="block text-sm font-medium text-gray-700 mb-1">
      Client <span class="text-red-500">*</span>
    </label>
    
    {#if selectedClient}
      <!-- Show selected client -->
      <div class="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-blue-900">{selectedClient.name}</p>
          {#if selectedClient.address}
            <p class="text-xs text-blue-700">{selectedClient.address}</p>
          {/if}
        </div>
        {#if !task && !initialClientId}
          <button
            type="button"
            onclick={() => { clientId = ''; clientSearchQuery = ''; }}
            class="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Change
          </button>
        {/if}
      </div>
    {:else}
      <!-- Client search button -->
      <button
        type="button"
        onclick={() => showClientSearch = true}
        class="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 text-gray-600 hover:text-gray-700 transition-colors"
      >
        <div class="flex items-center justify-center gap-2">
          <Icon name="search" class="w-4 h-4" />
          <span>Search for client</span>
        </div>
      </button>
    {/if}
  </div>
  
  <!-- Service Type and Priority -->
  <div class="grid grid-cols-2 gap-3">
    <div>
      <label for="task-service" class="block text-sm font-medium text-gray-700 mb-1">
        Service Type
      </label>
      <select
        id="task-service"
        bind:value={serviceType}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {#each serviceTypes as type}
          <option value={type}>{type}</option>
        {/each}
      </select>
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Priority
      </label>
      <div class="grid grid-cols-2 gap-1">
        {#each ['low', 'normal'] as p}
          <button
            type="button"
            onclick={() => priority = p as typeof priority}
            class="py-2 px-2 rounded text-xs font-medium transition-colors
                   {priority === p 
                     ? p === 'low' ? 'bg-gray-600 text-white' : 'bg-blue-600 text-white'
                     : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        {/each}
      </div>
      <div class="grid grid-cols-2 gap-1 mt-1">
        {#each ['high', 'emergency'] as p}
          <button
            type="button"
            onclick={() => priority = p as typeof priority}
            class="py-2 px-2 rounded text-xs font-medium transition-colors
                   {priority === p 
                     ? p === 'high' ? 'bg-orange-600 text-white' : 'bg-red-600 text-white'
                     : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        {/each}
      </div>
    </div>
  </div>
  
  <!-- Schedule -->
  <div class="space-y-3">
    <h3 class="text-sm font-medium text-gray-700">Schedule</h3>
    
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="task-date" class="block text-xs text-gray-600 mb-1">
          Date <span class="text-red-500">*</span>
        </label>
        <input
          id="task-date"
          type="date"
          bind:value={scheduledDate}
          required
          min={new Date().toISOString().split('T')[0]}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label for="task-time" class="block text-xs text-gray-600 mb-1">
          Time <span class="text-red-500">*</span>
        </label>
        <input
          id="task-time"
          type="time"
          bind:value={scheduledTime}
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
    
    <div>
      <label for="task-duration" class="block text-xs text-gray-600 mb-1">
        Estimated Duration
      </label>
      <select
        id="task-duration"
        bind:value={estimatedDuration}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {#each durationOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>
  </div>
  
  <!-- Assigned To (if team members available) -->
  {#if teamMembers.length > 0 && !compact}
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Assign To
      </label>
      <div class="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
        {#each teamMembers as member}
          <label class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
            <input
              type="checkbox"
              value={member.id}
              checked={assignedTo.includes(member.id)}
              onchange={(e) => {
                if (e.currentTarget.checked) {
                  assignedTo = [...assignedTo, member.id];
                } else {
                  assignedTo = assignedTo.filter(id => id !== member.id);
                }
              }}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm">{member.name}</span>
          </label>
        {/each}
      </div>
    </div>
  {/if}
  
  <!-- Description -->
  <div>
    <label for="task-description" class="block text-sm font-medium text-gray-700 mb-1">
      Description / Notes
    </label>
    <textarea
      id="task-description"
      bind:value={description}
      rows="{compact ? 2 : 3}"
      placeholder="Additional details about the task..."
      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    ></textarea>
  </div>
  
  <!-- Actions -->
  <div class="flex gap-2 pt-2">
    <button
      type="button"
      onclick={onCancel}
      class="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={!isValid || isSubmitting}
      class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isSubmitting ? 'Saving...' : submitLabel}
    </button>
  </div>
</form>

<!-- Client Search Modal -->
{#if showClientSearch}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-end z-[60]" onclick={(e) => e.target === e.currentTarget && (showClientSearch = false)}>
    <div class="bg-white rounded-t-xl w-full max-h-[80vh] flex flex-col" onclick={(e) => e.stopPropagation()}>
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
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autofocus
        />
      </div>
      
      <div class="flex-1 overflow-y-auto">
        {#if filteredClients.length === 0}
          <div class="p-8 text-center text-gray-500">
            {clientSearchQuery ? 'No clients found' : 'No clients available'}
          </div>
        {:else}
          <div class="divide-y divide-gray-200">
            {#each filteredClients as client}
              <button
                type="button"
                onclick={() => {
                  clientId = client.id;
                  showClientSearch = false;
                  clientSearchQuery = '';
                }}
                class="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <p class="font-medium text-gray-900">{client.name}</p>
                {#if client.address}
                  <p class="text-sm text-gray-600 mt-1">
                    {client.address}
                  </p>
                {/if}
                {#if client.phone}
                  <p class="text-sm text-gray-500">{client.phone}</p>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
