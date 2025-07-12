<script lang="ts">
  import { useClients } from '$lib/stores/client.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useJobStore } from '$lib/stores/task.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
  import { checkSchedulingConflicts, formatConflictMessage } from '$lib/utils/calendar-conflicts';
  import { type RecurrencePattern, formatRecurrencePattern, createRecurringTasks } from '$lib/utils/recurring-tasks';
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
  const taskStore = useJobStore();
  const toast = useToast();
  
  // UI state
  let showClientSearch = $state(false);
  let clientSearchQuery = $state('');
  let hasConflict = $state(false);
  let conflictMessage = $state('');
  
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
  
  // Recurrence state
  let isRecurring = $state(false);
  let recurrencePattern = $state<RecurrencePattern>('weekly');
  let recurrenceEndDate = $state('');
  let maxOccurrences = $state(12);
  
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
  
  // Check for scheduling conflicts
  $effect(() => {
    if (scheduledDate && scheduledTime && estimatedDuration) {
      const start = new Date(`${scheduledDate}T${scheduledTime}`);
      const end = new Date(start.getTime() + estimatedDuration * 60000);
      
      const conflict = checkSchedulingConflicts(
        start,
        end,
        taskStore.tasks,
        assignedTo[0], // Check for first assigned technician
        task?.id // Exclude current task if editing
      );
      
      hasConflict = conflict.hasConflict;
      conflictMessage = conflict.message || '';
    } else {
      hasConflict = false;
      conflictMessage = '';
    }
  });
  
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
  
  // Focus action for search input
  function focusOnMount(node: HTMLElement) {
    node.focus();
    return {
      destroy() {}
    };
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<form onsubmit={handleSubmit} class="{compact ? 'space-y-3' : 'space-y-4'}">
  <!-- Title -->
  <div>
    <label for="task-title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Title <span class="text-red-500">*</span>
    </label>
    <input
      id="task-title"
      type="text"
      bind:value={title}
      placeholder="e.g., Annual HVAC Maintenance"
      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
      required
    />
  </div>
  
  <!-- Client Selection -->
  <div>
    <label for="task-client" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Client <span class="text-red-500">*</span>
    </label>
    
    {#if selectedClient}
      <!-- Show selected client -->
      <div class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-blue-900 dark:text-blue-100">{selectedClient.name}</p>
          {#if selectedClient.address}
            <p class="text-xs text-blue-700 dark:text-blue-300">{selectedClient.address}</p>
          {/if}
        </div>
        {#if !task && !initialClientId}
          <button
            type="button"
            onclick={() => { clientId = ''; clientSearchQuery = ''; }}
            class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
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
        class="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:border-gray-400 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
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
      <label for="task-service" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Service Type
      </label>
      <select
        id="task-service"
        bind:value={serviceType}
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      >
        {#each serviceTypes as type}
          <option value={type}>{type}</option>
        {/each}
      </select>
    </div>
    
    <div>
      <label for="task-priority" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                     : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
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
                     : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        {/each}
      </div>
    </div>
  </div>
  
  <!-- Recurrence Options (not shown when editing) -->
  {#if !task && !compact}
    <div>
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          bind:checked={isRecurring}
          class="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Repeat this task</span>
      </label>
      
      {#if isRecurring}
        <div class="mt-3 space-y-3 pl-6">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="recurrence-pattern" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Repeat
              </label>
              <select
                id="recurrence-pattern"
                bind:value={recurrencePattern}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            
            <div>
              <label for="max-occurrences" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Number of occurrences
              </label>
              <input
                id="max-occurrences"
                type="number"
                bind:value={maxOccurrences}
                min="2"
                max="52"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          
          <p class="text-xs text-gray-500 dark:text-gray-400">
            This will create {maxOccurrences} tasks, occurring {formatRecurrencePattern(recurrencePattern).toLowerCase()}
          </p>
        </div>
      {/if}
    </div>
  {/if}
  
  <!-- Conflict Warning -->
  {#if hasConflict}
    <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 flex items-start gap-2">
      <Icon name="alertTriangle" class="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
      <div class="flex-1">
        <p class="text-sm font-medium text-yellow-800 dark:text-yellow-100">Scheduling Conflict</p>
        <p class="text-sm text-yellow-700 dark:text-yellow-200 mt-1">{conflictMessage}</p>
      </div>
    </div>
  {/if}
  
  <!-- Schedule -->
  <div class="space-y-3">
    <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Schedule</h3>
    
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="task-date" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
          Date <span class="text-red-500">*</span>
        </label>
        <input
          id="task-date"
          type="date"
          bind:value={scheduledDate}
          required
          min={new Date().toISOString().split('T')[0]}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      
      <div>
        <label for="task-time" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
          Time <span class="text-red-500">*</span>
        </label>
        <input
          id="task-time"
          type="time"
          bind:value={scheduledTime}
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
    </div>
    
    <div>
      <label for="task-duration" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
        Estimated Duration
      </label>
      <select
        id="task-duration"
        bind:value={estimatedDuration}
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
      <label for="task-assignees" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Assign To
      </label>
      <div class="space-y-2 max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-800">
        {#each teamMembers as member}
          <label class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
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
              class="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <span class="text-sm text-gray-900 dark:text-gray-100">{member.name}</span>
          </label>
        {/each}
      </div>
    </div>
  {/if}
  
  <!-- Description -->
  <div>
    <label for="task-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Description / Notes
    </label>
    <textarea
      id="task-description"
      bind:value={description}
      rows="{compact ? 2 : 3}"
      placeholder="Additional details about the task..."
      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
    ></textarea>
  </div>
  
  <!-- Actions -->
  <div class="flex gap-2 pt-2">
    <button
      type="button"
      onclick={onCancel}
      class="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={!isValid || isSubmitting}
      class="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isSubmitting ? 'Saving...' : submitLabel}
    </button>
  </div>
</form>

<!-- Client Search Modal -->
{#if showClientSearch}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-end z-[60]" 
    role="presentation"
    onclick={(e) => e.target === e.currentTarget && (showClientSearch = false)}
    onkeydown={(e) => e.key === 'Escape' && (showClientSearch = false)}
  >
    <div 
      class="bg-white dark:bg-gray-800 rounded-t-xl w-full max-h-[80vh] flex flex-col" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-search-title"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.key === 'Escape' && (showClientSearch = false)}
      tabindex="-1"
    >
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-3">
          <h2 id="client-search-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Client</h2>
          <button
            type="button"
            onclick={() => showClientSearch = false}
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Icon name="x" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        <input
          type="text"
          bind:value={clientSearchQuery}
          placeholder="Search clients..."
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          use:focusOnMount
        />
      </div>
      
      <div class="flex-1 overflow-y-auto">
        {#if filteredClients.length === 0}
          <div class="p-8 text-center text-gray-500 dark:text-gray-400">
            {clientSearchQuery ? 'No clients found' : 'No clients available'}
          </div>
        {:else}
          <div class="divide-y divide-gray-200 dark:divide-gray-700">
            {#each filteredClients as client}
              <button
                type="button"
                onclick={() => {
                  clientId = client.id;
                  showClientSearch = false;
                  clientSearchQuery = '';
                }}
                class="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <p class="font-medium text-gray-900 dark:text-gray-100">{client.name}</p>
                {#if client.address}
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {client.address}
                  </p>
                {/if}
                {#if client.phone}
                  <p class="text-sm text-gray-500 dark:text-gray-400">{client.phone}</p>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
