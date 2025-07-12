<script lang="ts">
  import { createDatePicker, melt } from '@melt-ui/svelte';
  import { 
    calendarSettings, 
    getBusinessHoursForDate
  } from '$lib/stores/calendar.svelte';
  import { fade, slide } from 'svelte/transition';
  import { useTaskCreation } from '$lib/composables/useTaskCreation.svelte';
  import RecurringTaskModal from './calendar/RecurringTaskModal.svelte';
  import CurrentTimeIndicator from './calendar/CurrentTimeIndicator.svelte';
  import MiniCalendar from './calendar/MiniCalendar.svelte';
  import TeamCalendarView from './calendar/TeamCalendarView.svelte';
  import TaskQuickView from './calendar/TaskQuickView.svelte';
  import { getConflictsForSlot, isWithinBusinessHours as checkBusinessHours } from '$lib/utils/calendar-conflicts';
  import { get } from 'svelte/store';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { useClients } from '$lib/stores/client.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useTeam } from '$lib/stores/team.svelte';
  import type { Task } from '$lib/types/task';
  import Icon from './icons/Icon.svelte';
  
  interface Props {
    viewType?: 'day' | 'week' | 'month' | 'team';
  }
  
  let { viewType = 'week' }: Props = $props();
  
  // Store values
  const settings = calendarSettings;
  const taskStore = useJobStore();
  const clients = useClients();
  const tenantStore = useTenant();
  const teamStore = useTeam();
  const taskCreation = useTaskCreation();
  
  // UI state
  let showMiniCalendar = $state(false);
  let showRecurringModal = $state(false);
  let recurringTask = $state<Task | undefined>(undefined);
  let showTeamView = $state(false);
  let showTaskQuickView = $state(false);
  let selectedTask = $state<Task | null>(null);
  
  // Subscribe to tasks based on client selection
  $effect(() => {
    if (tenantStore.current?.id) {
      // Always set tenant first
      taskStore.setTenant(tenantStore.current.id);
      
      // If a client is selected, subscribe to their tasks
      if (clients.selectedClient?.id) {
        console.log('CalendarView - Loading tasks for client:', clients.selectedClient.name);
        taskStore.subscribeToClient(clients.selectedClient.id);
      } else {
        // Load all tasks for the tenant when no client is selected
        console.log('CalendarView - Loading all tasks');
        taskStore.loadMore(); // This loads tasks with pagination
      }
    }
  });
  
  // Get tasks filtered by selected client and scheduled status
  let filteredTasks = $derived(
    taskStore.tasks.filter(task => {
      // Must have a scheduled start date
      if (!task.scheduledStart) return false;
      
      // Filter by client if one is selected
      if (clients.selectedClient && task.clientId !== clients.selectedClient.id) {
        return false;
      }
      
      // Include all tasks with scheduled dates, including drafts
      return ['draft', 'scheduled', 'in_progress', 'completed'].includes(task.status);
    })
  );
  
  // Debug - log task count and sample tasks
  $effect(() => {
    console.log('CalendarView - Selected client:', clients.selectedClient?.name || 'All Clients');
    console.log('CalendarView - Total tasks:', taskStore.tasks.length);
    console.log('CalendarView - Filtered tasks:', filteredTasks.length);
    console.log('CalendarView - Tasks with scheduledStart:', taskStore.tasks.filter(t => t.scheduledStart).length);
    
    // Log first few tasks for debugging
    if (filteredTasks.length > 0) {
      console.log('Sample tasks:');
      filteredTasks.slice(0, 3).forEach(task => {
        const taskDate = task.scheduledStart instanceof Date 
          ? task.scheduledStart 
          : task.scheduledStart.toDate();
        console.log('- Task:', {
          title: task.title,
          date: taskDate.toISOString(),
          dateStr: taskDate.toISOString().split('T')[0],
          timeStr: taskDate.toTimeString().slice(0, 5),
          status: task.status
        });
      });
    }
  });
  
  // Simple date state for navigation
  let currentDate = $state(new Date());
  let currentMonth = $state(new Date().getMonth());
  let currentYear = $state(new Date().getFullYear());
  
  // Update month/year when date changes
  $effect(() => {
    currentMonth = currentDate.getMonth();
    currentYear = currentDate.getFullYear();
  });
  
  // Navigation functions
  function goToPrevious() {
    if (viewType === 'week') {
      currentDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (viewType === 'day') {
      currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      currentDate = new Date(currentYear, currentMonth, 1);
    }
  }
  
  function goToNext() {
    if (viewType === 'week') {
      currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (viewType === 'day') {
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    } else {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      currentDate = new Date(currentYear, currentMonth, 1);
    }
  }
  
  // Reactive variables
  let timeSlots = $derived(generateTimeSlots($settings.timeSlotDuration, 6, 20)); // 6 AM to 8 PM
  let weekDates = $derived(getWeekDates(currentDate));
  
  // Get tasks for a specific date and time slot
  function getTasksForDateTime(date: Date, time: string): Task[] {
    const dateStr = date.toISOString().split('T')[0];
    const [slotHour, slotMinute] = time.split(':').map(Number);
    const slotStartMinutes = slotHour * 60 + slotMinute;
    const slotEndMinutes = slotStartMinutes + $settings.timeSlotDuration;
    
    return filteredTasks.filter(task => {
      if (!task.scheduledStart) return false;
      
      // Handle both Date objects and Firestore Timestamps
      let taskDate: Date;
      if (task.scheduledStart instanceof Date) {
        taskDate = task.scheduledStart;
      } else if (task.scheduledStart && typeof task.scheduledStart.toDate === 'function') {
        taskDate = task.scheduledStart.toDate();
      } else {
        taskDate = new Date(task.scheduledStart);
      }
      
      const taskDateStr = taskDate.toISOString().split('T')[0];
      
      // Check if task is on the same date
      if (taskDateStr !== dateStr) return false;
      
      // Check if task starts within this time slot
      const taskHour = taskDate.getHours();
      const taskMinute = taskDate.getMinutes();
      const taskStartMinutes = taskHour * 60 + taskMinute;
      
      // Task should start within this time slot
      const matches = taskStartMinutes >= slotStartMinutes && taskStartMinutes < slotEndMinutes;
      
      return matches;
    });
  }
  
  // Get tasks for a specific date (month view)
  function getTasksForDate(date: Date): Task[] {
    const dateStr = date.toISOString().split('T')[0];
    return filteredTasks.filter(task => {
      if (!task.scheduledStart) return false;
      
      // Handle both Date objects and Firestore Timestamps
      let taskDate: Date;
      if (task.scheduledStart instanceof Date) {
        taskDate = task.scheduledStart;
      } else if (task.scheduledStart && typeof task.scheduledStart.toDate === 'function') {
        taskDate = task.scheduledStart.toDate();
      } else {
        taskDate = new Date(task.scheduledStart);
      }
      
      const taskDateStr = taskDate.toISOString().split('T')[0];
      return taskDateStr === dateStr;
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
  
  // Get week dates
  function getWeekDates(date: Date): Date[] {
    const week: Date[] = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    
    return week;
  }
  
  // Get month days
  function getMonthDays(date: Date): Date[][] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const weeks: Date[][] = [];
    let week: Date[] = [];
    
    const current = new Date(startDate);
    while (current <= lastDay || week.length > 0) {
      week.push(new Date(current));
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
      current.setDate(current.getDate() + 1);
    }
    
    return weeks;
  }
  
  // Format time for display
  function formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }
  
  // Check if time slot is within business hours
  function isWithinBusinessHours(date: Date, time: string): boolean {
    const businessHours = getBusinessHoursForDate(date, $settings);
    if (!businessHours) return false;
    
    return time >= businessHours.start && time <= businessHours.end;
  }
  
  // Handle task click
  function handleTaskClick(task: Task) {
    selectedTask = task;
    showTaskQuickView = true;
  }
  
  // Handle time slot click
  function handleTimeSlotClick(date: Date, time: string) {
    taskCreation.create({
      initialDate: date.toISOString().split('T')[0],
      initialTime: time
    });
  }
  
  // Month view data
  let monthWeeks = $derived(getMonthDays(currentDate));
  
  // Get task duration in minutes
  function getTaskDuration(task: Task): number {
    if (!task.scheduledStart || !task.scheduledEnd) return 60;
    
    // Handle both Date objects and Firestore Timestamps
    let start: Date;
    if (task.scheduledStart instanceof Date) {
      start = task.scheduledStart;
    } else if (task.scheduledStart && typeof task.scheduledStart.toDate === 'function') {
      start = task.scheduledStart.toDate();
    } else {
      start = new Date(task.scheduledStart);
    }
    
    let end: Date;
    if (task.scheduledEnd instanceof Date) {
      end = task.scheduledEnd;
    } else if (task.scheduledEnd && typeof task.scheduledEnd.toDate === 'function') {
      end = task.scheduledEnd.toDate();
    } else {
      end = new Date(task.scheduledEnd);
    }
      
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }
  
  // Get color based on task status
  function getTaskColor(task: Task): string {
    switch (task.status) {
      case 'completed':
      case 'paid':
        return 'bg-green-500 hover:bg-green-600';
      case 'in_progress':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'scheduled':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'draft':
        return 'bg-gray-400 hover:bg-gray-500';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  }
  
  // Check if task spans multiple time slots
  function getTaskSpan(task: Task): number {
    const duration = getTaskDuration(task);
    return Math.ceil(duration / $settings.timeSlotDuration);
  }
  
  // Check if we should show task in this slot (for multi-slot spanning)
  function shouldShowTaskInSlot(task: Task, slotTime: string): boolean {
    const taskStart = task.scheduledStart instanceof Date 
      ? task.scheduledStart 
      : task.scheduledStart.toDate();
    const taskTime = taskStart.toTimeString().slice(0, 5);
    return taskTime === slotTime;
  }
  
  // Handle recurring task creation
  function handleCreateRecurring(task?: Task) {
    recurringTask = task;
    showRecurringModal = true;
  }
  
  // Handle quick date navigation
  function navigateToDate(date: Date) {
    currentDate = date;
    showMiniCalendar = false;
  }
</script>

<div class="h-full flex flex-col bg-white">
  <!-- Navigation -->
  <div class="p-4 border-b">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <button
          onclick={goToPrevious}
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onclick={goToNext}
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          onclick={() => currentDate = new Date()}
          class="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Today
        </button>
      </div>
      
      <div class="text-center flex-1">
        <h2 class="text-lg font-semibold">
          {currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric',
            ...(viewType === 'day' && { day: 'numeric' })
          })}
        </h2>
        {#if clients.selectedClient}
          <p class="text-sm text-gray-500">Client: {clients.selectedClient.name}</p>
        {:else}
          <p class="text-sm text-gray-500">All Clients</p>
        {/if}
      </div>
      
      <div class="flex items-center gap-2">
        <!-- View Toggle -->
        <div class="flex bg-gray-100 rounded-lg p-1">
          {#each ['day', 'week', 'month', 'team'] as view}
            <button
              onclick={() => viewType = view as any}
              class="px-3 py-1 text-sm font-medium rounded transition-colors
                {viewType === view 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'}"
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          {/each}
        </div>
        
        <!-- Calendar Button -->
        <button
          onclick={() => showMiniCalendar = !showMiniCalendar}
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
          aria-label="Show calendar"
        >
          <Icon name="calendar" size={20} />
        </button>
      </div>
    </div>
    
    <!-- Mini Calendar Popover -->
    {#if showMiniCalendar}
      <div class="absolute right-4 top-16 z-50">
        <MiniCalendar 
          bind:selectedDate={currentDate}
          onDateSelect={navigateToDate}
        />
      </div>
    {/if}
  </div>

  <!-- Recurring Task Modal -->
  <RecurringTaskModal
    bind:open={showRecurringModal}
    task={recurringTask}
    initialDate={currentDate ? new Date(currentDate) : new Date()}
  />
  
  <!-- Task Quick View Modal -->
  <TaskQuickView
    bind:open={showTaskQuickView}
    bind:task={selectedTask}
  />
  
  <!-- Calendar Grid -->
  <div class="flex-1 overflow-auto">
    {#if viewType === 'week'}
      <!-- Week View -->
      <div class="h-full">
        <!-- Day Headers -->
        <div class="grid grid-cols-8 border-b sticky top-0 bg-white z-10">
          <div class="p-2 text-xs font-medium text-gray-500 border-r"></div>
          {#each weekDates as date}
            <div class="p-2 text-center border-r">
              <div class="text-xs font-medium text-gray-500">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div class="text-lg font-semibold {date.toDateString() === new Date().toDateString() ? 'text-blue-600' : ''}">
                {date.getDate()}
              </div>
            </div>
          {/each}
        </div>
        
        <!-- Time Slots -->
        <div class="relative">
          <!-- Current Time Indicator -->
          <CurrentTimeIndicator {timeSlots} startHour={6} />
          
          {#each timeSlots as time}
            <div class="grid grid-cols-8 border-b hover:bg-gray-50 group">
              <!-- Time Label -->
              <div class="p-2 text-xs text-gray-500 border-r">
                {formatTime(time)}
              </div>
              
              <!-- Day Slots -->
              {#each weekDates as date}
                {@const dayTasks = getTasksForDateTime(date, time)}
                {@const isBusinessHours = isWithinBusinessHours(date, time)}
                
                <!-- Debug: Log slot info for first time slot -->
                {#if timeSlots.indexOf(time) === 0 && weekDates.indexOf(date) === 0}
                  {console.log('First slot check:', { 
                    date: date.toISOString().split('T')[0], 
                    time, 
                    dayTasks: dayTasks.length,
                    isBusinessHours 
                  })}
                {/if}
                
                <div
                  class="relative p-2 border-r min-h-[60px] text-left transition-colors calendar-slot
                    {isBusinessHours ? 'hover:bg-blue-50 cursor-pointer' : 'bg-gray-50 cursor-not-allowed'}"
                  data-date={date.toISOString().split('T')[0]}
                  data-time={time}
                  onclick={() => isBusinessHours && handleTimeSlotClick(date, time)}

                  onkeydown={(e) => e.key === 'Enter' && isBusinessHours && handleTimeSlotClick(date, time)}
                  role="button"
                  tabindex={isBusinessHours ? 0 : -1}
                  aria-label="Time slot {formatTime(time)} on {date.toLocaleDateString()}"
                >
                  {#each dayTasks as task}
                    {@const span = getTaskSpan(task)}
                    <div
                      class="absolute inset-x-1 text-white text-xs p-1 rounded cursor-pointer transition-colors {getTaskColor(task)}"
                      style="height: {span * 60 - 4}px; z-index: {10 + dayTasks.indexOf(task)}"
                      onclick={(e) => { e.stopPropagation(); handleTaskClick(task); }}
                      onkeydown={(e) => e.key === 'Enter' && handleTaskClick(task)}
                      oncontextmenu={(e) => { e.preventDefault(); handleCreateRecurring(task); }}
                      role="button"
                      tabindex="0"
                      aria-label="{task.title} at {formatTime(time)}"
                      title="{task.title} - {getTaskDuration(task)} minutes\nRight-click to create recurring"
                    >
                      <div class="flex items-center gap-1">
                        <div class="font-medium truncate flex-1">{task.title}</div>
                        {#if task.priority === 'emergency'}
                          <svg class="w-3 h-3 text-red-200" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                          </svg>
                        {/if}
                        {#if task.customFields?.recurringSeriesId}
                          <Icon name="repeat" size={12} class="text-white/80" />
                        {/if}
                      </div>
                      {#if task.client?.name}
                        <div class="truncate opacity-90">{task.client.name}</div>
                      {/if}
                      {#if span > 1}
                        <div class="text-[10px] opacity-80">{getTaskDuration(task)} min</div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
      
    {:else if viewType === 'day'}
      <!-- Day View -->
      <div class="max-w-2xl mx-auto p-4">
        <div class="space-y-2">
          {#each timeSlots as time}
            {@const dayTasks = getTasksForDateTime(currentDate, time)}
            {@const isBusinessHours = isWithinBusinessHours(currentDate, time)}
            
            <div class="flex gap-4 {!isBusinessHours ? 'opacity-50' : ''}">
              <div class="w-20 text-sm text-gray-500 pt-2">
                {formatTime(time)}
              </div>
              
              <div
                class="flex-1 min-h-[60px] p-3 border rounded-lg text-left transition-colors calendar-slot
                  {isBusinessHours ? 'hover:border-blue-300 hover:bg-blue-50 cursor-pointer' : 'bg-gray-50 cursor-not-allowed'}"
                data-date={currentDate.toISOString().split('T')[0]}
                data-time={time}
                onclick={() => isBusinessHours && handleTimeSlotClick(currentDate, time)}

                onkeydown={(e) => e.key === 'Enter' && isBusinessHours && handleTimeSlotClick(currentDate, time)}
                role="button"
                tabindex={isBusinessHours ? 0 : -1}
                aria-label="Time slot {formatTime(time)} on {currentDate.toLocaleDateString()}"
              >
                {#if dayTasks.length > 0}
                  {#each dayTasks as task}
                    <div
                      class="text-white p-2 rounded mb-2 cursor-pointer transition-colors {getTaskColor(task)}"
                      onclick={(e) => { e.stopPropagation(); handleTaskClick(task); }}
                      onkeydown={(e) => e.key === 'Enter' && handleTaskClick(task)}
                      role="button"
                      tabindex="0"
                      aria-label="{task.title} at {formatTime(time)}"
                    >
                      <div class="font-medium">{task.title}</div>
                      {#if task.client?.name}
                        <div class="text-sm opacity-90">{task.client.name}</div>
                      {/if}
                    </div>
                  {/each}
                {:else if isBusinessHours}
                  <div class="text-gray-400 text-sm">Available</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
      
    {:else if viewType === 'month'}
      <!-- Month View -->
      <div class="p-4">
        <div class="grid grid-cols-7 gap-1">
          <!-- Day headers -->
          <div class="grid grid-cols-7 col-span-7 mb-2">
            {#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
              <div class="text-center text-sm font-medium text-gray-500">{day}</div>
            {/each}
          </div>
          
          <!-- Month days -->
          {#each monthWeeks as week}
            {#each week as day}
              {@const dayTasks = getTasksForDate(day)}
              {@const isCurrentMonth = day.getMonth() === currentDate.getMonth()}
              <button
                type="button"
                class="w-full p-2 text-center rounded-lg hover:bg-gray-100 cursor-pointer min-h-[80px]
                  {!isCurrentMonth ? 'text-gray-400' : ''}
                  {day.toDateString() === new Date().toDateString() ? 'bg-blue-50' : ''}"
                onclick={() => handleTimeSlotClick(day, '09:00')}
              >
                <div class="text-sm font-medium">{day.getDate()}</div>
                {#if dayTasks.length > 0}
                  <div class="mt-1">
                    <div class="text-xs text-blue-600 font-medium">
                      {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                    </div>
                  </div>
                {/if}
              </button>
            {/each}
          {/each}
        </div>
      </div>
      
    {:else if viewType === 'team'}
      <!-- Team View -->
      <div class="p-4">
        {#if teamStore?.members && teamStore.members.length > 0}
          {@const members = teamStore.members}
          <TeamCalendarView 
            teamMembers={members}
            selectedDate={currentDate}
          />
        {:else}
          <div class="text-center py-12">
            <Icon name="users" size={48} class="mx-auto text-gray-400 mb-4" />
            <p class="text-gray-500">No team members found</p>
            <p class="text-sm text-gray-400 mt-2">Add team members in settings to see the team calendar</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
