<script lang="ts">
  import { createDialog, melt } from '@melt-ui/svelte';
  import { fade, fly } from 'svelte/transition';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
  import type { Task, CreateTaskInput } from '$lib/types/task';
  
  interface Props {
    open: boolean;
    task?: Task;
    initialDate?: Date;
  }
  
  let { 
    open = $bindable(), 
    task,
    initialDate = new Date()
  }: Props = $props();
  
  const taskStore = useJobStore();
  const toast = useToast();
  
  // Form state
  let recurrenceType = $state<'daily' | 'weekly' | 'monthly' | 'custom'>('weekly');
  let interval = $state(1);
  let selectedDays = $state<string[]>([]);
  let endType = $state<'never' | 'after' | 'on'>('never');
  let occurrences = $state(10);
  let endDate = $state(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)); // 90 days from now
  let isSubmitting = $state(false);
  
  // Days of week for weekly recurrence
  const daysOfWeek = [
    { value: 'sun', label: 'Sun' },
    { value: 'mon', label: 'Mon' },
    { value: 'tue', label: 'Tue' },
    { value: 'wed', label: 'Wed' },
    { value: 'thu', label: 'Thu' },
    { value: 'fri', label: 'Fri' },
    { value: 'sat', label: 'Sat' }
  ];
  
  // Dialog setup
  const {
    elements: { trigger, overlay, content, title: dialogTitle, close, portalled },
    states: { open: dialogOpen }
  } = createDialog({
    forceVisible: true,
    preventScroll: true,
    onOpenChange: ({ open: isOpen }) => {
      open = isOpen;
    }
  });
  
  // Update dialog when prop changes
  $effect(() => {
    dialogOpen.set(open);
  });
  
  // Initialize selected days based on initial date
  $effect(() => {
    if (open && selectedDays.length === 0) {
      const dayIndex = initialDate.getDay();
      const dayValue = daysOfWeek[dayIndex].value;
      selectedDays = [dayValue];
    }
  });
  
  function toggleDay(day: string) {
    if (selectedDays.includes(day)) {
      selectedDays = selectedDays.filter(d => d !== day);
    } else {
      selectedDays = [...selectedDays, day];
    }
  }
  
  function generateOccurrences(): Date[] {
    const dates: Date[] = [];
    let currentDate = new Date(initialDate);
    let count = 0;
    
    while (
      (endType === 'never' && count < 52) || // Max 1 year for "never"
      (endType === 'after' && count < occurrences) ||
      (endType === 'on' && currentDate <= endDate)
    ) {
      if (recurrenceType === 'daily') {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + interval);
      } else if (recurrenceType === 'weekly') {
        // For weekly, generate for each selected day
        for (const day of selectedDays) {
          const dayIndex = daysOfWeek.findIndex(d => d.value === day);
          const daysUntilNext = (dayIndex - currentDate.getDay() + 7) % 7 || 7;
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + daysUntilNext);
          
          if (
            (endType === 'never' || endType === 'after' || nextDate <= endDate) &&
            dates.length < (endType === 'after' ? occurrences : 52)
          ) {
            dates.push(nextDate);
          }
        }
        currentDate.setDate(currentDate.getDate() + 7 * interval);
      } else if (recurrenceType === 'monthly') {
        dates.push(new Date(currentDate));
        currentDate.setMonth(currentDate.getMonth() + interval);
      }
      
      count++;
      
      // Safety limit
      if (dates.length > 100) break;
    }
    
    // Sort and remove duplicates
    return [...new Set(dates.map(d => d.toISOString()))]
      .map(d => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());
  }
  
  async function handleSubmit() {
    if (!task) return;
    
    if (recurrenceType === 'weekly' && selectedDays.length === 0) {
      toast.error('Please select at least one day of the week');
      return;
    }
    
    isSubmitting = true;
    
    try {
      const occurrenceDates = generateOccurrences();
      
      if (occurrenceDates.length === 0) {
        toast.error('No occurrences generated with the selected pattern');
        return;
      }
      
      // Create tasks for each occurrence
      const promises = occurrenceDates.map(date => {
        const scheduledStart = new Date(date);
        scheduledStart.setHours(
          task.scheduledStart instanceof Date ? task.scheduledStart.getHours() : task.scheduledStart.toDate().getHours(),
          task.scheduledStart instanceof Date ? task.scheduledStart.getMinutes() : task.scheduledStart.toDate().getMinutes()
        );
        
        const duration = task.scheduledEnd && task.scheduledStart
          ? (task.scheduledEnd instanceof Date ? task.scheduledEnd.getTime() : task.scheduledEnd.toDate().getTime()) -
            (task.scheduledStart instanceof Date ? task.scheduledStart.getTime() : task.scheduledStart.toDate().getTime())
          : 60 * 60 * 1000;
        
        const scheduledEnd = new Date(scheduledStart.getTime() + duration);
        
        const taskData: CreateTaskInput = {
          clientId: task.clientId,
          title: task.title,
          description: task.description,
          serviceType: task.serviceType,
          priority: task.priority,
          scheduledStart,
          scheduledEnd,
          assignedTo: task.assignedTo,
          address: task.address,
          customFields: {
            ...task.customFields,
            recurringSeriesId: `series_${Date.now()}`,
            recurrencePattern: {
              type: recurrenceType,
              interval,
              daysOfWeek: selectedDays,
              endType,
              occurrences: endType === 'after' ? occurrences : undefined,
              endDate: endType === 'on' ? endDate : undefined
            }
          }
        };
        
        return taskStore.createTask(taskData);
      });
      
      await Promise.all(promises);
      
      toast.success(`Created ${occurrenceDates.length} recurring tasks`);
      open = false;
    } catch (error) {
      console.error('Error creating recurring tasks:', error);
      toast.error('Failed to create recurring tasks');
    } finally {
      isSubmitting = false;
    }
  }
  
  function getPreviewText(): string {
    let text = 'Repeats ';
    
    if (recurrenceType === 'daily') {
      text += interval === 1 ? 'every day' : `every ${interval} days`;
    } else if (recurrenceType === 'weekly') {
      if (selectedDays.length === 0) return 'Select days of the week';
      const dayNames = selectedDays.map(d => daysOfWeek.find(dw => dw.value === d)?.label).join(', ');
      text += interval === 1 ? `every week on ${dayNames}` : `every ${interval} weeks on ${dayNames}`;
    } else if (recurrenceType === 'monthly') {
      const dayOfMonth = initialDate.getDate();
      text += interval === 1 ? `monthly on the ${dayOfMonth}th` : `every ${interval} months on the ${dayOfMonth}th`;
    }
    
    if (endType === 'after') {
      text += ` for ${occurrences} occurrences`;
    } else if (endType === 'on') {
      text += ` until ${endDate.toLocaleDateString()}`;
    }
    
    return text;
  }
