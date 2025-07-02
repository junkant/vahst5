<!-- src/lib/components/client/ClientJobs.svelte -->
<!--
  @component ClientJobs
  @description Displays active and upcoming jobs for a client
  @usage <ClientJobs {client} />
-->
<script lang="ts">
  import { useJobs } from '$lib/stores/jobs.svelte';
  import { goto } from '$app/navigation';
  import type { Client } from '$lib/stores/client.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  interface Props {
    client: Client;
  }
  
  let { client }: Props = $props();
  
  const jobs = useJobs();
  
  // Get active jobs for this client
  const activeJobs = $derived(() => {
    return jobs.jobs
      .filter(job => 
        job.clientId === client.id && 
        ['scheduled', 'in_progress', 'draft'].includes(job.status)
      )
      .sort((a, b) => {
        const dateA = new Date(a.scheduledDate || Date.now()).getTime();
        const dateB = new Date(b.scheduledDate || Date.now()).getTime();
        return dateA - dateB; // Earliest first
      });
  });
  
  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', {
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
  
  function navigateToJob(jobId: string) {
    goto(`/jobs/${jobId}`);
  }
  
  function createNewJob() {
    goto(`/jobs/new?clientId=${client.id}`);
  }
</script>

<div>
  {#if activeJobs().length === 0}
    <div class="text-center py-8">
      <Icon name="clipboard" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <p class="text-gray-500 mb-4">No active jobs</p>
      <button
        onclick={createNewJob}
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
      >
        Create New Job
      </button>
    </div>
  {:else}
    <div class="space-y-3">
      {#each activeJobs() as job (job.id)}
        <div 
          class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
          onclick={() => navigateToJob(job.id)}
          onkeydown={(e) => e.key === 'Enter' && navigateToJob(job.id)}
          role="button"
          tabindex="0"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h4 class="font-medium text-gray-900">{job.title}</h4>
              {#if job.scheduledDate}
                <p class="text-sm text-gray-600 mt-1">
                  {formatDate(job.scheduledDate)}
                </p>
              {/if}
              {#if job.description}
                <p class="text-sm text-gray-500 mt-2 line-clamp-2">
                  {job.description}
                </p>
              {/if}
              {#if job.assignedTo?.length > 0}
                <div class="flex items-center gap-2 mt-2">
                  <Icon name="user" class="w-4 h-4 text-gray-400" />
                  <span class="text-xs text-gray-500">
                    {job.assignedTo.join(', ')}
                  </span>
                </div>
              {/if}
            </div>
            <div class="flex flex-col items-end gap-2">
              <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(job.status)}">
                {job.status.replace('_', ' ')}
              </span>
              <Icon name="chevronRight" class="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      {/each}
      
      <button
        onclick={createNewJob}
        class="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 
               hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center 
               justify-center gap-2"
      >
        <Icon name="plus" class="w-5 h-5" />
        Add New Job
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