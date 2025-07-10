// src/lib/utils/taskNumber.ts
// Generate unique task numbers for easy reference

import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '$lib/firebase/config';

interface TaskNumberCounter {
  current: number;
  prefix?: string;
  year: number;
}

/**
 * Generate a unique task number in format: PREFIX-YYYY-NNNN
 * Example: TASK-2025-0001
 */
export async function generateTaskNumber(tenantId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const counterRef = doc(db, `tenants/${tenantId}/counters`, 'taskNumbers');
  
  try {
    const counterSnap = await getDoc(counterRef);
    let counter: TaskNumberCounter;
    
    if (counterSnap.exists()) {
      counter = counterSnap.data() as TaskNumberCounter;
      
      // Reset counter if year changed
      if (counter.year !== currentYear) {
        counter = {
          current: 1,
          prefix: counter.prefix || 'TASK',
          year: currentYear
        };
      } else {
        counter.current += 1;
      }
    } else {
      // Initialize counter
      counter = {
        current: 1,
        prefix: 'TASK',
        year: currentYear
      };
    }
    
    // Update counter in database
    await setDoc(counterRef, counter);
    
    // Format number with leading zeros
    const paddedNumber = counter.current.toString().padStart(4, '0');
    return `${counter.prefix}-${currentYear}-${paddedNumber}`;
    
  } catch (error) {
    console.error('Error generating task number:', error);
    // Fallback to timestamp-based number
    return `TASK-${currentYear}-${Date.now().toString().slice(-6)}`;
  }
}

/**
 * Set custom prefix for task numbers
 */
export async function setTaskNumberPrefix(
  tenantId: string, 
  prefix: string
): Promise<void> {
  const counterRef = doc(db, `tenants/${tenantId}/counters`, 'taskNumbers');
  await updateDoc(counterRef, { prefix });
}

/**
 * Parse task number to extract components
 */
export function parseTaskNumber(taskNumber: string): {
  prefix: string;
  year: number;
  number: number;
} | null {
  const match = taskNumber.match(/^([A-Z]+)-(\d{4})-(\d+)$/);
  if (!match) return null;
  
  return {
    prefix: match[1],
    year: parseInt(match[2]),
    number: parseInt(match[3])
  };
}
