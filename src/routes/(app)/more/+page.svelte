<!-- src/routes/(app)/more/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  
  const auth = useAuth();
  
  const accountItems = [
    { icon: 'user', label: 'Profile Settings', path: '/settings/profile' },
    { icon: 'bell', label: 'Notifications', path: '/settings/notifications' },
    { icon: 'shield', label: 'Privacy & Security', path: '/settings/security' }
  ];
  
  const businessItems = [
    { icon: 'users', label: 'Team Management', path: '/settings/team' },
    { icon: 'chart', label: 'Analytics', path: '/analytics' },
    { icon: 'dollar', label: 'Subscription', path: '/settings/billing' }
  ];
  
  const supportItems = [
    { icon: 'question', label: 'Help Center', path: '/help' },
    { icon: 'mail', label: 'Contact Support', path: '/support' },
    { icon: 'info', label: 'About VAHST', path: '/about' }
  ];
  
  function navigate(path: string) {
    goto(path);
  }
  
  async function handleSignOut() {
    try {
      console.log('Starting sign out...');
      const result = await auth.signOut();
      console.log('Sign out result:', result);
      
      if (result.error) {
        console.error('Sign out error:', result.error);
      } else {
        console.log('Sign out successful, navigating to home...');
        goto('/');
      }
    } catch (error) {
      console.error('Unexpected sign out error:', error);
    }
  }
</script>

<div class="h-full bg-gray-50 p-4 pb-24">
  <h1 class="text-2xl font-semibold text-gray-900 mb-6">More</h1>
  
  <div class="space-y-4">
    <!-- Account Section -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <div class="p-4 border-b border-gray-200">
        <h2 class="text-lg font-medium text-gray-900">Account</h2>
      </div>
      <div class="divide-y divide-gray-200">
        {#each accountItems as item}
          <button 
            onclick={() => navigate(item.path)}
            class="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between transition-colors"
          >
            <div class="flex items-center space-x-3">
              <Icon name={item.icon} class="w-5 h-5 text-gray-600" />
              <span class="text-gray-900">{item.label}</span>
            </div>
            <Icon name="chevronRight" class="w-5 h-5 text-gray-400" />
          </button>
        {/each}
      </div>
    </div>

    <!-- Business Section -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <div class="p-4 border-b border-gray-200">
        <h2 class="text-lg font-medium text-gray-900">Business</h2>
      </div>
      <div class="divide-y divide-gray-200">
        {#each businessItems as item}
          <button 
            onclick={() => navigate(item.path)}
            class="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between transition-colors"
          >
            <div class="flex items-center space-x-3">
              <Icon name={item.icon} class="w-5 h-5 text-gray-600" />
              <span class="text-gray-900">{item.label}</span>
            </div>
            <Icon name="chevronRight" class="w-5 h-5 text-gray-400" />
          </button>
        {/each}
      </div>
    </div>

    <!-- Support Section -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <div class="p-4 border-b border-gray-200">
        <h2 class="text-lg font-medium text-gray-900">Support</h2>
      </div>
      <div class="divide-y divide-gray-200">
        {#each supportItems as item}
          <button 
            onclick={() => navigate(item.path)}
            class="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between transition-colors"
          >
            <div class="flex items-center space-x-3">
              <Icon name={item.icon} class="w-5 h-5 text-gray-600" />
              <span class="text-gray-900">{item.label}</span>
            </div>
            <Icon name="chevronRight" class="w-5 h-5 text-gray-400" />
          </button>
        {/each}
      </div>
    </div>
    
    <!-- App Info -->
    <div class="text-center py-8">
      <p class="text-sm text-gray-500">VAHST v1.0.0</p>
      <p class="text-xs text-gray-400 mt-1">© 2025 VAHST LLC</p>
    </div>
    
    <!-- Sign Out Button -->
    <div class="px-4">
      <button
        onclick={handleSignOut}
        class="w-full p-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center space-x-2"
      >
        <Icon name="logout" class="w-5 h-5" />
        <span class="font-medium">Sign Out</span>
      </button>
    </div>
  </div>
</div>