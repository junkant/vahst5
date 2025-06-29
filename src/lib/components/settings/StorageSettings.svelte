<!-- src/lib/components/settings/StorageSettings.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { storageMonitor, type StorageInfo } from '$lib/utils/storageMonitor';
  import { localCache } from '$lib/utils/localCache';
  import { useTenant } from '$lib/stores/tenant';
  
  const tenant = useTenant();
  
  let storageInfo = $state<StorageInfo | null>(null);
  let isLoading = $state(true);
  let isClearing = $state(false);
  let clearProgress = $state(0);
  let clearingStore = $state('');
  let isPersistent = $state(false);
  
  onMount(async () => {
    await loadStorageInfo();
    checkPersistence();
  });
  
  async function loadStorageInfo() {
    isLoading = true;
    try {
      storageInfo = await storageMonitor.getStorageInfo();
    } catch (error) {
      console.error('Failed to load storage info:', error);
    } finally {
      isLoading = false;
    }
  }
  
  async function checkPersistence() {
    if (navigator.storage?.persisted) {
      isPersistent = await navigator.storage.persisted();
    }
  }
  
  async function requestPersistence() {
    const granted = await storageMonitor.requestPersistentStorage();
    if (granted) {
      isPersistent = true;
    }
  }
  
  async function clearOldData() {
    if (!confirm('This will remove cached data older than 30 days. Continue?')) {
      return;
    }
    
    isClearing = true;
    clearProgress = 0;
    
    try {
      const deleted = await localCache.cleanOldData((progress, store) => {
        clearProgress = progress;
        clearingStore = store;
      });
      
      alert(`Cleared ${deleted} old items from cache`);
      await loadStorageInfo();
    } catch (error) {
      console.error('Failed to clear old data:', error);
      alert('Failed to clear cache');
    } finally {
      isClearing = false;
      clearProgress = 0;
      clearingStore = '';
    }
  }
  
  async function clearAllCache() {
    if (!confirm('This will clear ALL cached data. You will need to sync again when online. Continue?')) {
      return;
    }
    
    isClearing = true;
    
    try {
      await storageMonitor.clearCache('all');
      alert('Cache cleared successfully');
      await loadStorageInfo();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache');
    } finally {
      isClearing = false;
    }
  }
  
  function getUsageColor(percentage: number): string {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div class="space-y-0.5">
      <h2 class="text-2xl font-bold tracking-tight">Storage Management</h2>
      <p class="text-gray-600">
        Manage your offline data and cache storage
      </p>
    </div>
    <button
      class="btn-secondary text-sm"
      onclick={loadStorageInfo}
      disabled={isLoading}
    >
      <svg class="h-4 w-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Refresh
    </button>
  </div>

  {#if isLoading}
    <div class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  {:else if storageInfo}
    <!-- Storage Overview -->
    <div class="rounded-lg border p-6 space-y-4">
      <h3 class="text-lg font-medium">Storage Usage</h3>
      
      <div class="space-y-2">
        <div class="flex justify-between text-sm">
          <span>Used</span>
          <span class="font-medium">
            {storageMonitor.formatBytes(storageInfo.used)} / {storageMonitor.formatBytes(storageInfo.quota)}
          </span>
        </div>
        
        <div class="w-full bg-gray-200 rounded-full h-3">
          <div 
            class="h-3 rounded-full transition-all duration-300 {getUsageColor(storageInfo.percentage)}"
            style="width: {Math.min(storageInfo.percentage, 100)}%"
          ></div>
        </div>
        
        <div class="flex justify-between text-xs text-gray-600">
          <span>{storageInfo.percentage.toFixed(1)}% used</span>
          <span>{storageMonitor.formatBytes(storageInfo.quota - storageInfo.used)} available</span>
        </div>
      </div>

      {#if storageMonitor.isStorageLow(storageInfo)}
        <div class="rounded-md bg-yellow-50 p-3">
          <p class="text-sm text-yellow-800">
            <svg class="h-4 w-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            Storage is getting full. Consider clearing old data.
          </p>
        </div>
      {/if}
    </div>

    <!-- Storage Breakdown -->
    <div class="rounded-lg border p-6 space-y-4">
      <h3 class="text-lg font-medium">Storage Breakdown</h3>
      
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">IndexedDB (Offline Data)</span>
          <span class="text-sm font-medium">
            {storageMonitor.formatBytes(storageInfo.breakdown.indexedDB)}
          </span>
        </div>
        
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Cache Storage</span>
          <span class="text-sm font-medium">
            {storageMonitor.formatBytes(storageInfo.breakdown.cache)}
          </span>
        </div>
        
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Local Storage</span>
          <span class="text-sm font-medium">
            {storageMonitor.formatBytes(storageInfo.breakdown.localStorage)}
          </span>
        </div>
      </div>
    </div>

    <!-- Cache Settings -->
    <div class="rounded-lg border p-6 space-y-4">
      <h3 class="text-lg font-medium">Cache Settings</h3>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p class="font-medium">Persistent Storage</p>
            <p class="text-sm text-gray-600">
              Prevents browser from automatically clearing your data
            </p>
          </div>
          {#if isPersistent}
            <span class="text-sm text-green-600 font-medium">Enabled</span>
          {:else}
            <button
              class="btn-primary text-sm"
              onclick={requestPersistence}
            >
              Enable
            </button>
          {/if}
        </div>

        <div class="space-y-3">
          <h4 class="text-sm font-medium text-gray-700">Data Retention</h4>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• Client data: 7 days</li>
            <li>• Job data: 30 days</li>
            <li>• Images: 14 days</li>
            <li>• Other data: 7 days</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Clear Cache Actions -->
    <div class="rounded-lg border p-6 space-y-4">
      <h3 class="text-lg font-medium">Clear Cache</h3>
      
      {#if isClearing}
        <div class="space-y-2">
          <p class="text-sm text-gray-600">
            Clearing {clearingStore || 'cache'}...
          </p>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="h-2 bg-primary-600 rounded-full transition-all duration-300"
              style="width: {clearProgress}%"
            ></div>
          </div>
        </div>
      {:else}
        <div class="space-y-3">
          <button
            class="w-full btn-secondary justify-between"
            onclick={clearOldData}
            disabled={isClearing}
          >
            <span>Clear Old Data (30+ days)</span>
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          
          <button
            class="w-full btn-secondary justify-between text-red-600 hover:bg-red-50"
            onclick={clearAllCache}
            disabled={isClearing}
          >
            <span>Clear All Cache</span>
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </button>
        </div>
      {/if}
    </div>
  {:else}
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <p class="text-sm text-red-800">
        Unable to load storage information. This feature may not be supported in your browser.
      </p>
    </div>
  {/if}
</div>