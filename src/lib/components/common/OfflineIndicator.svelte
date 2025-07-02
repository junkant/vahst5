<!-- src/lib/components/common/OfflineIndicator.svelte -->
<!--
  @component OfflineIndicator
  @description Shows offline status and sync queue information
  @usage <OfflineIndicator /> (place in root layout)
-->
<script lang="ts">
  import { fade, slide } from 'svelte/transition';
  import { useOffline } from '$lib/stores/offline.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { browser } from '$app/environment';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const offline = useOffline();
  const auth = useAuth();
  
  let showDetails = $state(false);
  let syncStatus = $state<'idle' | 'syncing' | 'success' | 'error'>('idle');
  let lastSyncTime = $state<Date | null>(null);
  
  // Listen for sync events
  $effect(() => {
    if (!browser) return;
    
    const handleSyncEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { status } = customEvent.detail;
      
      syncStatus = status === 'progress' ? 'syncing' : status;
      
      if (status === 'success') {
        lastSyncTime = new Date();
        // Reset status after 3 seconds
        setTimeout(() => {
          if (syncStatus === 'success') {
            syncStatus = 'idle';
          }
        }, 3000);
      }
    };
    
    window.addEventListener('offline-sync', handleSyncEvent);
    
    return () => {
      window.removeEventListener('offline-sync', handleSyncEvent);
    };
  });
  
  // Update sync status based on store state
  $effect(() => {
    if (offline.isSyncing) {
      syncStatus = 'syncing';
    } else if (offline.hasSyncErrors) {
      syncStatus = 'error';
    } else if (offline.queueLength === 0 && syncStatus === 'syncing') {
      syncStatus = 'success';
      lastSyncTime = new Date();
    }
  });
  
  // Auto-hide details after sync completes
  $effect(() => {
    if (!offline.isSyncing && !offline.hasQueuedOperations && syncStatus === 'success') {
      setTimeout(() => {
        showDetails = false;
      }, 3000);
    }
  });
  
  function formatTime(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }
  
  function formatTimestamp(timestamp: number) {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return formatTime(date);
  }
  
  // Determine what to show - only show when there's something to report
  const shouldShowIndicator = $derived(
    auth.user && (
      !offline.isOnline || 
      offline.hasQueuedOperations || 
      offline.isSyncing ||
      syncStatus === 'success' ||
      syncStatus === 'error'
    )
  );
</script>

{#if shouldShowIndicator}
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
            <Icon name="wifi" class="w-5 h-5 text-orange-500" size={2} />
            <span class="font-medium text-gray-900 dark:text-gray-100">Offline Mode</span>
          {:else if offline.isSyncing || syncStatus === 'syncing'}
            <!-- Refresh Icon (animated) -->
            <Icon name="refresh" class="w-5 h-5 text-blue-500 animate-spin" />
            <span class="font-medium text-gray-900 dark:text-gray-100">Syncing changes...</span>
          {:else if syncStatus === 'success'}
            <!-- Success Icon -->
            <Icon name="checkCircleFilled" class="w-5 h-5 text-green-500" />
            <span class="font-medium text-green-600 dark:text-green-400">All changes synced</span>
          {:else if syncStatus === 'error' || offline.hasSyncErrors}
            <!-- Error Icon -->
            <Icon name="xCircle" class="w-5 h-5 text-red-500" />
            <span class="font-medium text-red-600 dark:text-red-400">Sync errors</span>
          {:else if offline.hasQueuedOperations}
            <!-- Alert Icon -->
            <Icon name="warning" class="w-5 h-5 text-yellow-500" />
            <span class="font-medium text-gray-900 dark:text-gray-100">
              {offline.queueLength} pending {offline.queueLength === 1 ? 'change' : 'changes'}
            </span>
          {/if}
        </div>
        
        <!-- Chevron Icon -->
        <Icon name="chevronDown" class="w-5 h-5 text-gray-400 transition-transform" />
      </button>
      
      <!-- Details Panel -->
      {#if showDetails}
        <div class="border-t border-gray-200 dark:border-gray-700 p-4" transition:slide>
          {#if !offline.isOnline}
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              You're working offline. Changes will sync when you reconnect.
            </p>
          {:else if syncStatus === 'success'}
            <p class="text-sm text-green-600 dark:text-green-400 mb-3">
              Successfully synced all changes.
            </p>
          {/if}
          
          {#if offline.hasQueuedOperations}
            <div class="space-y-2 mb-3">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Pending changes:
              </p>
              {#each offline.offlineQueue.slice(0, 3) as operation}
                <div class="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <span class="capitalize">{operation.type}</span>
                  <span class="text-gray-400">•</span>
                  <span>{operation.collection}</span>
                  <span class="text-gray-400 ml-auto">{formatTimestamp(operation.timestamp)}</span>
                </div>
              {/each}
              {#if offline.queueLength > 3}
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  And {offline.queueLength - 3} more...
                </p>
              {/if}
            </div>
          {/if}
          
          {#if offline.hasSyncErrors}
            <div class="bg-red-50 dark:bg-red-900/20 rounded p-3 mb-3">
              <p class="text-sm font-medium text-red-600 dark:text-red-400">
                {offline.syncErrors.length} operation{offline.syncErrors.length === 1 ? '' : 's'} failed to sync
              </p>
              <div class="space-y-1">
                {#each offline.syncErrors.slice(0, 2) as error}
                  <p class="text-xs text-red-500 dark:text-red-400">{error.message}</p>
                {/each}
              </div>
            </div>
          {/if}
          
          {#if offline.hasConflicts}
            <div class="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
              <p class="text-sm text-orange-600 dark:text-orange-400">
                {offline.conflicts.length} conflict{offline.conflicts.length === 1 ? '' : 's'} need resolution
              </p>
            </div>
          {/if}
          
          {#if lastSyncTime}
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Last synced at {formatTime(lastSyncTime)}
            </p>
          {/if}
          
          {#if offline.backgroundSyncSupported}
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <Icon name="checkCircleFilled" class="w-3 h-3" />
              Background sync enabled
            </p>
          {/if}
          
          <div class="mt-3 flex gap-2">
            {#if offline.isOnline && offline.hasQueuedOperations && !offline.isSyncing}
              <button
                class="flex-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
                onclick={() => offline.processQueue()}
                type="button"
              >
                Retry Sync
              </button>
            {/if}
            
            {#if offline.hasSyncErrors}
              <button
                class="flex-1 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
                onclick={() => offline.clearQueue()}
                type="button"
              >
                Clear Queue
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}