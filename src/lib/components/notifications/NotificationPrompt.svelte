<!-- src/lib/components/notifications/NotificationPrompt.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { useNotifications } from '$lib/stores/notifications.svelte';
  import { slide } from 'svelte/transition';
  
  const notifications = useNotifications();
  
  let showPrompt = $state(false);
  let dismissed = $state(false);
  
  onMount(() => {
    // Check if we should show the prompt
    const shouldShowPrompt = 
      notifications.isSupported &&
      notifications.permission === 'default' &&
      !localStorage.getItem('notification-prompt-dismissed') &&
      !notifications.isEnabled;
    
    if (shouldShowPrompt) {
      // Wait a bit before showing the prompt (better UX)
      setTimeout(() => {
        showPrompt = true;
      }, 5000);
    }
  });
  
  async function handleEnable() {
    const success = await notifications.requestPermission();
    if (success) {
      showPrompt = false;
    }
  }
  
  function handleDismiss() {
    showPrompt = false;
    dismissed = true;
    localStorage.setItem('notification-prompt-dismissed', 'true');
  }
  
  function handleRemindLater() {
    showPrompt = false;
    // Show again in 7 days
    const remindDate = new Date();
    remindDate.setDate(remindDate.getDate() + 7);
    localStorage.setItem('notification-prompt-remind', remindDate.toISOString());
  }
</script>

{#if showPrompt && !dismissed}
  <div 
    transition:slide={{ duration: 300 }}
    class="fixed bottom-4 right-4 z-50 w-full max-w-md rounded-lg border bg-white p-6 shadow-lg md:bottom-8 md:right-8"
  >
    <button
      onclick={handleDismiss}
      class="absolute right-2 top-2 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      aria-label="Close notification prompt"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    
    <div class="flex gap-4">
      <div class="flex-shrink-0">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
          <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      </div>
      
      <div class="flex-1 space-y-2">
        <h3 class="font-semibold text-gray-900">Stay Updated</h3>
        <p class="text-sm text-gray-600">
          Get instant notifications about new jobs, schedule changes, and client messages.
        </p>
        
        <div class="flex flex-col gap-2 pt-2 sm:flex-row">
          <button 
            class="btn-primary text-sm"
            onclick={handleEnable}
            disabled={notifications.isLoading}
          >
            Enable Notifications
          </button>
          <button 
            class="btn-secondary text-sm"
            onclick={handleRemindLater}
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Success Toast -->
{#if notifications.isEnabled && !showPrompt}
  <div 
    transition:slide={{ duration: 300 }}
    class="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800"
  >
    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span class="text-sm font-medium">Notifications enabled successfully!</span>
  </div>
{/if}