// Calendar voice commands extension
import { goto } from '$app/navigation';
import { scheduledTasks, type ScheduledTask } from '$lib/stores/calendar.svelte';
import { get } from 'svelte/store';

export interface CalendarVoiceCommand {
  patterns: RegExp[];
  action: (matches?: RegExpMatchArray) => void | Promise<void>;
  description: string;
}

// Parse natural language date/time
function parseDateTime(dateStr: string, timeStr: string): { date: string; time: string } | null {
  const today = new Date();
  let targetDate = today;
  
  // Parse relative dates
  if (dateStr.includes('today')) {
    targetDate = today;
  } else if (dateStr.includes('tomorrow')) {
    targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 1);
  } else if (dateStr.includes('monday') || dateStr.includes('tuesday') || 
             dateStr.includes('wednesday') || dateStr.includes('thursday') || 
             dateStr.includes('friday') || dateStr.includes('saturday') || 
             dateStr.includes('sunday')) {
    // Find next occurrence of the day
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.findIndex(day => dateStr.toLowerCase().includes(day));
    const currentDay = today.getDay();
    
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7;
    
    targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
  }
  
  // Parse time
  let hours = 0;
  let minutes = 0;
  
  // Match patterns like "2pm", "2:30pm", "14:30"
  const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    hours = parseInt(timeMatch[1]);
    minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const isPM = timeMatch[3]?.toLowerCase() === 'pm';
    
    if (timeMatch[3]) { // 12-hour format
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    }
  }
  
  const dateISO = targetDate.toISOString().split('T')[0];
  const timeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  return { date: dateISO, time: timeFormatted };
}

export const calendarVoiceCommands: CalendarVoiceCommand[] = [
  // Calendar navigation
  {
    patterns: [/show calendar|open calendar|go to calendar|calendar/i],
    action: () => {
      goto('/calendar');
    },
    description: 'Navigate to calendar'
  },
  {
    patterns: [/show week view|week view|weekly view/i],
    action: () => {
      goto('/calendar?view=week');
    },
    description: 'Show calendar week view'
  },
  {
    patterns: [/show day view|day view|daily view|today's schedule/i],
    action: () => {
      goto('/calendar?view=day');
    },
    description: 'Show calendar day view'
  },
  {
    patterns: [/show month view|month view|monthly view/i],
    action: () => {
      goto('/calendar?view=month');
    },
    description: 'Show calendar month view'
  },
  
  // Scheduling commands
  {
    patterns: [/schedule (.+) (?:on|for) (.+) at (.+)/i],
    action: async (matches) => {
      if (!matches) return;
      
      const taskTitle = matches[1];
      const dateStr = matches[2];
      const timeStr = matches[3];
      
      const parsed = parseDateTime(dateStr, timeStr);
      if (!parsed) {
        // Use speak function if available
        console.log("I couldn't understand that date and time. Try saying something like 'schedule oil change tomorrow at 2pm'");
        return;
      }
      
      // Create a new scheduled task
      const newTask: ScheduledTask = {
        id: crypto.randomUUID(),
        title: taskTitle,
        completed: false,
        createdAt: Date.now(),
        scheduledDate: parsed.date,
        scheduledTime: parsed.time,
        duration: 60, // Default 1 hour
        priority: 'medium',
        tags: ['scheduled']
      };
      
      // Add to scheduled tasks
      scheduledTasks.update(tasks => [...tasks, newTask]);
      
      // Navigate to the calendar on that date
      goto(`/calendar?view=day&date=${parsed.date}`);
      
      console.log(`Scheduled ${taskTitle} for ${parsed.date} at ${parsed.time}`);
    },
    description: 'Schedule a task'
  },
  
  // Query commands
  {
    patterns: [/what's scheduled (?:for|on) (.+)|what do I have (.+)|show schedule (?:for|on) (.+)/i],
    action: (matches) => {
      const dateStr = matches?.[1] || matches?.[2] || matches?.[3];
      if (!dateStr) return;
      
      const parsed = parseDateTime(dateStr, '');
      if (!parsed) return;
      
      goto(`/calendar?view=day&date=${parsed.date}`);
    },
    description: 'Show schedule for a specific day'
  },
  
  // Business settings
  {
    patterns: [/business hours|business settings|schedule settings/i],
    action: () => {
      goto('/settings/business');
    },
    description: 'Open business settings'
  }
];

// Export function to add these commands to the voice store
export function addCalendarVoiceCommands(voiceStore: any) {
  // This would be called from your main voice store to add calendar commands
  // Implementation depends on how your voice store is structured
  console.log('Calendar voice commands ready to be integrated');
}
