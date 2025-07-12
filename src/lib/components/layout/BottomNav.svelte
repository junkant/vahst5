<!--
  @component BottomNav
  @description Bottom navigation bar for authenticated app users
  @usage <BottomNav />
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useVoice } from '$lib/stores/voice.svelte';
  import { useNetwork } from '$lib/stores/network.svelte.ts';
  import Icon from '$lib/components/icons/Icon.svelte';
  import QuickActionsMenu from '../common/QuickActionsMenu.svelte';
  
  const auth = useAuth();
  const network = useNetwork();
  const voice = useVoice();
  
  let showQuickActions = $state(false);
  
  const activeTab = $derived.by(() => {
    const route = $page.route.id;
    if (!route) return '';
    
    if (route.includes('my-day')) return 'my-day';
    if (route.includes('tasks')) return 'tasks';
    if (route.includes('money')) return 'money';
    if (route.includes('clients')) return 'clients';
    return '';
  });

  const lightningColor = $derived.by(() => {
    if (!network.isOnline) return 'text-red-500';
    if (network.isSlowConnection) return 'text-yellow-500';
    return 'text-white';
  });
  
  function navigateTo(path: string) {
    goto(path);
  }
  
  function toggleQuickActions() {
    showQuickActions = !showQuickActions;
  }
  
  function handleVoiceClick() {
    if (voice && auth.isAuthenticated) {
      voice.startListening();
    }
  }
  
  $effect(() => {
    return () => {
      if (voice?.isListening) {
        voice.stopListening();
      }
      if (showQuickActions) {
        showQuickActions = false;
      }
    };
  });
</script>

<nav class="fixed bottom-0 left-0 right-0 z-30">
  <!-- Shadow and curve effect -->
  <div class="absolute inset-x-0 bottom-0 h-16 bg-white dark:bg-gray-800 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"></div>
  
  <!-- Navigation content -->
  <div class="relative bg-white dark:bg-gray-800 rounded-t-[2rem] px-6 pt-1 pb-2">
    <div class="flex items-center justify-around">
      
      <!-- My Day -->
      <button 
        type="button"
        class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors {activeTab === 'my-day' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} cursor-pointer"
        onclick={() => navigateTo('/my-day')}
      >
        <Icon name="clock" class="w-6 h-6 mb-0.5" />
        <span class="text-xs">My Day</span>
      </button>
      
      <!-- Tasks -->
      <button 
        type="button"
        class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors {activeTab === 'tasks' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} cursor-pointer"
        onclick={() => navigateTo('/tasks')}
      >
        <Icon name="clipboard" class="w-6 h-6 mb-0.5" />
        <span class="text-xs">Tasks</span>
      </button>
      
      <!-- Center Action Button - Quick Actions with Dynamic Lightning Color -->
      <button 
        type="button"
        class="flex items-center justify-center w-14 h-14 -mt-4 bg-blue-600 dark:bg-blue-500 rounded-full shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all transform hover:scale-105 cursor-pointer"
        onclick={() => toggleQuickActions()}
        aria-label="Quick actions menu"
      >
        <Icon name="lightning" class="w-8 h-8 transition-colors duration-300 {lightningColor}" />
      </button>
      
      <!-- Money -->
      <button 
        type="button"
        class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors {activeTab === 'money' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} cursor-pointer"
        onclick={() => navigateTo('/money')}
      >
        <Icon name="dollar" class="w-6 h-6 mb-0.5" />
        <span class="text-xs">Money</span>
      </button>
      
      <!-- Voice -->
      <button 
        type="button"
        class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors {voice?.isListening ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-500 dark:text-gray-400'} cursor-pointer"
        onclick={() => handleVoiceClick()}
      >
        <div class="relative">
          <Icon name="microphone" class="w-6 h-6 mb-0.5 {voice?.isListening ? 'animate-pulse' : ''}" />
          {#if voice?.isListening}
            <div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          {/if}
        </div>
        <span class="text-xs">Voice</span>
      </button>
    </div>
  </div>
  
  <!-- Quick Actions Menu -->
  <QuickActionsMenu bind:show={showQuickActions} />
</nav>