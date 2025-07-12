// Calendar conflict detection utilities
import type { Task } from '$lib/types/task';
import type { CalendarSettings } from '$lib/stores/calendar.svelte';

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingTasks: Task[];
  overlappingMinutes: number;
}

// Convert time string (HH:MM) to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes since midnight to time string (HH:MM)
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Check if two time slots overlap
export function timeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  return slot1.start < slot2.end && slot1.end > slot2.start;
}

// Get conflict information for a specific time slot
export function getConflictsForSlot(
  tasks: Task[],
  date: string,
  startTime: string,
  duration: number, // in minutes
  excludeTaskId?: string
): ConflictInfo {
  const slotStart = new Date(`${date}T${startTime}`);
  const slotEnd = new Date(slotStart.getTime() + duration * 60000);
  
  const conflictingTasks = tasks.filter(task => {
    // Skip the task we're checking (for rescheduling)
    if (excludeTaskId && task.id === excludeTaskId) return false;
    
    // Skip tasks without scheduled times
    if (!task.scheduledStart || !task.scheduledEnd) return false;
    
    const taskStart = task.scheduledStart instanceof Date 
      ? task.scheduledStart 
      : task.scheduledStart.toDate();
    const taskEnd = task.scheduledEnd instanceof Date 
      ? task.scheduledEnd 
      : task.scheduledEnd.toDate();
    
    // Check if dates match
    if (taskStart.toDateString() !== slotStart.toDateString()) return false;
    
    // Check for time overlap
    return timeSlotsOverlap(
      { start: slotStart, end: slotEnd },
      { start: taskStart, end: taskEnd }
    );
  });
  
  // Calculate total overlapping time
  let overlappingMinutes = 0;
  conflictingTasks.forEach(task => {
    const taskStart = task.scheduledStart instanceof Date 
      ? task.scheduledStart 
      : task.scheduledStart.toDate();
    const taskEnd = task.scheduledEnd instanceof Date 
      ? task.scheduledEnd 
      : task.scheduledEnd.toDate();
    
    const overlapStart = Math.max(slotStart.getTime(), taskStart.getTime());
    const overlapEnd = Math.min(slotEnd.getTime(), taskEnd.getTime());
    overlappingMinutes += Math.round((overlapEnd - overlapStart) / 60000);
  });
  
  return {
    hasConflict: conflictingTasks.length > 0,
    conflictingTasks,
    overlappingMinutes
  };
}

// Check if a time slot is within business hours
export function isWithinBusinessHours(
  date: string,
  time: string,
  duration: number,
  settings: CalendarSettings
): boolean {
  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof settings.businessHours;
  const dayHours = settings.businessHours[dayName];
  
  if (!dayHours.enabled) return false;
  
  const slotStartMinutes = timeToMinutes(time);
  const slotEndMinutes = slotStartMinutes + duration;
  const businessStartMinutes = timeToMinutes(dayHours.start);
  const businessEndMinutes = timeToMinutes(dayHours.end);
  
  return slotStartMinutes >= businessStartMinutes && slotEndMinutes <= businessEndMinutes;
}

// Get available time slots for a date
export function getAvailableSlots(
  tasks: Task[],
  date: string,
  settings: CalendarSettings,
  minDuration: number = 30 // minimum slot duration in minutes
): TimeSlot[] {
  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof settings.businessHours;
  const dayHours = settings.businessHours[dayName];
  
  if (!dayHours.enabled) return [];
  
  // Get all tasks for this date
  const dayTasks = tasks.filter(task => {
    if (!task.scheduledStart) return false;
    const taskDate = task.scheduledStart instanceof Date 
      ? task.scheduledStart 
      : task.scheduledStart.toDate();
    return taskDate.toDateString() === dateObj.toDateString();
  });
  
  // Sort tasks by start time
  dayTasks.sort((a, b) => {
    const aStart = a.scheduledStart instanceof Date ? a.scheduledStart : a.scheduledStart.toDate();
    const bStart = b.scheduledStart instanceof Date ? b.scheduledStart : b.scheduledStart.toDate();
    return aStart.getTime() - bStart.getTime();
  });
  
  const availableSlots: TimeSlot[] = [];
  const businessStart = new Date(`${date}T${dayHours.start}`);
  const businessEnd = new Date(`${date}T${dayHours.end}`);
  
  let currentTime = businessStart;
  
  // Check for slots between tasks
  for (const task of dayTasks) {
    const taskStart = task.scheduledStart instanceof Date 
      ? task.scheduledStart 
      : task.scheduledStart.toDate();
    const taskEnd = task.scheduledEnd instanceof Date 
      ? task.scheduledEnd 
      : task.scheduledEnd.toDate();
    
    // If there's a gap before this task
    if (taskStart.getTime() - currentTime.getTime() >= minDuration * 60000) {
      availableSlots.push({
        start: new Date(currentTime),
        end: new Date(taskStart.getTime() - settings.bufferTime * 60000)
      });
    }
    
    // Update current time to after this task (plus buffer)
    currentTime = new Date(taskEnd.getTime() + settings.bufferTime * 60000);
  }
  
  // Check for slot after last task
  if (businessEnd.getTime() - currentTime.getTime() >= minDuration * 60000) {
    availableSlots.push({
      start: new Date(currentTime),
      end: businessEnd
    });
  }
  
  return availableSlots;
}

