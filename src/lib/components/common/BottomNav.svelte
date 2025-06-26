<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  
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
    if (path.includes('/clients')) return 'clients';
    if (path.includes('/today')) return 'today';  
    if (path.includes('/tools')) return 'tools';
    if (path.includes('/more')) return 'more';
    return 'today'; // default to today instead of clients
  }
</script>

<nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-30">
  <div class="flex items-center justify-around">
    
    <!-- Clients Tab -->
    <button 
      class="flex flex-col items-center py-2 px-3 rounded-lg transition-colors {activeTab === 'clients' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}"
      onclick={() => navigateTo('/clients')}
    >
      <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <span class="text-xs">Clients</span>
    </button>
    
    <!-- Today Tab -->
    <button 
      class="flex flex-col items-center py-2 px-3 rounded-lg transition-colors {activeTab === 'today' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}"
      onclick={() => navigateTo('/today')}
    >
      <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span class="text-xs">Today</span>
    </button>
    
    <!-- Quick Action (Center) -->
    <button 
      class="flex flex-col items-center py-2 px-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      onclick={toggleQuickActions}
      aria-label="Quick actions"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    </button>
    
    <!-- Tools Tab -->
    <button 
      class="flex flex-col items-center py-2 px-3 rounded-lg transition-colors {activeTab === 'tools' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}"
      onclick={() => navigateTo('/tools')}
    >
      <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span class="text-xs">Tools</span>
    </button>
    
    <!-- More Tab -->
    <button 
      class="flex flex-col items-center py-2 px-3 rounded-lg transition-colors {activeTab === 'more' ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}"
      onclick={() => navigateTo('/more')}
    >
      <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
      </svg>
      <span class="text-xs">More</span>
    </button>
    
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
      role="document"
    >
      <div class="text-center mb-4">
        <div class="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3"></div>
        <h3 class="text-lg font-semibold text-gray-900">Quick Actions</h3>
      </div>
      
      <div class="grid grid-cols-2 gap-3">
        <button class="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
          <span class="text-2xl mb-2">📝</span>
          <span class="text-sm font-medium text-gray-900">New Job</span>
        </button>
        
        <button class="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
          <span class="text-2xl mb-2">➕</span>
          <span class="text-sm font-medium text-gray-900">Add Client</span>
        </button>
        
        <button class="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
          <span class="text-2xl mb-2">💰</span>
          <span class="text-sm font-medium text-gray-900">Invoice</span>
        </button>
        
        <button class="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
          <span class="text-2xl mb-2">📊</span>
          <span class="text-sm font-medium text-gray-900">Report</span>
        </button>
        
        <button class="flex flex-col items-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
          <span class="text-2xl mb-2">📞</span>
          <span class="text-sm font-medium text-gray-900">Log Call</span>
        </button>
        
        <button class="flex flex-col items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
          <span class="text-2xl mb-2">📱</span>
          <span class="text-sm font-medium text-gray-900">Scan QR</span>
        </button>
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