<script lang="ts">
  import { calendarSettings } from '$lib/stores/calendar.svelte';
  import { fade } from 'svelte/transition';
  
  let saved = false;
  
  const days = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ] as const;
  
  function handleSave() {
    // Settings are automatically persisted by the store
    saved = true;
    setTimeout(() => saved = false, 3000);
  }
  
  function formatDayName(day: string): string {
    return day.charAt(0).toUpperCase() + day.slice(1);
  }
</script>

<div class="max-w-4xl mx-auto p-6">
  <h1 class="text-2xl font-bold mb-6">Business Settings</h1>
  
  <div class="bg-white rounded-lg shadow p-6">
    <!-- Time Slot Duration -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold mb-4">Appointment Settings</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Time Slot Duration
          </label>
          <select
            bind:value={$calendarSettings.timeSlotDuration}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Default Appointment Duration
          </label>
          <select
            bind:value={$calendarSettings.defaultAppointmentDuration}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Buffer Time Between Appointments
          </label>
          <select
            bind:value={$calendarSettings.bufferTime}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>No buffer</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
          </select>
        </div>
      </div>
    </div>
    
    <!-- Business Hours -->
    <div>
      <h2 class="text-lg font-semibold mb-4">Business Hours</h2>
      
      <div class="space-y-3">
        {#each days as day}
          <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
            <label class="flex items-center gap-2 min-w-[120px]">
              <input
                type="checkbox"
                bind:checked={$calendarSettings.businessHours[day].enabled}
                class="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span class="font-medium">{formatDayName(day)}</span>
            </label>
            
            {#if $calendarSettings.businessHours[day].enabled}
              <div class="flex items-center gap-2 flex-1" transition:fade={{ duration: 200 }}>
                <input
                  type="time"
                  bind:value={$calendarSettings.businessHours[day].start}
                  class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span class="text-gray-500">to</span>
                <input
                  type="time"
                  bind:value={$calendarSettings.businessHours[day].end}
                  class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            {:else}
              <div class="text-gray-400 italic">Closed</div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Save Button -->
    <div class="mt-8 flex items-center justify-between">
      <button
        on:click={handleSave}
        class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Save Settings
      </button>
      
      {#if saved}
        <div class="text-green-600 font-medium" transition:fade>
          ✓ Settings saved successfully
        </div>
      {/if}
    </div>
  </div>
</div>
