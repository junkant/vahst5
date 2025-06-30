<!-- src/routes/(app)/my-day/+page.svelte -->
<script lang="ts">
  import { useClients } from '$lib/stores/client.svelte';
  import { useJobs } from '$lib/stores/jobs.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { goto } from '$app/navigation';
  
  const clients = useClients();
  const jobs = useJobs();
  const tenant = useTenant();
  
  // Get today's date info
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Computed values from stores
  const todayJobs = $derived(jobs.todayJobs);
  const overdueJobs = $derived(jobs.overdueJobs);
  const upcomingJobs = $derived(jobs.upcomingJobs.slice(0, 3)); // Next 3 upcoming
  const recentClients = $derived(clients.recentClients?.slice(0, 5) || []); // Recent 5 clients
  
  function createNewJob() {
    if (clients.selectedClient) {
      goto(`/jobs/new?client=${clients.selectedClient.id}`);
    } else {
      goto('/clients');
    }
  }
  
  function viewAllJobs() {
    goto('/jobs');
  }
  
  function viewAllClients() {
    goto('/clients');
  }
  
  function selectClient(client: any) {
    clients.selectClient(client);
    goto(`/clients/${client.id}`);
  }
  
  function getJobStatusColor(status: string) {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
</script>

<div class="flex flex-col h-full bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b border-gray-200 p-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-gray-900">My Day</h1>
        <p class="text-sm text-gray-500">{todayFormatted}</p>
      </div>
      <div class="text-right">
        {#if tenant.current}
          <p class="text-sm font-medium text-gray-900">{tenant.current.name}</p>
          <p class="text-xs text-gray-500">
            {tenant.userRole ? tenant.userRole.charAt(0).toUpperCase() + tenant.userRole.slice(1) : 'User'}
          </p>
        {/if}
      </div>
    </div>
  </div>
  
  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    
    <!-- Quick Actions -->
    <div class="bg-white rounded-lg p-4">
      <h2 class="font-semibold text-gray-900 mb-3">Quick Actions</h2>
      <div class="grid grid-cols-2 gap-3">
        <button 
          onclick={createNewJob}
          class="flex items-center justify-center p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-sm font-medium text-blue-700">New Job</span>
        </button>
        <button 
          onclick={() => goto('/clients/new')}
          class="flex items-center justify-center p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
        >
          <svg class="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span class="text-sm font-medium text-green-700">New Client</span>
        </button>
      </div>
    </div>
    
    <!-- Overdue Jobs Alert -->
    {#if overdueJobs.length > 0}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span class="text-sm font-medium text-red-800">
            {overdueJobs.length} overdue job{overdueJobs.length === 1 ? '' : 's'} need attention
          </span>
        </div>
      </div>
    {/if}
    
    <!-- Today's Jobs -->
    <div class="bg-white rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold text-gray-900">Today's Jobs</h2>
        <button 
          onclick={viewAllJobs}
          class="text-sm text-blue-600 hover:text-blue-700"
        >
          View All
        </button>
      </div>
      
      {#if jobs.isLoading}
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      {:else if todayJobs.length === 0}
        <div class="text-center py-8">
          <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-1">No jobs scheduled for today</h3>
          <p class="text-gray-500 mb-4">Looks like you have a light day ahead!</p>
          <button 
            onclick={createNewJob}
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Schedule a Job
          </button>
        </div>
      {:else}
        <div class="space-y-3">
          {#each todayJobs as job (job.id)}
            <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-1">
                    <h3 class="font-medium text-gray-900">{job.title}</h3>
                    <span class="px-2 py-1 rounded-full text-xs {getJobStatusColor(job.status)}">
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mb-1">
                    {job.client?.name || 'Unknown Client'}
                  </p>
                  {#if job.scheduledDate}
                    <p class="text-xs text-gray-500">
                      {formatTime(new Date(job.scheduledDate))}
                    </p>
                  {/if}
                </div>
                <button class="text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    
    <!-- Upcoming Jobs Preview -->
    {#if upcomingJobs.length > 0}
      <div class="bg-white rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-gray-900">Coming Up</h2>
          <button 
            onclick={viewAllJobs}
            class="text-sm text-blue-600 hover:text-blue-700"
          >
            View All
          </button>
        </div>
        
        <div class="space-y-2">
          {#each upcomingJobs as job (job.id)}
            <div class="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
              <div class="flex-1">
                <p class="font-medium text-gray-900 text-sm">{job.title}</p>
                <p class="text-xs text-gray-500">{job.client?.name}</p>
              </div>
              {#if job.scheduledDate}
                <p class="text-xs text-gray-500">
                  {new Date(job.scheduledDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    <!-- Recent Clients -->
    <div class="bg-white rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold text-gray-900">Recent Clients</h2>
        <button 
          onclick={viewAllClients}
          class="text-sm text-blue-600 hover:text-blue-700"
        >
          View All
        </button>
      </div>
      
      {#if clients.isLoadingClients}
        <div class="flex items-center justify-center py-4">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      {:else if recentClients.length === 0}
        <div class="text-center py-6">
          <svg class="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p class="text-sm text-gray-500 mb-3">No clients yet</p>
          <button 
            onclick={() => goto('/clients/new')}
            class="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first client
          </button>
        </div>
      {:else}
        <div class="space-y-2">
          {#each recentClients as client (client.id)}
            <button
              onclick={() => selectClient(client)}
              class="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded text-left"
            >
              <div class="flex-1">
                <p class="font-medium text-gray-900 text-sm">{client.name}</p>
                <p class="text-xs text-gray-500">{client.address}</p>
              </div>
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          {/each}
        </div>
      {/if}
    </div>
    
    <!-- Error Display -->
    {#if jobs.error || clients.error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-sm text-red-800">
          {jobs.error || clients.error}
        </p>
      </div>
    {/if}
  </div>
</div>