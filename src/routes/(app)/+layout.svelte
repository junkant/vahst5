<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { createDialog, melt } from '@melt-ui/svelte';
  import { useAuth } from '$lib/stores/auth';
  import { useUI } from '$lib/stores/ui';
  import { useOffline } from '$lib/stores/offline';
  import BottomNav from '$lib/components/common/BottomNav.svelte';
  import TopBar from '$lib/components/common/TopBar.svelte';
  import TenantSwitcher from '$lib/components/tenant/TenantSwitcher.svelte';
  
  const auth = useAuth();
  const ui = useUI();
  const offline = useOffline();
  
  // Redirect if not authenticated
  $effect(() => {
    if (!auth.isLoading && !auth.user) {
      goto('/login');
    }
  });
  
  // Offline indicator dialog
  const offlineDialog = createDialog({
    forceVisible: !offline.isOnline,
    closeOnOutsideClick: false
  });
</script>

{#if auth.user && auth.tenant}
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- Top Bar -->
    <TopBar />
    
    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto">
      <slot />
    </main>
    
    <!-- Bottom Navigation -->
    <BottomNav />
    
    <!-- Offline Indicator -->
    {#if $offlineDialog.states.open}
      <div use:melt={$offlineDialog.elements.overlay} 
           class="fixed inset-0 bg-black/20 z-50">
        <div use:melt={$offlineDialog.elements.content}
             class="fixed top-4 left-1/2 -translate-x-1/2 bg-yellow-100 
                    border border-yellow-400 rounded-lg px-4 py-2 
                    flex items-center gap-2 shadow-lg">
          <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-medium text-yellow-800">
            Working offline
            {#if offline.queueLength > 0}
              ({offline.queueLength} pending)
            {/if}
          </span>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <!-- Loading state -->
  <div class="flex items-center justify-center h-screen bg-gray-50">
    <div class="text-center">
      <div class="w-16 h-16 border-4 border-primary-600 border-t-transparent 
                  rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-gray-600">Loading...</p>
    </div>
  </div>
{/if}
