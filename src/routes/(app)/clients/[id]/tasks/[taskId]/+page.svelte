<!-- src/routes/(app)/clients/[id]/tasks/[taskId]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useJobStore } from '$lib/stores/task.svelte';
  import TaskDetail from '$lib/components/task/TaskDetail.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  // Get IDs from route
  const clientId = $derived($page.params.id);
  const taskId = $derived($page.params.taskId);
  
  // Store
  const taskStore = useJobStore();
  
  // Get task
  const task = $derived(taskStore.getTaskById(taskId));
  const isLoading = $derived(taskStore.isLoading);
  
  // Navigate back
  function navigateBack() {
    goto(`/clients/${clientId}/tasks`);
  }
  
  // Check if task exists and belongs to client
  $effect(() => {
    if (task && task.clientId !== clientId) {
      // Task doesn't belong to this client, redirect
      goto(`/clients/${clientId}/tasks`);
    }
  });
</script>

{#if isLoading && !task}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent 
                  rounded-full animate-spin mb-4 mx-auto"></div>
      <p class="text-gray-500">Loading task...</p>
    </div>
  </div>
{:else if task}
  <TaskDetail {task} />
{:else}
  <div class="min-h-screen bg-gray-50">
    <div class="bg-white border-b border-gray-200">
      <div class="px-4 py-3">
        <div class="flex items-center gap-3">
          <button
            onclick={navigateBack}
            class="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="arrowLeft" class="w-5 h-5" />
          </button>
          
          <h1 class="text-lg font-semibold text-gray-900">
            Task Not Found
          </h1>
        </div>
      </div>
    </div>
    
    <div class="p-4 text-center">
      <Icon name="alertCircle" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <p class="text-gray-500">This task could not be found.</p>
      <button
        onclick={navigateBack}
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg 
               hover:bg-blue-700 transition-colors"
      >
        Back to Tasks
      </button>
    </div>
  </div>
{/if}