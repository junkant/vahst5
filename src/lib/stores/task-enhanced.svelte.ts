// src/lib/stores/task-enhanced.svelte.ts
// Export the task store with the correct name and add missing methods
import { useJobStore as getTaskStore, cleanupJobStore } from './task.svelte';

export function useEnhancedTaskStore() {
  const store = getTaskStore();
  
  // Return an object that includes all methods and properties
  return {
    // Properties
    get tasks() { return store.tasks; },
    get todayTasks() { return store.todayTasks; },
    get upcomingTasks() { return store.upcomingTasks; },
    get overdueTasks() { return store.overdueTasks; },
    get isLoading() { return store.isLoading; },
    get error() { return store.error; },
    get isOffline() { return store.isOffline; },
    get filters() { return store.filters; },
    get sortOptions() { return store.sortOptions; },
    get hasMore() { return store.hasMore; },
    
    // Methods
    subscribeToClient: (clientId: string) => store.subscribeToClient(clientId),
    subscribeTechnicianToday: (technicianId: string) => store.subscribeTechnicianToday(technicianId),
    createTask: (taskData: any) => store.createTask(taskData),
    updateTask: (taskId: string, updates: any) => store.updateTask(taskId, updates),
    updateTaskStatus: (taskId: string, newStatus: any, reason?: string) => store.updateTaskStatus(taskId, newStatus, reason),
    addPhoto: (taskId: string, file: File, type: any, caption?: string) => store.addPhoto(taskId, file, type, caption),
    addNote: (taskId: string, text: string, type?: any, isPrivate?: boolean) => store.addNote(taskId, text, type, isPrivate),
    loadMore: () => store.loadMore(),
    setFilters: (filters: any) => store.setFilters(filters),
    setSortOptions: (sortOptions: any) => store.setSortOptions(sortOptions),
    getTaskById: (taskId: string) => store.getTaskById(taskId),
    getTasksForClient: (clientId: string) => store.getTasksForClient(clientId),
    searchTasks: (query: string) => store.searchTasks(query),
    getPredictions: (taskId: string) => store.getPredictions(taskId),
    setTenant: (tenantId: string | undefined) => store.setTenant(tenantId),
    
    // Critical missing methods that components are using
    initializeTenant: (tenantId: string | null) => store.setTenant(tenantId || undefined),
    cleanup: () => store.cleanup()
  };
}

export { cleanupJobStore as cleanupEnhancedTaskStore };
