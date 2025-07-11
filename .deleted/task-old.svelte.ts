// src/lib/stores/job.svelte.ts
// Enhanced job store with AI predictions and offline support

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
  TaskNote
} from '$lib/types/task';
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

interface TaskPredictions {
  duration: {
    minutes: number;
    confidence: number;
    factors: string[];
  };
  complexity: {
    level: 'simple' | 'moderate' | 'complex';
    confidence: number;
    reasoning: string[];
  };
  requiredEquipment: {
    items: string[];
    confidence: number;
    basedOn: string[];
  };
  weatherImpact?: {
    severity: 'none' | 'minor' | 'moderate' | 'severe';
    recommendations: string[];
    alternativeDate?: Date;
  };
  skillsRequired: string[];
  estimatedCost?: {
    labor: number;
    parts: number;
    confidence: number;
  };
}

class TaskStore {
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
    if (browser) {
      this.initializeOfflineDetection();
      this.loadCachedData();
    }
  }
  
  // Initialize offline detection
  private initializeOfflineDetection() {
    this.state.isOffline = !navigator.onLine;
    
    window.addEventListener('online', () => {
      this.state.isOffline = false;
      this.syncOfflineQueue();
    });
    
    window.addEventListener('offline', () => {
      this.state.isOffline = true;
    });
  }
  
  // Load cached data
  private async loadCachedData() {
    try {
      const cachedJobs = await localCache.getRecentJobs(this.currentTenantId || '', 30);
      if (cachedJobs.length > 0) {
        this.state.jobs = cachedJobs;
        this.updateDerivedJobs();
      }
    } catch (error) {
      console.error('Error loading cached jobs:', error);
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
  
  // Update derived job lists
  private updateDerivedJobs() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Today's jobs
    this.state.todayJobs = this.state.jobs.filter(job => {
      const scheduledDate = job.scheduledStart instanceof Date 
        ? job.scheduledStart 
        : job.scheduledStart.toDate();
      return scheduledDate >= today && scheduledDate < tomorrow;
    }).sort((a, b) => {
      const dateA = a.scheduledStart instanceof Date ? a.scheduledStart : a.scheduledStart.toDate();
      const dateB = b.scheduledStart instanceof Date ? b.scheduledStart : b.scheduledStart.toDate();
      return dateA.getTime() - dateB.getTime();
    });
    
    // Upcoming jobs (after today)
    this.state.upcomingJobs = this.state.jobs.filter(job => {
      const scheduledDate = job.scheduledStart instanceof Date 
        ? job.scheduledStart 
        : job.scheduledStart.toDate();
      return scheduledDate >= tomorrow;
    }).sort((a, b) => {
      const dateA = a.scheduledStart instanceof Date ? a.scheduledStart : a.scheduledStart.toDate();
      const dateB = b.scheduledStart instanceof Date ? b.scheduledStart : b.scheduledStart.toDate();
      return dateA.getTime() - dateB.getTime();
    });
    
    // Overdue jobs
    this.state.overdueJobs = this.state.jobs.filter(job => {
      const scheduledDate = job.scheduledStart instanceof Date 
        ? job.scheduledStart 
        : job.scheduledStart.toDate();
      return scheduledDate < today && 
        job.status !== 'completed' && 
        job.status !== 'invoiced' && 
        job.status !== 'paid';
    }).sort((a, b) => {
      const dateA = a.scheduledStart instanceof Date ? a.scheduledStart : a.scheduledStart.toDate();
      const dateB = b.scheduledStart instanceof Date ? b.scheduledStart : b.scheduledStart.toDate();
      return dateB.getTime() - dateA.getTime(); // Most overdue first
    });
  }
  
  // Subscribe to client jobs
  subscribeToClient(clientId: string) {
    if (!this.currentTenantId) return;
    
    // Unsubscribe from previous client
    const key = `client_${clientId}`;
    if (this.unsubscribes.has(key)) {
      this.unsubscribes.get(key)!();
    }
    
    this.state.isLoading = true;
    
    const unsubscribe = subscribeToClientJobs(
      this.currentTenantId,
      clientId,
      (jobs) => {
        this.state.clientJobs.set(clientId, jobs);
        this.mergeClientJobs(clientId, jobs);
        this.state.isLoading = false;
        
        // Cache jobs
        jobs.forEach(job => {
          localCache.setJob(job, this.currentTenantId!);
        });
        
        // Generate AI predictions for new jobs
        this.generatePredictionsForJobs(jobs);
      },
      (error) => {
        console.error('Error subscribing to client jobs:', error);
        this.state.error = error.message;
        this.state.isLoading = false;
      }
    );
    
    this.unsubscribes.set(key, unsubscribe);
  }
  
  // Subscribe to technician's today jobs
  subscribeTechnicianToday(technicianId: string) {
    if (!this.currentTenantId) return;
    
    const key = `tech_today_${technicianId}`;
    if (this.unsubscribes.has(key)) {
      this.unsubscribes.get(key)!();
    }
    
    const unsubscribe = subscribeToTechnicianTodayJobs(
      this.currentTenantId,
      technicianId,
      (jobs) => {
        this.mergeJobs(jobs);
        this.updateDerivedJobs();
        
        // Cache jobs
        jobs.forEach(job => {
          localCache.setJob(job, this.currentTenantId!);
        });
      },
      (error) => {
        console.error('Error subscribing to technician jobs:', error);
        this.state.error = error.message;
      }
    );
    
    this.unsubscribes.set(key, unsubscribe);
  }
  
  // Merge client jobs into main jobs array
  private mergeClientJobs(clientId: string, clientJobs: Job[]) {
    // Remove old jobs for this client
    this.state.jobs = this.state.jobs.filter(job => job.clientId !== clientId);
    
    // Add new jobs
    this.state.jobs = [...this.state.jobs, ...clientJobs];
    
    this.updateDerivedJobs();
  }
  
  // Merge jobs into state
  private mergeJobs(newJobs: Job[]) {
    const jobMap = new Map(this.state.jobs.map(job => [job.id, job]));
    
    newJobs.forEach(job => {
      jobMap.set(job.id, job);
    });
    
    this.state.jobs = Array.from(jobMap.values());
  }
  
  // Generate AI predictions for jobs
  private async generatePredictionsForJobs(jobs: Job[]) {
    if (!browser || this.state.isOffline) return;
    
    for (const job of jobs) {
      if (!this.state.predictionsCache.has(job.id) && !job.predictions) {
        try {
          const predictions = await generateJobPredictions(job, this.state.jobs);
          this.state.predictionsCache.set(job.id, predictions);
          
          // Update job with predictions
          if (this.currentTenantId && this.auth.user) {
            await updateJobFirebase(
              this.currentTenantId,
              job.id,
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
  
  // Create a new job
  async createJob(jobData: CreateJobInput): Promise<Job> {
    if (!this.currentTenantId || !this.auth.user) {
      throw new Error('Not authenticated');
    }
    
    try {
      if (this.state.isOffline) {
        // Create offline job
        const offlineJob: Job = {
          id: `offline_${Date.now()}`,
          tenantId: this.currentTenantId,
          ...jobData,
          status: 'draft',
          statusHistory: [{
            status: 'draft',
            changedAt: new Date(),
            changedBy: this.auth.user.uid
          }],
          priority: jobData.priority || 'normal',
          client: {
            id: jobData.clientId,
            name: 'Offline Client',
            address: jobData.address || {}
          },
          address: jobData.address || {},
          equipment: [],
          photos: [],
          notes: [],
          createdAt: new Date(),
          createdBy: this.auth.user.uid,
          updatedAt: new Date(),
          _localId: `offline_${Date.now()}`,
          _syncStatus: 'pending'
        } as Job;
        
        // Add to offline queue
        await offlineQueue.addOperation({
          type: 'create',
          collection: 'jobs',
          data: jobData,
          localId: offlineJob.id
        });
        
        // Add to local state
        this.state.jobs = [...this.state.jobs, offlineJob];
        this.updateDerivedJobs();
        
        return offlineJob;
      } else {
        // Create online
        const job = await createJobFirebase(
          this.currentTenantId,
          jobData,
          this.auth.user.uid,
          this.auth.user.displayName || undefined
        );
        
        // Add to local state
        this.state.jobs = [...this.state.jobs, job];
        this.updateDerivedJobs();
        
        // Cache job
        await localCache.setJob(job, this.currentTenantId);
        
        // Generate AI predictions
        this.generatePredictionsForJobs([job]);
        
        return job;
      }
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  }
  
  // Update job
  async updateJob(jobId: string, updates: UpdateJobInput): Promise<void> {
    if (!this.currentTenantId || !this.auth.user) {
      throw new Error('Not authenticated');
    }
    
    try {
      if (this.state.isOffline) {
        // Add to offline queue
        await offlineQueue.addOperation({
          type: 'update',
          collection: 'jobs',
          documentId: jobId,
          data: updates
        });
        
        // Update local state
        this.state.jobs = this.state.jobs.map(job => 
          job.id === jobId ? { ...job, ...updates, updatedAt: new Date() } : job
        );
        this.updateDerivedJobs();
      } else {
        // Update online
        await updateJobFirebase(
          this.currentTenantId,
          jobId,
          updates,
          this.auth.user.uid
        );
        
        // Update will come through subscription
      }
    } catch (error) {
      console.error('Error updating job:', error);
      throw error;
    }
  }
  
  // Update job status with transition validation
  async updateJobStatus(jobId: string, newStatus: JobStatus, reason?: string): Promise<void> {
    const job = this.getJobById(jobId);
    if (!job) throw new Error('Job not found');
    
    // Validate transition
    if (!canTransitionTo(job.status, newStatus)) {
      throw new Error(`Cannot transition from ${job.status} to ${newStatus}`);
    }
    
    await this.updateJob(jobId, {
      status: newStatus,
      subStatus: reason as any
    });
  }
  
  // Add photo to job
  async addPhoto(
    jobId: string, 
    file: File, 
    type: JobPhoto['type'],
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
      const imageId = `job_${jobId}_${Date.now()}`;
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
          aiAnalysis = await analyzeJobPhoto(imageBlob, type);
        } catch (error) {
          console.error('Error analyzing photo:', error);
        }
      }
      
      const photo: Omit<JobPhoto, 'id'> = {
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
          collection: 'jobs',
          documentId: jobId,
          action: 'addPhoto',
          data: { photo, imageBlob }
        });
        
        // Update local state
        const job = this.getJobById(jobId);
        if (job) {
          job.photos.push({
            ...photo,
            id: `photo_${Date.now()}`
          });
          this.state.jobs = [...this.state.jobs]; // Trigger reactivity
        }
      } else {
        // Upload to Firebase Storage and add to job
        await addJobPhoto(
          this.currentTenantId,
          jobId,
          photo,
          this.auth.user.uid
        );
      }
    } catch (error) {
      console.error('Error adding photo:', error);
      throw error;
    }
  }
  
  // Add note to job
  async addNote(
    jobId: string,
    text: string,
    type: JobNote['type'] = 'general',
    isPrivate: boolean = false
  ): Promise<void> {
    if (!this.currentTenantId || !this.auth.user) {
      throw new Error('Not authenticated');
    }
    
    const note: Omit<JobNote, 'id' | 'createdAt'> = {
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
        collection: 'jobs',
        documentId: jobId,
        action: 'addNote',
        data: note
      });
      
      // Update local state
      const job = this.getJobById(jobId);
      if (job) {
        job.notes.push({
          ...note,
          id: `note_${Date.now()}`,
          createdAt: new Date()
        });
        this.state.jobs = [...this.state.jobs]; // Trigger reactivity
      }
    } else {
      await addJobNote(
        this.currentTenantId,
        jobId,
        note,
        this.auth.user.uid
      );
    }
  }
  
  // Load more jobs with pagination
  async loadMore(): Promise<void> {
    if (!this.currentTenantId || !this.state.hasMore || this.state.isLoading) {
      return;
    }
    
    this.state.isLoading = true;
    
    try {
      const { jobs, lastDoc } = await getJobs(
        this.currentTenantId,
        this.state.filters,
        this.state.sortOptions,
        20,
        this.state.lastDoc
      );
      
      if (jobs.length < 20) {
        this.state.hasMore = false;
      }
      
      this.state.lastDoc = lastDoc;
      this.mergeJobs(jobs);
      this.updateDerivedJobs();
      
      // Cache jobs
      for (const job of jobs) {
        await localCache.setJob(job, this.currentTenantId);
      }
      
      // Generate predictions
      this.generatePredictionsForJobs(jobs);
    } catch (error) {
      console.error('Error loading more jobs:', error);
      this.state.error = error instanceof Error ? error.message : 'Failed to load jobs';
    } finally {
      this.state.isLoading = false;
    }
  }
  
  // Apply filters
  setFilters(filters: JobFilters) {
    this.state.filters = filters;
    this.state.hasMore = true;
    this.state.lastDoc = undefined;
    this.state.jobs = [];
    this.loadMore();
  }
  
  // Set sort options
  setSortOptions(sortOptions: JobSortOptions) {
    this.state.sortOptions = sortOptions;
    this.state.hasMore = true;
    this.state.lastDoc = undefined;
    this.state.jobs = [];
    this.loadMore();
  }
  
  // Get job by ID
  getJobById(jobId: string): Job | undefined {
    return this.state.jobs.find(job => job.id === jobId);
  }
  
  // Get jobs for client
  getJobsForClient(clientId: string): Job[] {
    return this.state.clientJobs.get(clientId) || 
      this.state.jobs.filter(job => job.clientId === clientId);
  }
  
  // Search jobs
  searchJobs(query: string): Job[] {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return this.state.jobs;
    
    return this.state.jobs.filter(job => 
      job.title?.toLowerCase().includes(searchTerm) ||
      job.description?.toLowerCase().includes(searchTerm) ||
      job.client?.name?.toLowerCase().includes(searchTerm) ||
      job.serviceType?.toLowerCase().includes(searchTerm) ||
      job.jobNumber?.toLowerCase().includes(searchTerm)
    );
  }
  
  // Get predictions for job
  getPredictions(jobId: string): JobPredictions | undefined {
    return this.state.predictionsCache.get(jobId) || 
      this.getJobById(jobId)?.predictions;
  }
  
  // Set current tenant
  setTenant(tenantId: string | undefined) {
    if (this.currentTenantId === tenantId) return;
    
    // Clean up subscriptions
    this.cleanup();
    
    this.currentTenantId = tenantId;
    
    if (tenantId) {
      this.loadCachedData();
      
      // Subscribe to today's jobs if user is authenticated
      if (this.auth.user) {
        this.subscribeTechnicianToday(this.auth.user.uid);
      }
    }
  }
  
  // Cleanup
  cleanup() {
    this.unsubscribes.forEach(unsubscribe => unsubscribe());
    this.unsubscribes.clear();
    this.state.jobs = [];
    this.state.clientJobs.clear();
    this.updateDerivedJobs();
  }
  
  // Getters for reactive access
  get jobs() { return this.state.jobs; }
  get todayJobs() { return this.state.todayJobs; }
  get upcomingJobs() { return this.state.upcomingJobs; }
  get overdueJobs() { return this.state.overdueJobs; }
  get isLoading() { return this.state.isLoading; }
  get error() { return this.state.error; }
  get isOffline() { return this.state.isOffline; }
  get filters() { return this.state.filters; }
  get sortOptions() { return this.state.sortOptions; }
  get hasMore() { return this.state.hasMore; }
}

// Helper function from job types
function canTransitionTo(currentStatus: JobStatus, targetStatus: JobStatus): boolean {
  const transitions: Record<JobStatus, JobStatus[]> = {
    draft: ['scheduled', 'cancelled'],
    scheduled: ['in_progress', 'cancelled', 'draft'],
    in_progress: ['completed', 'on_hold', 'scheduled'],
    completed: ['invoiced', 'in_progress'],
    invoiced: ['paid', 'completed'],
    paid: []
  };
  
  return transitions[currentStatus]?.includes(targetStatus) ?? false;
}

// Create singleton instance
let jobStore: JobStore | null = null;

export function useJobStore() {
  if (!jobStore) {
    jobStore = new JobStore();
  }
  return jobStore;
}

// Cleanup function
export function cleanupJobStore() {
  if (jobStore) {
    jobStore.cleanup();
    jobStore = null;
  }
}
