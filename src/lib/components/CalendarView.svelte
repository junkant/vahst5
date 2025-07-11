<script lang="ts">
  import { createDatePicker, melt } from '@melt-ui/svelte';
  import { 
    calendarSettings, 
    scheduledTasks, 
    generateTimeSlots,
    getBusinessHoursForDate,
    type ScheduledTask 
  } from '$lib/stores/calendar.svelte';
  import { fade, slide } from 'svelte/transition';
  import SchedulingModal from './SchedulingModal.svelte';
  import { createDragHandlers } from '$lib/utils/calendar-drag';
  import { get } from 'svelte/store';
  
  interface Props {
    viewType?: 'day' | 'week' | 'month';
  }
  
  let { viewType = 'week' }: Props = $props();
  
  // Store values
  let settings = $state(get(calendarSettings));
  let tasks = $state(get(scheduledTasks));
  
  // Subscribe to store changes
  $effect(() => {
    const unsubSettings = calendarSettings.subscribe(value => {
      settings = value;
    });
    const unsubTasks = scheduledTasks.subscribe(value => {
      tasks = value;
    });
    
    return () => {
      unsubSettings();
      unsubTasks();
    };
  });
  
  // Modal state - must use $state for reactivity
  let showModal = $state(false);
  let selectedDate = $state('');
  let selectedTime = $state('');
  let selectedTask = $state<ScheduledTask | null>(null);
  
  // Drag and drop handlers
  const dragHandlers = createDragHandlers((task, newDate, newTime) => {
    // Update task with new date/time
    scheduledTasks.update(tasks => 
      tasks.map(t => 
        t.id === task.id 
          ? { ...t, scheduledDate: newDate, scheduledTime: newTime }
          : t
      )
    );
  });
  
  // Simple date state for navigation
  let currentDate = $state(new Date());
  let currentMonth = $state(currentDate.getMonth());
  let currentYear = $state(currentDate.getFullYear());
  
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
  let timeSlots = $derived(generateTimeSlots(settings.timeSlotDuration, 6, 20)); // 6 AM to 8 PM
  let weekDates = $derived(getWeekDates(currentDate));
  
  // Get tasks for a specific date
  function getTasksForDate(date: Date): ScheduledTask[] {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => task.scheduledDate === dateStr);
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
    const businessHours = getBusinessHoursForDate(date, settings);
    if (!businessHours) return false;
    
    return time >= businessHours.start && time <= businessHours.end;
  }
  
  // Handle task click
  function handleTaskClick(task: ScheduledTask) {
    selectedTask = task;
    selectedDate = task.scheduledDate;
    selectedTime = task.scheduledTime;
    showModal = true;
  }
  
  // Handle time slot click
  function handleTimeSlotClick(date: Date, time: string) {
    selectedTask = null;
    selectedDate = date.toISOString().split('T')[0];
    selectedTime = time;
    showModal = true;
  }
  
  // Month view data
  let monthWeeks = $derived(getMonthDays(currentDate));
</script>

