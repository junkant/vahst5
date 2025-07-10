<!-- src/lib/components/common/Toaster.svelte - COMPLETE FIXED VERSION -->
<!--
  @component Toaster
  @description Optimized toast notification component with animations and interactions
  @usage <Toaster /> (place in root layout)
-->
<script lang="ts">
  import { useToast } from '$lib/stores/toast.svelte';
  import { fly, fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { onMount } from 'svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const toast = useToast();
  
  // Track which toasts are being hovered
  let hoveredToasts = $state(new Set<string>());
  
  // Get icon and styles for toast type
  function getToastStyles(type: string) {
    const styles = {
      success: {
        container: 'bg-green-50 text-green-900 border-green-200',
        icon: 'text-green-600',
        iconPath: 'M5 13l4 4L19 7',
        progressBar: 'bg-green-600'
      },
      error: {
        container: 'bg-red-50 text-red-900 border-red-200',
        icon: 'text-red-600',
        iconPath: 'M6 18L18 6M6 6l12 12',
        progressBar: 'bg-red-600'
      },
      warning: {
        container: 'bg-yellow-50 text-yellow-900 border-yellow-200',
        icon: 'text-yellow-600',
        iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        progressBar: 'bg-yellow-600'
      },
      info: {
        container: 'bg-blue-50 text-blue-900 border-blue-200',
        icon: 'text-blue-600',
        iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        progressBar: 'bg-blue-600'
      }
    };
    
    return styles[type as keyof typeof styles] || styles.info;
  }
  
  // Handle mouse enter/leave for pause on hover
  function handleMouseEnter(toastId: string) {
    hoveredToasts.add(toastId);
    toast.pause(toastId);
  }
  
  function handleMouseLeave(toastId: string) {
    hoveredToasts.delete(toastId);
    toast.resume(toastId);
  }
  
  // Calculate progress for toast
  function calculateProgress(toastItem: any): number {
    if (!toastItem.duration || toastItem.duration <= 0) return 0;
    if (hoveredToasts.has(toastItem.id)) return 100; // Pause progress
    
    const elapsed = Date.now() - toastItem.createdAt;
    const remaining = Math.max(0, toastItem.duration - elapsed);
    return (remaining / toastItem.duration) * 100;
  }
  
  // Cleanup on unmount
  onMount(() => {
    return () => {
      hoveredToasts.clear();
    };
  });
  
  // Handle keyboard dismissal
  function handleKeyDown(event: KeyboardEvent, toastId: string) {
    if (event.key === 'Escape' || event.key === 'Delete') {
      toast.remove(toastId);
    }
  }
</script>

<!-- Toast Container -->
<div 
  class="fixed top-4 right-4 z-[9999] pointer-events-none"
  aria-live="polite"
  aria-label="Notifications"
>
  <div class="flex flex-col gap-2 items-end">
    {#each toast.toasts as toastItem (toastItem.id)}
      {@const styles = getToastStyles(toastItem.type)}
      <div
        animate:flip={{ duration: 200 }}
        in:fly={{ x: 100, duration: 200, opacity: 0 }}
        out:fade={{ duration: 150 }}
        class="relative pointer-events-auto"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div 
          class="flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm 
                 max-w-sm min-w-[300px] {styles.container} relative overflow-hidden"
          onmouseenter={() => toastItem.pauseOnHover && handleMouseEnter(toastItem.id)}
          onmouseleave={() => toastItem.pauseOnHover && handleMouseLeave(toastItem.id)}
        >
          <!-- Progress bar -->
          {#if toastItem.duration && toastItem.duration > 0}
            <div 
              class="absolute bottom-0 left-0 h-1 transition-all duration-100 {styles.progressBar}"
              style="width: {calculateProgress(toastItem)}%"
              aria-hidden="true"
            ></div>
          {/if}
          
          <!-- Icon -->
          <svg 
            class="w-5 h-5 flex-shrink-0 mt-0.5 {styles.icon}" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d={styles.iconPath} 
            />
          </svg>
          
          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium break-words">
              {toastItem.title}
            </p>
            {#if toastItem.description}
              <p class="text-sm opacity-90 mt-1">
                {toastItem.description}
              </p>
            {/if}
            
            {#if toastItem.action}
              <button
                onclick={() => {
                  toastItem.action?.callback();
                  toast.remove(toastItem.id);
                }}
                class="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none 
                       focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
              >
                {toastItem.action.label}
              </button>
            {/if}
          </div>
          
          <!-- Close button -->
          <button
            onclick={() => toast.remove(toastItem.id)}
            onkeydown={(e) => handleKeyDown(e, toastItem.id)}
            class="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors 
                   focus:outline-none focus:ring-2 focus:ring-current"
            aria-label="Dismiss notification"
          >
            <Icon name="close" class="w-4 h-4" />
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  /* Ensure toasts are above all other content */
  :global(.pointer-events-none > *) {
    pointer-events: auto;
  }
  
  /* Smooth progress bar animation */
  @keyframes progress {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
</style>