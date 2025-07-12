// Utility functions for recurring tasks

export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';

export function formatRecurrencePattern(pattern: RecurrencePattern): string {
  switch (pattern) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      return 'Every week';
    case 'biweekly':
      return 'Every 2 weeks';
    case 'monthly':
      return 'Every month';
    case 'quarterly':
      return 'Every 3 months';
    case 'annually':
      return 'Every year';
    default:
      return 'Unknown pattern';
  }
}

export function getNextOccurrenceDate(
  startDate: Date,
  pattern: RecurrencePattern,
  occurrence: number
): Date {
  const date = new Date(startDate);
  
  switch (pattern) {
    case 'daily':
      date.setDate(date.getDate() + occurrence);
      break;
    case 'weekly':
      date.setDate(date.getDate() + (occurrence * 7));
      break;
    case 'biweekly':
      date.setDate(date.getDate() + (occurrence * 14));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + occurrence);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + (occurrence * 3));
      break;
    case 'annually':
      date.setFullYear(date.getFullYear() + occurrence);
      break;
  }
  
  return date;
}

export function createRecurringTasks(
  baseTask: any,
  pattern: RecurrencePattern,
  occurrences: number
): any[] {
  const tasks = [];
  const seriesId = `series_${Date.now()}`;
  
  for (let i = 0; i < occurrences; i++) {
    const scheduledStart = getNextOccurrenceDate(baseTask.scheduledStart, pattern, i);
    const scheduledEnd = getNextOccurrenceDate(baseTask.scheduledEnd, pattern, i);
    
    tasks.push({
      ...baseTask,
      scheduledStart,
      scheduledEnd,
      customFields: {
        ...baseTask.customFields,
        recurringSeriesId: seriesId,
        recurrencePattern: pattern,
        occurrenceNumber: i + 1,
        totalOccurrences: occurrences
      }
    });
  }
  
  return tasks;
}

export function formatSchedulingConflict(conflicts: any[]): string {
  if (conflicts.length === 0) return '';
  
  if (conflicts.length === 1) {
    const conflict = conflicts[0];
    return `This time conflicts with "${conflict.title}" scheduled at ${conflict.scheduledStart.toLocaleTimeString()}`;
  }
  
  return `This time conflicts with ${conflicts.length} other appointments`;
}
