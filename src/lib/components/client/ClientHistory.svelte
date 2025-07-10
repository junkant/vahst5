<!-- src/lib/components/client/ClientHistory.svelte -->
<!--
  @component ClientHistory
  @description Displays service history for a client
  @usage <ClientHistory {client} />
-->
<script lang="ts">
  import { useJobStore } from '$lib/stores/task.svelte';
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
  
  // Get completed tasks for this client
  const clientHistory = $derived(() => {
    return taskStore.getTasksForClient(client.id)
      .filter(task => task.status === 'completed' || task.status === 'invoiced' || task.status === 'paid')
      .sort((a, b) => {
        const dateA = (a.actualEnd || a.scheduledEnd || a.scheduledStart || new Date()).valueOf();
        const dateB = (b.actualEnd || b.scheduledEnd || b.scheduledStart || new Date()).valueOf();
        return dateB - dateA; // Most recent first
      })
      .slice(0, 10); // Limit to last 10
  });
  
  function formatDate(date: Date | any) {
    const d = date instanceof Date ? date : date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  function formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }
</script>

<div class="space-y-3">
  {#if clientHistory().length === 0}
    <div class="text-center py-8">
      <Icon name="clipboard" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <p class="text-gray-500">No service history yet</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each clientHistory() as task (task.id)}
        <div class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h4 class="font-medium text-gray-900">{task.title}</h4>
              <p class="text-sm text-gray-600 mt-1">
                {formatDate(task.actualEnd || task.scheduledEnd || task.scheduledStart)}
                {#if task.duration}
                  • {formatDuration(task.duration)}
                {/if}
              </p>
              {#if task.assignedToNames?.length > 0}
                <p class="text-xs text-gray-500 mt-1">
                  Technician: {task.assignedToNames.join(', ')}
                </p>
              {/if}
            </div>
            <span class="px-2 py-1 text-xs font-medium rounded-full 
              {task.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 
               task.status === 'invoiced' ? 'bg-purple-100 text-purple-800' :
               'bg-green-100 text-green-800'}">
              {task.status.replace('_', ' ')}
            </span>
          </div>
          
          {#if task.notes && task.notes.length > 0}
            <div class="mt-2 text-sm text-gray-600 bg-white rounded p-2">
              {task.notes[0].text}
            </div>
          {/if}
        </div>
      {/each}
    </div>
    
    {#if taskStore.getTasksForClient(client.id).filter(t => t.status === 'completed' || t.status === 'invoiced' || t.status === 'paid').length > 10}
      <button 
        class="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2"
        onclick={() => console.log('View all history')}
      >
        View all service history ({taskStore.getTasksForClient(client.id).filter(t => t.status === 'completed' || t.status === 'invoiced' || t.status === 'paid').length} total)
      </button>
    {/if}
  {/if}
</div>