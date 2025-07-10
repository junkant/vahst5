// src/lib/stores/tasks.svelte.ts
import { type Unsubscribe } from 'firebase/firestore';
import { subscribeToTenantTasks, type Task } from '$lib/firebase/firestore';
import { localCache } from '$lib/utils/localCache';
import { imageCompressor } from '$lib/utils/imageCompressor';
import { browser } from '$app/environment';

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  todayTasks: Task[];
  upcomingTasks: Task[];
  overdueTasks: Task[];
  getTaskById: (id: string) => Task | undefined;
  searchTasks: (query: string) => Task[];
  attachPhoto: (taskId: string, file: File) => Promise<void>;
  getTasksByPriority: (priority: Task['priority']) => Task[];
  getTasksByType: (type: Task['taskType']) => Task[];
}

class TaskStoreImpl {
  // State
  tasks = $state<Task[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);
  isOffline = $state(false);
  
  // Cache state
  private cachedTasks = $state<Task[]>([]);
  private lastSync = $state<number>(0);
  
  // Subscriptions
  private unsubscribe: Unsubscribe | null = null;
  private currentTenantId: string | undefined = undefined;

  constructor() {
    this.initializeOfflineDetection();
  }

  // Initialize offline detection
  private initializeOfflineDetection() {
    if (!browser) return;
    
    this.isOffline = !navigator.onLine;
    
    window.addEventListener('online', () => {
      this.isOffline = false;
      if (this.currentTenantId) {
        this.syncWithServer(this.currentTenantId);
      }
    });
    
    window.addEventListener('offline', () => {
      this.isOffline = true;
      if (this.currentTenantId) {
        this.loadFromCache(this.currentTenantId);
      }
    });
  }

  // Load tasks from cache (last 30 days)
  private async loadFromCache(tenantId: string) {
    try {
      this.isLoading = true;
      // Get tasks from last 30 days
      const cachedTasks = await localCache.getRecentTasks(tenantId, 30);
      
      if (cachedTasks.length > 0) {
        this.cachedTasks = cachedTasks;
        this.tasks = cachedTasks;
        
        if (import.meta.env.DEV) {
          console.log(`Loaded ${cachedTasks.length} tasks from cache (last 30 days)`);
        }
      }
    } catch (error) {
      console.error('Error loading tasks from cache:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Sync tasks with server
  private async syncWithServer(tenantId: string) {
    if (this.isOffline) return;
    
    try {
      // Only cache tasks from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      for (const task of this.tasks) {
        // Only cache recent tasks
        const dateField = task.scheduledStart || task.scheduledDate;
        if (dateField && new Date(dateField) >= thirtyDaysAgo) {
          await localCache.setTask(task, tenantId);
        }
      }
      
      this.lastSync = Date.now();
      
      if (import.meta.env.DEV) {
        console.log('Synced recent tasks to cache');
      }
    } catch (error) {
      console.error('Error syncing tasks to cache:', error);
    }
  }

  // Subscribe to tenant tasks
  subscribeTenant(tenantId: string | undefined) {
    if (tenantId) {
      this.currentTenantId = tenantId;
      this.isLoading = true;
      this.error = null;
      
      // Cleanup previous subscription
      if (this.unsubscribe) {
        this.unsubscribe();
      }
      
      // Load from cache first
      this.loadFromCache(tenantId);
      
      // Subscribe to real-time updates if online
      if (!this.isOffline) {
        // Note: You'll need to implement subscribeToTenantTasks in firestore.ts
        this.unsubscribe = subscribeToTenantTasks(
          tenantId,
          async (updatedTasks) => {
            this.tasks = updatedTasks;
            this.isLoading = false;
            
            // Update cache with recent tasks
            this.syncWithServer(tenantId);
          },
          (error) => {
            if (!this.isOffline) {
              console.error('Error subscribing to tasks:', error);
              this.error = error.message;
            }
            this.isLoading = false;
            
            // Fall back to cache
            this.loadFromCache(tenantId);
          }
        );
      }
    } else {
      // Clear state when no tenant
      this.tasks = [];
      this.isLoading = false;
      this.error = null;
    }
  }

  // Computed values
  get todayTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tasksToFilter = this.isOffline && this.cachedTasks.length > 0 
      ? this.cachedTasks 
      : this.tasks;
    
    return tasksToFilter.filter(task => {
      const dateField = task.scheduledStart || task.scheduledDate;
      if (!dateField) return false;
      const taskDate = new Date(dateField);
      return taskDate >= today && taskDate < tomorrow;
    }).sort((a, b) => {
      // Sort by priority first, then by time
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityA = priorityOrder[a.priority || 'medium'];
      const priorityB = priorityOrder[b.priority || 'medium'];
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      const dateA = new Date(a.scheduledStart || a.scheduledDate);
      const dateB = new Date(b.scheduledStart || b.scheduledDate);
      return dateA.getTime() - dateB.getTime();
    });
  }

  get upcomingTasks() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const tasksToFilter = this.isOffline && this.cachedTasks.length > 0 
      ? this.cachedTasks 
      : this.tasks;
    
    return tasksToFilter.filter(task => {
      const dateField = task.scheduledStart || task.scheduledDate;
      if (!dateField) return false;
      const taskDate = new Date(dateField);
      return taskDate >= tomorrow;
    }).sort((a, b) => {
      const dateA = new Date(a.scheduledStart || a.scheduledDate);
      const dateB = new Date(b.scheduledStart || b.scheduledDate);
      return dateA.getTime() - dateB.getTime();
    });
  }

