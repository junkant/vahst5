<!-- src/routes/(app)/settings/profile/+page.svelte - FIXED VERSION -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useUI } from '$lib/stores/ui.svelte';
  import BusinessSwitcher from '$lib/components/settings/BusinessSwitcher.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const auth = useAuth();
  const ui = useUI();
  
  async function handleSignOut() {
    try {
      console.log('Starting sign out...');
      const result = await auth.signOut();
      console.log('Sign out result:', result);
      
      if (result.error) {
        console.error('Sign out error:', result.error);
        // You might want to show an error toast here
      } else {
        console.log('Sign out successful, navigating to home...');
        // After sign out, go to home page, not login
        goto('/');
      }
    } catch (error) {
      console.error('Unexpected sign out error:', error);
    }
  }
</script>

<div class="space-y-6">
  <div class="space-y-0.5">
    <h2 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Profile</h2>
    <p class="text-gray-600 dark:text-gray-400">
      Manage your account information
    </p>
  </div>

  {#if auth.user}
    <div class="space-y-6">
      <!-- User Info -->
      <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">Account Information</h3>
        
        <div class="space-y-3">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
            <p class="text-gray-900 dark:text-gray-100">{auth.user.email}</p>
          </div>
          
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">User ID</p>
            <p class="text-sm text-gray-600 dark:text-gray-400 font-mono">{auth.user.uid}</p>
          </div>
          
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Account Created</p>
            <p class="text-gray-900 dark:text-gray-100">
              {auth.user.metadata.creationTime ? 
                new Date(auth.user.metadata.creationTime).toLocaleDateString() : 
                'Unknown'}
            </p>
          </div>
        </div>
      </div>

      <!-- Business Switcher Component -->
      <BusinessSwitcher />
      
      <!-- Preferences Section -->
      <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">Preferences</h3>
        
        <div class="space-y-4">
          <!-- Theme Setting -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Icon name={ui.theme === 'dark' ? 'moon' : 'sun'} class="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Theme</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Choose your preferred color scheme</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                onclick={() => ui.setTheme('light')}
                class="px-3 py-1.5 text-sm rounded-md transition-colors {ui.theme === 'light' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
              >
                Light
              </button>
              <button
                onclick={() => ui.setTheme('dark')}
                class="px-3 py-1.5 text-sm rounded-md transition-colors {ui.theme === 'dark' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
              >
                Dark
              </button>
            </div>
          </div>
          
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              <kbd class="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}
              </kbd>
              +
              <kbd class="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                Shift
              </kbd>
              +
              <kbd class="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                D
              </kbd>
              to toggle dark mode
            </p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="space-y-3 pt-4">
        <button
          class="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          onclick={() => console.log('Edit profile')}
        >
          Edit Profile
        </button>
        
        <button
          class="w-full px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          onclick={handleSignOut}
        >
          Sign Out
        </button>
      </div>
    </div>
  {:else}
    <p class="text-gray-500 dark:text-gray-400">Not signed in</p>
  {/if}
</div>