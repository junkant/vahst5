<script lang="ts">
  import { createDialog, melt } from '@melt-ui/svelte';
  import { fade, fly } from 'svelte/transition';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { 
    scheduledTasks, 
    calendarSettings,
    type ScheduledTask 
  } from '$lib/stores/calendar.svelte';
  import { useClients } from '$lib/stores/client.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { get } from 'svelte/store';
  
  interface Props {
    open: boolean;
    date: string;
    time: string;
    task: ScheduledTask | null;
  }
  
  let { open = $bindable(), date, time, task }: Props = $props();
  
  const clients = useClients();
  const auth = useAuth();
  
  // Get calendar settings
  let settings = $state(get(calendarSettings));
  
  $effect(() => {
    const unsub = calendarSettings.subscribe(value => {
      settings = value;
    });
    return unsub;
  });
  
  // Form data
  let title = $state(task?.title || '');
  let clientId = $state(task?.clientId || '');
  let clientName = $state(task?.clientName || '');
  let clientPhone = $state(task?.clientPhone || '');
  let duration = $state(task?.duration || settings.defaultAppointmentDuration);
  let notes = $state(task?.notes || '');
  let priority = $state<'low' | 'medium' | 'high'>(task?.priority || 'medium');
  
  // Get clients for current tenant
  let tenantClients = $derived(clients.clients.filter(c => c.tenantId === auth.tenant?.id));
  
  // Dialog setup
  const {
    elements: { trigger, overlay, content, title: dialogTitle, description, close, portalled },
    states: { open: dialogOpen }
  } = createDialog({
    forceVisible: true,
    preventScroll: true,
    onOpenChange: ({ open: isOpen }) => {
      open = isOpen;
    }
  });
  
  // Update dialog when prop changes
  $effect(() => {
    $dialogOpen.set(open);
  });
  
  // Reset form when opening
  $effect(() => {
    if (open && !task) {
      title = '';
      clientId = '';
      clientName = '';
      clientPhone = '';
      duration = settings.defaultAppointmentDuration;
      notes = '';
      priority = 'medium';
    }
  });
  
  // Update client info when selection changes
  $effect(() => {
    if (clientId) {
      const selectedClient = tenantClients.find(c => c.id === clientId);
      if (selectedClient) {
        clientName = selectedClient.name;
        clientPhone = selectedClient.phone || '';
      }
    }
  });
  
  function handleSave() {
    if (!title.trim()) return;
    
    const newTask: ScheduledTask = {
      id: task?.id || crypto.randomUUID(),
      title: title.trim(),
      completed: false,
      createdAt: task?.createdAt || Date.now(),
      updatedAt: Date.now(),
      scheduledDate: date,
      scheduledTime: time,
      duration,
      clientId,
      clientName,
      clientPhone,
      notes,
      priority,
      tags: ['scheduled'],
      tenantId: auth.tenant?.id
    };
    
    scheduledTasks.update(tasks => {
      if (task) {
        // Update existing
        return tasks.map(t => t.id === task.id ? newTask : t);
      } else {
        // Add new
        return [...tasks, newTask];
      }
    });
    
    open = false;
  }
  
  function handleDelete() {
    if (!task) return;
    
    if (confirm('Are you sure you want to delete this appointment?')) {
      scheduledTasks.update(tasks => tasks.filter(t => t.id !== task.id));
      open = false;
    }
  }
  
  function formatDateTime(date: string, time: string): string {
    const dateObj = new Date(`${date}T${time}`);
    return dateObj.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
</script>

{#if open}
  <div use:melt={$portalled}>
    <div
      use:melt={$overlay}
      class="fixed inset-0 z-50 bg-black/50"
      transition:fade={{ duration: 150 }}
    ></div>
    <div
      use:melt={$content}
      class="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg"
      transition:fly={{ y: -10, duration: 150 }}
    >
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div>
          <h2 use:melt={$dialogTitle} class="text-lg font-semibold">
            {task ? 'Edit Appointment' : 'New Appointment'}
          </h2>
          <p class="text-sm text-gray-500 mt-1">
            {formatDateTime(date, time)}
          </p>
        </div>
        <button
          use:melt={$close}
          class="rounded-lg p-1 hover:bg-gray-100 transition-colors"
        >
          <Icon name="close" size={20} />
        </button>
      </div>
      
      <!-- Form -->
      <form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
        <!-- Title -->
        <div>
          <label for="title" class="block text-sm font-medium text-gray-700 mb-1">
            Title <span class="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            bind:value={title}
            placeholder="e.g., HVAC Maintenance"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <!-- Client Selection -->
        <div>
          <label for="client" class="block text-sm font-medium text-gray-700 mb-1">
            Client
          </label>
          <select
            id="client"
            bind:value={clientId}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No client selected</option>
            {#each tenantClients as client}
              <option value={client.id}>{client.name}</option>
            {/each}
          </select>
        </div>
        
        <!-- Manual client info if no client selected -->
        {#if !clientId}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="clientName" class="block text-sm font-medium text-gray-700 mb-1">
                Client Name
              </label>
              <input
                id="clientName"
                type="text"
                bind:value={clientName}
                placeholder="John Smith"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="clientPhone" class="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                id="clientPhone"
                type="tel"
                bind:value={clientPhone}
                placeholder="(555) 123-4567"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        {/if}
        
        <!-- Duration and Priority -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="duration" class="block text-sm font-medium text-gray-700 mb-1">
              Duration
            </label>
            <select
              id="duration"
              bind:value={duration}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
              <option value={240}>4 hours</option>
            </select>
          </div>
          
          <div>
            <label for="priority" class="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              bind:value={priority}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        
        <!-- Notes -->
        <div>
          <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            bind:value={notes}
            rows="3"
            placeholder="Additional details..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>
        
        <!-- Actions -->
        <div class="flex justify-between pt-4">
          <div>
            {#if task}
              <button
                type="button"
                onclick={handleDelete}
                class="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                Delete
              </button>
            {/if}
          </div>
          
          <div class="flex gap-2">
            <button
              type="button"
              use:melt={$close}
              class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {task ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}
