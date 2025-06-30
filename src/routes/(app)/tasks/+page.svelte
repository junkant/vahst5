<!-- src/routes/(app)/tasks/+page.svelte -->
<script lang="ts">
  import { useClients } from '$lib/stores/client.svelte';
  import { useJobs } from '$lib/stores/jobs.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  const clients = useClients();
  const jobs = useJobs();
  const tenant = useTenant();
  
  // Filter states
  let filter = $state('all');
  let searchQuery = $state('');
  
  // Initialize stores when component mounts
  onMount(() => {
    if (tenant.current?.id) {
      clients.subscribeTenant(tenant.current.id);
    }
  });
  
  // Watch for tenant changes - prevent infinite loops AND clear invalid client selections
  let lastTenantId = $state<string | null>(null);
  $effect(() => {
    if (tenant.current?.id && tenant.current.id !== lastTenantId) {
      const oldTenantId = lastTenantId;
      lastTenantId = tenant.current.id;
      
      // Clear selected client immediately on tenant change
      if (oldTenantId !== null && clients.selectedClient) {
        clients.selectClient(null);
      }
      
      clients.subscribeTenant(tenant.current.id);
    }
  });
  
  // Validate selected client belongs to current tenant
  const validSelectedClient = $derived(() => {
    if (!clients.selectedClient || !tenant.current?.id) {
      return null;
    }
    
    // Ensure selected client exists in current tenant's client list
    const isValid = clients.clients.some(c => c.id === clients.selectedClient?.id);
    return isValid ? clients.selectedClient : null;
  });
  
  // Use real jobs from the store
  const allJobs = $derived(jobs.jobs || []);
  
  // Filter and search jobs
  const filteredJobs = $derived(() => {
    let result = [...allJobs];
    
    // Filter by client if one is VALIDLY selected
    if (validSelectedClient) {
      result = result.filter(job => job.clientId === validSelectedClient.id);
    }
    
    // Filter by status
    if (filter !== 'all') {
      result = result.filter(job => {
        switch (filter) {
          case 'pending':
            return job.status === 'scheduled' || job.status === 'draft';
          case 'in-progress':
            return job.status === 'in_progress';
          case 'completed':
            return job.status === 'completed';
          case 'overdue':
            return job.status === 'scheduled' && job.scheduledDate && new Date(job.scheduledDate) < new Date();
          default:
            return true;
        }
      });
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(job => 
        job.title?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query) ||
        job.client?.name?.toLowerCase().includes(query)
      );
    }
    
    // Sort by priority: overdue, in-progress, scheduled, completed
    return result.sort((a, b) => {
      const getStatusPriority = (job: any) => {
        if (job.status === 'completed') return 4;
        if (job.status === 'in_progress') return 1;
        if (job.status === 'scheduled' && job.scheduledDate && new Date(job.scheduledDate) < new Date()) return 0; // overdue
        if (job.status === 'scheduled') return 2;
        return 3;
      };
      
      const priorityA = getStatusPriority(a);
      const priorityB = getStatusPriority(b);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same priority, sort by scheduled date
      if (a.scheduledDate && b.scheduledDate) {
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      }
      
      return 0;
    });
  });
  
  function getStatusColor(status: string, scheduledDate?: Date) {
    // Check if overdue
    if (status === 'scheduled' && scheduledDate && new Date(scheduledDate) < new Date()) {
      return 'bg-red-100 text-red-800';
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
  
  function getStatusText(status: string, scheduledDate?: Date) {
    // Check if overdue
    if (status === 'scheduled' && scheduledDate && new Date(scheduledDate) < new Date()) {
      return 'Overdue';
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
  
  function formatDate(date: Date) {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  
  function createNewJob() {
    if (clients.selectedClient) {
      goto(`/jobs/new?client=${clients.selectedClient.id}`);
    } else {
      goto('/clients');
    }
  }
  
  function viewJob(job: any) {
    goto(`/jobs/${job.id}`);
  }
</script>

<div class="flex flex-col h-full bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b border-gray-200 p-4">
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-xl font-semibold text-gray-900">Tasks & Jobs</h1>
      <button 
        onclick={createNewJob}
        class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        New Job
      </button>
    </div>
    
    <!-- Selected Client Info -->
    {#if validSelectedClient}
      <div class="flex items-center space-x-2 mb-3">
        <span class="text-sm text-gray-500">Showing jobs for:</span>
        <span class="text-sm font-medium text-gray-900">{validSelectedClient.name}</span>
        <button 
          onclick={() => clients.selectClient(null)}
          class="text-xs text-blue-600 hover:text-blue-700"
        >
          Show All
        </button>
      </div>
    {/if}
    
    <!-- Search -->
    <div class="mb-3">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search jobs..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    
    <!-- Filters -->
    <div class="flex space-x-2 overflow-x-auto">
      {#each [
        { key: 'all', label: 'All' },
        { key: 'overdue', label: 'Overdue' },
        { key: 'in-progress', label: 'In Progress' },
        { key: 'pending', label: 'Pending' },
        { key: 'completed', label: 'Completed' }
      ] as filterOption}
        <button
          onclick={() => filter = filterOption.key}
          class="px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                 {filter === filterOption.key 
                   ? 'bg-blue-600 text-white' 
                   : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
        >
          {filterOption.label}
        </button>
      {/each}
    </div>
  </div>
  
  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4">
    {#if jobs.isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    {:else if jobs.error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-sm text-red-800">{jobs.error}</p>
      </div>
    {:else if filteredJobs.length === 0}
      <div class="text-center py-12">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-1">
          {searchQuery ? 'No jobs found' : 'No jobs yet'}
        </h3>
        <p class="text-gray-500 mb-4">
          {searchQuery 
            ? 'Try adjusting your search or filters' 
            : 'Create your first job to get started'}
        </p>
        {#if !searchQuery}
          <button 
            onclick={createNewJob}
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Create Your First Job
          </button>
        {/if}
      </div>
    {:else}
      <div class="space-y-3">
        {#each filteredJobs as job (job.id)}
          <button
            onclick={() => viewJob(job)}
            class="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow text-left"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-2">
                  <h3 class="font-semibold text-gray-900">{job.title}</h3>
                  <span class="px-2 py-1 rounded-full text-xs {getStatusColor(job.status, job.scheduledDate)}">
                    {getStatusText(job.status, job.scheduledDate)}
                  </span>
                </div>
                
                <div class="space-y-1">
                  <p class="text-sm text-gray-600">
                    Client: {job.client?.name || 'Unknown Client'}
                  </p>
                  
                  {#if job.description}
                    <p class="text-sm text-gray-500 line-clamp-2">{job.description}</p>
                  {/if}
                  
                  {#if job.scheduledDate}
                    <p class="text-xs text-gray-500">
                      Scheduled: {formatDate(new Date(job.scheduledDate))}
                    </p>
                  {/if}
                  
                  {#if job.assignedTo && job.assignedTo.length > 0}
                    <p class="text-xs text-gray-500">
                      Assigned to: {job.assignedTo.join(', ')}
                    </p>
                  {/if}
                </div>
              </div>
              
              <div class="text-right ml-4">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>