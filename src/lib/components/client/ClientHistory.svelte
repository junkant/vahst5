<!-- src/lib/components/client/ClientHistory.svelte -->
<!--
  @component ClientHistory
  @description Displays service history for a client
  @usage <ClientHistory {client} />
-->
<script lang="ts">
  import { useJobs } from '$lib/stores/jobs.svelte';
  import type { Client } from '$lib/stores/client.svelte';
  
  interface Props {
    client: Client;
  }
  
  let { client }: Props = $props();
  
  const jobs = useJobs();
  
  // Get completed jobs for this client
  const clientHistory = $derived(() => {
    return jobs.jobs
      .filter(job => job.clientId === client.id && job.status === 'completed')
      .sort((a, b) => {
        const dateA = new Date(a.completedDate || a.scheduledDate).getTime();
        const dateB = new Date(b.completedDate || b.scheduledDate).getTime();
        return dateB - dateA; // Most recent first
      })
      .slice(0, 10); // Limit to last 10
  });
  
  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  function formatDuration(start: Date, end: Date) {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
</script>

<div class="space-y-3">
  {#if clientHistory().length === 0}
    <div class="text-center py-8">
      <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p class="text-gray-500">No service history yet</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each clientHistory() as job (job.id)}
        <div class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h4 class="font-medium text-gray-900">{job.title}</h4>
              <p class="text-sm text-gray-600 mt-1">
                {formatDate(job.completedDate || job.scheduledDate)}
                {#if job.actualStart && job.actualEnd}
                  • {formatDuration(job.actualStart, job.actualEnd)}
                {/if}
              </p>
              {#if job.assignedTo?.length > 0}
                <p class="text-xs text-gray-500 mt-1">
                  Technician: {job.assignedTo.join(', ')}
                </p>
              {/if}
            </div>
            <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
              Completed
            </span>
          </div>
          
          {#if job.notes}
            <div class="mt-2 text-sm text-gray-600 bg-white rounded p-2">
              {job.notes}
            </div>
          {/if}
        </div>
      {/each}
    </div>
    
    {#if jobs.jobs.filter(j => j.clientId === client.id && j.status === 'completed').length > 10}
      <button 
        class="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2"
        onclick={() => console.log('View all history')}
      >
        View all service history ({jobs.jobs.filter(j => j.clientId === client.id && j.status === 'completed').length} total)
      </button>
    {/if}
  {/if}
</div>