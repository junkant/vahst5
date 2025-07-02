<!-- src/lib/components/notifications/NotificationPrompt.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { slide, fade } from 'svelte/transition';
  import { useNotifications } from '$lib/stores/notifications.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
const toast = useToast();
  
  const notifications = useNotifications();
  
  let showPrompt = $state(false);
  let isRequesting = $state(false);
  
  onMount(async () => {
    // Check if we should show the prompt
    if (!notifications.isSupported) return;
    
    // Check permission status directly
    if ('Notification' in window) {
      const permission = Notification.permission;
      if (permission === 'default') {
        // Wait a bit before showing the prompt for better UX
        setTimeout(() => {
          showPrompt = true;
        }, 2000);
      }
    }
  });
  
  async function handleEnable() {
    isRequesting = true;
    try {
      const granted = await notifications.requestPermission();
      if (granted) {
        showPrompt = false;
        toast.success('Notifications enabled! You\'ll receive updates about your tasks and appointments.');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      toast.error('Failed to enable notifications. Please check your browser settings.');
    } finally {
      isRequesting = false;
    }
  }
  
  function handleDismiss() {
    showPrompt = false;
    // Don't ask again for 7 days
    localStorage.setItem('notification-prompt-dismissed', Date.now().toString());
  }
</script>

{#if showPrompt && notifications.isSupported && !notifications.isEnabled}
  <div 
    transition:slide={{ duration: 300 }}
    class="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40"
  >
    <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        </div>
        
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-gray-900">
            Stay Updated
          </h3>
          <p class="mt-1 text-sm text-gray-600">
            Get notified about upcoming appointments, task reminders, and important updates.
          </p>
          
          <div class="mt-3 flex gap-2">
            <button
              onclick={handleEnable}
              disabled={isRequesting}
              class="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md
                     hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRequesting ? 'Enabling...' : 'Enable Notifications'}
            </button>
            
            <button
              onclick={handleDismiss}
              class="px-3 py-1.5 text-gray-600 text-sm font-medium rounded-md
                     hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500
                     transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
        
        <button
          onclick={handleDismiss}
          class="flex-shrink-0 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
{/if}