<script lang="ts">
  import { onMount } from 'svelte';
  
  interface Props {
    timeSlots: string[];
    startHour: number;
  }
  
  let { timeSlots, startHour = 6 }: Props = $props();
  
  let currentTimePosition = $state(0);
  let isVisible = $state(false);
  let intervalId: number;
  
  function updateTimePosition() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check if current time is within business hours
    if (currentHour < startHour || currentHour >= startHour + timeSlots.length) {
      isVisible = false;
      return;
    }
    
    isVisible = true;
    
    // Calculate position as percentage
    const minutesSinceStart = (currentHour - startHour) * 60 + currentMinute;
    const totalMinutes = timeSlots.length * 60;
    currentTimePosition = (minutesSinceStart / totalMinutes) * 100;
  }
  
  onMount(() => {
    updateTimePosition();
    // Update every minute
    intervalId = setInterval(updateTimePosition, 60000);
    
    return () => clearInterval(intervalId);
  });
</script>

{#if isVisible}
  <div 
    class="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
    style="top: {currentTimePosition}%"
  >
    <div class="absolute -left-2 -top-2 w-4 h-4 bg-red-500 rounded-full"></div>
    <div class="absolute left-4 -top-3 text-xs text-red-600 font-medium bg-white px-1 rounded">
      {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
    </div>
  </div>
{/if}
