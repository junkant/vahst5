<!-- src/routes/(app)/test-notifications/+page.svelte -->
<script lang="ts">
  import { useNotifications } from '$lib/stores/notifications.svelte';
  import NotificationSettings from '$lib/components/settings/NotificationSettings.svelte';
  
  const notifications = useNotifications();
  
  async function sendTestNotification() {
    if (!notifications.isEnabled) {
      alert('Please enable notifications first');
      return;
    }
    
    // Create a test notification
    const notification = new Notification('VAHST Test Notification', {
      body: 'This is a test notification from your PWA!',
      icon: '/icon-192.svg',
      badge: '/icon-96.svg',
      tag: 'test-notification',
      vibrate: [200, 100, 200],
      requireInteraction: false
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
      alert('Notification clicked!');
    };
  }
</script>

<div class="container mx-auto max-w-4xl p-6 space-y-8">
  <div class="space-y-2">
    <h1 class="text-3xl font-bold">Notification Test Page</h1>
    <p class="text-gray-600">Test your push notification setup</p>
  </div>
  
  <div class="space-y-4 rounded-lg border p-6">
    <h2 class="text-xl font-semibold">Quick Status</h2>
    
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="space-y-1">
        <p class="text-sm font-medium text-gray-600">Browser Support</p>
        <p class="text-2xl font-bold">
          {notifications.isSupported ? '✅ Supported' : '❌ Not Supported'}
        </p>
      </div>
      
      <div class="space-y-1">
        <p class="text-sm font-medium text-gray-600">Permission Status</p>
        <p class="text-2xl font-bold capitalize">
          {notifications.permission === 'granted' ? '✅' : notifications.permission === 'denied' ? '❌' : '⏳'} 
          {notifications.permission}
        </p>
      </div>
      
      <div class="space-y-1">
        <p class="text-sm font-medium text-gray-600">Notifications Enabled</p>
        <p class="text-2xl font-bold">
          {notifications.isEnabled ? '✅ Yes' : '❌ No'}
        </p>
      </div>
      
      <div class="space-y-1">
        <p class="text-sm font-medium text-gray-600">FCM Token</p>
        <p class="text-sm font-mono text-gray-700">
          {notifications.token ? `${notifications.token.slice(0, 20)}...` : 'Not available'}
        </p>
      </div>
    </div>
    
    <div class="pt-4">
      <button 
        class="btn-primary"
        onclick={sendTestNotification}
        disabled={!notifications.isEnabled}
      >
        Send Test Notification
      </button>
    </div>
  </div>
  
  <NotificationSettings />
</div>