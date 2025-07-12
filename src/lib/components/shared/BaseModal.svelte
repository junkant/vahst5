<!-- src/lib/components/shared/BaseModal.svelte -->
<script lang="ts">
  import { melt } from '@melt-ui/svelte';
  import { createDialog } from '@melt-ui/svelte';
  import { fly, fade } from 'svelte/transition';
  
  interface Props {
    open: boolean;
    title: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    onClose?: () => void;
  }
  
  let { open = $bindable(), title, size = 'md', onClose }: Props = $props();
  
  const {
    elements: { trigger, overlay, content, close, portalled },
    states: { open: dialogOpen }
  } = createDialog({
    forceVisible: true,
    preventScroll: true
  });
  
  $effect(() => {
    dialogOpen.set(open);
  });
  
  $effect(() => {
    open = $dialogOpen;
  });
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  
  function handleClose() {
    open = false;
    onClose?.();
  }
</script>

{#if open}
  <div use:melt={$portalled}>
    <div 
      use:melt={$overlay}
      class="fixed inset-0 bg-black/50 dark:bg-black/70 z-50"
      transition:fade={{ duration: 150 }}
      onclick={handleClose}
    />
    <div
      use:melt={$content}
      class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
             bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 w-full p-6
             {sizeClasses[size]}"
      transition:fly={{ y: -20, duration: 200 }}
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <button
          use:melt={$close}
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          onclick={handleClose}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="modal-content">
        <slot name="content" />
      </div>
      
      {#if $$slots.actions}
        <div class="mt-6 flex justify-end gap-3">
          <slot name="actions" />
        </div>
      {/if}
    </div>
  </div>
{/if}