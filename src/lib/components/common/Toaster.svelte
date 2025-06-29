<!-- src/lib/components/common/Toaster.svelte -->
<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { toasterStates, toast } from '$lib/utils/toast';
  
  const { toasts } = toasterStates;
  
  function getStyles(type: string) {
    const base = 'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm';
    
    switch (type) {
      case 'success':
        return {
          container: `${base} bg-green-50/95 text-green-900 border-green-200`,
          icon: 'text-green-600',
          path: 'M5 13l4 4L19 7'
        };
      case 'error':
        return {
          container: `${base} bg-red-50/95 text-red-900 border-red-200`,
          icon: 'text-red-600',
          path: 'M6 18L18 6M6 6l12 12'
        };
      case 'warning':
        return {
          container: `${base} bg-yellow-50/95 text-yellow-900 border-yellow-200`,
          icon: 'text-yellow-600',
          path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
        };
      default:
        return {
          container: `${base} bg-blue-50/95 text-blue-900 border-blue-200`,
          icon: 'text-blue-600',
          path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        };
    }
  }
</script>

<!-- Toast Container -->
<div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
  {#each $toasts as toastItem (toastItem.id)}
    {@const styles = getStyles(toastItem.data.type)}
    <div
      animate:flip={{ duration: 200 }}
      in:fly={{ x: 100, duration: 200 }}
      out:fade={{ duration: 150 }}
      class="{styles.container} max-w-sm"
    >
      <!-- Icon -->
      <svg 
        class="w-5 h-5 flex-shrink-0 {styles.icon}" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d={styles.path} 
        />
      </svg>
      
      <!-- Message -->
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium break-words">
          {toastItem.data.message}
        </p>
      </div>
      
      <!-- Close button -->
      <button
        onclick={() => toast.remove(toastItem.id)}
        class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors rounded p-0.5 hover:bg-black/5"
        aria-label="Dismiss notification"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/each}
</div>