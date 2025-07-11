<!-- src/routes/(app)/tasks/[id]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useClients } from '$lib/stores/client.svelte';
  import { onMount } from 'svelte';
  import { untrack } from 'svelte';
  import TaskDetail from '$lib/components/task/TaskDetail.svelte';
  import { getTask } from '$lib/firebase/tasks';
  
  const taskStore = useJobStore();
  const tenant = useTenant();
  const clients = useClients();
  
  // Get task ID from route
  const taskId = $derived($page.params.id);
  
  // Track initialization
  let isInitialized = $state(false);
  let isLoadingTask = $state(false);
  let taskNotFound = $state(false);
  
  // Local task state for direct loading
  let directLoadedTask = $state<any>(null);
  
  // Get task from store or direct load
  const task = $derived(
    taskId ? (taskStore.getTaskById(taskId) || directLoadedTask) : null
  );
  
  // Initialize and load task
  onMount(() => {
    console.log('Task detail page mounted, taskId:', taskId);
    
    // Initialize stores with current tenant
    const tenantId = untrack(() => tenant.current?.id);
    if (tenantId) {
      taskStore.setTenant(tenantId);
      clients.subscribeTenant(tenantId);
      isInitialized = true;
      
      // Load the specific task
      loadTaskData();
    }
    
    return () => {
      console.log('Task detail page unmounting');
      directLoadedTask = null;
    };
  });
  
  // Watch for tenant changes
  $effect(() => {
    const tenantId = tenant.current?.id;
    if (tenantId && isInitialized) {
      loadTaskData();
    }
  });
  
  // Load task data
  async function loadTaskData() {
    if (!tenant.current?.id || !taskId || isLoadingTask) return;
    
    // First check if task is already in store
    const storeTask = taskStore.getTaskById(taskId);
    if (storeTask) {
      console.log('Task found in store');
      directLoadedTask = null;
      return;
    }
    
    // If not in store, load directly
    isLoadingTask = true;
    taskNotFound = false;
    
    try {
      console.log('Loading task directly from Firebase...');
      const loadedTask = await getTask(tenant.current.id, taskId);
      
      if (loadedTask) {
        console.log('Task loaded:', loadedTask);
        directLoadedTask = loadedTask;
        
        // Subscribe to the client's tasks if task has a client
        if (loadedTask.clientId) {
          console.log('Subscribing to client tasks:', loadedTask.clientId);
          taskStore.subscribeToClient(loadedTask.clientId);
        }
      } else {
        console.log('Task not found');
        taskNotFound = true;
      }
    } catch (error) {
      console.error('Error loading task:', error);
      taskNotFound = true;
    } finally {
      isLoadingTask = false;
    }
  }
  
  // Navigate to tasks list
  function goToTasksList() {
    goto('/tasks');
  }
</script>

{#if isLoadingTask || (!task && !taskNotFound)}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading task...</p>
    </div>
  </div>
{:else if task}
  <TaskDetail {task} />
{:else}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
      <p class="text-gray-600 mb-4">Task not found</p>
      <button
        onclick={goToTasksList}
        class="text-blue-600 hover:text-blue-700 font-medium"
      >
        Back to Tasks
      </button>
    </div>
  </div>
{/if}
