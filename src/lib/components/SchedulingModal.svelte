<script lang="ts">
  import { createDialog, melt } from '@melt-ui/svelte';
  import { fade, fly } from 'svelte/transition';
  import Icon from '$lib/components/icons/Icon.svelte';
  import TaskForm from '$lib/components/task/TaskForm.svelte';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { toast } from '$lib/utils/toast';
  import type { CreateTaskInput, Task } from '$lib/types/task';
  
  interface Props {
    open: boolean;
    date: string;
    time: string;
    task: Task | null;
  }
  
  let { open = $bindable(), date, time, task }: Props = $props();
  
  const taskStore = useJobStore();
  
  // Submit state
  let isSubmitting = $state(false);
  
  // Dialog setup
  const {
    elements: { trigger, overlay, content, title: dialogTitle, description: dialogDesc, close, portalled },
    states: { open: dialogOpen }
  } = createDialog({
    forceVisible: true,
    preventScroll: true,
    onOpenChange: ({ open: isOpen }) => {
      open = isOpen;
    }
  });
  
  // Update dialog when prop changes
  $effect(() => {
    $dialogOpen.set(open);
  });
  
  async function handleSubmit(taskData: CreateTaskInput) {
    isSubmitting = true;
    
    try {
      if (task) {
        // Update existing task
        await taskStore.updateTask(task.id, {
          title: taskData.title,
          description: taskData.description,
          serviceType: taskData.serviceType,
          priority: taskData.priority,
          scheduledStart: taskData.scheduledStart,
          scheduledEnd: taskData.scheduledEnd,
          assignedTo: taskData.assignedTo
        });
        
        toast.success('Task updated successfully');
      } else {
        // Create new task
        const newTaskData = {
          ...taskData,
          customFields: {
            createdFromCalendar: true
          }
        };
        
        await taskStore.createTask(newTaskData);
        
        toast.success('Task scheduled successfully');
      }
      
      open = false;
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error(task ? 'Failed to update task' : 'Failed to create task');
    } finally {
      isSubmitting = false;
    }
  }
  
  async function handleDelete() {
    if (!task) return;
    
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await taskStore.deleteTask(task.id);
        toast.success('Task deleted');
        open = false;
      } catch (error) {
        console.error('Error deleting task:', error);
        toast.error('Failed to delete task');
      }
    }
  }
  
  function formatDateTime(date: string, time: string): string {
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
</script>

{#if open}
  <div use:melt={$portalled}>
    <div
      use:melt={$overlay}
      class="fixed inset-0 z-50 bg-black/50"
      transition:fade={{ duration: 150 }}
      onclick={() => open = false}
    ></div>
    <div
      use:melt={$content}
      class="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg overflow-y-auto"
      transition:fly={{ y: -10, duration: 150 }}
    >
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div>
          <h2 use:melt={$dialogTitle} class="text-lg font-semibold">
            {task ? 'Edit Task' : 'Schedule Task'}
          </h2>
          <p class="text-sm text-gray-500 mt-1">
            {formatDateTime(date, time)}
          </p>
        </div>
        <button
          use:melt={$close}
          class="rounded-lg p-1 hover:bg-gray-100 transition-colors"
        >
          <Icon name="close" size={20} />
        </button>
      </div>
      
      <!-- Task Form -->
      <TaskForm
        {task}
        initialDate={date}
        initialTime={time}
        onSubmit={handleSubmit}
        onCancel={() => open = false}
        submitLabel={task ? 'Update' : 'Create'}
        {isSubmitting}
        compact={true}
      />
      
      <!-- Delete button for existing tasks -->
      {#if task}
        <div class="mt-4 pt-4 border-t">
          <button
            type="button"
            onclick={handleDelete}
            class="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            Delete Task
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
