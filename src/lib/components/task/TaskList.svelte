<!-- src/lib/components/job/JobList.svelte -->
<script lang="ts">
  import type { Job, JobStatus } from '$lib/types/job';
  import JobCard from './JobCard.svelte';
  import { useTasks } from '$lib/stores/tasks.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { goto } from '$app/navigation';
  import { toast } from '$lib/utils/toast';
  
  interface Props {
    jobs: Job[];
    title?: string;
    emptyMessage?: string;
    showClient?: boolean;
    allowStatusChange?: boolean;
    onJobClick?: (job: Job) => void;
  }
  
  let { 
    jobs,
    title,
    emptyMessage = 'No jobs found',
    showClient = true,
    allowStatusChange = true,
    onJobClick
  }: Props = $props();
  
  const jobStore = useJobs();
  const auth = useAuth();
  
  // Group jobs by date
  const groupedJobs = $derived(() => {
    const groups = new Map<string, Job[]>();
    
    jobs.forEach(job => {
      const date = job.scheduledStart instanceof Date 
        ? job.scheduledStart 
        : job.scheduledStart.toDate();
      
      const dateKey = date.toDateString();
      
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      
      groups.get(dateKey)!.push(job);
    });
    
    // Sort groups by date
    return Array.from(groups.entries()).sort((a, b) => {
      return new Date(a[0]).getTime() - new Date(b[0]).getTime();
    });
  });
  
  // Format group date
  function formatGroupDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else if (date < today) {
      return 'Overdue';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }
  
  // Handle job click
  function handleJobClick(job: Job) {
    if (onJobClick) {
      onJobClick(job);
    } else {
      goto(`/clients/${job.clientId}/jobs/${job.id}`);
    }
  }
  
  // Handle status change
  async function handleStatusChange(job: Job, newStatus: JobStatus) {
    if (!allowStatusChange) return;
    
    try {
      await jobStore.updateJobStatus(job.id, newStatus);
      toast.success(`Job status updated to ${newStatus.replace('_', ' ')}`);
      
      // Auto-navigate to job if changing to in_progress
      if (newStatus === 'in_progress') {
        handleJobClick(job);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  }
  
  // Loading state
  const isLoading = $derived(jobStore.isLoading);
</script>

<div class="job-list">
  {#if title}
    <h2 class="text-lg font-semibold text-gray-900 mb-4 px-4">
      {title}
    </h2>
  {/if}
  
  {#if isLoading && jobs.length === 0}
    <div class="flex flex-col items-center justify-center py-12">
      <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent 
                  rounded-full animate-spin mb-4"></div>
      <p class="text-gray-500">Loading jobs...</p>
    </div>
  {:else if jobs.length === 0}
    <div class="flex flex-col items-center justify-center py-12 px-4">
      <Icon name="clipboard" class="w-12 h-12 text-gray-400 mb-3" />
      <p class="text-gray-500 text-center">{emptyMessage}</p>
    </div>
  {:else}
    <div class="space-y-6">
      {#each groupedJobs as [dateKey, dateJobs]}
        <div>
          <!-- Date header -->
          <div class="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200 z-10">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-medium text-gray-700">
                {formatGroupDate(dateKey)}
              </h3>
              <span class="text-xs text-gray-500">
                {dateJobs.length} job{dateJobs.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          <!-- Jobs for this date -->
          <div class="px-4 py-3 space-y-3">
            {#each dateJobs as job (job.id)}
              <JobCard
                {job}
                {showClient}
                onClick={() => handleJobClick(job)}
                onStatusChange={allowStatusChange ? 
                  (status) => handleStatusChange(job, status) : 
                  undefined
                }
              />
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  <!-- Offline indicator -->
  {#if jobStore.isOffline}
    <div class="fixed bottom-20 left-4 right-4 bg-yellow-100 border border-yellow-400 
                text-yellow-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <Icon name="wifiOff" class="w-5 h-5" />
      <span class="text-sm">Working offline - changes will sync when connected</span>
    </div>
  {/if}
</div>

<style>
  .job-list {
    min-height: 100%;
    padding-bottom: 5rem; /* Space for bottom navigation */
  }
  
  /* Ensure sticky headers work properly */
  :global(.job-list > div) {
    position: relative;
  }
</style>
