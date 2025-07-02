<!-- src/lib/components/settings/NotificationSettings.svelte -->
<script lang="ts">
  import { useNotifications } from '$lib/stores/notifications.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const notifications = useNotifications();
  
  async function handleEnableNotifications() {
    await notifications.requestPermission();
  }
  
  async function handleDisableNotifications() {
    await notifications.disableNotifications();
  }
  
  function handlePreferenceChange(key: string, event: Event) {
    const target = event.target as HTMLInputElement;
    notifications.updatePreferences({ [key]: target.checked });
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div class="space-y-0.5">
      <h2 class="text-2xl font-bold tracking-tight">Notifications</h2>
      <p class="text-gray-600">
        Manage how you receive updates about jobs and messages
      </p>
    </div>
    {#if notifications.isSupported}
      <div class="flex items-center gap-2">
        {#if notifications.isEnabled}
          <Icon name="bell" class="h-5 w-5 text-green-500" />
          <span class="text-sm text-green-500">Active</span>
        {:else}
          <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm text-gray-400">Inactive</span>
        {/if}
      </div>
    {/if}
  </div>

  {#if !notifications.isSupported}
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <p class="text-sm text-red-800">
        Push notifications are not supported in this browser. Try using Chrome, Firefox, or Safari.
      </p>
    </div>
  {:else}
    <div class="space-y-4">
      <!-- Enable/Disable Notifications -->
      <div class="rounded-lg border p-6">
        <div class="flex items-center justify-between space-x-4">
          <div class="flex-1 space-y-1">
            <h3 class="text-lg font-medium">Push Notifications</h3>
            <p class="text-sm text-gray-600">
              Receive notifications about job updates, schedule changes, and messages
            </p>
          </div>
          
          {#if notifications.permission === 'granted' && notifications.token}
            <button
              class="btn-secondary"
              onclick={handleDisableNotifications}
              disabled={notifications.isLoading}
            >
              <Icon name="moon" class="mr-2 h-4 w-4 inline" />
              Disable
            </button>
          {:else}
            <button
              class="btn-primary"
              onclick={handleEnableNotifications}
              disabled={notifications.isLoading || notifications.permission === 'denied'}
            >
              <Icon name="bell" class="mr-2 h-4 w-4 inline" />
              {notifications.permission === 'denied' ? 'Blocked' : 'Enable'}
            </button>
          {/if}
        </div>
        
        {#if notifications.permission === 'denied'}
          <div class="mt-4 rounded-md bg-yellow-50 p-3">
            <p class="text-sm text-yellow-800">
              You've blocked notifications. To enable them, click the lock icon in your browser's address bar and allow notifications.
            </p>
          </div>
        {/if}
        
        {#if notifications.error}
          <div class="mt-4 rounded-md bg-red-50 p-3">
            <p class="text-sm text-red-800">{notifications.error}</p>
          </div>
        {/if}
      </div>

      <!-- Notification Types -->
      {#if notifications.isEnabled}
        <div class="space-y-4">
          <h3 class="text-lg font-medium">Notification Types</h3>
          
          <div class="space-y-3">
            <!-- Job Updates -->
            <label class="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-gray-50">
              <div class="flex items-center space-x-3">
                <Icon name="briefcase" class="h-5 w-5 text-gray-500" />
                <div>
                  <p class="font-medium">Job Updates</p>
                  <p class="text-sm text-gray-600">
                    New jobs, status changes, and completions
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifications.preferences.jobUpdates}
                onchange={(e) => handlePreferenceChange('jobUpdates', e)}
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </label>
            
            <!-- Schedule Reminders -->
            <label class="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-gray-50">
              <div class="flex items-center space-x-3">
                <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p class="font-medium">Schedule Reminders</p>
                  <p class="text-sm text-gray-600">
                    Upcoming appointments and schedule changes
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifications.preferences.scheduleReminders}
                onchange={(e) => handlePreferenceChange('scheduleReminders', e)}
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </label>
            
            <!-- Client Messages -->
            <label class="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-gray-50">
              <div class="flex items-center space-x-3">
                <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <div>
                  <p class="font-medium">Client Messages</p>
                  <p class="text-sm text-gray-600">
                    Messages and updates from clients
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifications.preferences.clientMessages}
                onchange={(e) => handlePreferenceChange('clientMessages', e)}
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </label>
          </div>
        </div>

        <!-- Notification Behavior -->
        <div class="space-y-4">
          <h3 class="text-lg font-medium">Notification Behavior</h3>
          
          <div class="space-y-3">
            <!-- Sound -->
            <label class="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-gray-50">
              <div class="flex items-center space-x-3">
                <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <div>
                  <p class="font-medium">Sound</p>
                  <p class="text-sm text-gray-600">
                    Play a sound when notifications arrive
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifications.preferences.sound}
                onchange={(e) => handlePreferenceChange('sound', e)}
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </label>
            
            <!-- Vibration -->
            <label class="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-gray-50">
              <div class="flex items-center space-x-3">
                <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <div>
                  <p class="font-medium">Vibration</p>
                  <p class="text-sm text-gray-600">
                    Vibrate on mobile devices
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifications.preferences.vibration}
                onchange={(e) => handlePreferenceChange('vibration', e)}
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </label>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>