<!-- src/routes/(app)/clients/[id]/tasks/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { useClients } from '$lib/stores/client.svelte';
  import TaskList from '$lib/components/task/TaskList.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  // Get client ID from route
  const clientId = $derived($page.params.id);
  
  // Stores
  const taskStore = useJobStore();
  const clientStore = useClients();
  
  // Subscribe to client tasks
  $effect(() => {
    if (clientId) {
      taskStore.subscribeToClient(clientId);
    }
  });
  
  // Get client and tasks
  const client = $derived(clientStore.clients.find(c => c.id === clientId));
  const tasks = $derived(taskStore.getTasksForClient(clientId));
  const isLoading = $derived(taskStore.isLoading || clientStore.isLoading);
  
  // Navigate to new task
  function createNewTask() {
    goto(`/clients/${clientId}/tasks/new`);
  }
  
  // Navigate back to client
  function navigateBack() {
    goto(`/clients/${clientId}`);
  }
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
        
        <div class="flex-1 min-w-0">
          <h1 class="text-lg font-semibold text-gray-900 truncate">
            {client?.name || 'Loading...'} - Tasks
          </h1>
          {#if client?.address}
            <p class="text-sm text-gray-500 truncate">
              {client.address}
            </p>
          {/if}
        </div>
        
        <button
          onclick={createNewTask}
          class="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                 transition-colors"
        >
          <Icon name="plus" class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
  
  <!-- Task list -->
  <div class="pb-20">
    {#if isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    {:else if tasks.length === 0}
      <div class="text-center py-12 px-4">
        <Icon name="clipboard" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 class="text-lg font-medium text-gray-900 mb-1">No tasks scheduled</h3>
        <p class="text-gray-500 mb-4">Create a task for {client?.name || 'this client'}</p>
        <button
          onclick={createNewTask}
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Create First Task
        </button>
      </div>
    {:else}
      <TaskList
        {tasks}
        emptyMessage="No tasks scheduled for this client"
        showClient={false}
        allowStatusChange={true}
      />
    {/if}
  </div>
</div>