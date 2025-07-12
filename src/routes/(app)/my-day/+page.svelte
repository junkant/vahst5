<!-- src/routes/(app)/my-day/+page.svelte -->
<script lang="ts">
  import { useClients } from '$lib/stores/client.svelte';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { goto } from '$app/navigation';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { scheduledTasks } from '$lib/stores/calendar.svelte';
  
  const clients = useClients();
  const tasks = useJobStore();
  const tenant = useTenant();
  
  // Get today's date info
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Computed values from stores
  const todayTasks = $derived(tasks.todayTasks);
  const overdueTasks = $derived(tasks.overdueTasks);
  const upcomingTasks = $derived(tasks.upcomingTasks.slice(0, 3)); // Next 3 upcoming
  const recentClients = $derived(clients.recentClients?.slice(0, 5) || []); // Recent 5 clients
  
  // Get today's scheduled appointments from calendar
  const todayScheduled = $derived((() => {
    const todayStr = today.toISOString().split('T')[0];
    return $scheduledTasks
      .filter(task => task.scheduledDate === todayStr && task.tenantId === tenant.current?.id)
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  })());
  
  // Check if appointment exists as task
  function getTaskForAppointment(appointmentId: string) {
    return tasks.todayTasks.find(t => 
      t.customFields?.calendarId === appointmentId || 
      t.id === appointmentId
    );
  }
  
  function createNewTask() {
    if (clients.selectedClient) {
      goto(`/tasks/new?client=${clients.selectedClient.id}`);
    } else if (clients.clients.length > 0) {
      // Show clients list with instruction to select one
      goto('/clients?action=new-task');
    } else {
      // No clients yet, create one first
      goto('/clients/new');
    }
  }
  
  function viewAllTasks() {
    goto('/tasks');
  }
  
  function viewAllClients() {
    goto('/clients');
  }
  
  // Updated to just select the client, not navigate
  function selectClient(client: any) {
    clients.selectClient(client);
  }
  
  // New function to edit client
  function editClient(client: any, event: Event) {
    event.stopPropagation(); // Prevent client selection
    goto(`/clients/${client.id}`);
  }
  
  function getTaskStatusColor(status: string) {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  function getPriorityColor(priority?: string) {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
</script>

<div class="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
  <!-- Header -->
  <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">My Day</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">{todayFormatted}</p>
      </div>
      <div class="text-right">
        {#if tenant.current}
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{tenant.current.name}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {tenant.userRole ? tenant.userRole.charAt(0).toUpperCase() + tenant.userRole.slice(1) : ''}
          </p>
        {/if}
      </div>
    </div>
  </div>
  
  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    
    <!-- Current Client Selection (if any) -->
    {#if clients.selectedClient}
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <Icon name="user" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span class="text-sm text-blue-800 dark:text-blue-300">
              Working with: <span class="font-medium">{clients.selectedClient.name}</span>
            </span>
          </div>
          <button
            onclick={() => clients.selectClient(null)}
            class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            Change
          </button>
        </div>
      </div>
    {/if}
    
    <!-- Calendar CTA Section -->
    <div class="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg p-4 text-white">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <div class="flex items-center space-x-2 mb-2">
            <Icon name="calendar" class="w-6 h-6" />
            <h2 class="text-lg font-semibold">Today's Schedule</h2>
          </div>
          {#if todayScheduled.length === 0}
            <p class="text-blue-100">No appointments scheduled for today</p>
          {:else if todayScheduled.length === 1}
            <p class="text-blue-100">1 appointment scheduled</p>
          {:else}
            <p class="text-blue-100">{todayScheduled.length} appointments scheduled</p>
          {/if}
          
          {#if todayScheduled.length > 0}
            {@const nextAppointment = todayScheduled[0]}
            {@const taskStatus = getTaskForAppointment(nextAppointment.id)?.status}
            <div class="mt-2 text-sm">
              <p class="text-blue-100">
                Next: <span class="font-medium">{nextAppointment.title}</span> 
                at {formatTime(new Date(`2000-01-01T${nextAppointment.scheduledTime}`))}
                {#if taskStatus}
                  <span class="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    {taskStatus}
                  </span>
                {/if}
              </p>
            </div>
          {/if}
        </div>
        <button
          onclick={() => goto('/calendar')}
          class="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center space-x-2"
        >
          <span>View Calendar</span>
          <Icon name="chevronRight" class="w-4 h-4" />
        </button>
      </div>
    </div>
    
    <!-- Overdue Tasks Alert -->
    {#if overdueTasks.length > 0}
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
        <div class="flex items-center space-x-2">
          <Icon name="warning" class="w-5 h-5 text-red-600 dark:text-red-400" />
          <span class="text-sm text-red-800 dark:text-red-300 font-medium">
            {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} need attention
          </span>
        </div>
      </div>
    {/if}
    
    <!-- Today's Tasks -->
    <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold text-gray-900 dark:text-gray-100">Today's Tasks</h2>
        <button 
          onclick={viewAllTasks}
          class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          View All
        </button>
      </div>
      
      {#if tasks.isLoading}
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      {:else if todayTasks.length === 0}
        <div class="text-center py-8">
          <Icon name="calendar" class="w-12 h-12 text-gray-400 mx-auto mb-3" size={2} />
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No tasks scheduled for today</h3>
          <p class="text-gray-500 dark:text-gray-400 mb-4">Looks like you have a light day ahead!</p>
          <button 
            onclick={createNewTask}
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Schedule a Task
          </button>
        </div>
      {:else}
        <div class="space-y-3">
          {#each todayTasks as task (task.id)}
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="font-medium text-gray-900 dark:text-gray-100">{task.title}</h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.client?.name || 'No client assigned'}</p>
                  {#if task.scheduledDate}
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatTime(new Date(task.scheduledDate))}
                    </p>
                  {/if}
                </div>
                <div class="flex flex-col items-end space-y-1">
                  {#if task.priority && task.priority !== 'medium'}
                    <span class="px-2 py-1 rounded-full text-xs {getPriorityColor(task.priority)}">
                      {task.priority}
                    </span>
                  {/if}
                  <span class="px-2 py-1 rounded-full text-xs {getTaskStatusColor(task.status)}">
                    {task.status}
                  </span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    
    <!-- Upcoming Tasks -->
    {#if upcomingTasks.length > 0}
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
        <h2 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Upcoming Tasks</h2>
        
        <div class="space-y-2">
          {#each upcomingTasks as task (task.id)}
            <div class="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
              <div class="flex-1">
                <p class="font-medium text-gray-900 dark:text-gray-100 text-sm">{task.title}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{task.client?.name}</p>
              </div>
              {#if task.scheduledDate}
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(task.scheduledDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    <!-- Recent Clients - FIXED -->
    <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold text-gray-900 dark:text-gray-100">Recent Clients</h2>
        <button 
          onclick={viewAllClients}
          class="text-sm text-blue-600 hover:text-blue-700"
        >
          View All
        </button>
      </div>
      
      {#if clients.isLoadingClients}
        <div class="flex items-center justify-center py-4">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      {:else if recentClients.length === 0}
        <div class="text-center py-6">
          <Icon name="users" class="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">No clients yet</p>
          <button 
            onclick={() => goto('/clients/new')}
            class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            Add your first client
          </button>
        </div>
      {:else}
        <div class="space-y-2">
          {#each recentClients as client (client.id)}
            <!-- Changed from button to div to fix nested button issue -->
            <div
              onclick={() => selectClient(client)}
              onkeydown={(e) => e.key === 'Enter' && selectClient(client)}
              class="w-full flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer group
                     {clients.selectedClient?.id === client.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 border' : ''}"
              role="button"
              tabindex="0"
              aria-label="Select client {client.name}"
            >
              <div class="flex-1">
                <p class="font-medium text-gray-900 dark:text-gray-100 text-sm">{client.name}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{client.address}</p>
              </div>
              <div class="flex items-center space-x-2">
                <!-- Edit Button -->
                <button
                  onclick={(e) => editClient(client, e)}
                  class="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Edit {client.name}"
                  title="Edit client"
                >
                  <Icon name="edit" class="w-4 h-4" size={2} />
                </button>
                <!-- Selection Indicator -->
                {#if clients.selectedClient?.id === client.id}
                  <Icon name="checkCircleFilled" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {:else}
                  <Icon name="chevronRight" class="w-4 h-4 text-gray-400" />
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    
    <!-- Error Display -->
    {#if tasks.error || clients.error}
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p class="text-sm text-red-800 dark:text-red-300">
          {tasks.error || clients.error}
        </p>
      </div>
    {/if}
  </div>
</div>