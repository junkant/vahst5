// src/lib/utils/swipe.ts
// Touch swipe gesture utilities

export interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance for swipe
  restraint?: number; // Maximum perpendicular distance
  allowedTime?: number; // Maximum time for swipe
}

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
  distX: number;
  distY: number;
  elapsedTime: number;
}

export function createSwipeable(
  element: HTMLElement,
  options: SwipeOptions = {}
): { destroy: () => void } {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 100,
    restraint = 100,
    allowedTime = 300
  } = options;
  
  let touchData: TouchData | null = null;
  let startX = 0;
  let currentX = 0;
  let startY = 0;
  let currentY = 0;
  
  function handleTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    startX = touch.pageX;
    startY = touch.pageY;
    currentX = startX;
    currentY = startY;
    
    touchData = {
      startX,
      startY,
      startTime: Date.now(),
      distX: 0,
      distY: 0,
      elapsedTime: 0
    };
    
    element.classList.add('swiping');
  }
  
  function handleTouchMove(e: TouchEvent) {
    if (!touchData) return;
    
    const touch = e.touches[0];
    currentX = touch.pageX;
    currentY = touch.pageY;
    
    touchData.distX = currentX - startX;
    touchData.distY = currentY - startY;
    
    // Add visual feedback
    if (Math.abs(touchData.distX) > Math.abs(touchData.distY)) {
      // Horizontal swipe
      if (touchData.distX > 0) {
        element.classList.add('swiping-right');
        element.classList.remove('swiping-left');
      } else {
        element.classList.add('swiping-left');
        element.classList.remove('swiping-right');
      }
      
      // Apply transform for visual feedback
      const translateX = Math.min(Math.max(touchData.distX * 0.3, -50), 50);
      element.style.transform = `translateX(${translateX}px)`;
    }
  }
  
  function handleTouchEnd(e: TouchEvent) {
    if (!touchData) return;
    
    touchData.elapsedTime = Date.now() - touchData.startTime;
    
    // Reset visual state
    element.classList.remove('swiping', 'swiping-left', 'swiping-right');
    element.style.transform = '';
    
    // Check if it's a valid swipe
    if (touchData.elapsedTime <= allowedTime) {
      // Horizontal swipe
      if (Math.abs(touchData.distX) >= threshold && 
          Math.abs(touchData.distY) <= restraint) {
        if (touchData.distX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
      
      // Vertical swipe
      else if (Math.abs(touchData.distY) >= threshold && 
               Math.abs(touchData.distX) <= restraint) {
        if (touchData.distY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }
    
    touchData = null;
  }
  
  function handleTouchCancel() {
    if (touchData) {
      element.classList.remove('swiping', 'swiping-left', 'swiping-right');
      element.style.transform = '';
      touchData = null;
    }
  }
  
  // Add event listeners
  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchmove', handleTouchMove, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });
  element.addEventListener('touchcancel', handleTouchCancel, { passive: true });
  
  // Cleanup function
  function destroy() {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('touchcancel', handleTouchCancel);
  }
  
  return { destroy };
}

// Directive for use with Svelte's use: syntax
export function swipe(node: HTMLElement, options: SwipeOptions) {
  const { destroy } = createSwipeable(node, options);
  
  return {
    destroy,
    update(newOptions: SwipeOptions) {
      destroy();
      const updated = createSwipeable(node, newOptions);
      destroy = updated.destroy;
    }
  };
}
