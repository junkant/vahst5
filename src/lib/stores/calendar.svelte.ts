import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

// Business hours configuration
export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  start: string; // "09:00"
  end: string;   // "17:00"
  enabled: boolean;
}

// Calendar settings
export interface CalendarSettings {
  timeSlotDuration: 15 | 30 | 60; // minutes
  businessHours: BusinessHours;
  bufferTime: number; // minutes between appointments
  defaultAppointmentDuration: number; // minutes
}

// Scheduled task with time information
export interface ScheduledTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  updatedAt?: number;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  clientId?: string;
  tenantId?: string;
  scheduledDate: string; // ISO date string
  scheduledTime: string; // "14:30"
  duration: number; // minutes
  clientName?: string;
  clientPhone?: string;
  notes?: string;
  description?: string;
  location?: string;
  assignedTo?: string;
  assignedToName?: string;
}

// Default business hours (9 AM - 5 PM, Mon-Fri)
const defaultBusinessHours: BusinessHours = {
  monday: { start: "09:00", end: "17:00", enabled: true },
  tuesday: { start: "09:00", end: "17:00", enabled: true },
  wednesday: { start: "09:00", end: "17:00", enabled: true },
  thursday: { start: "09:00", end: "17:00", enabled: true },
  friday: { start: "09:00", end: "17:00", enabled: true },
  saturday: { start: "09:00", end: "12:00", enabled: false },
  sunday: { start: "09:00", end: "12:00", enabled: false }
};

// Create stores with localStorage persistence
function createPersistedStore<T>(key: string, initialValue: T) {
  // Load from localStorage if available
  const stored = browser ? localStorage.getItem(key) : null;
  const initial = stored ? JSON.parse(stored) : initialValue;
  
  const store = writable<T>(initial);
  
  // Subscribe to changes and save to localStorage
  if (browser) {
    store.subscribe(value => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  }
  
  return store;
}

// Calendar settings store
export const calendarSettings = createPersistedStore<CalendarSettings>('calendar-settings', {
  timeSlotDuration: 60,
  businessHours: defaultBusinessHours,
  bufferTime: 0,
  defaultAppointmentDuration: 60
});

// Scheduled tasks store
export const scheduledTasks = createPersistedStore<ScheduledTask[]>('scheduled-tasks', []);

// Helper functions
export function generateTimeSlots(duration: number, startHour = 0, endHour = 24): string[] {
  const slots: string[] = [];
  const totalMinutes = (endHour - startHour) * 60;
  const slotCount = totalMinutes / duration;
  
  for (let i = 0; i < slotCount; i++) {
    const minutes = (startHour * 60) + (i * duration);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
  }
  
  return slots;
}

export function isTimeSlotAvailable(
  date: string,
  time: string,
  duration: number,
  tasks: ScheduledTask[]
): boolean {
  const slotStart = new Date(`${date}T${time}`);
  const slotEnd = new Date(slotStart.getTime() + duration * 60000);
  
  return !tasks.some(task => {
    const taskStart = new Date(`${task.scheduledDate}T${task.scheduledTime}`);
    const taskEnd = new Date(taskStart.getTime() + task.duration * 60000);
    
    return (slotStart < taskEnd && slotEnd > taskStart);
  });
}

export function getBusinessHoursForDate(date: Date, settings: CalendarSettings): DayHours | null {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof BusinessHours;
  const hours = settings.businessHours[dayName];
  
  return hours.enabled ? hours : null;
}
