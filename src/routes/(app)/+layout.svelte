<script>
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import BottomNav from '$lib/components/common/BottomNav.svelte';
  import TenantSwitcher from '$lib/components/tenant/TenantSwitcher.svelte';
  
  let { children } = $props();
  
  const auth = useAuth();
  
  let showTenantSwitcher = $state(false);
  
  // Temporarily disable auth redirect for testing
  // $effect(() => {
  //   if (!auth.isLoading && !auth.user) {
  //     goto('/login');
  //   }
  // });
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-sm">V</span>
        </div>
        <div>
          <h1 class="text-lg font-semibold text-gray-900">Vahst</h1>
          <button 
            class="text-xs text-gray-500 hover:text-gray-700"
            onclick={() => showTenantSwitcher = true}
          >
            {auth.tenant?.name || 'Select Tenant'}
          </button>
        </div>
      </div>
      
      <div class="flex items-center space-x-3">
        <span class="text-sm text-gray-600">Welcome, {auth.user?.name || 'User'}</span>
        <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <span class="text-gray-600 text-sm font-medium">
            {auth.user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
          </span>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="pb-20">
    {@render children()}
  </main>

  <!-- Bottom Navigation -->
  <BottomNav />
  
  <!-- Tenant Switcher Dialog -->
  <TenantSwitcher bind:open={showTenantSwitcher} />
</div>