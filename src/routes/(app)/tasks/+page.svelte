<!-- src/routes/(app)/tasks/+page.svelte -->
<script lang="ts">
  import { useClients } from '$lib/stores/client.svelte';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { untrack } from 'svelte';
  
  const clients = useClients();
  const taskStore = useJobStore();
  const tenant = useTenant();
  
  // Filter states
  let filter = $state('all');
  let searchQuery = $state('');
  
  // Track initialization state
  let isInitialized = $state(false);
  let currentTenantId = $state<string | null>(null);
  let currentClientId = $state<string | null>(null);
  
  // Initialize stores when component mounts
  onMount(() => {
    // Initialize with current tenant
    const tenantId = untrack(() => tenant.current?.id);
    if (tenantId && !isInitialized) {
      isInitialized = true;
      currentTenantId = tenantId;
      
      clients.subscribeTenant(tenantId);
      taskStore.setTenant(tenantId);
    }
    
    return () => {
      // Clean up stores when unmounting
      try {
        console.log('Cleaning up task store:', taskStore);
        console.log('TaskStore methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(taskStore)));
        if (typeof taskStore.cleanup === 'function') {
          taskStore.cleanup();
        } else {
          console.error('taskStore.cleanup is not a function', taskStore);
        }
        clients.cleanup();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
      isInitialized = false;
    };
  });
  
  // Watch for tenant changes ONLY
  $effect(() => {
    const newTenantId = tenant.current?.id;
    
    // Only react to actual tenant changes after initialization
    if (isInitialized && newTenantId !== currentTenantId) {
      currentTenantId = newTenantId;
      currentClientId = null; // Reset client selection
      
      if (newTenantId) {
        // Clear selected client in an untracked context
        untrack(() => {
          if (clients.selectedClient) {
            clients.selectClient(null);
          }
        });
        
        // Re-initialize stores
        clients.subscribeTenant(newTenantId);
        taskStore.setTenant(newTenantId);
      }
    }
  });
  
  // Watch for client selection changes ONLY
  $effect(() => {
    const selectedClient = clients.selectedClient;
    const newClientId = selectedClient?.id || null;
    
    // Only react to actual client changes
    if (isInitialized && newClientId !== currentClientId) {
      currentClientId = newClientId;
      
      if (newClientId && currentTenantId) {
        taskStore.subscribeToClient(newClientId);
      }
    }
  });
  
  // Use real tasks from the store
  const allTasks = $derived(taskStore.tasks || []);
  
  // Client-filtered tasks first (if a client is selected)
  const clientFilteredTasks = $derived(() => {
    if (!clients.selectedClient) {
      return allTasks;
    }
    return allTasks.filter(task => task.clientId === clients.selectedClient.id);
  });
  
  // Filter and search tasks
  const filteredTasks = $derived(() => {
    let result = [...clientFilteredTasks()];
    
    // Filter by status
    if (filter !== 'all') {
      result = result.filter(task => {
        switch (filter) {
          case 'today':
            return taskStore.todayTasks.some(t => t.id === task.id);
          case 'upcoming':
            return taskStore.upcomingTasks.some(t => t.id === task.id);
          case 'draft':
            return task.status === 'draft';
          case 'pending':
            return task.status === 'scheduled' || task.status === 'draft';
          case 'in-progress':
            return task.status === 'in_progress';
          case 'completed':
            return task.status === 'completed';
          case 'overdue':
            return task.status === 'scheduled' && task.scheduledStart && 
              (task.scheduledStart instanceof Date ? task.scheduledStart : task.scheduledStart.toDate()) < new Date();
          default:
            return true;
        }
      });
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(task => 
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.client?.name?.toLowerCase().includes(query) ||
        task.serviceType?.toLowerCase().includes(query)
      );
    }
    
    // Sort by priority first, then by date
    return result.sort((a, b) => {
      // Priority order
      const priorityOrder = { emergency: 0, high: 1, normal: 2, low: 3 };
      const priorityA = priorityOrder[a.priority || 'normal'];
      const priorityB = priorityOrder[b.priority || 'normal'];
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Then by status priority
      const getStatusPriority = (task: any) => {
        if (task.status === 'completed') return 4;
        if (task.status === 'in_progress') return 1;
        if (task.status === 'scheduled' && task.scheduledStart && 
            (task.scheduledStart instanceof Date ? task.scheduledStart : task.scheduledStart.toDate()) < new Date()) return 0; // overdue
        if (task.status === 'scheduled') return 2;
        return 3;
      };
      
      const statusPriorityA = getStatusPriority(a);
      const statusPriorityB = getStatusPriority(b);
      
      if (statusPriorityA !== statusPriorityB) {
        return statusPriorityA - statusPriorityB;
      }
      
      // Finally by scheduled date
      if (a.scheduledStart && b.scheduledStart) {
        const dateA = a.scheduledStart instanceof Date ? a.scheduledStart : a.scheduledStart.toDate();
        const dateB = b.scheduledStart instanceof Date ? b.scheduledStart : b.scheduledStart.toDate();
        return dateA.getTime() - dateB.getTime();
      }
      
      return 0;
    });
  });
  
  function getStatusColor(status: string, scheduledStart?: Date | any) {
    // Check if overdue
    if (status === 'scheduled' && scheduledStart) {
      const schedDate = scheduledStart instanceof Date ? scheduledStart : scheduledStart?.toDate ? scheduledStart.toDate() : new Date(scheduledStart);
      if (schedDate < new Date()) {
        return 'bg-red-100 text-red-800';
      }
    }
    
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  function getStatusText(status: string, scheduledStart?: Date | any) {
    // Check if overdue
    if (status === 'scheduled' && scheduledStart) {
      const schedDate = scheduledStart instanceof Date ? scheduledStart : scheduledStart?.toDate ? scheduledStart.toDate() : new Date(scheduledStart);
      if (schedDate < new Date()) {
        return 'Overdue';
      }
    }
    
    switch (status) {
      case 'in_progress':
        return 'In Progress';
      case 'scheduled':
        return 'Scheduled';
      case 'completed':
        return 'Completed';
      case 'draft':
        return 'Draft';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }
  
  function formatDate(date: Date | any) {
    // Handle Firebase Timestamp objects
    const dateObj = date instanceof Date ? date : date?.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
  
  function getTaskTypeIcon(type?: string) {
    switch (type) {
      case 'HVAC':
      case 'Plumbing':
      case 'Electrical':
        return 'wrench';
      case 'General Maintenance':
        return 'settings';
      case 'Installation':
        return 'construction';
      case 'Inspection':
        return 'search';
      default:
        return 'clipboard';
    }
  }
  
  // Filter option type
  interface FilterOption {
    key: string;
    label: string;
    count: number;
  }
  
  function createNewTask() {
    if (clients.selectedClient) {
      goto(`/tasks/new?client=${clients.selectedClient.id}`);
    } else {
      goto('/clients');
    }
  }
  
  function viewTask(task: any) {
    goto(`/tasks/${task.id}`);
  }
</script>

<div class="flex flex-col h-full bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b border-gray-200 p-4">
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-xl font-semibold text-gray-900">Tasks</h1>
      <button 
        onclick={createNewTask}
        class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        New Task
      </button>
    </div>
    
    <!-- Selected Client Info -->
    {#if clients.selectedClient}
      <div class="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
        <div class="flex items-center space-x-2">
          <Icon name="info" class="w-4 h-4 text-blue-600" />
          <span class="text-sm text-blue-800">
            Showing tasks for: <span class="font-medium">{clients.selectedClient.name}</span>
          </span>
        </div>
        <button 
          onclick={() => clients.selectClient(null)}
          class="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Clear Filter
        </button>
      </div>
    {/if}
    
    <!-- Search -->
    <div class="mb-3">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search tasks..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    
    <!-- Filters -->
    <div class="flex space-x-2 overflow-x-auto pb-1">
      {#each [
        { key: 'all', label: 'All', count: clientFilteredTasks().length },
        { key: 'overdue', label: 'Overdue', count: clientFilteredTasks().filter(t => {
          if (t.status === 'scheduled' && t.scheduledStart) {
            const schedDate = t.scheduledStart instanceof Date ? t.scheduledStart : t.scheduledStart?.toDate ? t.scheduledStart.toDate() : new Date(t.scheduledStart);
            return schedDate < new Date();
          }
          return false;
        }).length },
        { key: 'today', label: 'Today', count: taskStore.todayTasks.filter(t => !clients.selectedClient || t.clientId === clients.selectedClient.id).length },
        { key: 'upcoming', label: 'Upcoming', count: taskStore.upcomingTasks.filter(t => !clients.selectedClient || t.clientId === clients.selectedClient.id).length },
        { key: 'in-progress', label: 'In Progress', count: clientFilteredTasks().filter(t => t.status === 'in_progress').length },
        { key: 'draft', label: 'Draft', count: clientFilteredTasks().filter(t => t.status === 'draft').length },
        { key: 'completed', label: 'Completed', count: clientFilteredTasks().filter(t => t.status === 'completed').length }
      ] as filterOption}
        <button
          onclick={() => filter = filterOption.key}
          class="px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                 {filter === filterOption.key 
                   ? 'bg-blue-600 text-white' 
                   : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
        >
          {filterOption.label}
          {#if filterOption.count > 0}
            <span class="ml-1.5 px-1.5 py-0.5 text-xs rounded-full 
                         {filter === filterOption.key 
                           ? 'bg-blue-500 text-white' 
                           : 'bg-gray-200 text-gray-600'}">
              {filterOption.count}
            </span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
  
  <!-- Tasks List -->
  <div class="flex-1 overflow-y-auto p-4">
    {#if taskStore.isLoading && allTasks.length === 0}
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    {:else if filteredTasks().length === 0}
      <div class="text-center py-12">
        <Icon name="clipboard" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 class="text-lg font-medium text-gray-900 mb-1">
          {searchQuery || clients.selectedClient ? 'No tasks found' : 'No tasks yet'}
        </h3>
        <p class="text-gray-500 mb-4">
          {searchQuery 
            ? 'Try adjusting your search' 
            : clients.selectedClient
              ? `No tasks for ${clients.selectedClient.name}`
              : 'Create your first task to get started'}
        </p>
        {#if !searchQuery}
          <button 
            onclick={createNewTask}
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Create Your First Task
          </button>
        {/if}
      </div>
    {:else}
      <div class="space-y-3">
        {#each filteredTasks() as task (task.id)}
          <button
            onclick={() => viewTask(task)}
            class="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow text-left"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-2">
                  <Icon name={getTaskTypeIcon(task.serviceType)} class="w-4 h-4 text-gray-500" />
                  <h3 class="font-semibold text-gray-900">{task.title}</h3>
                  {#if task.priority && task.priority !== 'normal'}
                    <span class="px-2 py-1 rounded-full text-xs {getPriorityColor(task.priority)}">
                      {task.priority}
                    </span>
                  {/if}
                  <span class="px-2 py-1 rounded-full text-xs {getStatusColor(task.status, task.scheduledStart)}">
                    {getStatusText(task.status, task.scheduledStart)}
                  </span>
                </div>
                
                <div class="space-y-1">
                  <p class="text-sm text-gray-600">
                    Client: {task.client?.name || 'Unknown Client'}
                  </p>
                  
                  {#if task.description}
                    <p class="text-sm text-gray-500 line-clamp-2">{task.description}</p>
                  {/if}
                  
                  {#if task.scheduledStart}
                    <p class="text-xs text-gray-500">
                      Scheduled: {formatDate(task.scheduledStart)}
                    </p>
                  {/if}
                  
                  {#if task.duration}
                    <p class="text-xs text-gray-500">
                      Duration: {Math.floor(task.duration / 60)}h {task.duration % 60}m
                    </p>
                  {/if}
                  
                  {#if task.assignedTo && task.assignedTo.length > 0}
                    <p class="text-xs text-gray-500">
                      Assigned to: {task.assignedTo.join(', ')}
                    </p>
                  {/if}
                </div>
              </div>
              
              <div class="text-right ml-4">
                <Icon name="chevronRight" class="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