</script>

{#if open}
  <div use:melt={$portalled}>
    <div
      use:melt={$overlay}
      class="fixed inset-0 z-50 bg-black/50"
      transition:fade={{ duration: 150 }}
    ></div>
    <div
      use:melt={$content}
      class="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg overflow-y-auto"
      transition:fly={{ y: -10, duration: 150 }}
    >
      <!-- Header -->
      <div class="flex items-start justify-between mb-6">
        <div>
          <h2 use:melt={$dialogTitle} class="text-lg font-semibold">
            Create Recurring Task
          </h2>
          {#if task}
            <p class="text-sm text-gray-600 mt-1">{task.title}</p>
          {/if}
        </div>
        <button
          use:melt={$close}
          class="rounded-lg p-1 hover:bg-gray-100 transition-colors"
        >
          <Icon name="close" size={20} />
        </button>
      </div>
      
      <!-- Recurrence Pattern -->
      <div class="space-y-4">
        <div>
          <label for="recurrence-type" class="block text-sm font-medium text-gray-700 mb-2">
            Repeat
          </label>
          <div class="grid grid-cols-4 gap-2">
            {#each ['daily', 'weekly', 'monthly', 'custom'] as type}
              <button
                type="button"
                onclick={() => recurrenceType = type as any}
                class="px-3 py-2 text-sm font-medium rounded-md transition-colors
                  {recurrenceType === type 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
                disabled={type === 'custom'}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            {/each}
          </div>
        </div>
        
        <!-- Interval -->
        <div class="flex items-center gap-2">
          <label for="recurrence-interval" class="text-sm font-medium text-gray-700">
            Every
          </label>
          <input
            id="recurrence-interval"
            type="number"
            bind:value={interval}
            min="1"
            max="30"
            class="w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span class="text-sm text-gray-700">
            {recurrenceType === 'daily' ? 'day(s)' : 
             recurrenceType === 'weekly' ? 'week(s)' : 
             'month(s)'}
          </span>
        </div>
        
        <!-- Days of Week (for weekly) -->
        {#if recurrenceType === 'weekly'}
          <div>
            <label for="days-selection" class="block text-sm font-medium text-gray-700 mb-2">
              On these days
            </label>
            <div class="flex gap-1">
              {#each daysOfWeek as day}
                <button
                  type="button"
                  onclick={() => toggleDay(day.value)}
                  class="px-3 py-2 text-sm font-medium rounded-md transition-colors
                    {selectedDays.includes(day.value) 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
                >
                  {day.label}
                </button>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- End Pattern -->
        <div>
          <label for="end-pattern" class="block text-sm font-medium text-gray-700 mb-2">
            Ends
          </label>
          <div class="space-y-3">
            <label class="flex items-center gap-2">
              <input
                type="radio"
                bind:group={endType}
                value="never"
                class="text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm">Never</span>
            </label>
            
            <label class="flex items-center gap-2">
              <input
                type="radio"
                bind:group={endType}
                value="after"
                class="text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm">After</span>
              <input
                type="number"
                bind:value={occurrences}
                min="1"
                max="100"
                disabled={endType !== 'after'}
                class="w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 
                       {endType !== 'after' ? 'opacity-50' : ''}"
              />
              <span class="text-sm">occurrences</span>
            </label>
            
            <label class="flex items-center gap-2">
              <input
                type="radio"
                bind:group={endType}
                value="on"
                class="text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm">On</span>
              <input
                type="date"
                bind:value={endDate}
                min={initialDate.toISOString().split('T')[0]}
                disabled={endType !== 'on'}
                class="px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 
                       {endType !== 'on' ? 'opacity-50' : ''}"
              />
            </label>
          </div>
        </div>
        
        <!-- Preview -->
        <div class="p-4 bg-gray-50 rounded-lg">
          <p class="text-sm font-medium text-gray-700 mb-2">Preview</p>
          <p class="text-sm text-gray-600">{getPreviewText()}</p>
          <p class="text-xs text-gray-500 mt-2">
            Will create {generateOccurrences().length} tasks
          </p>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onclick={() => open = false}
          class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={handleSubmit}
          disabled={isSubmitting || (recurrenceType === 'weekly' && selectedDays.length === 0)}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Creating...' : 'Create Tasks'}
        </button>
      </div>
    </div>
  </div>
{/if}
