// Calendar-Task synchronization service
import { get } from 'svelte/store';
import { scheduledTasks, type ScheduledTask } from '$lib/stores/calendar.svelte';
import { useJobStore } from '$lib/stores/task.svelte';
import type { Task, CreateTaskInput } from '$lib/types/task';

class CalendarTaskSync {
  private jobStore = useJobStore();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor() {
    // Start sync when service is created
    this.startSync();
  }
  
  // Start automatic sync
  startSync() {
    // Initial sync
    this.syncCalendarToTasks();
    
    // Subscribe to calendar changes
    scheduledTasks.subscribe(() => {
      this.syncCalendarToTasks();
    });
  }
  
  // Convert calendar appointment to task
  private calendarToTask(appointment: ScheduledTask): CreateTaskInput {
    const scheduledStart = new Date(`${appointment.scheduledDate}T${appointment.scheduledTime}`);
    const scheduledEnd = new Date(scheduledStart.getTime() + appointment.duration * 60000);
    
    return {
      clientId: appointment.clientId || '',
      title: appointment.title,
      description: appointment.notes,
      serviceType: 'General Service', // Default, could be enhanced
      priority: appointment.priority || 'normal',
      scheduledStart,
      scheduledEnd,
      assignedTo: appointment.assignedTo ? [appointment.assignedTo] : [],
      address: appointment.location ? { street: appointment.location, city: '', state: '', zip: '' } : undefined,
      customFields: {
        calendarId: appointment.id,
        isCalendarAppointment: true
      }
    };
  }
  
  // Convert task to calendar appointment
  private taskToCalendar(task: Task): ScheduledTask | null {
    // Only sync scheduled tasks that have dates
    if (!task.scheduledStart || task.status === 'draft') {
      return null;
    }
    
    const scheduledDate = task.scheduledStart instanceof Date 
      ? task.scheduledStart 
      : task.scheduledStart.toDate();
      
    const scheduledEnd = task.scheduledEnd instanceof Date
      ? task.scheduledEnd
      : task.scheduledEnd?.toDate();
    
    const duration = scheduledEnd 
      ? Math.round((scheduledEnd.getTime() - scheduledDate.getTime()) / 60000)
      : 60; // Default 1 hour
    
    return {
      id: task.id,
      title: task.title,
      completed: task.status === 'completed' || task.status === 'paid',
      createdAt: task.createdAt instanceof Date ? task.createdAt.getTime() : Date.now(),
      updatedAt: task.updatedAt instanceof Date ? task.updatedAt.getTime() : Date.now(),
      priority: task.priority === 'emergency' ? 'high' : task.priority,
      tags: ['synced', task.serviceType],
      clientId: task.clientId,
      tenantId: task.tenantId,
      scheduledDate: scheduledDate.toISOString().split('T')[0],
      scheduledTime: scheduledDate.toTimeString().slice(0, 5),
      duration,
      clientName: task.client?.name,
      clientPhone: task.client?.phone,
      notes: task.description,
      location: task.address ? `${task.address.street}, ${task.address.city}` : undefined,
      assignedTo: task.leadTechnician || task.assignedTo?.[0],
      assignedToName: task.assignedToNames?.[0]
    };
  }
  
  // Sync calendar appointments to task system
  async syncCalendarToTasks() {
    const appointments = get(scheduledTasks);
    const tasks = this.jobStore.tasks;
    
    for (const appointment of appointments) {
      // Skip if no client ID
      if (!appointment.clientId) {
        console.log('Skipping appointment without client:', appointment.title);
        continue;
      }
      
      // Check if this appointment already exists as a task
      const existingTask = tasks.find(t => 
        t.customFields?.calendarId === appointment.id ||
        t.id === appointment.id
      );
      
      if (!existingTask) {
        // Create new task from appointment
        try {
          const taskData = this.calendarToTask(appointment);
          console.log('Creating task from appointment:', taskData);
          await this.jobStore.createTask(taskData);
          console.log('Created task from calendar appointment:', appointment.title);
        } catch (error) {
          console.error('Failed to create task from appointment:', error);
        }
      } else if (existingTask) {
        // Update existing task if needed
        const taskDate = existingTask.scheduledStart instanceof Date 
          ? existingTask.scheduledStart 
          : existingTask.scheduledStart.toDate();
          
        const appointmentDate = new Date(`${appointment.scheduledDate}T${appointment.scheduledTime}`);
        
        // Check if schedule changed
        if (taskDate.getTime() !== appointmentDate.getTime()) {
          try {
            await this.jobStore.updateTask(existingTask.id, {
              scheduledStart: appointmentDate,
              scheduledEnd: new Date(appointmentDate.getTime() + appointment.duration * 60000)
            });
            console.log('Updated task schedule from calendar:', appointment.title);
          } catch (error) {
            console.error('Failed to update task:', error);
          }
        }
      }
    }
  }
  
  // Sync tasks to calendar
  syncTasksToCalendar() {
    const tasks = this.jobStore.tasks;
    const appointments = get(scheduledTasks);
    
    // Get all scheduled tasks
    const scheduledTasksToSync = tasks
      .filter(t => t.status === 'scheduled' && t.scheduledStart)
      .map(t => this.taskToCalendar(t))
      .filter(Boolean) as ScheduledTask[];
    
    // Update calendar with tasks
    const appointmentIds = new Set(appointments.map(a => a.id));
    const tasksToAdd = scheduledTasksToSync.filter(t => !appointmentIds.has(t.id));
    
    if (tasksToAdd.length > 0) {
      scheduledTasks.update(current => [...current, ...tasksToAdd]);
      console.log(`Added ${tasksToAdd.length} tasks to calendar`);
    }
  }
  
  // Update task status when calendar appointment is marked complete
  async updateTaskCompletion(appointmentId: string, completed: boolean) {
    const task = this.jobStore.tasks.find(t => 
      t.customFields?.calendarId === appointmentId ||
      t.id === appointmentId
    );
    
    if (task) {
      const newStatus = completed ? 'completed' : 'scheduled';
      if (task.status !== newStatus) {
        await this.jobStore.updateTaskStatus(task.id, newStatus);
      }
    }
  }
  
  // Delete task when calendar appointment is deleted
  async deleteTaskFromCalendar(appointmentId: string) {
    const task = this.jobStore.tasks.find(t => 
      t.customFields?.calendarId === appointmentId ||
      t.id === appointmentId
    );
    
    if (task && task.customFields?.isCalendarAppointment) {
      // Only delete if it was created from calendar
      await this.jobStore.deleteTask(task.id);
    }
  }
  
  // Clean up
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Create singleton instance
let syncService: CalendarTaskSync | null = null;

export function getCalendarTaskSync(): CalendarTaskSync {
  if (!syncService) {
    syncService = new CalendarTaskSync();
  }
  return syncService;
}

export function destroyCalendarTaskSync() {
  if (syncService) {
    syncService.destroy();
    syncService = null;
  }
}
