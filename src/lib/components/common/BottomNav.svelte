<!-- src/lib/components/common/BottomNav.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { useClients } from '$lib/stores/client.svelte';
  import { useVoice } from '$lib/stores/voice.svelte';
  
  let { 
    mode = 'app',
    openLogin = () => {},
    openRegister = () => {}
  } = $props();
  
  const client = useClients();
  const voice = useVoice();
  let showQuickActions = $state(false);
  
  function navigateTo(path) {
    goto(path);
  }
  
  function toggleQuickActions() {
    showQuickActions = !showQuickActions;
  }
  
  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Determine active tab based on current path
  let currentPath = $derived($page.url.pathname);
  let activeTab = $derived(getActiveTab(currentPath));
  
  function getActiveTab(path) {
    if (path === '/') return 'home';
    if (path.includes('/my-day') || path.includes('/today')) return 'my-day';
    if (path.includes('/tasks')) return 'tasks';
    if (path.includes('/money')) return 'money';
    if (path.includes('/voice')) return 'voice';
    return 'my-day';
  }
</script>

{#if mode === 'landing'}
  <!-- Landing Page Bottom Navigation -->
  <nav class="fixed bottom-0 left-0 right-0 z-30">
    <!-- Shadow and curve effect -->
    <div class="absolute inset-x-0 bottom-0 h-16 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"></div>
    
    <!-- Navigation content -->
    <div class="relative bg-white rounded-t-[2rem] px-6 pt-1 pb-2">
      <div class="flex items-center justify-around">
        
        <!-- Features -->
        <button 
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors text-gray-600 hover:text-blue-600"
          onclick={() => scrollToSection('features')}
        >
          <svg class="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span class="text-xs">Features</span>
        </button>
        
        <!-- Pricing -->
        <button 
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors text-gray-600 hover:text-blue-600"
          onclick={() => scrollToSection('pricing')}
        >
          <svg class="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-xs">Pricing</span>
        </button>
        
        <!-- Center CTA -->
        <button 
          class="flex items-center justify-center w-14 h-14 -mt-4 bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105"
          onclick={openRegister}
          aria-label="Start free trial"
        >
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
        
        <!-- Login -->
        <button 
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors text-gray-600 hover:text-blue-600"
          onclick={openLogin}
        >
          <svg class="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          <span class="text-xs">Login</span>
        </button>
        
        <!-- Register -->
        <button 
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors text-gray-600 hover:text-blue-600"
          onclick={openRegister}
        >
          <svg class="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span class="text-xs">Sign Up</span>
        </button>
        
      </div>
    </div>
  </nav>
{:else}
  <!-- App Bottom Navigation (Original) -->
  <nav class="fixed bottom-0 left-0 right-0 z-30">
    <!-- Shadow and curve effect -->
    <div class="absolute inset-x-0 bottom-0 h-16 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"></div>
    
    <!-- Navigation content -->
    <div class="relative bg-white rounded-t-[2rem] px-6 pt-1 pb-2">
      <div class="flex items-center justify-around">
        
        <!-- My Day -->
        <button 
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors {activeTab === 'my-day' ? 'text-blue-600' : 'text-gray-500'}"
          onclick={() => navigateTo('/my-day')}
        >
          <svg class="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-xs">My Day</span>
        </button>
        
        <!-- Tasks -->
        <button 
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors {activeTab === 'tasks' ? 'text-blue-600' : 'text-gray-500'}"
          onclick={() => navigateTo('/tasks')}
        >
          <svg class="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span class="text-xs">Tasks</span>
        </button>
        
        <!-- Center Action Button -->
        <button 
          class="flex items-center justify-center w-14 h-14 -mt-4 bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105"
          onclick={toggleQuickActions}
          aria-label="Quick actions menu"
        >
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
        
        <!-- Money -->
        <button 
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors {activeTab === 'money' ? 'text-blue-600' : 'text-gray-500'}"
          onclick={() => navigateTo('/money')}
        >
          <svg class="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-xs">Money</span>
        </button>
        
        <!-- Voice -->
        <button 
          class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors {activeTab === 'voice' || voice.isListening ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}"
          onclick={() => voice.startListening()}
        >
          <div class="relative">
            <svg class="w-6 h-6 mb-0.5 {voice.isListening ? 'animate-pulse' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {#if voice.isListening}
              <div class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            {/if}
          </div>
          <span class="text-xs">{voice.isListening ? 'Listening' : 'Voice'}</span>
        </button>
        
      </div>
    </div>
  </nav>
  
  <!-- Quick Actions Popover -->
  {#if showQuickActions}
    <div 
      class="fixed inset-0 bg-black/30 z-40 flex items-end justify-center pb-24"
      onclick={() => showQuickActions = false}
      onkeydown={(e) => e.key === 'Escape' && (showQuickActions = false)}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <div 
        class="bg-white rounded-t-2xl shadow-xl w-full max-w-sm mx-4 p-6"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Quick actions menu"
        tabindex="-1"
      >
        <div class="text-center mb-4">
          <div class="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3"></div>
          <h3 class="text-lg font-semibold text-gray-900">Quick Actions</h3>
          {#if client.selectedClient}
            <p class="text-sm text-gray-500 mt-1">for {client.selectedClient.name}</p>
          {/if}
        </div>
        
        <div class="grid grid-cols-2 gap-3">
          {#if client.selectedClient}
            <!-- Client-specific actions -->
            <button class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span class="text-2xl mb-2">📝</span>
              <span class="text-sm font-medium text-gray-900">New Job</span>
            </button>
            
            <button class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span class="text-2xl mb-2">💰</span>
              <span class="text-sm font-medium text-gray-900">Create Invoice</span>
            </button>
            
            <button class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span class="text-2xl mb-2">📸</span>
              <span class="text-sm font-medium text-gray-900">Take Photo</span>
            </button>
            
            <button class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span class="text-2xl mb-2">📋</span>
              <span class="text-sm font-medium text-gray-900">View History</span>
            </button>
          {:else}
            <!-- General actions -->
            <button 
              onclick={() => { showQuickActions = false; goto('/clients'); }}
              class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span class="text-2xl mb-2">👥</span>
              <span class="text-sm font-medium text-gray-900">Select Client</span>
            </button>
            
            <button class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span class="text-2xl mb-2">🎤</span>
              <span class="text-sm font-medium text-gray-900">Voice Note</span>
            </button>
            
            <button class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span class="text-2xl mb-2">📍</span>
              <span class="text-sm font-medium text-gray-900">Check In</span>
            </button>
            
            <button class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span class="text-2xl mb-2">⚡</span>
              <span class="text-sm font-medium text-gray-900">Quick Job</span>
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
{/if}