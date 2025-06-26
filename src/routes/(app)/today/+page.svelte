<script>
  import { onMount } from 'svelte';
  import { createDatePicker, melt } from '@melt-ui/svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { subscribeToTodayJobs } from '$lib/firebase/firestore';
  
  const auth = useAuth();
  
  let todayJobs = $state([]);
  let isLoading = $state(true);
  let selectedDate = $state(new Date());
  
  const datePicker = createDatePicker({
    defaultValue: selectedDate,
    onValueChange: ({ next }) => {
      selectedDate = next;
      loadJobsForDate(next);
      return next;
    }
  });
  
  async function loadJobsForDate(date) {
    isLoading = true;
    // Implementation would subscribe to jobs for selected date
    // For now, using mock data
    setTimeout(() => {
      todayJobs = [
        {
          id: '1',
          clientName: 'Johnson Residence',
          address: '123 Main St',
          time: '9:00 AM',
          duration: '2 hours',
          type: 'AC Maintenance',
          status: 'scheduled'
        },
        {
          id: '2',
          clientName: 'Smith Office Building',
          address: '456 Business Blvd',
          time: '11:30 AM',
          duration: '1 hour',
          type: 'Repair',
          status: 'scheduled'
        },
        {
          id: '3',
          clientName: 'Miller Property',
          address: '789 Oak Ave',
          time: '2:00 PM',
          duration: '3 hours',
          type: 'Installation',
          status: 'scheduled'
        }
      ];
      isLoading = false;
    }, 500);
  }
  
  onMount(() => {
    loadJobsForDate(selectedDate);
  });
  
  function getRouteMapUrl() {
    const addresses = todayJobs.map(job => job.address).join('/');
    return `https://maps.google.com/maps/dir/${encodeURIComponent(addresses)}`;
  }
</script>

<div class="flex flex-col h-full bg-gray-50">
  <!-- Header with Date Picker -->
  <div class="bg-white border-b border-gray-200 p-4">
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-xl font-semibold text-gray-900">Schedule</h1>
      <button use:melt={$datePicker.elements.trigger}
              class="flex items-center gap-2 px-3 py-2 bg-gray-100 
                     rounded-lg text-sm font-medium text-gray-700">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {selectedDate.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        })}
      </button>
    </div>
    
    <!-- Quick Stats -->
    <div class="flex gap-4 text-sm">
      <div class="flex items-center gap-1">
        <span class="font-semibold text-gray-900">{todayJobs.length}</span>
        <span class="text-gray-500">jobs</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="font-semibold text-gray-900">
          {todayJobs.reduce((acc, job) => {
            const hours = parseInt(job.duration) || 0;
            return acc + hours;
          }, 0)}
        </span>
        <span class="text-gray-500">hours</span>
      </div>
    </div>
  </div>
  
  <!-- Map Preview -->
  {#if todayJobs.length > 0}
    <div class="bg-primary-600 text-white p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">Optimized Route</p>
          <p class="text-xs text-primary-200">
            {todayJobs.length} stops • ~25 miles
          </p>
        </div>
        <a href={getRouteMapUrl()} 
           target="_blank"
           class="flex items-center gap-2 px-3 py-1.5 bg-white/20 
                  rounded-lg text-sm font-medium hover:bg-white/30 
                  transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Open in Maps
        </a>
      </div>
    </div>
  {/if}
  
  <!-- Jobs List -->
  <div class="flex-1 overflow-y-auto">
    {#if isLoading}
      <div class="flex items-center justify-center h-64">
        <div class="text-center">
          <div class="w-12 h-12 border-4 border-primary-600 border-t-transparent 
                      rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-gray-600">Loading schedule...</p>
        </div>
      </div>
    {:else if todayJobs.length === 0}
      <div class="text-center py-12">
        <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" 
             stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No jobs scheduled</h3>
        <p class="text-gray-500">Your schedule is clear for this day</p>
      </div>
    {:else}
      <div class="p-4 space-y-3">
        {#each todayJobs as job, index}
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div class="p-4">
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-primary-100 text-primary-600 
                              rounded-full flex items-center justify-center 
                              font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h3 class="font-medium text-gray-900">{job.clientName}</h3>
                    <p class="text-sm text-gray-500">{job.address}</p>
                  </div>
                </div>
                <span class="text-xs px-2 py-1 bg-gray-100 text-gray-800 
                             rounded-full">
                  {job.status}
                </span>
              </div>
              
              <div class="flex items-center gap-4 text-sm text-gray-600 ml-11">
                <div class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {job.time}
                </div>
                <div class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {job.duration}
                </div>
                <div class="flex-1 text-right">
                  <span class="font-medium">{job.type}</span>
                </div>
              </div>
            </div>
            
            <!-- Quick Actions -->
            <div class="bg-gray-50 px-4 py-2 flex gap-2">
              <button class="flex-1 text-center py-2 text-sm font-medium 
                             text-primary-600 hover:bg-white rounded 
                             transition-colors">
                Start Job
              </button>
              <button class="flex-1 text-center py-2 text-sm font-medium 
                             text-gray-600 hover:bg-white rounded 
                             transition-colors">
                View Details
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
