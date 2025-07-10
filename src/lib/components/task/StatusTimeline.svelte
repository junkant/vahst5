<!-- src/lib/components/task/StatusTimeline.svelte -->
<script lang="ts">
  import type { TaskStatus } from '$lib/types/task';
  import { getStatusColor, getStatusIcon } from '$lib/types/task';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  // Format timestamp
  function formatTime(date: Date): string {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  
  interface StatusHistoryItem {
    status: TaskStatus;
    changedAt: Date;
    changedBy: string;
    reason?: string;
  }
  
  interface Props {
    statusHistory: StatusHistoryItem[];
    onClose: () => void;
  }
  
  let { statusHistory, onClose }: Props = $props();
  
  // Status order for timeline
  const statusOrder: TaskStatus[] = [
    'draft',
    'scheduled',
    'in_progress',
    'completed',
    'invoiced',
    'paid'
  ];
  
  // Get timeline position for status
  function getTimelinePosition(status: TaskStatus): number {
    const index = statusOrder.indexOf(status);
    return index === -1 ? 0 : index;
  }
  
  // Current status position
  const currentStatus = statusHistory[statusHistory.length - 1]?.status || 'draft';
  const currentPosition = getTimelinePosition(currentStatus);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50"
  onclick={onClose}
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="bg-white w-full max-w-lg rounded-t-2xl shadow-xl max-h-[80vh] 
           animate-slide-up"
    onclick={(e) => e.stopPropagation()}
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-900">Status Timeline</h2>
      <button
        onclick={onClose}
        class="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Icon name="x" class="w-5 h-5 text-gray-500" />
      </button>
    </div>
    
    <!-- Timeline -->
    <div class="p-6 overflow-y-auto">
      <div class="relative">
        <!-- Progress line -->
        <div class="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        <div 
          class="absolute left-6 top-0 w-0.5 bg-green-500 transition-all duration-500"
          style="height: {(currentPosition / (statusOrder.length - 1)) * 100}%"
        ></div>
        
        <!-- Status nodes -->
        {#each statusOrder as status, index}
          {@const isCompleted = index <= currentPosition}
          {@const historyItem = statusHistory.find(h => h.status === status)}
          
          <div class="relative flex items-start mb-8 last:mb-0">
            <!-- Node -->
            <div 
              class="relative z-10 w-12 h-12 rounded-full flex items-center justify-center
                     {isCompleted ? `bg-${getStatusColor(status)}-100` : 'bg-gray-100'}
                     {historyItem ? 'ring-4 ring-white shadow-lg' : ''}"
            >
              <Icon 
                name={getStatusIcon(status)} 
                class="w-6 h-6 {isCompleted ? `text-${getStatusColor(status)}-600` : 'text-gray-400'}"
              />
            </div>
            
            <!-- Content -->
            <div class="ml-4 flex-1">
              <h3 class="font-medium text-gray-900 capitalize">
                {status.replace('_', ' ')}
              </h3>
              
              {#if historyItem}
                <p class="text-sm text-gray-500 mt-0.5">
                  {formatTime(historyItem.changedAt)}
                </p>
                {#if historyItem.reason}
                  <p class="text-sm text-gray-600 mt-1">
                    {historyItem.reason}
                  </p>
                {/if}
              {:else}
                <p class="text-sm text-gray-400 mt-0.5">Not reached</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
      
      <!-- History details -->
      {#if statusHistory.length > 1}
        <div class="mt-8 pt-6 border-t border-gray-200">
          <h3 class="text-sm font-medium text-gray-700 mb-3">Status Changes</h3>
          <div class="space-y-2">
            {#each statusHistory.slice().reverse() as item, index}
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <Icon 
                    name={getStatusIcon(item.status)} 
                    class="w-4 h-4 text-{getStatusColor(item.status)}-600"
                  />
                  <span class="capitalize">{item.status.replace('_', ' ')}</span>
                </div>
                <span class="text-gray-500">
                  {formatTime(item.changedAt)}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  
  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }
</style>