// src/lib/stores/task.svelte.ts
// Enhanced task store with AI predictions and offline support
import { BaseStore } from './base.store';
import { 
  type Unsubscribe,
  type DocumentSnapshot 
} from 'firebase/firestore';
import { 
  subscribeToClientTasks,
  subscribeToTechnicianTodayTasks,
  getTasks,
  createTask as createTaskFirebase,
  updateTask as updateTaskFirebase,
  deleteTask as deleteTaskFirebase,
  addTaskPhoto,
  addTaskNote
} from '$lib/firebase/tasks';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TaskSortOptions,
  TaskStatus,
  TaskPhoto,
  TaskNote,
  TaskPredictions
} from '$lib/types/task';
import { canTransitionTo } from '$lib/types/task';
import { localCache } from '$lib/utils/localCache';
import { imageCompressor } from '$lib/utils/imageCompressor';
import { useAuth } from './auth.svelte';
import { useTenant } from './tenant.svelte';
import { browser } from '$app/environment';
import { generateTaskPredictions } from '$lib/ai/taskPredictions';
import { analyzeTaskPhoto } from '$lib/ai/photoAnalysis';
import { offlineQueue } from '$lib/utils/offlineQueue';

interface TaskStoreState {
  // Tasks data
  tasks: Task[];
  clientTasks: Map<string, Task[]>; // Tasks by client ID
  todayTasks: Task[];
  upcomingTasks: Task[];
  overdueTasks: Task[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  
  // Filters and sorting
  filters: TaskFilters;
  sortOptions: TaskSortOptions;
  
  // Pagination
  hasMore: boolean;
  lastDoc?: DocumentSnapshot;
  
  // AI predictions cache
  predictionsCache: Map<string, TaskPredictions>;
}

class TaskStore extends BaseStore {
  // State using Svelte 5 runes
  private state = $state<TaskStoreState>({
    tasks: [],
    clientTasks: new Map(),
    todayTasks: [],
    upcomingTasks: [],
    overdueTasks: [],
    isLoading: false,
    error: null,
    isOffline: false,
    filters: {},
    sortOptions: {
      field: 'scheduledStart',
      direction: 'asc'
    },
    hasMore: true,
    predictionsCache: new Map()
  });
  
  // Subscriptions
  private unsubscribes: Map<string, Unsubscribe> = new Map();
  private currentTenantId?: string;
  
  // Stores
  private auth = useAuth();
  private tenant = useTenant();
  
  constructor() {
    super();
    if (browser) {
      this.initializeOfflineDetection();
      this.loadCachedData();
    }
  }
  
  // Initialize the store
  init() {
    if (this.initialized) return;
    this.initialized = true;
    // Additional initialization if needed
  }
  
  // Reset the store state
  reset() {
    this.state.tasks = [];
    this.state.clientTasks.clear();
    this.state.todayTasks = [];
    this.state.upcomingTasks = [];
    this.state.overdueTasks = [];
    this.state.isLoading = false;
    this.state.error = null;
    this.state.isOffline = false;
    this.state.filters = {};
    this.state.sortOptions = {
      field: 'scheduledStart',
      direction: 'asc'
    };
    this.state.hasMore = true;
    this.state.lastDoc = undefined;
    this.state.predictionsCache.clear();
    this.currentTenantId = undefined;
  }
  
  // Initialize offline detection
  private initializeOfflineDetection() {
    this.state.isOffline = !navigator.onLine;
    
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Add cleanup for event listeners
    this.addCleanup(() => {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    });
  }
  
  // Event handlers
  private handleOnline = () => {
    this.state.isOffline = false;
    this.syncOfflineQueue();
  };
  
  private handleOffline = () => {
    this.state.isOffline = true;
  };
  
  // Load cached data
  private async loadCachedData() {
    try {
      const cachedTasks = await localCache.getRecentTasks(this.currentTenantId || '', 30);
      if (cachedTasks.length > 0) {
        this.state.tasks = cachedTasks;
        this.updateDerivedTasks();
      }
    } catch (error) {
      console.error('Error loading cached tasks:', error);
    }
  }
  
  // Sync offline queue
  private async syncOfflineQueue() {
    if (!this.currentTenantId || !this.auth.user) return;
    
    try {
      await offlineQueue.processQueue(this.currentTenantId, this.auth.user.uid);
    } catch (error) {
      console.error('Error syncing offline queue:', error);
    }
  }
  
