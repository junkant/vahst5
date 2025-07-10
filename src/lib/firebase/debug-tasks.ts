// src/lib/firebase/debug-tasks.ts
// Debug utilities for checking task queries

import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from './config';

export async function debugTaskQueries(tenantId: string) {
  console.log('🔍 Starting Firebase task debug for tenant:', tenantId);
  
  const results = {
    simpleQuery: null as any,
    orderedQuery: null as any,
    clientQuery: null as any,
    errors: [] as string[]
  };
  
  const tasksRef = collection(db, `tenants/${tenantId}/tasks`);
  
  // Test 1: Simple query without ordering
  try {
    console.log('Test 1: Simple query...');
    const simpleQuery = query(tasksRef, limit(5));
    const simpleSnapshot = await getDocs(simpleQuery);
    results.simpleQuery = {
      success: true,
      count: simpleSnapshot.size,
      tasks: simpleSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    };
    console.log('✅ Simple query successful:', simpleSnapshot.size, 'tasks');
  } catch (error: any) {
    console.error('❌ Simple query failed:', error);
    results.simpleQuery = { success: false, error: error.message };
    results.errors.push(`Simple query: ${error.message}`);
  }
  
  // Test 2: Query with scheduledStart ordering
  try {
    console.log('Test 2: Query with scheduledStart ordering...');
    const orderedQuery = query(tasksRef, orderBy('scheduledStart', 'desc'), limit(5));
    const orderedSnapshot = await getDocs(orderedQuery);
    results.orderedQuery = {
      success: true,
      count: orderedSnapshot.size,
      tasks: orderedSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    };
    console.log('✅ Ordered query successful:', orderedSnapshot.size, 'tasks');
  } catch (error: any) {
    console.error('❌ Ordered query failed:', error);
    results.orderedQuery = { success: false, error: error.message };
    results.errors.push(`Ordered query: ${error.message}`);
    
    // If index error, provide the link
    if (error.message?.includes('index')) {
      console.log('📌 Index required. Check the console for the index creation link.');
    }
  }
  
  // Test 3: Query with client filter (if we have a task ID)
  if (results.simpleQuery?.success && results.simpleQuery.tasks.length > 0) {
    const sampleTask = results.simpleQuery.tasks[0];
    if (sampleTask.clientId) {
      try {
        console.log('Test 3: Query with client filter...');
        const clientQuery = query(
          tasksRef, 
          where('clientId', '==', sampleTask.clientId),
          orderBy('scheduledStart', 'desc')
        );
        const clientSnapshot = await getDocs(clientQuery);
        results.clientQuery = {
          success: true,
          count: clientSnapshot.size,
          clientId: sampleTask.clientId
        };
        console.log('✅ Client query successful:', clientSnapshot.size, 'tasks');
      } catch (error: any) {
        console.error('❌ Client query failed:', error);
        results.clientQuery = { success: false, error: error.message };
        results.errors.push(`Client query: ${error.message}`);
      }
    }
  }
  
  // Field analysis
  if (results.simpleQuery?.success && results.simpleQuery.tasks.length > 0) {
    console.log('\n📊 Field Analysis:');
    const task = results.simpleQuery.tasks[0];
    console.log('Sample task fields:', Object.keys(task));
    console.log('Has scheduledStart:', 'scheduledStart' in task);
    console.log('Has scheduledDate:', 'scheduledDate' in task);
    console.log('scheduledStart value:', task.scheduledStart);
    console.log('scheduledDate value:', task.scheduledDate);
  }
  
  return results;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).debugTaskQueries = debugTaskQueries;
}
