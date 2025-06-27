<!-- src/lib/components/tenant/TenantSwitcher.svelte -->
<script>
  import { useAuth } from '$lib/stores/auth.svelte';
  
  const auth = useAuth();
  
  let { open = $bindable(false) } = $props();
  
  function handleTenantChange(tenant) {
    if (tenant) {
      auth.setTenant(tenant);
      open = false;
    }
  }
  
  function closeDialog() {
    open = false;
  }
  
  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  }
  
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      closeDialog();
    }
  }
</script>

{#if open}
  <!-- Overlay -->
  <div 
    class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
    onclick={handleOverlayClick}
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="tenant-dialog-title"
    tabindex="-1"
  >
    <!-- Modal -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 id="tenant-dialog-title" class="text-xl font-semibold">Switch Tenant</h2>
        <button 
          onclick={closeDialog}
          class="text-gray-400 hover:text-gray-600"
          aria-label="Close dialog"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Content -->
      <div class="p-4 space-y-4">
        <div>
          <p class="block text-sm font-medium text-gray-700 mb-3">
            Select Tenant
          </p>
          
          <div class="space-y-2">
            {#if auth.tenants && auth.tenants.length > 0}
              {#each auth.tenants as tenant}
                <button
                  onclick={() => handleTenantChange(tenant)}
                  class="w-full px-4 py-3 text-left bg-white border border-gray-200 
                         rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 
                         focus:ring-blue-500 transition-colors
                         {auth.tenant?.id === tenant.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''}"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-medium">{tenant.name}</span>
                    <span class="text-xs text-gray-500">{tenant.userRole}</span>
                  </div>
                </button>
              {/each}
            {:else}
              <p class="text-sm text-gray-500 text-center py-4">
                No tenants available
              </p>
            {/if}
          </div>
        </div>
        
        <div class="flex gap-3 justify-end pt-4 border-t border-gray-200">
          <button
            onclick={closeDialog}
            class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}