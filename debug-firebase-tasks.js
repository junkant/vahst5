// Debug script to check Firebase tasks directly
// Run this in the browser console while on the tasks page

async function debugFirebaseTasks() {
  console.log('=== FIREBASE TASKS DEBUG ===');
  
  // Import Firebase functions
  const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
  const { db } = await import('$lib/firebase/config');
  const { useTenant } = await import('$lib/stores/tenant.svelte');
  
  const tenant = useTenant();
  const tenantId = tenant.current?.id;
  
  if (!tenantId) {
    console.error('No tenant selected!');
    return;
  }
  
  console.log('Current tenant:', tenantId);
  
  try {
    // Query tasks directly
    const tasksRef = collection(db, `tenants/${tenantId}/tasks`);
    const q = query(tasksRef, orderBy('scheduledStart', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} tasks in Firebase`);
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\nTask ${index + 1}:`, {
        id: doc.id,
        title: data.title,
        status: data.status,
        clientId: data.clientId,
        scheduledStart: data.scheduledStart,
        scheduledDate: data.scheduledDate,
        fields: Object.keys(data)
      });
    });
    
    // Check for field name issues
    if (snapshot.size > 0) {
      const firstDoc = snapshot.docs[0];
      const data = firstDoc.data();
      console.log('\nFirst task full data:', data);
      console.log('\nField analysis:');
      console.log('- Has scheduledStart:', 'scheduledStart' in data);
      console.log('- Has scheduledDate:', 'scheduledDate' in data);
      console.log('- scheduledStart type:', typeof data.scheduledStart);
      console.log('- scheduledDate type:', typeof data.scheduledDate);
    }
    
  } catch (error) {
    console.error('Error querying Firebase:', error);
    if (error.code === 'permission-denied') {
      console.error('Permission denied - check Firebase security rules');
    }
  }
}

// Run the debug function
debugFirebaseTasks();
