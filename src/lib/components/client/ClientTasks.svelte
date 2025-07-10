<!-- src/lib/components/client/ClientTasks.svelte -->
<!--
  @component ClientTasks
  @description Displays active and upcoming tasks for a client
  @usage <ClientTasks {client} />
-->
<script lang="ts">
  import { useJobStore } from '$lib/stores/task.svelte';
  import { goto } from '$app/navigation';
  import type { Client } from '$lib/stores/client.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  interface Props {
    client: Client;
  }
  
  let { client }: Props = $props();
  
  const taskStore = useJobStore();
  
  // Subscribe to client tasks
  $effect(() => {
    taskStore.subscribeToClient(client.id);
  });
  
  // Get active tasks for this client
  const activeTasks = $derived(() => {
    return taskStore.getTasksForClient(client.id)
      .filter(task => 
        ['scheduled', 'in_progress', 'draft'].includes(task.status)
      )
      .sort((a, b) => {
        const dateA = (a.scheduledStart instanceof Date ? a.scheduledStart : a.scheduledStart?.toDate?.() || new Date()).getTime();
        const dateB = (b.scheduledStart instanceof Date ? b.scheduledStart : b.scheduledStart?.toDate?.() || new Date()).getTime();
        return dateA - dateB; // Earliest first
      });
  });
  
  function formatDate(date: Date | any) {
    const d = date instanceof Date ? date : date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
  
  function getStatusColor(status: string) {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  function navigateToTask(taskId: string) {
    goto(`/tasks/${taskId}`);
  }
  
  function createNewTask() {
    goto(`/tasks/new?client=${client.id}`);
  }
</script>

<div>
  {#if activeTasks().length === 0}
    <div class="text-center py-8">
      <Icon name="clipboard" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <p class="text-gray-500 mb-4">No active tasks</p>
      <button
        onclick={createNewTask}
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
      >
        Create New Task
      </button>
    </div>
  {:else}
    <div class="space-y-3">
      {#each activeTasks() as task (task.id)}
        <div 
          class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
          onclick={() => navigateToTask(task.id)}
          onkeydown={(e) => e.key === 'Enter' && navigateToTask(task.id)}
          role="button"
          tabindex="0"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h4 class="font-medium text-gray-900">{task.title}</h4>
              {#if task.scheduledStart}
                <p class="text-sm text-gray-600 mt-1">
                  {formatDate(task.scheduledStart)}
                </p>
              {/if}
              {#if task.description}
                <p class="text-sm text-gray-500 mt-2 line-clamp-2">
                  {task.description}
                </p>
              {/if}
              {#if task.assignedTo?.length > 0}
                <div class="flex items-center gap-2 mt-2">
                  <Icon name="user" class="w-4 h-4 text-gray-400" />
                  <span class="text-xs text-gray-500">
                    {task.assignedToNames?.join(', ') || task.assignedTo.join(', ')}
                  </span>
                </div>
              {/if}
            </div>
            <div class="flex flex-col items-end gap-2">
              <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(task.status)}">
                {task.status.replace('_', ' ')}
              </span>
              <Icon name="chevronRight" class="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      {/each}
      
      <button
        onclick={createNewTask}
        class="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 
               hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center 
               justify-center gap-2"
      >
        <Icon name="plus" class="w-5 h-5" />
        Add New Task
      </button>
    </div>
  {/if}
</div>

<style>
  /* Line clamp utility */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>