  get overdueTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasksToFilter = this.isOffline && this.cachedTasks.length > 0 
      ? this.cachedTasks 
      : this.tasks;
    
    return tasksToFilter.filter(task => {
      const dateField = task.scheduledStart || task.scheduledDate;
      if (!dateField) return false;
      const taskDate = new Date(dateField);
      return taskDate < today && task.status !== 'completed' && task.status !== 'cancelled';
    }).sort((a, b) => {
      const dateA = new Date(a.scheduledStart || a.scheduledDate);
      const dateB = new Date(b.scheduledStart || b.scheduledDate);
      return dateB.getTime() - dateA.getTime();
    });
  }

  // Get task by ID
  getTaskById = (id: string): Task | undefined => {
    const tasksToSearch = this.isOffline && this.cachedTasks.length > 0 
      ? this.cachedTasks 
      : this.tasks;
    
    return tasksToSearch.find(t => t.id === id);
  }

  // Search tasks
  searchTasks = (query: string): Task[] => {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return this.tasks;
    
    const tasksToSearch = this.isOffline && this.cachedTasks.length > 0 
      ? this.cachedTasks 
      : this.tasks;
    
    return tasksToSearch.filter(task => 
      task.title?.toLowerCase().includes(searchTerm) ||
      task.description?.toLowerCase().includes(searchTerm) ||
      task.client?.name?.toLowerCase().includes(searchTerm) ||
      task.taskType?.toLowerCase().includes(searchTerm)
    );
  }

  // Get tasks by priority
  getTasksByPriority = (priority: Task['priority']): Task[] => {
    const tasksToFilter = this.isOffline && this.cachedTasks.length > 0 
      ? this.cachedTasks 
      : this.tasks;
    
    return tasksToFilter.filter(task => task.priority === priority);
  }

  // Get tasks by type
  getTasksByType = (type: Task['taskType']): Task[] => {
    const tasksToFilter = this.isOffline && this.cachedTasks.length > 0 
      ? this.cachedTasks 
      : this.tasks;
    
    return tasksToFilter.filter(task => task.taskType === type);
  }

  // Attach photo to task with compression
  async attachPhoto(taskId: string, file: File): Promise<void> {
    if (!this.currentTenantId) {
      throw new Error('No tenant selected');
    }

    try {
      // Check if compression is needed
      if (imageCompressor.shouldCompress(file)) {
        // Compress the image
        const compressed = await imageCompressor.compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.85
        });

        // Cache the compressed image
        await localCache.cacheImage(
          `task-${taskId}-${Date.now()}`,
          compressed.blob,
          this.currentTenantId
        );

        // Also create a thumbnail
        await localCache.cacheImage(
          `task-${taskId}-${Date.now()}-thumb`,
          file,
          this.currentTenantId,
          true
        );

        console.log(`Compressed image from ${file.size} to ${compressed.size} bytes (${compressed.compressionRatio.toFixed(2)}x)`);
      } else {
        // Cache original if small enough
        await localCache.cacheImage(
          `task-${taskId}-${Date.now()}`,
          file,
          this.currentTenantId
        );
      }

      // TODO: Upload to Firebase Storage when online
      // For now, just cache locally
    } catch (error) {
      console.error('Error attaching photo:', error);
      throw error;
    }
  }

  // Cleanup
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

// Create singleton instance
let taskStore: TaskStoreImpl | null = null;

// Export the store hook
export function useTasks(): TaskStore {
  if (!taskStore) {
    taskStore = new TaskStoreImpl();
  }

  return {
    get tasks() { return taskStore.tasks; },
    get isLoading() { return taskStore.isLoading; },
    get error() { return taskStore.error; },
    get isOffline() { return taskStore.isOffline; },
    get todayTasks() { return taskStore.todayTasks; },
    get upcomingTasks() { return taskStore.upcomingTasks; },
    get overdueTasks() { return taskStore.overdueTasks; },
    getTaskById: taskStore.getTaskById,
    searchTasks: taskStore.searchTasks,
    attachPhoto: taskStore.attachPhoto.bind(taskStore),
    getTasksByPriority: taskStore.getTasksByPriority,
    getTasksByType: taskStore.getTasksByType
  };
}

// Initialize subscription
export function initializeTaskStore(tenantId: string | undefined) {
  if (taskStore) {
    taskStore.subscribeTenant(tenantId);
  }
}

// Cleanup
export function cleanupTaskStore() {
  if (taskStore) {
    taskStore.destroy();
    taskStore = null;
  }
}