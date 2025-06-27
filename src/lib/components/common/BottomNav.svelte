<!-- src/lib/components/common/BottomNav.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { useClients } from '$lib/stores/client.svelte';
  
  const client = useClients();
  let showQuickActions = $state(false);
  
  function navigateTo(path) {
    goto(path);
  }
  
  function toggleQuickActions() {
    showQuickActions = !showQuickActions;
  }
  
  // Determine active tab based on current path
  let currentPath = $derived($page.url.pathname);
  let activeTab = $derived(getActiveTab(currentPath));
  
  function getActiveTab(path) {
    if (path.includes('/my-day') || path.includes('/today')) return 'my-day';
    if (path.includes('/tasks')) return 'tasks';
    if (path.includes('/money')) return 'money';
    if (path.includes('/voice')) return 'voice';
    return 'my-day';
  }
</script>

<!-- Clean Minimal Bottom Navigation with Curve -->
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
      
      <!-- Quick Action (Center) - Breaking the line -->
      <div class="relative -mt-6">
        <button 
          class="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          onclick={toggleQuickActions}
          aria-label="Quick actions"
        >
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>
      
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
        class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors text-gray-500"
        onclick={() => {}}
      >
        <svg class="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <span class="text-xs">Voice</span>
      </button>
      
    </div>
  </div>
</nav>

<!-- Quick Actions Popover - Clean Design -->
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
            <span class="text-2xl mb-2">📋</span>
            <span class="text-sm font-medium text-gray-900">New Estimate</span>
          </button>
          
          <button class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="text-2xl mb-2">📸</span>
            <span class="text-sm font-medium text-gray-900">Take Photo</span>
          </button>
          
          <button class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="text-2xl mb-2">📞</span>
            <span class="text-sm font-medium text-gray-900">Log Call</span>
          </button>
          
          <button class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="text-2xl mb-2">📍</span>
            <span class="text-sm font-medium text-gray-900">Check In</span>
          </button>
        {:else}
          <!-- No client selected - show prompt -->
          <div class="col-span-2 text-center py-8">
            <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p class="text-gray-600 mb-4">Please select a client first</p>
            <button 
              onclick={() => { showQuickActions = false; }}
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Select Client
            </button>
          </div>
        {/if}
      </div>
      
      <button 
        onclick={() => showQuickActions = false}
        class="w-full mt-4 py-3 text-gray-600 text-sm font-medium"
      >
        Cancel
      </button>
    </div>
  </div>
{/if}