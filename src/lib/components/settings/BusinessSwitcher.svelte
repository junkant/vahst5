<!-- src/lib/components/settings/BusinessSwitcher.svelte -->
<script lang="ts">
  import { useAuth } from '$lib/stores/auth.svelte';
  import { goto } from '$app/navigation';
  import { toast } from '$lib/utils/toast';
  
  const auth = useAuth();
  
  let isLoading = $state(false);
  let showConfirmDialog = $state(false);
  let selectedBusiness = $state<any>(null);
  
  // Get user's role for each business
  function getUserRole(tenantId: string): string {
    // This will come from the userTenants data
    const roles: Record<string, string> = {
      'owner': 'Owner',
      'admin': 'Administrator', 
      'manager': 'Manager',
      'technician': 'Technician'
    };
    
    // For now, return from available data
    return roles[auth.tenants.find(t => t.id === tenantId)?.userRole || 'technician'] || 'Team Member';
  }
  
  function handleBusinessSelect(business: any) {
    if (business.id === auth.tenant?.id) return;
    
    selectedBusiness = business;
    showConfirmDialog = true;
  }
  
  async function confirmSwitch() {
    if (!selectedBusiness) return;
    
    isLoading = true;
    try {
      auth.setTenant(selectedBusiness);
      toast.success(`Switched to ${selectedBusiness.name}`);
      
      // Reload the current page to refresh data
      window.location.reload();
    } catch (error) {
      toast.error('Failed to switch business');
      console.error('Business switch error:', error);
    } finally {
      isLoading = false;
      showConfirmDialog = false;
    }
  }
  
  function cancelSwitch() {
    showConfirmDialog = false;
    selectedBusiness = null;
  }
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200">
  <div class="p-6">
    <h3 class="text-lg font-medium text-gray-900 mb-1">Business Account</h3>
    <p class="text-sm text-gray-600 mb-6">
      Manage your business accounts and switch between them
    </p>
    
    <div class="space-y-3">
      {#each auth.tenants as business}
        <div 
          class="relative border rounded-lg p-4 transition-all
                 {business.id === auth.tenant?.id 
                   ? 'border-blue-500 bg-blue-50' 
                   : 'border-gray-200 hover:border-gray-300 cursor-pointer'}"
          onclick={() => handleBusinessSelect(business)}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && handleBusinessSelect(business)}
        >
          <!-- Current Business Indicator -->
          {#if business.id === auth.tenant?.id}
            <div class="absolute top-2 right-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Current
              </span>
            </div>
          {/if}
          
          <div class="pr-20">
            <h4 class="font-medium text-gray-900">{business.name}</h4>
            <p class="text-sm text-gray-600 mt-1">
              {getUserRole(business.id)} • {business.plan} plan
            </p>
          </div>
          
          {#if business.id !== auth.tenant?.id}
            <div class="absolute right-4 top-1/2 -translate-y-1/2">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          {/if}
        </div>
      {/each}
    </div>
    
    <!-- Add New Business -->
    <div class="mt-6 pt-6 border-t border-gray-200">
      <button
        onclick={() => goto('/onboarding/new-business')}
        class="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
      >
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create New Business
      </button>
    </div>
  </div>
</div>

<!-- Confirmation Dialog -->
{#if showConfirmDialog && selectedBusiness}
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
      <div class="p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          Switch Business Account?
        </h3>
        <p class="text-sm text-gray-600 mb-6">
          You're about to switch from <strong>{auth.tenant?.name}</strong> to <strong>{selectedBusiness.name}</strong>. 
          This will reload the page with the new business data.
        </p>
        
        <div class="flex gap-3 justify-end">
          <button
            onclick={cancelSwitch}
            disabled={isLoading}
            class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onclick={confirmSwitch}
            disabled={isLoading}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {#if isLoading}
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            {/if}
            Switch Business
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}