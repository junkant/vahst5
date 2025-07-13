<!-- src/lib/components/settings/StorageSettings.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { storageMonitor, type StorageInfo } from '$lib/utils/storageMonitor';
  import { localCache } from '$lib/utils/localCache';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
  import PermissionGate from '$lib/components/permissions/PermissionGate.svelte';
  
  const toast = useToast();
  
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
    try {
      const granted = await storageMonitor.requestPersistentStorage();
      isPersistent = granted;
      
      if (granted) {
        toast.success('Persistent storage enabled! Your data is now protected.');
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
        
        toast.info(helpText);
      }
    } catch (error) {
      console.error('Failed to request persistence:', error);
      toast.error('Failed to enable persistent storage. Please try again.');
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
      
      toast.success(`Successfully cleared ${deleted} old items from cache`);
      await loadStorageInfo();
    } catch (error) {
      console.error('Failed to clear old data:', error);
      toast.error('Failed to clear cache. Please try again.');
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
      
      toast.success('All cached data has been cleared successfully');
      await loadStorageInfo();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast.error('Failed to clear cache. Please try again.');
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
        
        <PermissionGate action="system_settings_manage_storage">
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
          
          {#snippet fallback()}
            <div class="w-full px-4 py-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg">
              <p class="font-medium mb-1">Cache management requires administrator access</p>
              <p class="text-xs text-gray-500">Contact your system administrator to clear cache data.</p>
            </div>
          {/snippet}
        </PermissionGate>
      </div>
    {:else}
      <div class="text-center py-8 text-gray-500">
        <p>Unable to load storage information</p>
      </div>
    {/if}
  </div>
</div>