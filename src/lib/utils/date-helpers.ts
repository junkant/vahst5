// Date conversion utilities for handling Firestore Timestamps and Date objects

/**
 * Convert various date formats to a JavaScript Date object
 * Handles Date objects, Firestore Timestamps, and date strings
 */
export function toDate(date: any): Date {
  if (!date) {
    return new Date();
  }
  
  if (date instanceof Date) {
    return date;
  }
  
  if (date && typeof date.toDate === 'function') {
    // Firestore Timestamp
    return date.toDate();
  }
  
  if (date && typeof date.seconds === 'number') {
    // Firestore Timestamp-like object
    return new Date(date.seconds * 1000);
  }
  
  // Try to parse as string or number
  return new Date(date);
}

/**
 * Format a date to ISO date string (YYYY-MM-DD)
 */
export function toDateString(date: any): string {
  return toDate(date).toISOString().split('T')[0];
}

/**
 * Format a date to time string (HH:MM)
 */
export function toTimeString(date: any): string {
  return toDate(date).toTimeString().slice(0, 5);
}

/**
 * Check if a value is a valid date
 */
export function isValidDate(date: any): boolean {
  const d = toDate(date);
  return !isNaN(d.getTime());
}
