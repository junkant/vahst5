<!-- Unified Task Creation Modal - Can be opened from anywhere -->
<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import Icon from '$lib/components/icons/Icon.svelte';
  import TaskForm from '$lib/components/task/TaskForm.svelte';
  import { createTask, updateTask, deleteTask } from '$lib/actions/task.actions';
  import type { CreateTaskInput, Task } from '$lib/types/task';
  
  interface Props {
    open: boolean;
    task?: Task | null;
    initialDate?: string;
    initialTime?: string;
    initialClientId?: string;
    onSuccess?: (task: Task) => void;
    compact?: boolean;
    title?: string;
  }
  
  let { 
    open = $bindable(), 
    task = null,
    initialDate = '',
    initialTime = '',
    initialClientId = '',
    onSuccess,
    compact = false,
    title = task ? 'Edit Task' : 'Create Task'
  }: Props = $props();
  
  // Submit state
  let isSubmitting = $state(false);
  
  async function handleSubmit(taskData: CreateTaskInput) {
    isSubmitting = true;
    
    try {
      if (task) {
        // Update existing task
        const success = await updateTask(task.id, {
          title: taskData.title,
          description: taskData.description,
          serviceType: taskData.serviceType,
          priority: taskData.priority,
          scheduledStart: taskData.scheduledStart,
          scheduledEnd: taskData.scheduledEnd,
          assignedTo: taskData.assignedTo,
          address: taskData.address
        }, {
          onSuccess: (updatedTask) => {
            open = false;
            onSuccess?.(updatedTask);
          }
        });
        
        if (!success) {
          isSubmitting = false;
        }
      } else {
        // Create new task
        const result = await createTask(taskData, {
          onSuccess: (newTask) => {
            open = false;
            onSuccess?.(newTask);
          },
          onError: () => {
            isSubmitting = false;
          }
        });
        
        if (!result) {
          isSubmitting = false;
        }
      }
    } finally {
      // Always reset submitting state
      setTimeout(() => {
        isSubmitting = false;
      }, 100);
    }
  }
  
  async function handleDelete() {
    if (!task) return;
    
    await deleteTask(task.id, {
      onSuccess: () => {
        open = false;
      }
    });
  }
  
  function formatDateTime(date?: string, time?: string): string | null {
    if (!date || !time) return null;
    
    const dateObj = new Date(`${date}T${time}`);
    return dateObj.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
  
  const formattedDateTime = $derived(formatDateTime(initialDate, initialTime));
  
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      open = false;
    }
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false;
    }
  }
</script>

{#if open}
  <!-- Backdrop -->
  <button
    type="button"
    class="fixed inset-0 z-50 bg-black/50 w-full h-full cursor-default"
    transition:fade={{ duration: 150 }}
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    aria-label="Close dialog"
  ></button>
  
  <!-- Modal -->
  <div
    class="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] 
           {compact ? 'max-w-[500px]' : 'max-w-[800px]'} 
           translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white dark:bg-gray-800 p-6 
           shadow-lg overflow-y-auto"
    transition:fly={{ y: -10, duration: 150 }}
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <!-- Header -->
    <div class="flex items-start justify-between mb-4">
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        {#if formattedDateTime}
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {formattedDateTime}
          </p>
        {/if}
      </div>
      <button
        onclick={() => open = false}
        class="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Icon name="close" size={20} class="text-gray-500 dark:text-gray-400" />
      </button>
    </div>
    
    <!-- Task Form -->
    <TaskForm
      {task}
      {initialDate}
      {initialTime}
      {initialClientId}
      onSubmit={handleSubmit}
      onCancel={() => open = false}
      submitLabel={task ? 'Update' : 'Create'}
      {isSubmitting}
      {compact}
    />
    
    <!-- Delete button for existing tasks -->
    {#if task}
      <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onclick={handleDelete}
          class="w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
        >
          Delete Task
        </button>
      </div>
    {/if}
  </div>
{/if}