// Find the next available slot from a given date/time
export function findNextAvailableSlot(
  tasks: Task[],
  startDate: Date,
  duration: number,
  settings: CalendarSettings,
  maxDaysToSearch: number = 30
): TimeSlot | null {
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < maxDaysToSearch; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const availableSlots = getAvailableSlots(tasks, dateStr, settings, duration);
    
    for (const slot of availableSlots) {
      const slotDuration = (slot.end.getTime() - slot.start.getTime()) / 60000;
      if (slotDuration >= duration) {
        // If this is today and the slot has already passed, skip it
        if (i === 0 && slot.start < startDate) {
          continue;
        }
        
        return {
          start: slot.start,
          end: new Date(slot.start.getTime() + duration * 60000)
        };
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return null;
}

// Get calendar statistics for a date range
// Check for scheduling conflicts when creating/updating a task
export function checkSchedulingConflicts(
  start: Date,
  end: Date,
  existingTasks: Task[],
  technicianId?: string,
  excludeTaskId?: string
): { hasConflict: boolean; message?: string; conflicts: Task[] } {
  const conflicts = existingTasks.filter(task => {
    // Skip the task being edited
    if (excludeTaskId && task.id === excludeTaskId) return false;
    
    // Skip if not assigned to the same technician (if specified)
    if (technicianId && !task.assignedTo.includes(technicianId)) return false;
    
    // Skip tasks without scheduled times
    if (!task.scheduledStart || !task.scheduledEnd) return false;
    
    const taskStart = task.scheduledStart instanceof Date 
      ? task.scheduledStart 
      : task.scheduledStart.toDate();
    const taskEnd = task.scheduledEnd instanceof Date 
      ? task.scheduledEnd 
      : task.scheduledEnd.toDate();
    
    // Check for overlap
    return timeSlotsOverlap(
      { start, end },
      { start: taskStart, end: taskEnd }
    );
  });
  
  if (conflicts.length === 0) {
    return { hasConflict: false, conflicts: [] };
  }
  
  const message = conflicts.length === 1
    ? `Conflicts with "${conflicts[0].title}" at ${conflicts[0].scheduledStart instanceof Date ? conflicts[0].scheduledStart.toLocaleTimeString() : conflicts[0].scheduledStart.toDate().toLocaleTimeString()}`
    : `Conflicts with ${conflicts.length} other tasks`;
  
  return {
    hasConflict: true,
    message,
    conflicts
  };
}

// Format conflict message for display
export function formatConflictMessage(conflicts: Task[]): string {
  if (conflicts.length === 0) return '';
  
  if (conflicts.length === 1) {
    const conflict = conflicts[0];
    const time = conflict.scheduledStart instanceof Date 
      ? conflict.scheduledStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : conflict.scheduledStart.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `This time conflicts with "${conflict.title}" scheduled at ${time}`;
  }
  
  return `This time conflicts with ${conflicts.length} other appointments`;
}

export function getCalendarStats(
  tasks: Task[],
  startDate: Date,
  endDate: Date,
  settings: CalendarSettings
): {
  totalTasks: number;
  totalHours: number;
  utilizationRate: number;
  busiestDay: { date: Date; taskCount: number };
  averageTasksPerDay: number;
} {
  const daysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const tasksByDay = new Map<string, Task[]>();
  let totalMinutes = 0;
  let totalAvailableMinutes = 0;
  
  // Group tasks by day
  tasks.forEach(task => {
    if (!task.scheduledStart || !task.scheduledEnd) return;
    
    const taskStart = task.scheduledStart instanceof Date 
      ? task.scheduledStart 
      : task.scheduledStart.toDate();
    
    if (taskStart >= startDate && taskStart <= endDate) {
      const dateKey = taskStart.toDateString();
      if (!tasksByDay.has(dateKey)) {
        tasksByDay.set(dateKey, []);
      }
      tasksByDay.get(dateKey)!.push(task);
      
      const taskEnd = task.scheduledEnd instanceof Date 
        ? task.scheduledEnd 
        : task.scheduledEnd.toDate();
      totalMinutes += (taskEnd.getTime() - taskStart.getTime()) / 60000;
    }
  });
  
  // Calculate total available minutes
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayName = current.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof settings.businessHours;
    const dayHours = settings.businessHours[dayName];
    
    if (dayHours.enabled) {
      const startMinutes = timeToMinutes(dayHours.start);
      const endMinutes = timeToMinutes(dayHours.end);
      totalAvailableMinutes += endMinutes - startMinutes;
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  // Find busiest day
  let busiestDay = { date: startDate, taskCount: 0 };
  tasksByDay.forEach((tasks, dateStr) => {
    if (tasks.length > busiestDay.taskCount) {
      busiestDay = { date: new Date(dateStr), taskCount: tasks.length };
    }
  });
  
  return {
    totalTasks: tasks.length,
    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    utilizationRate: totalAvailableMinutes > 0 ? Math.round((totalMinutes / totalAvailableMinutes) * 100) : 0,
    busiestDay,
    averageTasksPerDay: Math.round((tasks.length / daysInRange) * 10) / 10
  };
}
