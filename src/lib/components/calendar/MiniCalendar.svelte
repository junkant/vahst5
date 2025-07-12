<script lang="ts">
  import { createCalendar, melt } from '@melt-ui/svelte';
  import Icon from '../icons/Icon.svelte';
  
  interface Props {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
  }
  
  let { selectedDate = $bindable(), onDateSelect }: Props = $props();
  
  const {
    elements: { calendar, cell, grid, heading, nextButton, prevButton },
    states: { months, headingValue, weekdays },
    helpers: { isDateDisabled, isDateUnavailable }
  } = createCalendar({
    defaultValue: selectedDate,
    onValueChange: ({ next }) => {
      if (next) {
        selectedDate = next.toDate(getLocalTimeZone());
        onDateSelect(selectedDate);
      }
      return next;
    }
  });
  
  function getLocalTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  
  // Check if a date has tasks
  function hasTasksOnDate(date: Date): boolean {
    // This would be connected to the task store in the parent component
    return false;
  }
</script>

<div class="bg-white rounded-lg shadow-sm p-3 w-64">
  <div use:melt={$calendar}>
    <header class="flex items-center justify-between mb-2">
      <button
        use:melt={$prevButton}
        class="p-1 hover:bg-gray-100 rounded transition-colors"
        aria-label="Previous month"
      >
        <Icon name="chevronLeft" size={16} />
      </button>
      
      <div use:melt={$heading} class="text-sm font-semibold">
        {$headingValue}
      </div>
      
      <button
        use:melt={$nextButton}
        class="p-1 hover:bg-gray-100 rounded transition-colors"
        aria-label="Next month"
      >
        <Icon name="chevronRight" size={16} />
      </button>
    </header>
    
    {#each $months as month}
      <div use:melt={$grid} class="grid grid-cols-7 gap-1">
        {#each $weekdays as weekday}
          <div class="text-xs font-medium text-gray-500 text-center">
            {weekday.slice(0, 2)}
          </div>
        {/each}
        
        {#each month.weeks as week}
          {#each week as date}
            {@const isDisabled = $isDateDisabled(date)}
            {@const isUnavailable = $isDateUnavailable(date)}
            {@const isToday = date.toDate(getLocalTimeZone()).toDateString() === new Date().toDateString()}
            {@const isSelected = date.toDate(getLocalTimeZone()).toDateString() === selectedDate.toDateString()}
            
            <div
              use:melt={$cell(date)}
              class="relative p-1"
            >
              <button
                class="w-full aspect-square text-xs rounded-full transition-colors
                  {isDisabled || isUnavailable ? 'text-gray-300 cursor-not-allowed' : ''}
                  {!isDisabled && !isUnavailable && !isSelected ? 'hover:bg-gray-100' : ''}
                  {isToday && !isSelected ? 'font-semibold text-blue-600' : ''}
                  {isSelected ? 'bg-blue-600 text-white font-semibold' : ''}"
                disabled={isDisabled || isUnavailable}
              >
                {date.day}
              </button>
            </div>
          {/each}
        {/each}
      </div>
    {/each}
  </div>
</div>
