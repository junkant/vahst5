<!--
  @component BottomNav
  @description Bottom navigation bar for app navigation with voice control and quick actions
  @usage <BottomNav mode="app" />
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { useClients } from '$lib/stores/client.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useVoice } from '$lib/stores/voice.svelte';
  import { useNetwork } from '$lib/stores/network.svelte.ts';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  interface Props {
    mode?: 'app' | 'landing';
    openLogin?: () => void;
    openRegister?: () => void;
  }
  
  let { mode = 'app', openLogin: propsOpenLogin, openRegister: propsOpenRegister }: Props = $props();
  
  const client = useClients();
  const auth = useAuth();
  const network = useNetwork();
  
  // Get voice store (it will handle its own initialization)
  const voice = mode === 'app' ? useVoice() : null;
  
  let showQuickActions = $state(false);
  
  // Performance: Memoize route derivations
  const activeTab = $derived.by(() => {
    const route = $page.route.id;
    if (!route) return '';
    
    if (route.includes('my-day')) return 'my-day';
    if (route.includes('tasks')) return 'tasks';
    if (route.includes('money')) return 'money';
    if (route.includes('clients')) return 'clients';
    return '';
  });

  // Performance: Memoize lightning color calculation
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
  
  function scrollToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
  // Emit events for login/register modals
  function openLogin() {
    if (propsOpenLogin) {
      propsOpenLogin();
    } else {
      window.dispatchEvent(new CustomEvent('openLoginModal'));
    }
  }
  
  function openRegister() {
    if (propsOpenRegister) {
      propsOpenRegister();
    } else {
      window.dispatchEvent(new CustomEvent('openRegisterModal'));
    }
  }
  
  function handleVoiceClick() {
    if (voice && auth.isAuthenticated) {
      voice.startListening();
    } else if (!auth.isAuthenticated) {
      // Maybe show a message that voice requires login
      console.log('Voice control requires authentication');
    }
  }
  
  // Cleanup on unmount
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

  // Performance monitoring in dev
  if (import.meta.env.DEV) {
    const start = performance.now();
    $effect(() => {
      console.log(`BottomNav rendered in ${performance.now() - start}ms`);
    });
  }
</script>

