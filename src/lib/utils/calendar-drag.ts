// Drag and drop utilities for calendar
import type { Task } from '$lib/types/task';

export interface DragState {
  task: Task | null;
  sourceDate: string;
  sourceTime: string;
}

export function createDragHandlers(
  onDrop: (task: Task, newDate: string, newTime: string) => void
) {
  let dragState: DragState = {
    task: null,
    sourceDate: '',
    sourceTime: ''
  };

  function handleDragStart(e: DragEvent, task: Task) {
    const taskDate = task.scheduledStart instanceof Date 
      ? task.scheduledStart 
      : task.scheduledStart.toDate();
    
    dragState = {
      task,
      sourceDate: taskDate.toISOString().split('T')[0],
      sourceTime: taskDate.toTimeString().slice(0, 5)
    };
    
    // Set drag data
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', JSON.stringify(dragState));
    
    // Add dragging class to element
    const target = e.target as HTMLElement;
    target.classList.add('opacity-50');
  }

  function handleDragEnd(e: DragEvent) {
    // Remove dragging class
    const target = e.target as HTMLElement;
    target.classList.remove('opacity-50');
    
    // Reset drag state
    dragState = {
      task: null,
      sourceDate: '',
      sourceTime: ''
    };
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    
    // Add visual feedback
    const target = e.currentTarget as HTMLElement;
    target.classList.add('bg-blue-100');
  }

  function handleDragLeave(e: DragEvent) {
    // Remove visual feedback
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('bg-blue-100');
  }

  function handleDrop(e: DragEvent, newDate: string, newTime: string) {
    e.preventDefault();
    
    // Remove visual feedback
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('bg-blue-100');
    
    // Get drag data
    try {
      const data = JSON.parse(e.dataTransfer!.getData('text/plain')) as DragState;
      if (data.task) {
        onDrop(data.task, newDate, newTime);
      }
    } catch (error) {
      console.error('Failed to parse drag data:', error);
    }
  }

  return {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}

// Touch support for mobile devices
export function addTouchSupport(element: HTMLElement, handlers: ReturnType<typeof createDragHandlers>) {
  let touchItem: HTMLElement | null = null;
  let touchOffset = { x: 0, y: 0 };
  
  element.addEventListener('touchstart', (e: TouchEvent) => {
    const touch = e.targetTouches[0];
    touchItem = e.target as HTMLElement;
    
    // Calculate offset
    const rect = touchItem.getBoundingClientRect();
    touchOffset.x = touch.clientX - rect.left;
    touchOffset.y = touch.clientY - rect.top;
    
    // Add visual feedback
    touchItem.classList.add('opacity-50');
  });
  
  element.addEventListener('touchmove', (e: TouchEvent) => {
    if (!touchItem) return;
    e.preventDefault();
    
    const touch = e.targetTouches[0];
    
    // Move the element
    touchItem.style.position = 'fixed';
    touchItem.style.left = `${touch.clientX - touchOffset.x}px`;
    touchItem.style.top = `${touch.clientY - touchOffset.y}px`;
    touchItem.style.zIndex = '1000';
    
    // Find drop target
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    if (dropTarget && dropTarget.classList.contains('calendar-slot')) {
      dropTarget.classList.add('bg-blue-100');
    }
  });
  
  element.addEventListener('touchend', (e: TouchEvent) => {
    if (!touchItem) return;
    
    const touch = e.changedTouches[0];
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Reset visual state
    touchItem.classList.remove('opacity-50');
    touchItem.style.position = '';
    touchItem.style.left = '';
    touchItem.style.top = '';
    touchItem.style.zIndex = '';
    
    // Handle drop
    if (dropTarget && dropTarget.classList.contains('calendar-slot')) {
      const newDate = dropTarget.getAttribute('data-date');
      const newTime = dropTarget.getAttribute('data-time');
      
      if (newDate && newTime) {
        // Trigger drop handler
        const task = JSON.parse(touchItem.getAttribute('data-task') || '{}');
        handlers.handleDrop(new Event('drop') as DragEvent, newDate, newTime);
      }
      
      dropTarget.classList.remove('bg-blue-100');
    }
    
    touchItem = null;
  });
}
