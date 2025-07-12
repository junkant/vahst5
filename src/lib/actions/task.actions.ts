// Unified task actions that can be used from anywhere in the app
import { goto } from '$app/navigation';
import { useJobStore } from '$lib/stores/task.svelte';
import { useToast } from '$lib/stores/toast.svelte';
import type { CreateTaskInput, Task } from '$lib/types/task';

export interface TaskActionOptions {
  redirectTo?: string | ((task: Task) => string);
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (task: Task) => void;
  onError?: (error: unknown) => void;
  customFields?: Record<string, any>;
}

/**
 * Unified task creation function
 * Used by both the /tasks/new page and calendar modal
 */
export async function createTask(
  taskData: CreateTaskInput,
  options: TaskActionOptions = {}
): Promise<Task | null> {
  const taskStore = useJobStore();
  const toast = useToast();
  
  const {
    redirectTo,
    successMessage = 'Task created successfully',
    errorMessage = 'Failed to create task',
    onSuccess,
    onError,
    customFields = {}
  } = options;
  
  try {
    // Merge any custom fields (like createdFromCalendar)
    const finalTaskData = {
      ...taskData,
      customFields: {
        ...taskData.customFields,
        ...customFields
      }
    };
    
    const newTask = await taskStore.createTask(finalTaskData);
    
    // Show success message
    toast.success(successMessage);
    
    // Handle success callback
    if (onSuccess) {
      onSuccess(newTask);
    }
    
    // Handle redirect
    if (redirectTo) {
      const path = typeof redirectTo === 'function' 
        ? redirectTo(newTask) 
        : redirectTo;
      await goto(path);
    }
    
    return newTask;
  } catch (error) {
    console.error('Error creating task:', error);
    toast.error(errorMessage);
    
    // Handle error callback
    if (onError) {
      onError(error);
    }
    
    return null;
  }
}

/**
 * Unified task update function
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>,
  options: TaskActionOptions = {}
): Promise<boolean> {
  const taskStore = useJobStore();
  const toast = useToast();
  
  const {
    successMessage = 'Task updated successfully',
    errorMessage = 'Failed to update task',
    onSuccess,
    onError
  } = options;
  
  try {
    await taskStore.updateTask(taskId, updates);
    
    // Show success message
    toast.success(successMessage);
    
    // Handle success callback
    if (onSuccess) {
      onSuccess(null as any); // We don't have the updated task here
    }
    
    return true;
  } catch (error) {
    console.error('Error updating task:', error);
    toast.error(errorMessage);
    
    // Handle error callback
    if (onError) {
      onError(error);
    }
    
    return false;
  }
}

/**
 * Unified task deletion function
 */
export async function deleteTask(
  taskId: string,
  options: {
    confirmMessage?: string;
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
  } = {}
): Promise<boolean> {
  const taskStore = useJobStore();
  const toast = useToast();
  
  const {
    confirmMessage = 'Are you sure you want to delete this task?',
    successMessage = 'Task deleted',
    errorMessage = 'Failed to delete task',
    onSuccess,
    onError
  } = options;
  
  if (!confirm(confirmMessage)) {
    return false;
  }
  
  try {
    await taskStore.deleteTask(taskId);
    
    // Show success message
    toast.success(successMessage);
    
    // Handle success callback
    if (onSuccess) {
      onSuccess();
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    toast.error(errorMessage);
    
    // Handle error callback
    if (onError) {
      onError(error);
    }
    
    return false;
  }
}
