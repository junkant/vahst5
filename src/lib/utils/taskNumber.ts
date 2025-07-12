// Task number generation utility
import { db } from '$lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

const COUNTER_COLLECTION = 'counters';
const TASK_COUNTER_DOC = 'tasks';

export async function generateTaskNumber(tenantId: string): Promise<string> {
  const counterRef = doc(db, COUNTER_COLLECTION, `${tenantId}_${TASK_COUNTER_DOC}`);
  
  try {
    // Try to get the current counter
    const counterSnap = await getDoc(counterRef);
    
    if (!counterSnap.exists()) {
      // Initialize counter if it doesn't exist
      await setDoc(counterRef, {
        value: 1,
        createdAt: new Date()
      });
      return formatTaskNumber(tenantId, 1);
    }
    
    // Increment and get the new value
    await updateDoc(counterRef, {
      value: increment(1)
    });
    
    // Get the updated value
    const updatedSnap = await getDoc(counterRef);
    const newValue = updatedSnap.data()?.value || 1;
    
    return formatTaskNumber(tenantId, newValue);
  } catch (error) {
    console.error('Error generating task number:', error);
    // Fallback to timestamp-based number
    return `TASK-${Date.now()}`;
  }
}

function formatTaskNumber(tenantId: string, number: number): string {
  // Get a short prefix from tenant ID (first 3-4 chars)
  const prefix = tenantId.substring(0, 4).toUpperCase();
  
  // Pad the number with zeros
  const paddedNumber = number.toString().padStart(5, '0');
  
  // Return formatted task number
  return `${prefix}-${paddedNumber}`;
}

// Reset counter (for admin use)
export async function resetTaskCounter(tenantId: string): Promise<void> {
  const counterRef = doc(db, COUNTER_COLLECTION, `${tenantId}_${TASK_COUNTER_DOC}`);
  await setDoc(counterRef, {
    value: 0,
    resetAt: new Date()
  });
}
