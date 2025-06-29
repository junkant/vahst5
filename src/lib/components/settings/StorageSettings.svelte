<!-- src/lib/components/settings/StorageSettings.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { storageMonitor, type StorageInfo } from '$lib/utils/storageMonitor';
  import { localCache } from '$lib/utils/localCache';
  import { useTenant } from '$lib/stores/tenant.svelte';  // Fixed import path
  
  const tenant = useTenant();
  
  let storageInfo = $state<StorageInfo | null>(null);
  let isLoading = $state(true);
  let isClearing = $state(false);
  let clearProgress = $state(0);
  let clearingStore = $state('');
  let isPersistent = $state(false);
  
  // Message state for in-app notifications
  let message = $state<{ text: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  let messageTimeout: number | undefined;
  
  onMount(async () => {
    await loadStorageInfo();
    checkPersistence();
  });
  
  function showMessage(text: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    message = { text, type };
    
    // Clear any existing timeout
    if (messageTimeout) {
      clearTimeout(messageTimeout);
    }
    
    // Auto-hide after 5 seconds
    messageTimeout = setTimeout(() => {
      message = null;
    }, 5000);
  }
  
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
    try {
      const granted = await storageMonitor.requestPersistentStorage();
      isPersistent = granted;
      
      if (granted) {
        showMessage('Persistent storage enabled! Your data is now protected.', 'success');
      } else {
        // Provide more helpful context about why it might have been denied
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;
        
        let helpText = 'Persistent storage was denied. ';
        
        if (isLocalhost) {
          helpText += 'This often happens in development. Try in production with HTTPS.';
        } else if (!isPWA) {
          helpText += 'Try installing this app to your home screen first.';
        } else {
          helpText += 'Try using the app more or bookmarking it. Browsers grant persistence to frequently-used sites.';
        }
        
        showMessage(helpText, 'info');
      }
    } catch (error) {
      console.error('Failed to request persistence:', error);
      showMessage('Failed to enable persistent storage. Please try again.', 'error');
    }
  }
  
  async function clearOldData() {
    if (!confirm('This will remove cached data older than 30 days. Continue?')) {
      return;
    }
    
    isClearing = true;
    clearProgress = 0;
    clearingStore = 'old';
    
    try {
      const deleted = await localCache.cleanOldData((progress, store) => {
        clearProgress = progress;
        clearingStore = store;
      });
      
      showMessage(`Successfully cleared ${deleted} old items from cache`, 'success');
      await loadStorageInfo();
    } catch (error) {
      console.error('Failed to clear old data:', error);
      showMessage('Failed to clear cache. Please try again.', 'error');
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
    clearProgress = 0;
    
    try {
      await localCache.clearAll((progress, store) => {
        clearProgress = progress;
        clearingStore = store;
      });
      
      showMessage('All cached data has been cleared successfully', 'success');
      await loadStorageInfo();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      showMessage('Failed to clear cache. Please try again.', 'error');
    } finally {
      isClearing = false;
      clearProgress = 0;
      clearingStore = '';
    }
  }
  
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function formatPercentage(value: number): string {
    return (value * 100).toFixed(1) + '%';
  }
</script>

<style>
  @keyframes slide-in-from-top-2 {
    from {
      transform: translateY(-0.5rem);
    }
    to {
      transform: translateY(0);
    }
  }
  
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .animate-in {
    animation-fill-mode: both;
  }
  
  .slide-in-from-top-2 {
    animation-name: slide-in-from-top-2;
  }
  
  .fade-in {
    animation-name: fade-in;
  }
</style>

<div class="space-y-6">
  <!-- Message Display -->
  {#if message}
    <div class="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
      <div class="px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md
        {message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : ''}
        {message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : ''}
        {message.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : ''}
        {message.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' : ''}">
        
        <!-- Icon -->
        <div class="flex-shrink-0">
          {#if message.type === 'success'}
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          {:else if message.type === 'error'}
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          {:else if message.type === 'warning'}
            <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          {:else}
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          {/if}
        </div>
        
        <!-- Message -->
        <p class="text-sm font-medium">{message.text}</p>
        
        <!-- Close button -->
        <button
          onclick={() => message = null}
          class="ml-auto flex-shrink-0 text-gray-400 hover:text-gray-600"
          aria-label="Close message"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  {/if}

  <div>
    <h2 class="text-lg font-semibold mb-4">Storage Settings</h2>
    
    {#if isLoading}
      <div class="animate-pulse space-y-4">
        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        <div class="h-8 bg-gray-200 rounded"></div>
        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    {:else if storageInfo}
      <!-- Storage Overview -->
      <div class="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 class="text-sm font-medium text-gray-700 mb-3">Storage Usage</h3>
        
        <!-- Progress Bar -->
        <div class="mb-2">
          <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              class="h-full bg-blue-500 transition-all duration-300"
              style="width: {formatPercentage(storageInfo.usagePercentage)}"
            ></div>
          </div>
        </div>
        
        <!-- Storage Stats -->
        <div class="flex justify-between text-sm text-gray-600">
          <span>{formatBytes(storageInfo.usage)} used</span>
          <span>{formatBytes(storageInfo.quota)} total</span>
        </div>
        
        {#if storageInfo.details}
          <div class="mt-4 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Cache Storage:</span>
              <span class="font-medium">{formatBytes(storageInfo.details.caches || 0)}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">IndexedDB:</span>
              <span class="font-medium">{formatBytes(storageInfo.details.indexedDB || 0)}</span>
            </div>
            {#if storageInfo.details.serviceWorker}
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Service Worker:</span>
                <span class="font-medium">{formatBytes(storageInfo.details.serviceWorker)}</span>
              </div>
            {/if}
          </div>
        {/if}
      </div>
      
      <!-- Persistence Status -->
      <div class="bg-gray-50 rounded-lg p-4 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h3 class="text-sm font-medium text-gray-700">Persistent Storage</h3>
            <p class="text-xs text-gray-500 mt-1">
              {isPersistent ? 'Data will not be automatically cleared' : 'Data may be cleared when storage is low'}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium {isPersistent ? 'text-green-600' : 'text-gray-600'}">
              {isPersistent ? 'Enabled' : 'Disabled'}
            </span>
            {#if !isPersistent}
              <button
                onclick={requestPersistence}
                class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Enable
              </button>
            {/if}
          </div>
        </div>
        
        {#if !isPersistent}
          <div class="mt-3 p-3 bg-blue-50 rounded-md">
            <h4 class="text-xs font-medium text-blue-900 mb-1">Tips for enabling persistent storage:</h4>
            <ul class="text-xs text-blue-700 space-y-1">
              <li>• Install this app to your home screen</li>
              <li>• Use the app regularly or bookmark it</li>
              <li>• Ensure you're using HTTPS (not localhost)</li>
              <li>• Try in a different browser (Chrome/Edge work best)</li>
            </ul>
          </div>
        {/if}
      </div>
      
      <!-- Tenant Storage Limit -->
      {#if tenant.current}
        <div class="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 class="text-sm font-medium text-gray-700 mb-2">Plan Storage Limit</h3>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">
              {tenant.current.plan === 'starter' ? '5 GB' : 
               tenant.current.plan === 'professional' ? '50 GB' : 'Unlimited'}
            </span>
            <span class="text-xs text-gray-500">
              {tenant.current.plan} plan
            </span>
          </div>
        </div>
      {/if}
      
      <!-- Cache Management -->
      <div class="space-y-3">
        <h3 class="text-sm font-medium text-gray-700">Cache Management</h3>
        
        <button
          onclick={clearOldData}
          disabled={isClearing}
          class="w-full px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg 
                 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed 
                 transition-colors flex items-center justify-center gap-2"
        >
          {#if isClearing && clearingStore === 'old'}
            <div class="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
            Clearing... {clearProgress}%
          {:else}
            Clear Old Data (30+ days)
          {/if}
        </button>
        
        <button
          onclick={clearAllCache}
          disabled={isClearing}
          class="w-full px-4 py-2 text-sm bg-red-50 border border-red-200 text-red-700 
                 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed 
                 transition-colors flex items-center justify-center gap-2"
        >
          {#if isClearing && clearingStore !== 'old'}
            <div class="animate-spin h-4 w-4 border-2 border-red-300 border-t-red-500 rounded-full"></div>
            Clearing {clearingStore}... {clearProgress}%
          {:else}
            Clear All Cache
          {/if}
        </button>
      </div>
    {:else}
      <div class="text-center py-8 text-gray-500">
        <p>Unable to load storage information</p>
      </div>
    {/if}
  </div>
</div>