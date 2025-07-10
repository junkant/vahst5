<!-- src/routes/(app)/tasks/+page.svelte -->
<script lang="ts">
  import { useClients } from '$lib/stores/client.svelte';
  import { useEnhancedTaskStore } from '$lib/stores/task-enhanced.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { debugTaskQueries } from '$lib/firebase/debug-tasks';
  import { checkTasksExist } from '$lib/firebase/debug-check-data';
  import { untrack } from 'svelte';
  
  const clients = useClients();
  const taskStore = useEnhancedTaskStore();
  const tenant = useTenant();
  
  // Debug flag
  let showDebug = $state(true);
  
  // Filter states
  let filter = $state('all');
  let searchQuery = $state('');
  
  // Track initialization state
  let isInitialized = $state(false);
  let currentTenantId = $state<string | null>(null);
  let currentClientId = $state<string | null>(null);
  
  // Initialize stores when component mounts
  onMount(() => {
    console.log('Tasks page mounted');
    
    // Initialize with current tenant
    const tenantId = untrack(() => tenant.current?.id);
    if (tenantId && !isInitialized) {
      isInitialized = true;
      currentTenantId = tenantId;
      
      console.log('Initial setup for tenant:', tenantId);
      clients.subscribeTenant(tenantId);
      taskStore.initializeTenant(tenantId);
    }
    
    return () => {
      console.log('Tasks page unmounting');
      // Clean up stores when unmounting
      taskStore.cleanup();
      clients.cleanup();
      isInitialized = false;
    };
  });
  
  // Watch for tenant changes ONLY
  $effect(() => {
    const newTenantId = tenant.current?.id;
    
    // Only react to actual tenant changes after initialization
    if (isInitialized && newTenantId !== currentTenantId) {
      console.log('Tenant changed:', { old: currentTenantId, new: newTenantId });
      
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
        taskStore.initializeTenant(newTenantId);
      }
    }
  });
  
  // Watch for client selection changes ONLY
  $effect(() => {
    const selectedClient = clients.selectedClient;
    const newClientId = selectedClient?.id || null;
    
    // Only react to actual client changes
    if (isInitialized && newClientId !== currentClientId) {
      console.log('Client selection changed:', selectedClient?.name || 'None');
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
  
  // Debug Firebase queries
  async function debugFirebase() {
    if (!tenant.current?.id) {
      alert('No tenant selected');
      return;
    }
    
    console.log('Running Firebase debug...');
    const results = await debugTaskQueries(tenant.current.id);
    console.log('Debug results:', results);
    
    if (results.errors.length > 0) {
      alert('Firebase errors found! Check console for details.');
    } else {
      alert('Firebase queries successful! Check console for results.');
    }
  }
  
  // Create a test task for debugging
  async function createTestTask() {
    if (!tenant.current?.id) {
      alert('No tenant selected');
      return;
    }
    
    if (!clients.selectedClient) {
      alert('Please select a client first');
      return;
    }
    
    try {
      const testTask = {
        clientId: clients.selectedClient.id,
        title: 'Test Task ' + new Date().toLocaleTimeString(),
        description: 'This is a test task created for debugging',
        serviceType: 'General Maintenance',
        priority: 'normal' as const,
        scheduledStart: new Date(),
        scheduledEnd: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours later
        assignedTo: [],
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345'
        }
      };
      
      const createdTask = await taskStore.createTask(testTask);
      console.log('Created test task:', createdTask);
      alert('Test task created successfully! Check the console for debug info.');
    } catch (error) {
      console.error('Error creating test task:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
  
  function viewTask(task: any) {
    goto(`/tasks/${task.id}`);
  }
  
  // Check if tasks exist in Firebase
  async function checkData() {
    if (!tenant.current?.id) {
      alert('No tenant selected');
      return;
    }
    
    console.log('Checking data...');
    const results = await checkTasksExist(tenant.current.id);
    console.log('Data check results:', results);
    
    if (results.error) {
      alert('Error: ' + results.error);
    } else {
      alert(`Found ${results.taskCount} tasks. Check console for details.`);
    }
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
      {#if import.meta.env.DEV}
        <button 
          onclick={createTestTask}
          class="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2"
        >
          Test Task
        </button>
        <button 
          onclick={debugFirebase}
          class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2"
        >
          Debug FB
        </button>
        <button 
          onclick={checkData}
          class="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2"
        >
          Check Data
        </button>
      {/if}
    </div>
    
    <!-- Selected Client Info - FIXED -->
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
  
  <!-- Debug Panel -->
  {#if showDebug && import.meta.env.DEV}
    <div class="fixed bottom-20 right-4 w-96 max-h-96 overflow-auto bg-black text-green-400 p-4 rounded-lg shadow-xl font-mono text-xs">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-sm font-bold">🔍 Debug Info</h3>
        <button onclick={() => showDebug = false} class="text-red-400 hover:text-red-300">✕</button>
      </div>
      
      <div class="space-y-2">
        <div>
          <strong>Tenant:</strong> {tenant.current?.id || 'None'}
        </div>
        <div>
          <strong>Client:</strong> {clients.selectedClient?.name || 'None'}
        </div>
        <div>
          <strong>Tasks:</strong> {taskStore.tasks.length}
        </div>
        <div>
          <strong>Loading:</strong> {taskStore.isLoading}
        </div>
        <div>
          <strong>Error:</strong> {taskStore.error || 'None'}
        </div>
        <div>
          <strong>Listener:</strong> {taskStore.debugInfo.listenerAttached ? '✅' : '❌'}
        </div>
        <div>
          <strong>Last Update:</strong> {taskStore.debugInfo.lastUpdateAt || 'Never'}
        </div>
        <div>
          <strong>Source:</strong> {taskStore.debugInfo.lastUpdateSource || 'None'}
        </div>
        
        <details class="mt-2">
          <summary class="cursor-pointer">Task IDs</summary>
          <div class="mt-1 text-xs">
            {#each taskStore.tasks as task}
              <div>{task.id} - {task.title}</div>
            {/each}
          </div>
        </details>
        
        <details class="mt-2">
          <summary class="cursor-pointer">Error Log</summary>
          <div class="mt-1 text-xs max-h-32 overflow-y-auto">
            {#each taskStore.debugInfo.errorLog as log}
              <div>{log}</div>
            {/each}
          </div>
        </details>
      </div>
    </div>
  {/if}
</div>
