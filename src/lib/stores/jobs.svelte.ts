// src/lib/stores/jobs.svelte.ts
import { type Unsubscribe } from 'firebase/firestore';
import { subscribeToTenantJobs, type Job } from '$lib/firebase/firestore';
import { localCache } from '$lib/utils/localCache';
import { imageCompressor } from '$lib/utils/imageCompressor';
import { browser } from '$app/environment';

interface JobStore {
  jobs: Job[];
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  todayJobs: Job[];
  upcomingJobs: Job[];
  overdueJobs: Job[];
  getJobById: (id: string) => Job | undefined;
  searchJobs: (query: string) => Job[];
  attachPhoto: (jobId: string, file: File) => Promise<void>;
}

class JobStoreImpl {
  // State
  jobs = $state<Job[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);
  isOffline = $state(false);
  
  // Cache state
  private cachedJobs = $state<Job[]>([]);
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

  // Load jobs from cache (last 30 days)
  private async loadFromCache(tenantId: string) {
    try {
      this.isLoading = true;
      // Get jobs from last 30 days
      const cachedJobs = await localCache.getRecentJobs(tenantId, 30);
      
      if (cachedJobs.length > 0) {
        this.cachedJobs = cachedJobs;
        this.jobs = cachedJobs;
        
        if (import.meta.env.DEV) {
          console.log(`Loaded ${cachedJobs.length} jobs from cache (last 30 days)`);
        }
      }
    } catch (error) {
      console.error('Error loading jobs from cache:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Sync jobs with server
  private async syncWithServer(tenantId: string) {
    if (this.isOffline) return;
    
    try {
      // Only cache jobs from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      for (const job of this.jobs) {
        // Only cache recent jobs
        if (new Date(job.scheduledDate) >= thirtyDaysAgo) {
          await localCache.setJob(job, tenantId);
        }
      }
      
      this.lastSync = Date.now();
      
      if (import.meta.env.DEV) {
        console.log('Synced recent jobs to cache');
      }
    } catch (error) {
      console.error('Error syncing jobs to cache:', error);
    }
  }

  // Subscribe to tenant jobs
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
        // Note: You'll need to implement subscribeToTenantJobs in firestore.ts
        this.unsubscribe = subscribeToTenantJobs(
          tenantId,
          async (updatedJobs) => {
            this.jobs = updatedJobs;
            this.isLoading = false;
            
            // Update cache with recent jobs
            this.syncWithServer(tenantId);
          },
          (error) => {
            if (!this.isOffline) {
              console.error('Error subscribing to jobs:', error);
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
      this.jobs = [];
      this.isLoading = false;
      this.error = null;
    }
  }

  // Computed values
  get todayJobs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const jobsToFilter = this.isOffline && this.cachedJobs.length > 0 
      ? this.cachedJobs 
      : this.jobs;
    
    return jobsToFilter.filter(job => {
      const jobDate = new Date(job.scheduledDate);
      return jobDate >= today && jobDate < tomorrow;
    }).sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  }

  get upcomingJobs() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const jobsToFilter = this.isOffline && this.cachedJobs.length > 0 
      ? this.cachedJobs 
      : this.jobs;
    
    return jobsToFilter.filter(job => {
      const jobDate = new Date(job.scheduledDate);
      return jobDate >= tomorrow;
    }).sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  }

  get overdueJobs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const jobsToFilter = this.isOffline && this.cachedJobs.length > 0 
      ? this.cachedJobs 
      : this.jobs;
    
    return jobsToFilter.filter(job => {
      const jobDate = new Date(job.scheduledDate);
      return jobDate < today && job.status !== 'completed' && job.status !== 'cancelled';
    }).sort((a, b) => 
      new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );
  }

  // Get job by ID
  getJobById = (id: string): Job | undefined => {
    const jobsToSearch = this.isOffline && this.cachedJobs.length > 0 
      ? this.cachedJobs 
      : this.jobs;
    
    return jobsToSearch.find(j => j.id === id);
  }

  // Search jobs
  searchJobs = (query: string): Job[] => {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return this.jobs;
    
    const jobsToSearch = this.isOffline && this.cachedJobs.length > 0 
      ? this.cachedJobs 
      : this.jobs;
    
    return jobsToSearch.filter(job => 
      job.title?.toLowerCase().includes(searchTerm) ||
      job.description?.toLowerCase().includes(searchTerm) ||
      job.client?.name?.toLowerCase().includes(searchTerm) ||
      job.serviceType?.toLowerCase().includes(searchTerm)
    );
  }

  // Attach photo to job with compression
  async attachPhoto(jobId: string, file: File): Promise<void> {
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
          `job-${jobId}-${Date.now()}`,
          compressed.blob,
          this.currentTenantId
        );

        // Also create a thumbnail
        await localCache.cacheImage(
          `job-${jobId}-${Date.now()}-thumb`,
          file,
          this.currentTenantId,
          true
        );

        console.log(`Compressed image from ${file.size} to ${compressed.size} bytes (${compressed.compressionRatio.toFixed(2)}x)`);
      } else {
        // Cache original if small enough
        await localCache.cacheImage(
          `job-${jobId}-${Date.now()}`,
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
let jobStore: JobStoreImpl | null = null;

// Export the store hook
export function useJobs(): JobStore {
  if (!jobStore) {
    jobStore = new JobStoreImpl();
  }

  return {
    get jobs() { return jobStore.jobs; },
    get isLoading() { return jobStore.isLoading; },
    get error() { return jobStore.error; },
    get isOffline() { return jobStore.isOffline; },
    get todayJobs() { return jobStore.todayJobs; },
    get upcomingJobs() { return jobStore.upcomingJobs; },
    get overdueJobs() { return jobStore.overdueJobs; },
    getJobById: jobStore.getJobById,
    searchJobs: jobStore.searchJobs,
    attachPhoto: jobStore.attachPhoto.bind(jobStore)
  };
}

// Initialize subscription
export function initializeJobStore(tenantId: string | undefined) {
  if (jobStore) {
    jobStore.subscribeTenant(tenantId);
  }
}

// Cleanup
export function cleanupJobStore() {
  if (jobStore) {
    jobStore.destroy();
    jobStore = null;
  }
}