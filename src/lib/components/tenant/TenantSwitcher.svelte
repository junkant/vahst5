<!-- src/lib/components/tenant/TenantSwitcher.svelte -->
<script lang="ts">
  import { useAuth } from '$lib/stores/auth.svelte';
  import { createEventDispatcher } from 'svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const auth = useAuth();
  const dispatch = createEventDispatcher();
  
  let { open = $bindable(false) } = $props();
  
  async function handleTenantChange(tenant: any) {
    if (tenant && tenant.id !== auth.tenant?.id) {
      try {
        auth.setTenant(tenant);
        open = false;
        dispatch('tenantChanged', { tenant });
      } catch (error) {
        console.error('Failed to switch tenant:', error);
      }
    }
  }
  
  function closeDialog() {
    open = false;
  }
  
  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  }
  
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeDialog();
    }
  }
  
  // Focus management for accessibility
  let dialogElement: HTMLDivElement;
  
  $effect(() => {
    if (open && dialogElement) {
      const firstButton = dialogElement.querySelector('button') as HTMLButtonElement;
      if (firstButton) {
        firstButton.focus();
      }
    }
  });
</script>

{#if open}
  <!-- Overlay with backdrop blur -->
  <div 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
    onclick={handleOverlayClick}
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="tenant-dialog-title"
    tabindex="-1"
  >
    <!-- Modal -->
    <div 
      bind:this={dialogElement}
      class="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-100">
        <div>
          <h2 id="tenant-dialog-title" class="text-xl font-semibold text-gray-900">
            Switch Business
          </h2>
          <p class="text-sm text-gray-500 mt-1">
            Choose which business to work with
          </p>
        </div>
        <button 
          onclick={closeDialog}
          class="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Close dialog"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Content -->
      <div class="p-6">
        <div class="space-y-3">
          {#if auth.tenants && auth.tenants.length > 0}
            {#each auth.tenants as tenant}
              {@const isSelected = auth.tenant?.id === tenant.id}
              <button
                onclick={() => handleTenantChange(tenant)}
                class="w-full px-4 py-4 text-left bg-white border-2 rounded-xl 
                       hover:bg-gray-50 focus:outline-none focus:ring-2 
                       focus:ring-blue-500 focus:border-blue-500 transition-all
                       {isSelected 
                         ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-20' 
                         : 'border-gray-200 hover:border-gray-300'}"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3">
                      <!-- Business Icon -->
                      <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 
                                  flex items-center justify-center text-white font-semibold text-sm">
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <!-- Business Info -->
                      <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-900 truncate">
                          {tenant.name}
                        </p>
                        <p class="text-sm text-gray-500 capitalize">
                          {tenant.plan} plan
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Selected Indicator -->
                  {#if isSelected}
                    <div class="text-blue-600">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  {/if}
                </div>
              </button>
            {/each}
          {:else}
            <div class="text-center py-8">
              <div class="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p class="text-gray-500">No businesses found</p>
              <p class="text-sm text-gray-400 mt-1">Contact your administrator</p>
            </div>
          {/if}
        </div>
        
        <!-- Footer Info -->
        {#if auth.tenants && auth.tenants.length > 1}
          <div class="mt-6 pt-4 border-t border-gray-100">
            <p class="text-xs text-gray-400 text-center">
              You have access to {auth.tenants.length} business{auth.tenants.length === 1 ? '' : 'es'}
            </p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Smooth animations */
  :global(.tenant-switcher-enter) {
    animation: fadeIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>