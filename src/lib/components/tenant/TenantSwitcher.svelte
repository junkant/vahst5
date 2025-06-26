<script>
  import { createDialog, createSelect, melt } from '@melt-ui/svelte';
  import { useAuth } from '$lib/stores/auth';
  
  const auth = useAuth();
  
  export let open = false;
  
  const dialog = createDialog({
    forceVisible: open,
    onOpenChange: ({ curr }) => {
      open = curr;
      return curr;
    }
  });
  
  const tenantSelect = createSelect({
    defaultSelected: { 
      value: auth.tenant?.id, 
      label: auth.tenant?.name 
    }
  });
  
  function handleTenantChange(selected) {
    const tenant = auth.tenants.find(t => t.id === selected.value);
    if (tenant) {
      auth.setTenant(tenant);
      open = false;
    }
  }
  
  $effect(() => {
    if ($tenantSelect.states.selected) {
      handleTenantChange($tenantSelect.states.selected);
    }
  });
</script>

{#if $dialog.states.open}
  <div use:melt={$dialog.elements.overlay} 
       class="fixed inset-0 bg-black/50 z-40"></div>
  
  <div use:melt={$dialog.elements.content}
       class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
              bg-white rounded-lg shadow-xl p-6 w-[90%] max-w-md z-50">
    
    <h2 class="text-xl font-semibold mb-4">Switch Tenant</h2>
    
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Select Tenant
        </label>
        
        <button use:melt={$tenantSelect.elements.trigger}
                class="w-full px-4 py-2 text-left bg-white border border-gray-300 
                       rounded-lg focus:outline-none focus:ring-2 
                       focus:ring-primary-500 focus:border-transparent">
          {$tenantSelect.states.selectedLabel || 'Select a tenant'}
        </button>
        
        {#if $tenantSelect.states.open}
          <div use:melt={$tenantSelect.elements.menu}
               class="absolute mt-1 w-full bg-white border border-gray-200 
                      rounded-lg shadow-lg z-50 max-h-60 overflow-auto">
            {#each auth.tenants as tenant}
              <div use:melt={$tenantSelect.elements.option({
                     value: tenant.id,
                     label: tenant.name
                   })}
                   class="px-4 py-2 hover:bg-gray-50 cursor-pointer 
                          flex items-center justify-between">
                <span>{tenant.name}</span>
                <span class="text-xs text-gray-500">{tenant.userRole}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <div class="flex gap-3 justify-end pt-4">
        <button use:melt={$dialog.elements.close}
                class="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}