<div class="h-full flex flex-col bg-white">
  <!-- Navigation -->
  <div class="flex items-center justify-between p-4 border-b">
    <button
      onclick={goToPrevious}
      class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      aria-label="Previous"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    
    <h2 class="text-lg font-semibold">
      {currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric',
        ...(viewType === 'day' && { day: 'numeric' })
      })}
    </h2>
    
    <button
      onclick={goToNext}
      class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      aria-label="Next"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>

  <!-- Scheduling Modal -->
  <SchedulingModal 
    bind:open={showModal}
    date={selectedDate}
    time={selectedTime}
    task={selectedTask}
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
          {#each timeSlots as time}
            <div class="grid grid-cols-8 border-b hover:bg-gray-50 group">
              <!-- Time Label -->
              <div class="p-2 text-xs text-gray-500 border-r">
                {formatTime(time)}
              </div>
              
              <!-- Day Slots -->
              {#each weekDates as date}
                {@const dayTasks = getTasksForDate(date).filter(t => t.scheduledTime === time)}
                {@const isBusinessHours = isWithinBusinessHours(date, time)}
                
                <div
                  class="relative p-2 border-r min-h-[60px] text-left transition-colors calendar-slot
                    {isBusinessHours ? 'hover:bg-blue-50 cursor-pointer' : 'bg-gray-50 cursor-not-allowed'}"
                  data-date={date.toISOString().split('T')[0]}
                  data-time={time}
                  onclick={() => isBusinessHours && handleTimeSlotClick(date, time)}
                  ondragover={isBusinessHours ? dragHandlers.handleDragOver : undefined}
                  ondragleave={isBusinessHours ? dragHandlers.handleDragLeave : undefined}
                  ondrop={isBusinessHours ? (e) => dragHandlers.handleDrop(e, date.toISOString().split('T')[0], time) : undefined}
                  onkeydown={(e) => e.key === 'Enter' && isBusinessHours && handleTimeSlotClick(date, time)}
                  role="button"
                  tabindex={isBusinessHours ? 0 : -1}
                  aria-label="Time slot {formatTime(time)} on {date.toLocaleDateString()}"
                >
                  {#each dayTasks as task}
                    <div
                      class="absolute inset-x-1 bg-blue-500 text-white text-xs p-1 rounded cursor-move hover:bg-blue-600 transition-colors"
                      style="height: {(task.duration / settings.timeSlotDuration) * 60}px"
                      draggable="true"
                      data-task={JSON.stringify(task)}
                      onclick={(e) => { e.stopPropagation(); handleTaskClick(task); }}
                      ondragstart={(e) => dragHandlers.handleDragStart(e, task)}
                      ondragend={dragHandlers.handleDragEnd}
                      onkeydown={(e) => e.key === 'Enter' && handleTaskClick(task)}
                      role="button"
                      tabindex="0"
                      aria-label="{task.title} at {formatTime(time)}"
                    >
                      <div class="font-medium truncate">{task.title}</div>
                      {#if task.clientName}
                        <div class="truncate opacity-90">{task.clientName}</div>
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
            {@const dayTasks = getTasksForDate(currentDate).filter(t => t.scheduledTime === time)}
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
                ondragover={isBusinessHours ? dragHandlers.handleDragOver : undefined}
                ondragleave={isBusinessHours ? dragHandlers.handleDragLeave : undefined}
                ondrop={isBusinessHours ? (e) => dragHandlers.handleDrop(e, currentDate.toISOString().split('T')[0], time) : undefined}
                onkeydown={(e) => e.key === 'Enter' && isBusinessHours && handleTimeSlotClick(currentDate, time)}
                role="button"
                tabindex={isBusinessHours ? 0 : -1}
                aria-label="Time slot {formatTime(time)} on {currentDate.toLocaleDateString()}"
              >
                {#if dayTasks.length > 0}
                  {#each dayTasks as task}
                    <div
                      class="bg-blue-500 text-white p-2 rounded mb-2 cursor-move hover:bg-blue-600 transition-colors"
                      draggable="true"
                      data-task={JSON.stringify(task)}
                      onclick={(e) => { e.stopPropagation(); handleTaskClick(task); }}
                      ondragstart={(e) => dragHandlers.handleDragStart(e, task)}
                      ondragend={dragHandlers.handleDragEnd}
                      onkeydown={(e) => e.key === 'Enter' && handleTaskClick(task)}
                      role="button"
                      tabindex="0"
                      aria-label="{task.title} at {formatTime(time)}"
                    >
                      <div class="font-medium">{task.title}</div>
                      {#if task.clientName}
                        <div class="text-sm opacity-90">{task.clientName}</div>
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
      
    {:else}
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
              <div
                class="p-2 text-center rounded-lg hover:bg-gray-100 cursor-pointer min-h-[80px]
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
              </div>
            {/each}
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
