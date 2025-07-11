<!-- src/lib/components/task/TaskList.svelte -->
<script lang="ts">
  import type { Task, TaskStatus } from '$lib/types/task';
  import TaskCard from './TaskCard.svelte';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { goto } from '$app/navigation';
  import { toast } from '$lib/utils/toast';
  
  interface Props {
    tasks: Task[];
    title?: string;
    emptyMessage?: string;
    showClient?: boolean;
    allowStatusChange?: boolean;
    onTaskClick?: (task: Task) => void;
  }
  
  let { 
    tasks,
    title,
    emptyMessage = 'No tasks found',
    showClient = true,
    allowStatusChange = true,
    onTaskClick
  }: Props = $props();
  
  const taskStore = useJobStore();
  const auth = useAuth();
  
  // Group tasks by date
  const groupedTasks = $derived(() => {
    const groups = new Map<string, Task[]>();
    
    tasks.forEach(task => {
      const date = task.scheduledStart instanceof Date 
        ? task.scheduledStart 
        : task.scheduledStart.toDate();
      
      const dateKey = date.toDateString();
      
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      
      groups.get(dateKey)!.push(task);
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
  
  // Handle task click
  function handleTaskClick(task: Task) {
    if (onTaskClick) {
      onTaskClick(task);
    } else {
      goto(`/clients/${task.clientId}/tasks/${task.id}`);
    }
  }
  
  // Handle status change
  async function handleStatusChange(task: Task, newStatus: TaskStatus) {
    if (!allowStatusChange) return;
    
    try {
      await taskStore.updateTaskStatus(task.id, newStatus);
      toast.success(`Task status updated to ${newStatus.replace('_', ' ')}`);
      
      // Auto-navigate to task if changing to in_progress
      if (newStatus === 'in_progress') {
        handleTaskClick(task);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  }
  
  // Loading state
  const isLoading = $derived(taskStore.isLoading);
</script>

<div class="task-list">
  {#if title}
    <h2 class="text-lg font-semibold text-gray-900 mb-4 px-4">
      {title}
    </h2>
  {/if}
  
  {#if isLoading && tasks.length === 0}
    <div class="flex flex-col items-center justify-center py-12">
      <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent 
                  rounded-full animate-spin mb-4"></div>
      <p class="text-gray-500">Loading tasks...</p>
    </div>
  {:else if tasks.length === 0}
    <div class="flex flex-col items-center justify-center py-12 px-4">
      <Icon name="clipboard" class="w-12 h-12 text-gray-400 mb-3" />
      <p class="text-gray-500 text-center">{emptyMessage}</p>
    </div>
  {:else}
    <div class="space-y-6">
      {#each groupedTasks as [dateKey, dateTasks]}
        <div>
          <!-- Date header -->
          <div class="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200 z-10">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-medium text-gray-700">
                {formatGroupDate(dateKey)}
              </h3>
              <span class="text-xs text-gray-500">
                {dateTasks.length} task{dateTasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          <!-- Tasks for this date -->
          <div class="px-4 py-3 space-y-3">
            {#each dateTasks as task (task.id)}
              <TaskCard
                {task}
                {showClient}
                onClick={() => handleTaskClick(task)}
                onStatusChange={allowStatusChange ? 
                  (status) => handleStatusChange(task, status) : 
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
  {#if taskStore.isOffline}
    <div class="fixed bottom-20 left-4 right-4 bg-yellow-100 border border-yellow-400 
                text-yellow-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <Icon name="wifiOff" class="w-5 h-5" />
      <span class="text-sm">Working offline - changes will sync when connected</span>
    </div>
  {/if}
</div>

<style>
  .task-list {
    min-height: 100%;
    padding-bottom: 5rem; /* Space for bottom navigation */
  }
  
  /* Ensure sticky headers work properly */
  :global(.task-list > div) {
    position: relative;
  }
</style>
