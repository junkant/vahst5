<script lang="ts">
  import { calendarSettings, scheduledTasks } from '$lib/stores/calendar.svelte';
  import CalendarView from '$lib/components/CalendarView.svelte';
  import { page } from '$app/stores';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { initializeClientStore } from '$lib/stores/client.svelte';
  import { onMount } from 'svelte';
  
  const auth = useAuth();
  const tenant = useTenant();
  
  // Get view type from URL params (week, day, or month)
  $: viewType = $page.url.searchParams.get('view') || 'week';
  
  // Initialize stores when component mounts
  onMount(() => {
    // Initialize client store with current tenant
    if (tenant.current?.id) {
      initializeClientStore(tenant.current.id);
    }
  });
</script>

<div class="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
  <!-- Header -->
  <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
    <div class="px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Calendar</h1>
        
        <!-- View Toggle -->
        <div class="flex gap-2">
          <a 
            href="/calendar?view=day"
            class="px-4 py-2 text-sm font-medium rounded-md 
                   {viewType === 'day' 
                     ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                     : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
          >
            Day
          </a>
          <a 
            href="/calendar?view=week"
            class="px-4 py-2 text-sm font-medium rounded-md 
                   {viewType === 'week' 
                     ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                     : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
          >
            Week
          </a>
          <a 
            href="/calendar?view=month"
            class="px-4 py-2 text-sm font-medium rounded-md 
                   {viewType === 'month' 
                     ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                     : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
          >
            Month
          </a>
        </div>
      </div>
    </div>
  </header>
  
  <!-- Calendar Component -->
  <main class="flex-1 overflow-hidden">
    <CalendarView {viewType} />
  </main>
</div>
