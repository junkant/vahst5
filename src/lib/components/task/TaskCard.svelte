<!-- src/lib/components/task/TaskCard.svelte -->
<script lang="ts">
  import type { Task } from '$lib/types/task';
  import { getStatusColor, getStatusIcon, getPriorityColor } from '$lib/types/task';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { createSwipeable } from '$lib/utils/swipe';
  import { useFeatureFlags } from '$lib/stores/featureFlags.svelte';
  
  // Date formatting utilities
  function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
  
  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  function formatDistanceToNow(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'just now';
  }
  
  interface Props {
    task: Task;
    onStatusChange?: (status: Task['status']) => void;
    onClick?: () => void;
    showClient?: boolean;
  }
  
  let { 
    task, 
    onStatusChange, 
    onClick,
    showClient = true 
  }: Props = $props();
  
  // Permission checks
  const featureFlags = useFeatureFlags();
  const canUpdateStatus = $derived(featureFlags.can('task_management_update_status'));
  
  // Swipe actions based on current status and permissions
  const swipeActions = $derived(() => {
    // Only show swipe actions if user has permission to update status
    if (!canUpdateStatus) return null;
    
    switch (task.status) {
      case 'scheduled':
        return {
          left: { action: 'start', color: 'green', icon: 'play' },
          right: { action: 'cancel', color: 'red', icon: 'x' }
        };
      case 'in_progress':
        return {
          left: { action: 'complete', color: 'blue', icon: 'check' },
          right: { action: 'pause', color: 'orange', icon: 'pause' }
        };
      default:
        return null;
    }
  });
  
  // Handle swipe actions
  function handleSwipe(direction: 'left' | 'right') {
    if (!swipeActions || !onStatusChange) return;
    
    const action = swipeActions[direction];
    if (!action) return;
    
    switch (action.action) {
      case 'start':
        onStatusChange('in_progress');
        break;
      case 'complete':
        onStatusChange('completed');
        break;
      case 'cancel':
        onStatusChange('draft');
        break;
      case 'pause':
        onStatusChange('scheduled');
        break;
    }
  }
  
  // Format scheduled time
  const scheduledTime = $derived(() => {
    const date = task.scheduledStart instanceof Date 
      ? task.scheduledStart 
      : task.scheduledStart.toDate();
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();
    
    if (isToday) {
      return `Today at ${formatTime(date)}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${formatTime(date)}`;
    } else if (date < now) {
      return `${formatDistanceToNow(date)} ago`;
    } else {
      return `${formatDate(date)} at ${formatTime(date)}`;
    }
  });
  
  // Duration display
  const durationDisplay = $derived(() => {
    if (task.duration) {
      const hours = Math.floor(task.duration / 60);
      const minutes = task.duration % 60;
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
    
    if (task.predictions?.duration) {
      const { minutes } = task.predictions.duration;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours > 0 ? `~${hours}h ${mins}m` : `~${mins}m`;
    }
    
    return null;
  });
  
  // Initialize swipeable
  let cardElement: HTMLDivElement;
  
  $effect(() => {
    if (cardElement && swipeActions) {
      const { destroy } = createSwipeable(cardElement, {
        onSwipeLeft: () => handleSwipe('left'),
        onSwipeRight: () => handleSwipe('right'),
        threshold: 100
      });
      
      return destroy;
    }
  });
</script>

<div 
  bind:this={cardElement}
  class="task-card relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
         overflow-hidden transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/30 cursor-pointer
         touch-manipulation"
  onclick={onClick}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Enter' && onClick?.()}
>
  <!-- Swipe action indicators -->
  {#if swipeActions}
    <div class="absolute inset-0 flex">
      <div class="swipe-action-left flex-1 flex items-center px-4 bg-{swipeActions.left.color}-500">
        <Icon name={swipeActions.left.icon} class="w-6 h-6 text-white" />
      </div>
      <div class="swipe-action-right flex-1 flex items-center justify-end px-4 bg-{swipeActions.right.color}-500">
        <Icon name={swipeActions.right.icon} class="w-6 h-6 text-white" />
      </div>
    </div>
  {/if}
  
  <!-- Card content -->
  <div class="relative bg-white dark:bg-gray-800 p-4">
    <!-- Header -->
    <div class="flex items-start justify-between mb-2">
      <div class="flex-1 min-w-0">
        <h3 class="font-medium text-gray-900 dark:text-gray-100 truncate">
          {task.title}
        </h3>
        {#if task.taskNumber}
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">#{task.taskNumber}</p>
        {/if}
      </div>
      
      <!-- Status badge -->
      <div class="flex items-center gap-2 ml-3">
        {#if task.priority !== 'normal'}
          <span class="w-2 h-2 rounded-full bg-{getPriorityColor(task.priority)}-500"></span>
        {/if}
        <span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium 
                     rounded-full bg-{getStatusColor(task.status)}-100 
                     text-{getStatusColor(task.status)}-800">
          <Icon name={getStatusIcon(task.status)} class="w-3 h-3" />
          {task.status.replace('_', ' ')}
        </span>
      </div>
    </div>
    
    <!-- Client info -->
    {#if showClient && task.client}
      <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-2">
        <Icon name="user" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <span class="truncate">{task.client.name}</span>
      </div>
    {/if}
    
    <!-- Time and location -->
    <div class="flex flex-col gap-1 text-sm">
      <div class="flex items-center gap-2 text-gray-600 dark:text-gray-300">
        <Icon name="clock" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <span>{scheduledTime}</span>
        {#if durationDisplay}
          <span class="text-gray-400 dark:text-gray-500">• {durationDisplay}</span>
        {/if}
      </div>
      
      {#if task.address}
        <div class="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Icon name="mapPin" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <span class="truncate">
            {task.address.street}
            {#if task.address.city}
              , {task.address.city}
            {/if}
          </span>
        </div>
      {/if}
    </div>
    
    <!-- Technicians -->
    {#if task.assignedToNames?.length}
      <div class="flex items-center gap-2 mt-2 text-sm">
        <Icon name="users" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <div class="flex -space-x-2">
          {#each task.assignedToNames.slice(0, 3) as name, i}
            <div 
              class="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800
                     flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-200"
              title={name}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          {/each}
          {#if task.assignedToNames.length > 3}
            <div class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800
                       flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
              +{task.assignedToNames.length - 3}
            </div>
          {/if}
        </div>
      </div>
    {/if}
    
    <!-- AI predictions indicator -->
    {#if task.predictions}
      <div class="flex items-center gap-2 mt-2">
        <div class="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
          <Icon name="sparkles" class="w-3 h-3" />
          <span>AI insights available</span>
        </div>
      </div>
    {/if}
    
    <!-- Photo indicator -->
    {#if task.photos?.length}
      <div class="absolute bottom-2 right-2">
        <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Icon name="camera" class="w-3 h-3" />
          <span>{task.photos.length}</span>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .task-card {
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }
  
  .swipe-action-left,
  .swipe-action-right {
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .task-card.swiping-left .swipe-action-left,
  .task-card.swiping-right .swipe-action-right {
    opacity: 1;
  }
  
  /* Touch feedback */
  .task-card:active {
    transform: scale(0.98);
  }
</style>