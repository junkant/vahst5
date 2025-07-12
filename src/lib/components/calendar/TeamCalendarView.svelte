<script lang="ts">
  import { calendarSettings } from '$lib/stores/calendar.svelte';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import type { Task } from '$lib/types/task';
  import type { TeamMember } from '$lib/types/team';
  import { get } from 'svelte/store';
  
  interface Props {
    teamMembers: TeamMember[];
    selectedDate: Date;
  }
  
  let { teamMembers, selectedDate }: Props = $props();
  
  const taskStore = useJobStore();
  const tenant = useTenant();
  const auth = useAuth();
  const settings = get(calendarSettings);
  
  // Generate time slots
  const timeSlots = generateTimeSlots(settings.timeSlotDuration, 6, 20);
  
  // Get tasks for a technician at a specific time
  function getTasksForTechnicianTime(technicianId: string, date: Date, time: string): Task[] {
    const dateStr = date.toISOString().split('T')[0];
    return taskStore.tasks.filter(task => {
      if (!task.assignedTo.includes(technicianId)) return false;
      if (!task.scheduledStart) return false;
      
      const taskDate = task.scheduledStart instanceof Date 
        ? task.scheduledStart 
        : task.scheduledStart.toDate();
      
      const taskDateStr = taskDate.toISOString().split('T')[0];
      const taskTime = taskDate.toTimeString().slice(0, 5);
      
      return taskDateStr === dateStr && taskTime === time;
    });
  }
  
  // Generate time slots
  function generateTimeSlots(duration: number, startHour: number, endHour: number): string[] {
    const slots: string[] = [];
    const totalMinutes = (endHour - startHour) * 60;
    const numSlots = Math.floor(totalMinutes / duration);
    
    for (let i = 0; i < numSlots; i++) {
      const minutes = startHour * 60 + i * duration;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    }
    
    return slots;
  }
  
  // Format time for display
  function formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }
  
  // Get technician availability status
  function getTechnicianStatus(technicianId: string, date: Date, time: string): 'available' | 'busy' | 'unavailable' {
    const tasks = getTasksForTechnicianTime(technicianId, date, time);
    if (tasks.length > 0) return 'busy';
    
    // Check if within business hours
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof settings.businessHours;
    const dayHours = settings.businessHours[dayName];
    if (!dayHours.enabled || time < dayHours.start || time > dayHours.end) {
      return 'unavailable';
    }
    
    return 'available';
  }
  
  // Get task color
  function getTaskColor(task: Task): string {
    switch (task.status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'scheduled':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  }
  
  // Calculate team utilization
  function getTeamUtilization(): number {
    let totalSlots = 0;
    let busySlots = 0;
    
    teamMembers.forEach(member => {
      timeSlots.forEach(time => {
        const status = getTechnicianStatus(member.id, selectedDate, time);
        if (status !== 'unavailable') {
          totalSlots++;
          if (status === 'busy') busySlots++;
        }
      });
    });
    
    return totalSlots > 0 ? Math.round((busySlots / totalSlots) * 100) : 0;
  }
</script>

<div class="bg-white rounded-lg shadow-sm">
  <!-- Header -->
  <div class="p-4 border-b">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">Team Schedule</h3>
        <p class="text-sm text-gray-500">
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div class="text-right">
        <p class="text-sm text-gray-500">Team Utilization</p>
        <p class="text-2xl font-bold text-blue-600">{getTeamUtilization()}%</p>
      </div>
    </div>
  </div>
  
  <!-- Team Grid -->
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead>
        <tr class="border-b">
          <th class="sticky left-0 bg-white p-2 text-left text-sm font-medium text-gray-700">
            Time
          </th>
          {#each teamMembers as member}
            <th class="p-2 text-center min-w-[120px]">
              <div class="text-sm font-medium text-gray-900">{member.name}</div>
              <div class="text-xs text-gray-500">{member.role}</div>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each timeSlots as time}
          <tr class="border-b hover:bg-gray-50">
            <td class="sticky left-0 bg-white p-2 text-sm text-gray-500">
              {formatTime(time)}
            </td>
            {#each teamMembers as member}
              {@const tasks = getTasksForTechnicianTime(member.id, selectedDate, time)}
              {@const status = getTechnicianStatus(member.id, selectedDate, time)}
              <td class="p-1">
                <div class="min-h-[40px] p-1 rounded
                  {status === 'available' ? 'bg-green-50' : 
                   status === 'unavailable' ? 'bg-gray-100' : ''}">
                  {#if tasks.length > 0}
                    {#each tasks as task}
                      <div class="text-xs p-1 rounded text-white truncate {getTaskColor(task)}"
                           title="{task.title} - {task.client?.name}">
                        {task.title}
                      </div>
                    {/each}
                  {:else if status === 'available'}
                    <div class="text-xs text-gray-400 text-center">Available</div>
                  {/if}
                </div>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  
  <!-- Legend -->
  <div class="p-4 border-t">
    <div class="flex items-center gap-4 text-xs">
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 bg-green-50 rounded"></div>
        <span>Available</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 bg-gray-100 rounded"></div>
        <span>Unavailable</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 bg-blue-500 rounded"></div>
        <span>Scheduled</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 bg-yellow-500 rounded"></div>
        <span>In Progress</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 bg-green-500 rounded"></div>
        <span>Completed</span>
      </div>
    </div>
  </div>
</div>
