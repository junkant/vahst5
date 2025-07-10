// src/lib/firebase/migrate-jobs-to-tasks.ts
// Migration utility to convert jobs to tasks if needed

import { collection, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

export async function checkAndMigrateJobsToTasks(tenantId: string) {
  console.log('🔄 Checking for jobs to migrate to tasks...');
  
  try {
    // Check if jobs collection exists
    const jobsRef = collection(db, `tenants/${tenantId}/jobs`);
    const jobsSnapshot = await getDocs(jobsRef);
    
    if (jobsSnapshot.size === 0) {
      console.log('No jobs found to migrate');
      return { migrated: 0, message: 'No jobs found' };
    }
    
    console.log(`Found ${jobsSnapshot.size} jobs to potentially migrate`);
    
    // Check if tasks collection already has data
    const tasksRef = collection(db, `tenants/${tenantId}/tasks`);
    const tasksSnapshot = await getDocs(tasksRef);
    
    if (tasksSnapshot.size > 0) {
      console.log('Tasks collection already has data, skipping migration');
      return { migrated: 0, message: 'Tasks already exist', taskCount: tasksSnapshot.size };
    }
    
    // Migrate jobs to tasks
    let migrated = 0;
    const errors: string[] = [];
    
    for (const jobDoc of jobsSnapshot.docs) {
      try {
        const jobData = jobDoc.data();
        
        // Convert job data to task format
        const taskData = {
          ...jobData,
          // Rename fields if needed
          scheduledStart: jobData.scheduledDate || jobData.scheduledStart || new Date(),
          scheduledEnd: jobData.scheduledEnd || null,
          
          // Ensure required fields
          title: jobData.title || 'Untitled Task',
          status: jobData.status || 'draft',
          priority: jobData.priority || 'normal',
          
          // Add migration metadata
          migratedFrom: 'jobs',
          migratedAt: serverTimestamp()
        };
        
        // Create task with same ID as job
        await setDoc(doc(tasksRef, jobDoc.id), taskData);
        migrated++;
        
        console.log(`Migrated job ${jobDoc.id} -> task`);
      } catch (error) {
        console.error(`Failed to migrate job ${jobDoc.id}:`, error);
        errors.push(`${jobDoc.id}: ${error.message}`);
      }
    }
    
    return {
      migrated,
      total: jobsSnapshot.size,
      errors,
      message: `Migrated ${migrated} of ${jobsSnapshot.size} jobs to tasks`
    };
    
  } catch (error) {
    console.error('Migration error:', error);
    return { error: error.message };
  }
}

// Export for browser console
if (typeof window !== 'undefined') {
  (window as any).migrateJobsToTasks = checkAndMigrateJobsToTasks;
}
