// src/lib/firebase/debug-check-data.ts
// Simple debug to check what data exists

import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './config';

export async function checkTasksExist(tenantId: string) {
  console.log('🔍 Checking if tasks exist for tenant:', tenantId);
  
  try {
    // First check if tenant exists
    const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
    console.log('Tenant exists:', tenantDoc.exists());
    
    // Check tasks collection
    const tasksRef = collection(db, `tenants/${tenantId}/tasks`);
    const snapshot = await getDocs(tasksRef);
    
    console.log('Tasks found:', snapshot.size);
    
    if (snapshot.size > 0) {
      console.log('Sample tasks:');
      snapshot.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log({
          id: doc.id,
          title: data.title,
          status: data.status,
          clientId: data.clientId,
          fields: Object.keys(data)
        });
      });
    }
    
    // Also check if there's a 'jobs' collection (old name)
    try {
      const jobsRef = collection(db, `tenants/${tenantId}/jobs`);
      const jobsSnapshot = await getDocs(jobsRef);
      console.log('Jobs collection exists with', jobsSnapshot.size, 'documents');
    } catch (e) {
      console.log('No jobs collection found');
    }
    
    return {
      tenantExists: tenantDoc.exists(),
      taskCount: snapshot.size,
      tasks: snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    };
    
  } catch (error) {
    console.error('Error checking tasks:', error);
    return { error: error.message };
  }
}

// Export for browser console
if (typeof window !== 'undefined') {
  (window as any).checkTasksExist = checkTasksExist;
}
