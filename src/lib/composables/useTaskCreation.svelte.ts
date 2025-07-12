// Global task creation state that can be used from anywhere
import type { Task } from '$lib/types/task';

interface TaskCreationState {
  isOpen: boolean;
  task: Task | null;
  initialDate: string;
  initialTime: string;
  initialClientId: string;
  onSuccess?: (task: Task) => void;
}

class TaskCreationManager {
  state = $state<TaskCreationState>({
    isOpen: false,
    task: null,
    initialDate: '',
    initialTime: '',
    initialClientId: '',
    onSuccess: undefined
  });
  
  /**
   * Open the task creation modal
   */
  create(options: Partial<Omit<TaskCreationState, 'isOpen' | 'task'>> = {}) {
    this.state = {
      isOpen: true,
      task: null,
      initialDate: options.initialDate || '',
      initialTime: options.initialTime || '',
      initialClientId: options.initialClientId || '',
      onSuccess: options.onSuccess
    };
  }
  
  /**
   * Open the task edit modal
   */
  edit(task: Task, options: { onSuccess?: (task: Task) => void } = {}) {
    this.state = {
      isOpen: true,
      task,
      initialDate: '',
      initialTime: '',
      initialClientId: '',
      onSuccess: options.onSuccess
    };
  }
  
  /**
   * Close the modal
   */
  close() {
    this.state.isOpen = false;
    // Clear state after animation
    setTimeout(() => {
      this.state = {
        isOpen: false,
        task: null,
        initialDate: '',
        initialTime: '',
        initialClientId: '',
        onSuccess: undefined
      };
    }, 300);
  }
}

// Singleton instance
let taskCreationManager: TaskCreationManager | null = null;

/**
 * Hook to use the global task creation modal
 */
export function useTaskCreation() {
  if (!taskCreationManager) {
    taskCreationManager = new TaskCreationManager();
  }
  
  return {
    state: taskCreationManager.state,
    create: taskCreationManager.create.bind(taskCreationManager),
    edit: taskCreationManager.edit.bind(taskCreationManager),
    close: taskCreationManager.close.bind(taskCreationManager)
  };
}
