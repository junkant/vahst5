<script lang="ts">
  import { fade, slide } from 'svelte/transition';
  import { useOffline } from '$lib/stores/offline.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  
  const offline = useOffline();
  const auth = useAuth();
  
  let showDetails = $state(false);
  
  // Auto-hide details after sync completes
  $effect(() => {
    if (!offline.isSyncing && !offline.hasQueuedOperations) {
      setTimeout(() => {
        showDetails = false;
      }, 3000);
    }
  });
</script>

{#if auth.user && (!offline.isOnline || offline.hasQueuedOperations || offline.isSyncing)}
  <div 
    class="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
    transition:slide
  >
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <!-- Status Bar -->
      <button
        class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onclick={() => showDetails = !showDetails}
        type="button"
      >
        <div class="flex items-center gap-3">
          {#if !offline.isOnline}
            <!-- Wifi Off Icon -->
            <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
            </svg>
            <span class="font-medium text-gray-900 dark:text-gray-100">Offline Mode</span>
          {:else if offline.isSyncing}
            <!-- Refresh Icon (animated) -->
            <svg class="w-5 h-5 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span class="font-medium text-gray-900 dark:text-gray-100">Syncing...</span>
          {:else if offline.hasQueuedOperations}
            <!-- Alert Icon -->
            <svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span class="font-medium text-gray-900 dark:text-gray-100">
              {offline.queueLength} pending {offline.queueLength === 1 ? 'change' : 'changes'}
            </span>
          {/if}
        </div>
        
        <!-- Chevron Icon -->
        <svg
          class="w-5 h-5 text-gray-400 transition-transform"
          class:rotate-180={showDetails}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <!-- Details Panel -->
      {#if showDetails}
        <div class="border-t border-gray-200 dark:border-gray-700 p-4" transition:slide>
          {#if !offline.isOnline}
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              You're working offline. Changes will sync when you reconnect.
            </p>
          {/if}
          
          {#if offline.hasQueuedOperations}
            <div class="space-y-2">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Pending Operations:
              </p>
              <div class="max-h-32 overflow-y-auto space-y-1">
                {#each offline.queue as operation}
                  <div class="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <span class="capitalize">{operation.type}</span>
                    <span class="text-gray-400">•</span>
                    <span>{operation.collection}</span>
                    {#if operation.retries > 0}
                      <span class="text-orange-500">(retry {operation.retries})</span>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}
          
          {#if offline.hasSyncErrors}
            <div class="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded">
              <p class="text-sm text-red-600 dark:text-red-400">
                {offline.syncErrors.length} operation{offline.syncErrors.length === 1 ? '' : 's'} failed to sync
              </p>
            </div>
          {/if}
          
          {#if offline.isOnline && offline.hasQueuedOperations && !offline.isSyncing}
            <button
              class="mt-3 w-full px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
              onclick={() => offline.processQueue()}
              type="button"
            >
              Retry Sync
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- Simple connection status indicator -->
{#if auth.user && offline.isOnline && !offline.hasQueuedOperations && !offline.isSyncing}
  <div 
    class="fixed bottom-20 right-4 p-2"
    transition:fade
  >
    <div class="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
      <!-- Wifi Icon -->
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
      <span>Connected</span>
    </div>
  </div>
{/if}