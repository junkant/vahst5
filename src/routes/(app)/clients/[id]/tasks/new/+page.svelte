<!-- src/routes/(app)/clients/[id]/tasks/new/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { useClients } from '$lib/stores/client.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import type { CreateTaskInput } from '$lib/types/task';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { toast } from '$lib/utils/toast';
  
  // Get client ID from route
  const clientId = $derived($page.params.id);
  
  // Stores
  const taskStore = useJobStore();
  const clientStore = useClients();
  const tenantStore = useTenant();
  const auth = useAuth();
  
  // Get client
  const client = $derived(clientStore.clients.find(c => c.id === clientId));
  const teamMembers = $derived(tenantStore.teamMembers || []);
  
  // Form state
  let title = $state('');
  let description = $state('');
  let serviceType = $state('General');
  let priority = $state<'low' | 'normal' | 'high' | 'emergency'>('normal');
  let scheduledDate = $state('');
  let scheduledTime = $state('');
  let duration = $state(60); // minutes
  let assignedTo = $state<string[]>([]);
  let useClientAddress = $state(true);
  let customAddress = $state({
    street: '',
    city: '',
    state: '',
    zip: ''
  });
  
  // Service types
  const serviceTypes = [
    'General',
    'HVAC',
    'Plumbing',
    'Electrical',
    'Maintenance',
    'Inspection',
    'Installation',
    'Repair',
    'Emergency'
  ];
  
  // Form validation
  const isValid = $derived(() => {
    return title.trim().length >= 3 &&
           scheduledDate &&
           scheduledTime &&
           (useClientAddress || customAddress.street.trim());
  });
  
  // Creating state
  let creating = $state(false);
  
  // Navigate back
  function navigateBack() {
    goto(`/clients/${clientId}/tasks`);
  }
  
  // Create task
  async function createTask() {
    if (!isValid || creating || !client) return;
    
    creating = true;
    
    try {
      // Combine date and time
      const [year, month, day] = scheduledDate.split('-').map(Number);
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const scheduledStart = new Date(year, month - 1, day, hours, minutes);
      const scheduledEnd = new Date(scheduledStart.getTime() + duration * 60000);
      
      const taskData: CreateTaskInput = {
        clientId,
        title,
        description,
        serviceType,
        priority,
        scheduledStart,
        scheduledEnd,
        assignedTo,
        address: useClientAddress ? client.address : customAddress
      };
      
      const task = await taskStore.createTask(taskData);
      
      toast.success('Task created successfully');
      goto(`/clients/${clientId}/tasks/${task.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create task');
      creating = false;
    }
  }
  
  // Set default date/time to tomorrow at 9 AM
  $effect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    scheduledDate = tomorrow.toISOString().split('T')[0];
    scheduledTime = '09:00';
  });
  
  // Initialize store with tenant
  $effect(() => {
    if (tenantStore.current?.id) {
      taskStore.setTenant(tenantStore.current.id);
    }
  });
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
    <div class="px-4 py-3">
      <div class="flex items-center gap-3">
        <button
          onclick={navigateBack}
          class="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Icon name="arrowLeft" class="w-5 h-5" />
        </button>
        
        <h1 class="text-lg font-semibold text-gray-900">
          New Task
        </h1>
      </div>
    </div>
  </div>
  
  <!-- Form -->
  <form onsubmit={(e) => { e.preventDefault(); createTask(); }} class="p-4 space-y-4 pb-20">
    <!-- Client info (readonly) -->
    <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <h3 class="text-sm font-medium text-blue-900 mb-1">Client</h3>
      <p class="font-medium text-blue-900">{client?.name}</p>
      {#if client?.phone}
        <p class="text-sm text-blue-700">{client.phone}</p>
      {/if}
    </div>
    
    <!-- Title -->
    <div>
      <label for="title" class="block text-sm font-medium text-gray-700 mb-1">
        Task Title <span class="text-red-500">*</span>
      </label>
      <input
        id="title"
        type="text"
        bind:value={title}
        placeholder="e.g., Annual HVAC maintenance"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg 
               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        required
      />
    </div>
    
    <!-- Description -->
    <div>
      <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
        Description
      </label>
      <textarea
        id="description"
        bind:value={description}
        placeholder="Additional details about the task..."
        rows="3"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg 
               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
    
    <!-- Service Type & Priority -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="serviceType" class="block text-sm font-medium text-gray-700 mb-1">
          Service Type
        </label>
        <select
          id="serviceType"
          bind:value={serviceType}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg 
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {#each serviceTypes as type}
            <option value={type}>{type}</option>
          {/each}
        </select>
      </div>
      
      <div>
        <label for="priority" class="block text-sm font-medium text-gray-700 mb-1">
          Priority
        </label>
        <select
          id="priority"
          bind:value={priority}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg 
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="emergency">Emergency</option>
        </select>
      </div>
    </div>
    
    <!-- Schedule -->
    <div class="space-y-4">
      <h3 class="text-sm font-medium text-gray-700">Schedule</h3>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="date" class="block text-sm text-gray-600 mb-1">
            Date <span class="text-red-500">*</span>
          </label>
          <input
            id="date"
            type="date"
            bind:value={scheduledDate}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg 
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        
        <div>
          <label for="time" class="block text-sm text-gray-600 mb-1">
            Time <span class="text-red-500">*</span>
          </label>
          <input
            id="time"
            type="time"
            bind:value={scheduledTime}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg 
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>
      
      <div>
        <label for="duration" class="block text-sm text-gray-600 mb-1">
          Estimated Duration
        </label>
        <select
          id="duration"
          bind:value={duration}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg 
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={90}>1.5 hours</option>
          <option value={120}>2 hours</option>
          <option value={180}>3 hours</option>
          <option value={240}>4 hours</option>
          <option value={480}>All day</option>
        </select>
      </div>
    </div>
    
    <!-- Technicians -->
    {#if teamMembers.length > 0}
      <div>
        <div class="block text-sm font-medium text-gray-700 mb-2">
          Assign Technicians
        </div>
        <div class="space-y-2">
          {#each teamMembers as member}
            <label class="flex items-center gap-3 p-3 border border-gray-200 
                          rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                value={member.id}
                checked={assignedTo.includes(member.id)}
                onchange={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.checked) {
                    assignedTo = [...assignedTo, member.id];
                  } else {
                    assignedTo = assignedTo.filter(id => id !== member.id);
                  }
                }}
                class="rounded border-gray-300 text-blue-600 
                       focus:ring-2 focus:ring-blue-500"
              />
              <div class="flex-1">
                <p class="font-medium text-gray-900">{member.name || member.email}</p>
                <p class="text-sm text-gray-500">{member.role}</p>
              </div>
            </label>
          {/each}
        </div>
      </div>
    {/if}
    
    <!-- Location -->
    <div class="space-y-4">
      <h3 class="text-sm font-medium text-gray-700">Location</h3>
      
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          bind:checked={useClientAddress}
          class="rounded border-gray-300 text-blue-600"
        />
        <span class="text-sm text-gray-700">Use client's address</span>
      </label>
      
      {#if useClientAddress && client?.address}
        <div class="p-3 bg-gray-50 rounded-lg">
          <address class="not-italic text-sm text-gray-600">
            {typeof client.address === 'string' ? client.address : client.address.street}<br>
            {#if typeof client.address === 'object' && client.address.city}
              {client.address.city}, {client.address.state} {client.address.zip}
            {/if}
          </address>
        </div>
      {:else}
        <div class="space-y-3">
          <input
            type="text"
            bind:value={customAddress.street}
            placeholder="Street address"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg 
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={!useClientAddress}
          />
          
          <div class="grid grid-cols-6 gap-3">
            <input
              type="text"
              bind:value={customAddress.city}
              placeholder="City"
              class="col-span-3 px-3 py-2 border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <input
              type="text"
              bind:value={customAddress.state}
              placeholder="State"
              maxlength="2"
              class="col-span-1 px-3 py-2 border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <input
              type="text"
              bind:value={customAddress.zip}
              placeholder="ZIP"
              class="col-span-2 px-3 py-2 border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      {/if}
    </div>
    
    <!-- Submit button -->
    <div class="flex gap-3 pt-4">
      <button
        type="button"
        onclick={navigateBack}
        class="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg 
               font-medium hover:bg-gray-50 transition-colors"
      >
        Cancel
      </button>
      
      <button
        type="submit"
        disabled={!isValid || creating}
        class="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium 
               hover:bg-blue-700 transition-colors disabled:opacity-50 
               disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {#if creating}
          <div class="w-5 h-5 border-2 border-white border-t-transparent 
                      rounded-full animate-spin"></div>
          Creating...
        {:else}
          <Icon name="plus" class="w-5 h-5" />
          Create Task
        {/if}
      </button>
    </div>
  </form>
  
  <!-- AI Suggestions (if available) -->
  {#if taskStore.isOffline}
    <div class="fixed bottom-20 left-4 right-4 bg-yellow-100 border border-yellow-400 
                text-yellow-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <Icon name="wifiOff" class="w-5 h-5" />
      <span class="text-sm">Creating task offline - will sync when connected</span>
    </div>
  {/if}
</div>