  // Update derived task lists
  private updateDerivedTasks() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Helper function to convert any date format to Date object
    const toDate = (date: any): Date => {
      if (date instanceof Date) return date;
      if (date?.toDate && typeof date.toDate === 'function') return date.toDate();
      if (date?.seconds) return new Date(date.seconds * 1000); // Firestore timestamp
      return new Date(date);
    };
    
    // Today's tasks
    this.state.todayTasks = this.state.tasks.filter(task => {
      if (!task.scheduledStart) return false;
      const scheduledDate = toDate(task.scheduledStart);
      return scheduledDate >= today && scheduledDate < tomorrow;
    }).sort((a, b) => {
      const dateA = toDate(a.scheduledStart);
      const dateB = toDate(b.scheduledStart);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Upcoming tasks (after today)
    this.state.upcomingTasks = this.state.tasks.filter(task => {
      if (!task.scheduledStart) return false;
      const scheduledDate = toDate(task.scheduledStart);
      return scheduledDate >= tomorrow;
    }).sort((a, b) => {
      const dateA = toDate(a.scheduledStart);
      const dateB = toDate(b.scheduledStart);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Overdue tasks
    this.state.overdueTasks = this.state.tasks.filter(task => {
      if (!task.scheduledStart) return false;
      const scheduledDate = toDate(task.scheduledStart);
      return scheduledDate < today && 
        task.status !== 'completed' && 
        task.status !== 'invoiced' && 
        task.status !== 'paid';
    }).sort((a, b) => {
      const dateA = toDate(a.scheduledStart);
      const dateB = toDate(b.scheduledStart);
      return dateB.getTime() - dateA.getTime(); // Most overdue first
    });
  }
  
  // Subscribe to client tasks
  subscribeToClient(clientId: string) {
    if (!this.currentTenantId) return;
    
    // Unsubscribe from previous client
    const key = `client_${clientId}`;
    if (this.unsubscribes.has(key)) {
      this.unsubscribes.get(key)!();
    }
    
    this.state.isLoading = true;
    
    const unsubscribe = subscribeToClientTasks(
      this.currentTenantId,
      clientId,
      (tasks) => {
        this.state.clientTasks.set(clientId, tasks);
        this.mergeClientTasks(clientId, tasks);
        this.state.isLoading = false;
        
        // Cache tasks
        tasks.forEach(task => {
          localCache.setTask(task, this.currentTenantId!);
        });
        
        // Generate AI predictions for new tasks
        this.generatePredictionsForTasks(tasks);
      },
      (error) => {
        console.error('Error subscribing to client tasks:', error);
        this.state.error = error.message;
        this.state.isLoading = false;
      }
    );
    
    this.unsubscribes.set(key, unsubscribe);
    
    // Track for cleanup
    this.addCleanup(() => unsubscribe());
  }
  
  // Subscribe to technician's today tasks
  subscribeTechnicianToday(technicianId: string) {
    if (!this.currentTenantId) return;
    
    const key = `tech_today_${technicianId}`;
    if (this.unsubscribes.has(key)) {
      this.unsubscribes.get(key)!();
    }
    
    const unsubscribe = subscribeToTechnicianTodayTasks(
      this.currentTenantId,
      technicianId,
      (tasks) => {
        this.mergeTasks(tasks);
        this.updateDerivedTasks();
        
        // Cache tasks
        tasks.forEach(task => {
          localCache.setTask(task, this.currentTenantId!);
        });
      },
      (error) => {
        console.error('Error subscribing to technician tasks:', error);
        this.state.error = error.message;
      }
    );
    
    this.unsubscribes.set(key, unsubscribe);
  }
  
  // Merge client tasks into main tasks array
  private mergeClientTasks(clientId: string, clientTasks: Task[]) {
    // Remove old tasks for this client
    this.state.tasks = this.state.tasks.filter(task => task.clientId !== clientId);
    
    // Add new tasks
    this.state.tasks = [...this.state.tasks, ...clientTasks];
    
    this.updateDerivedTasks();
  }
  
  // Merge tasks into state
  private mergeTasks(newTasks: Task[]) {
    const taskMap = new Map(this.state.tasks.map(task => [task.id, task]));
    
    newTasks.forEach(task => {
      taskMap.set(task.id, task);
    });
    
    this.state.tasks = Array.from(taskMap.values());
  }
  
  // Generate AI predictions for tasks
  private async generatePredictionsForTasks(tasks: Task[]) {
    if (!browser || this.state.isOffline) return;
    
    for (const task of tasks) {
      if (!this.state.predictionsCache.has(task.id) && !task.predictions) {
        try {
          const predictions = await generateTaskPredictions(task, this.state.tasks);
          this.state.predictionsCache.set(task.id, predictions);
          
          // Update task with predictions
          if (this.currentTenantId && this.auth.user) {
            await updateTaskFirebase(
              this.currentTenantId,
              task.id,
              { predictions },
              this.auth.user.uid
            );
          }
        } catch (error) {
          console.error('Error generating predictions:', error);
        }
      }
    }
  }
  
  // Create a new task
  async createTask(taskData: CreateTaskInput): Promise<Task> {
    if (!this.currentTenantId || !this.auth.user) {
      throw new Error('Not authenticated');
    }
    
    try {
      if (this.state.isOffline) {
        // Create offline task
        const offlineTask: Task = {
          id: `offline_${Date.now()}`,
          tenantId: this.currentTenantId,
          ...taskData,
          status: 'draft',
          statusHistory: [{
            status: 'draft',
            changedAt: new Date(),
            changedBy: this.auth.user.uid
          }],
          priority: taskData.priority || 'normal',
          client: {
            id: taskData.clientId,
            name: 'Offline Client',
            address: taskData.address || {}
          },
          address: taskData.address || {},
          equipment: [],
          photos: [],
          notes: [],
          createdAt: new Date(),
          createdBy: this.auth.user.uid,
          updatedAt: new Date(),
          _localId: `offline_${Date.now()}`,
          _syncStatus: 'pending'
        } as Task;
        
        // Add to offline queue
        await offlineQueue.addOperation({
          type: 'create',
          collection: 'tasks',
          data: taskData,
          localId: offlineTask.id
        });
        
        // Add to local state
        this.state.tasks = [...this.state.tasks, offlineTask];
        this.updateDerivedTasks();
        
        return offlineTask;
      } else {
        // Create online
        const task = await createTaskFirebase(
          this.currentTenantId,
          taskData,
          this.auth.user.uid,
          this.auth.user.displayName || undefined
        );
        
        // Add to local state
        this.state.tasks = [...this.state.tasks, task];
        this.updateDerivedTasks();
        
        // Cache task
        await localCache.setTask(task, this.currentTenantId);
        
        // Generate AI predictions
        this.generatePredictionsForTasks([task]);
        
        return task;
      }
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }
  
  // Update task
  async updateTask(taskId: string, updates: UpdateTaskInput): Promise<void> {
    if (!this.currentTenantId || !this.auth.user) {
      throw new Error('Not authenticated');
    }
    
    try {
      if (this.state.isOffline) {
        // Add to offline queue
        await offlineQueue.addOperation({
          type: 'update',
          collection: 'tasks',
          documentId: taskId,
          data: updates
        });
        
        // Update local state
        this.state.tasks = this.state.tasks.map(task => 
          task.id === taskId ? { ...task, ...updates, updatedAt: new Date() } : task
        );
        this.updateDerivedTasks();
      } else {
        // Update online
        await updateTaskFirebase(
          this.currentTenantId,
          taskId,
          updates,
          this.auth.user.uid
        );
        
        // Update will come through subscription
      }
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }
  
  // Delete task
  async deleteTask(taskId: string): Promise<void> {
    if (!this.currentTenantId || !this.auth.user) {
      throw new Error('Not authenticated');
    }
    
    try {
      if (this.state.isOffline) {
        // Add to offline queue
        await offlineQueue.addOperation({
          type: 'delete',
          collection: 'tasks',
          documentId: taskId
        });
        
        // Remove from local state
        this.state.tasks = this.state.tasks.filter(task => task.id !== taskId);
        this.updateDerivedTasks();
      } else {
        // Delete online
        await deleteTaskFirebase(
          this.currentTenantId,
          taskId
        );
        
        // Remove from local state
        this.state.tasks = this.state.tasks.filter(task => task.id !== taskId);
        this.updateDerivedTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }
  
  // Update task status with transition validation
  async updateTaskStatus(taskId: string, newStatus: TaskStatus, reason?: string): Promise<void> {
    const task = this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');
    
    // Validate transition
    if (!canTransitionTo(task.status, newStatus)) {
      throw new Error(`Cannot transition from ${task.status} to ${newStatus}`);
    }
    
    await this.updateTask(taskId, {
      status: newStatus,
      subStatus: reason as any
    });
  }
  
  // Add photo to task
  async addPhoto(
    taskId: string, 
    file: File, 
    type: TaskPhoto['type'],
    caption?: string
  ): Promise<void> {
    if (!this.currentTenantId || !this.auth.user) {
      throw new Error('Not authenticated');
    }
    
    try {
      // Compress image
      let imageBlob: Blob = file;
      if (imageCompressor.shouldCompress(file)) {
        const compressed = await imageCompressor.compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.85
        });
        imageBlob = compressed.blob;
      }
      
      // Cache image locally
      const imageId = `task_${taskId}_${Date.now()}`;
      const imageUrl = await localCache.cacheImage(
        imageId,
        imageBlob,
        this.currentTenantId
      );
      
      // Create thumbnail
      const thumbnailUrl = await localCache.cacheImage(
        `${imageId}_thumb`,
        file,
        this.currentTenantId,
        true
      );
      
      // Analyze photo with AI
      let aiAnalysis;
      if (!this.state.isOffline) {
        try {
          aiAnalysis = await analyzeTaskPhoto(imageBlob, type);
        } catch (error) {
          console.error('Error analyzing photo:', error);
        }
      }
      
      const photo: Omit<TaskPhoto, 'id'> = {
        url: imageUrl,
        thumbnailUrl,
        caption,
        takenAt: new Date(),
        takenBy: this.auth.user.uid,
        type,
        aiAnalysis
      };
      
      if (this.state.isOffline) {
        // Queue for later upload
        await offlineQueue.addOperation({
          type: 'custom',
          collection: 'tasks',
          documentId: taskId,
          action: 'addPhoto',
          data: { photo, imageBlob }
        });
        
        // Update local state
        const task = this.getTaskById(taskId);
        if (task) {
          task.photos.push({
            ...photo,
            id: `photo_${Date.now()}`
          });
          this.state.tasks = [...this.state.tasks]; // Trigger reactivity
        }
      } else {
        // Upload to Firebase Storage and add to task
        await addTaskPhoto(
          this.currentTenantId,
          taskId,
          photo,
          this.auth.user.uid
        );
      }
    } catch (error) {
      console.error('Error adding photo:', error);
      throw error;
    }
  }
  
  // Add note to task
  async addNote(
    taskId: string,
    text: string,
    type: TaskNote['type'] = 'general',
    isPrivate: boolean = false
  ): Promise<void> {
    if (!this.currentTenantId || !this.auth.user) {
      throw new Error('Not authenticated');
    }
    
    const note: Omit<TaskNote, 'id' | 'createdAt'> = {
      text,
      createdBy: this.auth.user.uid,
      createdByName: this.auth.user.displayName || 'Unknown',
      type,
      isPrivate
    };
    
    if (this.state.isOffline) {
      // Queue for later
      await offlineQueue.addOperation({
        type: 'custom',
        collection: 'tasks',
        documentId: taskId,
        action: 'addNote',
        data: note
      });
      
      // Update local state
      const task = this.getTaskById(taskId);
      if (task) {
        task.notes.push({
          ...note,
          id: `note_${Date.now()}`,
          createdAt: new Date()
        });
        this.state.tasks = [...this.state.tasks]; // Trigger reactivity
      }
    } else {
      await addTaskNote(
        this.currentTenantId,
        taskId,
        note,
        this.auth.user.uid
      );
    }
  }
  
  // Load more tasks with pagination
  async loadMore(): Promise<void> {
    if (!this.currentTenantId || !this.state.hasMore || this.state.isLoading) {
      return;
    }
    
    this.state.isLoading = true;
    
    try {
      const { tasks, lastDoc } = await getTasks(
        this.currentTenantId,
        this.state.filters,
        this.state.sortOptions,
        20,
        this.state.lastDoc
      );
      
      if (tasks.length < 20) {
        this.state.hasMore = false;
      }
      
      this.state.lastDoc = lastDoc;
      this.mergeTasks(tasks);
      this.updateDerivedTasks();
      
      // Cache tasks
      for (const task of tasks) {
        await localCache.setTask(task, this.currentTenantId);
      }
      
      // Generate predictions
      this.generatePredictionsForTasks(tasks);
    } catch (error) {
      console.error('Error loading more tasks:', error);
      this.state.error = error instanceof Error ? error.message : 'Failed to load tasks';
    } finally {
      this.state.isLoading = false;
    }
  }
  
  // Apply filters
  setFilters(filters: TaskFilters) {
    this.state.filters = filters;
    this.state.hasMore = true;
    this.state.lastDoc = undefined;
    this.state.tasks = [];
    this.loadMore();
  }
  
  // Set sort options
  setSortOptions(sortOptions: TaskSortOptions) {
    this.state.sortOptions = sortOptions;
    this.state.hasMore = true;
    this.state.lastDoc = undefined;
    this.state.tasks = [];
    this.loadMore();
  }
  
  // Load a specific task by ID
  async loadTask(taskId: string): Promise<Task | null> {
    if (!this.currentTenantId) {
      throw new Error('No tenant selected');
    }
    
    try {
      this.state.isLoading = true;
      
      // Try to get from cache first
      let task = this.getTaskById(taskId);
      if (task) {
        return task;
      }
      
      // Fetch from Firebase
      const fetchedTask = await getTask(this.currentTenantId, taskId);
      
      if (fetchedTask) {
        // Add to state
        this.state.tasks = [...this.state.tasks, fetchedTask];
        this.updateDerivedTasks();
        
        // Cache it
        await localCache.setTask(fetchedTask, this.currentTenantId);
        
        // Generate predictions
        this.generatePredictionsForTasks([fetchedTask]);
        
        return fetchedTask;
      }
      
      return null;
    } catch (error) {
      console.error('Error loading task:', error);
      throw error;
    } finally {
      this.state.isLoading = false;
    }
  }
  
  // Get task by ID
  getTaskById(taskId: string): Task | undefined {
    return this.state.tasks.find(task => task.id === taskId);
  }
  
  // Get tasks for client
  getTasksForClient(clientId: string): Task[] {
    return this.state.clientTasks.get(clientId) || 
      this.state.tasks.filter(task => task.clientId === clientId);
  }
  
  // Search tasks
  searchTasks(query: string): Task[] {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return this.state.tasks;
    
    return this.state.tasks.filter(task => 
      task.title?.toLowerCase().includes(searchTerm) ||
      task.description?.toLowerCase().includes(searchTerm) ||
      task.client?.name?.toLowerCase().includes(searchTerm) ||
      task.serviceType?.toLowerCase().includes(searchTerm) ||
      task.taskNumber?.toLowerCase().includes(searchTerm)
    );
  }
  
  // Get predictions for task
  getPredictions(taskId: string): TaskPredictions | undefined {
    return this.state.predictionsCache.get(taskId) || 
      this.getTaskById(taskId)?.predictions;
  }
  
  // Set current tenant
  setTenant(tenantId: string | undefined) {
    if (this.currentTenantId === tenantId) return;
    
    // Clean up subscriptions
    this.unsubscribes.forEach(unsubscribe => unsubscribe());
    this.unsubscribes.clear();
    this.state.tasks = [];
    this.state.clientTasks.clear();
    this.updateDerivedTasks();
    
    this.currentTenantId = tenantId;
    
    if (tenantId) {
      this.loadCachedData();
      
      // Subscribe to today's tasks if user is authenticated
      if (this.auth.user) {
        this.subscribeTechnicianToday(this.auth.user.uid);
      }
    }
  }
  
  // Cleanup
  cleanup() {
    this.unsubscribes.forEach(unsubscribe => unsubscribe());
    this.unsubscribes.clear();
    this.state.tasks = [];
    this.state.clientTasks.clear();
    this.updateDerivedTasks();
    
    // Let base store handle additional cleanup
    super.destroy();
  }
  
  // Getters for reactive access
  get tasks() { return this.state.tasks; }
  get todayTasks() { return this.state.todayTasks; }
  get upcomingTasks() { return this.state.upcomingTasks; }
  get overdueTasks() { return this.state.overdueTasks; }
  get isLoading() { return this.state.isLoading; }
  get error() { return this.state.error; }
  get isOffline() { return this.state.isOffline; }
  get filters() { return this.state.filters; }
  get sortOptions() { return this.state.sortOptions; }
  get hasMore() { return this.state.hasMore; }
}

// Create singleton instance
let taskStore: TaskStore | null = null;

export function useJobStore() {
  if (!taskStore) {
    taskStore = new TaskStore();
  }
  return taskStore;
}

// Cleanup function
export function cleanupJobStore() {
  if (taskStore) {
    taskStore.cleanup();
    taskStore = null;
  }
}