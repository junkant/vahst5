<script lang="ts">
  import { createDialog, melt } from '@melt-ui/svelte';
  import { fade, fly } from 'svelte/transition';
  import Icon from '$lib/components/icons/Icon.svelte';
  import type { Task } from '$lib/types/task';
  import { useTaskCreation } from '$lib/composables/useTaskCreation.svelte';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { goto } from '$app/navigation';
  import { formatDate, formatTime } from '$lib/utils/format';
  
  interface Props {
    open: boolean;
    task: Task | null;
  }
  
  let { 
    open = $bindable(), 
    task = $bindable()
  }: Props = $props();
  
  const taskCreation = useTaskCreation();
  const taskStore = useJobStore();
  
  // Dialog setup
  const {
    elements: { trigger, overlay, content, title: dialogTitle, close, portalled },
    states: { open: dialogOpen }
  } = createDialog({
    forceVisible: true,
    preventScroll: true,
    onOpenChange: ({ open: isOpen }) => {
      open = isOpen;
      if (!isOpen) {
        // Clear task when closing
        setTimeout(() => {
          task = null;
        }, 200);
      }
    }
  });
  
  // Update dialog when prop changes
  $effect(() => {
    dialogOpen.set(open);
  });
  
  // Handle edit action
  function handleEdit() {
    if (task) {
      open = false;
      taskCreation.edit(task);
    }
  }
  
  // Handle view details action
  function handleViewDetails() {
    if (task) {
      open = false;
      goto(`/tasks/${task.id}`);
    }
  }
  
  // Handle status change
  async function handleStatusChange(newStatus: string) {
    if (!task) return;
    
    try {
      await taskStore.updateTaskStatus(task.id, newStatus as any);
      // Update local task
      task = { ...task, status: newStatus as any };
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  }
  
  // Get status color
  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100';
      case 'scheduled':
        return 'text-blue-600 bg-blue-100';
      case 'draft':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }
  
  // Get priority color
  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'emergency':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'normal':
        return 'text-blue-600';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  }
</script>

{#if open && task}
  <div use:melt={$portalled}>
    <div
      use:melt={$overlay}
      class="fixed inset-0 z-50 bg-black/50"
      transition:fade={{ duration: 150 }}
    ></div>
    <div
      use:melt={$content}
      class="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-lg overflow-hidden"
      transition:fly={{ y: -10, duration: 150 }}
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b bg-gray-50">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h2 use:melt={$dialogTitle} class="text-lg font-semibold text-gray-900">
              {task.title}
            </h2>
            <p class="text-sm text-gray-600 mt-1">
              {task.client?.name || 'No client'}
            </p>
          </div>
          <button
            use:melt={$close}
            class="rounded-lg p-1 hover:bg-gray-200 transition-colors"
          >
            <Icon name="x" size={20} />
          </button>
        </div>
      </div>
      
      <!-- Content -->
      <div class="px-6 py-4 space-y-4">
        <!-- Status and Priority -->
        <div class="flex items-center justify-between">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(task.status)}">
            {task.status.replace('_', ' ')}
          </span>
          <span class="text-sm font-medium {getPriorityColor(task.priority || 'normal')}">
            {task.priority || 'normal'} priority
          </span>
        </div>
        
        <!-- Schedule Info -->
        <div class="space-y-2">
          <div class="flex items-center gap-2 text-sm">
            <Icon name="calendar" size={16} class="text-gray-400" />
            <span class="text-gray-600">
              {task.scheduledStart ? formatDate(task.scheduledStart) : 'Not scheduled'}
            </span>
          </div>
          
          {#if task.scheduledStart}
            <div class="flex items-center gap-2 text-sm">
              <Icon name="clock" size={16} class="text-gray-400" />
              <span class="text-gray-600">
                {formatTime(task.scheduledStart)}
                {#if task.scheduledEnd}
                  - {formatTime(task.scheduledEnd)}
                {/if}
              </span>
            </div>
          {/if}
        </div>
        
        <!-- Service Type -->
        {#if task.serviceType}
          <div class="flex items-center gap-2 text-sm">
            <Icon name="tool" size={16} class="text-gray-400" />
            <span class="text-gray-600">{task.serviceType}</span>
          </div>
        {/if}
        
        <!-- Address -->
        {#if task.address?.street}
          <div class="flex items-start gap-2 text-sm">
            <Icon name="mapPin" size={16} class="text-gray-400 mt-0.5" />
            <div class="text-gray-600">
              <div>{task.address.street}</div>
              {#if task.address.city}
                <div>{task.address.city}, {task.address.state} {task.address.zip}</div>
              {/if}
            </div>
          </div>
        {/if}
        
        <!-- Assigned To -->
        {#if task.assignedToNames && task.assignedToNames.length > 0}
          <div class="flex items-center gap-2 text-sm">
            <Icon name="user" size={16} class="text-gray-400" />
            <span class="text-gray-600">
              {task.assignedToNames.join(', ')}
            </span>
          </div>
        {/if}
        
        <!-- Description -->
        {#if task.description}
          <div class="pt-2 border-t">
            <p class="text-sm text-gray-600">{task.description}</p>
          </div>
        {/if}
      </div>
      
      <!-- Actions -->
      <div class="px-6 py-4 bg-gray-50 border-t flex flex-col gap-2">
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            onclick={handleViewDetails}
            class="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Icon name="eye" size={16} />
            View Details
          </button>
          <button
            type="button"
            onclick={handleEdit}
            class="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Icon name="edit" size={16} />
            Edit Task
          </button>
        </div>
        
        <!-- Quick status change -->
        {#if task.status !== 'completed' && task.status !== 'paid'}
          <div class="pt-2 border-t">
            <p class="text-xs text-gray-500 mb-2">Quick Actions:</p>
            <div class="flex gap-2">
              {#if task.status === 'scheduled'}
                <button
                  type="button"
                  onclick={() => handleStatusChange('in_progress')}
                  class="flex-1 px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 rounded hover:bg-yellow-200 transition-colors"
                >
                  Start Task
                </button>
              {/if}
              
              {#if task.status === 'in_progress'}
                <button
                  type="button"
                  onclick={() => handleStatusChange('completed')}
                  class="flex-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
                >
                  Mark Complete
                </button>
              {/if}
              
              <button
                type="button"
                onclick={() => handleStatusChange('cancelled')}
                class="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