{#if mode === 'landing'}
  <!-- Landing Page Bottom Navigation -->
  <nav class="fixed bottom-0 left-0 right-0 z-40">
    <!-- Shadow and curve effect -->
    <div class="absolute inset-x-0 bottom-0 h-16 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"></div>
    
    <!-- Navigation content -->
    <div class="relative bg-white rounded-t-[2rem] px-6 pt-1 pb-2">
      <div class="flex items-center justify-around">
        <!-- Features -->
        <button 
          type="button"
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors text-gray-600 hover:text-blue-600 cursor-pointer"
          onclick={() => scrollToSection('features')}
        >
          <Icon name="clipboard" class="w-6 h-6 mb-0.5" />
          <span class="text-xs">Features</span>
        </button>
        
        <!-- Pricing -->
        <button 
          type="button"
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors text-gray-600 hover:text-blue-600 cursor-pointer"
          onclick={() => scrollToSection('pricing')}
        >
          <Icon name="dollar" class="w-6 h-6 mb-0.5" />
          <span class="text-xs">Pricing</span>
        </button>
        
        <!-- Center CTA -->
        <button 
          type="button"
          class="flex items-center justify-center w-14 h-14 -mt-4 bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105 cursor-pointer"
          onclick={() => openRegister()}
          aria-label="Start free trial"
        >
          <Icon name="lightning" class="w-8 h-8 text-white" />
        </button>
        
        <!-- Login -->
        <button 
          type="button"
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors text-gray-600 hover:text-blue-600 cursor-pointer"
          onclick={() => openLogin()}
        >
          <svg class="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          <span class="text-xs">Login</span>
        </button>
        
        <!-- Register -->
        <button 
          type="button"
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors text-gray-600 hover:text-blue-600 cursor-pointer"
          onclick={() => openRegister()}
        >
          <Icon name="userPlus" class="w-6 h-6 mb-0.5" />
          <span class="text-xs">Sign Up</span>
        </button>
      </div>
    </div>
  </nav>
{:else}
  <!-- App Bottom Navigation - Authenticated Users -->
  <nav class="fixed bottom-0 left-0 right-0 z-30">
    <!-- Shadow and curve effect -->
    <div class="absolute inset-x-0 bottom-0 h-16 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"></div>
    
    <!-- Navigation content -->
    <div class="relative bg-white rounded-t-[2rem] px-6 pt-1 pb-2">
      <div class="flex items-center justify-around">
        
        <!-- My Day -->
        <button 
          type="button"
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors {activeTab === 'my-day' ? 'text-blue-600' : 'text-gray-500'} cursor-pointer"
          onclick={() => navigateTo('/my-day')}
        >
          <Icon name="clock" class="w-6 h-6 mb-0.5" />
          <span class="text-xs">My Day</span>
        </button>
        
        <!-- Tasks -->
        <button 
          type="button"
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors {activeTab === 'tasks' ? 'text-blue-600' : 'text-gray-500'} cursor-pointer"
          onclick={() => navigateTo('/tasks')}
        >
          <Icon name="clipboard" class="w-6 h-6 mb-0.5" />
          <span class="text-xs">Tasks</span>
        </button>
        
        <!-- Center Action Button - Quick Actions with Dynamic Lightning Color -->
        <button 
          type="button"
          class="flex items-center justify-center w-14 h-14 -mt-4 bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105 cursor-pointer"
          onclick={() => toggleQuickActions()}
          aria-label="Quick actions menu"
        >
          <Icon name="lightning" class="w-8 h-8 transition-colors duration-300 {lightningColor}" />
        </button>
        
        <!-- Money -->
        <button 
          type="button"
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors {activeTab === 'money' ? 'text-blue-600' : 'text-gray-500'} cursor-pointer"
          onclick={() => navigateTo('/money')}
        >
          <Icon name="dollar" class="w-6 h-6 mb-0.5" />
          <span class="text-xs">Money</span>
        </button>
        
        <!-- Voice -->
        <button 
          type="button"
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors {voice?.isListening ? 'text-blue-600 bg-blue-50' : 'text-gray-500'} cursor-pointer"
          onclick={() => handleVoiceClick()}
        >
          <div class="relative">
            <svg class="w-6 h-6 mb-0.5 {voice?.isListening ? 'animate-pulse' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {#if voice?.isListening}
              <div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            {/if}
          </div>
          <span class="text-xs">Voice</span>
        </button>
      </div>
    </div>
    
    <!-- Quick Actions Menu -->
    {#if showQuickActions}
      <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div class="p-2">
          <button
            type="button"
            onclick={() => { navigateTo('/quick-add'); showQuickActions = false; }}
            class="w-full px-4 py-3 text-left hover:bg-gray-50 rounded-lg flex items-center space-x-3 cursor-pointer"
          >
            <span class="text-2xl">➕</span>
            <span>Quick Add</span>
          </button>
          <button
            type="button"
            onclick={() => { navigateTo('/clients'); showQuickActions = false; }}
            class="w-full px-4 py-3 text-left hover:bg-gray-50 rounded-lg flex items-center space-x-3 cursor-pointer"
          >
            <span class="text-2xl">👥</span>
            <span>Clients</span>
          </button>
          <button
            type="button"
            onclick={() => { navigateTo('/jobs'); showQuickActions = false; }}
            class="w-full px-4 py-3 text-left hover:bg-gray-50 rounded-lg flex items-center space-x-3 cursor-pointer"
          >
            <span class="text-2xl">🔧</span>
            <span>Jobs</span>
          </button>
          <button
            type="button"
            onclick={() => { navigateTo('/more'); showQuickActions = false; }}
            class="w-full px-4 py-3 text-left hover:bg-gray-50 rounded-lg flex items-center space-x-3 cursor-pointer"
          >
            <span class="text-2xl">⚙️</span>
            <span>More</span>
          </button>
        </div>
      </div>
    {/if}
  </nav>
{/if}