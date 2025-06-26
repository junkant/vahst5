<script>
  import { createPopover, melt } from '@melt-ui/svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useClients } from '$lib/stores/client.svelte';
  
  const auth = useAuth();
  const clients = useClients();
  
  // User menu popover
  const userMenu = createPopover({
    positioning: { placement: 'bottom-end' }
  });
</script>

<header class="bg-white border-b border-gray-200 safe-top">
  <div class="flex items-center justify-between px-4 py-3">
    <!-- Logo/Brand -->
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-bold text-primary-600">Vahst</h1>
      <span class="text-sm text-gray-500">{auth.tenant?.name}</span>
    </div>
    
    <!-- User Menu -->
    <button use:melt={$userMenu.elements.trigger}
            class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 
                   transition-colors">
      <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center 
                  justify-center text-white font-medium">
        {auth.user?.email?.[0]?.toUpperCase() || 'U'}
      </div>
    </button>
    
    {#if $userMenu.states.open}
      <div use:melt={$userMenu.elements.content}
           class="bg-white rounded-lg shadow-lg border border-gray-200 
                  p-2 min-w-[200px] z-50">
        <div class="px-3 py-2 border-b border-gray-100 mb-2">
          <p class="text-sm font-medium text-gray-900">
            {auth.user?.email}
          </p>
          <p class="text-xs text-gray-500">
            {auth.tenant?.name}
          </p>
        </div>
        
        <button class="w-full text-left px-3 py-2 text-sm text-gray-700 
                       hover:bg-gray-100 rounded transition-colors">
          Settings
        </button>
        <button class="w-full text-left px-3 py-2 text-sm text-gray-700 
                       hover:bg-gray-100 rounded transition-colors">
          Switch Tenant
        </button>
        <hr class="my-2 border-gray-100" />
        <button class="w-full text-left px-3 py-2 text-sm text-red-600 
                       hover:bg-red-50 rounded transition-colors">
          Sign Out
        </button>
      </div>
    {/if}
  </div>
</header>