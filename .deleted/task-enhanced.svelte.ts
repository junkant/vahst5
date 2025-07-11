// src/lib/stores/task-enhanced.svelte.ts
// Enhanced task store with proper Firebase listener management

import { 
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '$lib/firebase/config';
import { 
  createTask as createTaskFirebase,
  updateTask as updateTaskFirebase,
  getTasks
} from '$lib/firebase/tasks';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus
} from '$lib/types/task';
import { canTransitionTo } from '$lib/types/task';
import { localCache } from '$lib/utils/localCache';
import { useAuth } from './auth.svelte';
import { useTenant } from './tenant.svelte';
import { browser } from '$app/environment';

class EnhancedTaskStore {
  // State - wrapped in an object to maintain reactivity
  #state = $state({
    tasks: [] as Task[],
    isLoading: false,
    error: null as string | null,
    isOffline: false
  });
  
  // Private fields
  #tenantListener: Unsubscribe | null = null;
  #clientListeners = new Map<string, Unsubscribe>();
  #currentTenantId: string | null = null;
  #currentClientId: string | null = null;
  #auth = useAuth();
  #tenant = useTenant();
  
  constructor() {
    if (browser) {
      this.#initializeOfflineDetection();
    }
  }
  
  // Initialize offline detection
  #initializeOfflineDetection() {
    this.#state.isOffline = !navigator.onLine;
    
    window.addEventListener('online', () => {
      this.#state.isOffline = false;
    });
    
    window.addEventListener('offline', () => {
      this.#state.isOffline = true;
    });
  }
  
  // Normalize task fields to handle mismatches
  #normalizeTask(doc: QueryDocumentSnapshot): Task {
    const data = doc.data();
    
    // Normalize date fields
    const normalizedTask: Task = {
      id: doc.id,
      ...data,
      // Handle both scheduledStart and scheduledDate
      scheduledStart: data.scheduledStart || data.scheduledDate || new Date(),
      scheduledEnd: data.scheduledEnd || null,
      // Ensure all required fields exist
      title: data.title || '',
      status: data.status || 'draft',
      priority: data.priority || 'normal',
      tenantId: data.tenantId || this.#currentTenantId,
      clientId: data.clientId || '',
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
      createdBy: data.createdBy || '',
      // Arrays
      assignedTo: data.assignedTo || [],
      equipment: data.equipment || [],
      photos: data.photos || [],
      notes: data.notes || [],
      statusHistory: data.statusHistory || []
    } as Task;
    
    return normalizedTask;
  }
  
  // Initialize tenant subscription
  async initializeTenant(tenantId: string | null) {
    // Skip if already initialized with same tenant
    if (this.#currentTenantId === tenantId && this.#tenantListener) {
      return;
    }
    
    // Clean up existing listeners only if tenant is changing
    if (this.#currentTenantId !== tenantId) {
      this.#cleanup();
    }
    
    if (!tenantId) {
      this.#currentTenantId = null;
      this.#state.tasks = [];
      return;
    }
    
    this.#currentTenantId = tenantId;
    this.#state.isLoading = true;
    
    try {
      // Load cached data first for immediate display
      const cachedTasks = await localCache.getRecentTasks(tenantId, 30);
      if (cachedTasks.length > 0) {
        this.#state.tasks = cachedTasks;
      }
      
      // Set up real-time listener
      this.#setupTenantListener(tenantId);
      
    } catch (error) {
      this.#state.error = error instanceof Error ? error.message : 'Failed to initialize';
    }
  }
  
  // Set up Firebase listener for all tenant tasks
  #setupTenantListener(tenantId: string) {
    const tasksRef = collection(db, `tenants/${tenantId}/tasks`);
    const q = query(
      tasksRef,
      orderBy('scheduledStart', 'desc'),
      limit(100)
    );
    
    this.#tenantListener = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        // Process all tasks
        const tasks: Task[] = [];
        snapshot.docs.forEach(doc => {
          tasks.push(this.#normalizeTask(doc));
        });
        
        // Update state
        this.#state.tasks = tasks;
        this.#state.isLoading = false;
        
        // Cache tasks in background
        if (tasks.length > 0 && !snapshot.metadata.fromCache) {
          this.#cacheTasks(tasks, tenantId);
        }
      },
      (error) => {
        this.#state.error = error.message;
        this.#state.isLoading = false;
      }
    );
  }
  
  // Subscribe to specific client's tasks
  subscribeToClient(clientId: string) {
    if (!this.#currentTenantId || !clientId) return;
    
    // Skip if already subscribed to the same client
    if (this.#currentClientId === clientId && this.#clientListeners.has(clientId)) {
      return;
    }
    
    this.#currentClientId = clientId;
    
    // Clean up existing client listener
    const existingListener = this.#clientListeners.get(clientId);
    if (existingListener) {
      existingListener();
    }
    
    const tasksRef = collection(db, `tenants/${this.#currentTenantId}/tasks`);
    const q = query(
      tasksRef,
      where('clientId', '==', clientId),
      orderBy('scheduledStart', 'desc')
    );
    
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        // Filter and update only this client's tasks
        const clientTasks = snapshot.docs.map(doc => this.#normalizeTask(doc));
        
        // Merge with existing tasks
        const otherTasks = this.#state.tasks.filter(t => t.clientId !== clientId);
        this.#state.tasks = [...otherTasks, ...clientTasks];
      },
      (error) => {
        // Handle error silently or notify user through UI
      }
    );
    
    this.#clientListeners.set(clientId, unsubscribe);
  }
  
  // Create task with optimistic update
  async createTask(taskData: CreateTaskInput): Promise<Task> {
    if (!this.#currentTenantId || !this.#auth.user) {
      throw new Error('Not authenticated or no tenant selected');
    }
    
    try {
      // Create optimistic task for immediate UI update
      const optimisticTask: Task = {
        id: `temp_${Date.now()}`,
        tenantId: this.#currentTenantId,
        ...taskData,
        status: 'draft',
        priority: taskData.priority || 'normal',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: this.#auth.user.uid,
        assignedTo: taskData.assignedTo || [],
        equipment: [],
        photos: [],
        notes: [],
        statusHistory: [{
          status: 'draft',
          changedAt: new Date(),
          changedBy: this.#auth.user.uid
        }],
        client: {
          id: taskData.clientId,
          name: 'Loading...',
          address: taskData.address || {}
        }
      } as Task;
      
      // Add optimistic update
      this.#state.tasks = [optimisticTask, ...this.#state.tasks];
      
      // Create in Firebase
      const createdTask = await createTaskFirebase(
        this.#currentTenantId,
        taskData,
        this.#auth.user.uid,
        this.#auth.user.displayName || undefined
      );
      
      // Remove optimistic task - real-time listener will add the actual task
      this.#state.tasks = this.#state.tasks.filter(t => t.id !== optimisticTask.id);
      
      return createdTask;
      
    } catch (error) {
      // Remove optimistic task on error
      this.#state.tasks = this.#state.tasks.filter(t => !t.id.startsWith('temp_'));
      throw error;
    }
  }
  
  // Update task
  async updateTask(taskId: string, updates: UpdateTaskInput): Promise<void> {
    if (!this.#currentTenantId || !this.#auth.user) {
      throw new Error('Not authenticated');
    }
    
    // Optimistic update
    this.#state.tasks = this.#state.tasks.map(task => 
      task.id === taskId 
        ? { ...task, ...updates, updatedAt: new Date() } 
        : task
    );
    
    try {
      await updateTaskFirebase(
        this.#currentTenantId,
        taskId,
        updates,
        this.#auth.user.uid
      );
      // Real-time listener will update with server data
    } catch (error) {
      // Revert optimistic update on error
      throw error;
    }
  }
  
  // Update task status
  async updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<void> {
    const task = this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');
    
    if (!canTransitionTo(task.status, newStatus)) {
      throw new Error(`Cannot transition from ${task.status} to ${newStatus}`);
    }
    
    await this.updateTask(taskId, { status: newStatus });
  }
  
  // Cache tasks in background
  async #cacheTasks(tasks: Task[], tenantId: string) {
    try {
      for (const task of tasks) {
        await localCache.setTask(task, tenantId);
      }
    } catch (error) {
      // Silent fail - caching is not critical
    }
  }
  
  // Load more tasks (pagination)
  async loadMore(): Promise<void> {
    if (!this.#currentTenantId || this.#state.isLoading) return;
    
    this.#state.isLoading = true;
    
    try {
      const { tasks } = await getTasks(
        this.#currentTenantId,
        {},
        { field: 'scheduledStart', direction: 'desc' },
        50
      );
      
      // Merge with existing tasks
      const existingIds = new Set(this.#state.tasks.map(t => t.id));
      const newTasks = tasks.filter(t => !existingIds.has(t.id));
      
      if (newTasks.length > 0) {
        this.#state.tasks = [...this.#state.tasks, ...newTasks];
      }
    } catch (error) {
      this.#state.error = error instanceof Error ? error.message : 'Failed to load tasks';
    } finally {
      this.#state.isLoading = false;
    }
  }
  
  // Cleanup listeners
  #cleanup() {
    if (this.#tenantListener) {
      this.#tenantListener();
      this.#tenantListener = null;
    }
    
    this.#clientListeners.forEach(unsubscribe => unsubscribe());
    this.#clientListeners.clear();
    this.#currentClientId = null;
  }
  
  // Public cleanup method
  cleanup() {
    this.#cleanup();
    this.#state.tasks = [];
  }
  
  // Getters
  get tasks() { return this.#state.tasks; }
  get isLoading() { return this.#state.isLoading; }
  get error() { return this.#state.error; }
  get isOffline() { return this.#state.isOffline; }
  
  // Derived getters
  get todayTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.#state.tasks.filter(task => {
      if (!task.scheduledStart) return false;
      const date = task.scheduledStart instanceof Date 
        ? task.scheduledStart 
        : new Date(task.scheduledStart);
      return date >= today && date < tomorrow;
    });
  }
  
  get upcomingTasks() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return this.#state.tasks.filter(task => {
      if (!task.scheduledStart) return false;
      const date = task.scheduledStart instanceof Date 
        ? task.scheduledStart 
        : new Date(task.scheduledStart);
      return date >= tomorrow;
    });
  }
  
  get overdueTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.#state.tasks.filter(task => {
      if (!task.scheduledStart) return false;
      const date = task.scheduledStart instanceof Date 
        ? task.scheduledStart 
        : new Date(task.scheduledStart);
      return date < today && 
        task.status !== 'completed' && 
        task.status !== 'invoiced' && 
        task.status !== 'paid';
    });
  }
  
  // Search tasks
  searchTasks(query: string): Task[] {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return this.#state.tasks;
    
    return this.#state.tasks.filter(task => 
      task.title?.toLowerCase().includes(searchTerm) ||
      task.description?.toLowerCase().includes(searchTerm) ||
      task.client?.name?.toLowerCase().includes(searchTerm) ||
      task.serviceType?.toLowerCase().includes(searchTerm)
    );
  }
  
  // Get task by ID
  getTaskById(id: string): Task | undefined {
    return this.#state.tasks.find(task => task.id === id);
  }
  
  // Get tasks for client
  getTasksForClient(clientId: string): Task[] {
    return this.#state.tasks.filter(task => task.clientId === clientId);
  }
}

// Create singleton
let enhancedTaskStore: EnhancedTaskStore | null = null;

export function useEnhancedTaskStore() {
  if (!enhancedTaskStore) {
    enhancedTaskStore = new EnhancedTaskStore();
  }
  return enhancedTaskStore;
}

// Cleanup function
export function cleanupEnhancedTaskStore() {
  if (enhancedTaskStore) {
    enhancedTaskStore.cleanup();
    enhancedTaskStore = null;
  }
}
