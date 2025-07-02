<!-- src/lib/components/settings/BusinessSwitcher.svelte -->
<script lang="ts">
  import { useAuth } from '$lib/stores/auth.svelte';
  import { goto } from '$app/navigation';
  import CreateBusinessModal from './CreateBusinessModal.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const auth = useAuth();
  
  let isExpanded = $state(false);
  let showLinkModal = $state(false);
  let showCreateModal = $state(false);
  let isSwitching = $state(false);
  let linkCode = $state('');
  
  async function switchBusiness(tenant: any) {
    if (tenant && tenant.id !== auth.tenant?.id) {
      isSwitching = true;
      try {
        await auth.setTenant(tenant);
        // Navigate to home page after switch
        await goto('/my-day');
        console.log('Switched to business:', tenant.name);
      } catch (error) {
        console.error('Failed to switch business:', error);
      } finally {
        isSwitching = false;
      }
    }
  }
  
  function toggleExpanded() {
    isExpanded = !isExpanded;
  }
  
  function openLinkModal() {
    showLinkModal = true;
    linkCode = '';
  }
  
  function openCreateModal() {
    showCreateModal = true;
  }
  
  async function handleLinkAccount() {
    // TODO: Implement account linking logic
    console.log('Linking with code:', linkCode);
    showLinkModal = false;
  }
  
  // Helper function to get user role for a tenant
  function getUserRole(tenant: any): string {
    if (!auth.user || !tenant) return 'Member';
    return tenant.ownerId === auth.user.uid ? 'Owner' : 'Member';
  }
</script>

<div class="rounded-lg border p-6 space-y-4">
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-medium">Business Access</h3>
    {#if auth.tenants && auth.tenants.length > 1}
      <button
        onclick={toggleExpanded}
        class="text-sm text-blue-600 hover:text-blue-700"
      >
        {isExpanded ? 'Show Less' : 'Show All'}
      </button>
    {/if}
  </div>
  
  <!-- Current Business -->
  {#if auth.tenant}
    <div class="space-y-3">
      <div>
        <p class="text-sm font-medium text-gray-500">Current Business</p>
        <div class="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center gap-3">
            <!-- Business Avatar -->
            <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 
                        flex items-center justify-center text-white font-semibold text-sm">
              {auth.tenant.name.charAt(0).toUpperCase()}
            </div>
            
            <!-- Business Info -->
            <div class="flex-1">
              <p class="font-medium text-gray-900">{auth.tenant.name}</p>
              <p class="text-sm text-gray-600">
                {getUserRole(auth.tenant)} • 
                {auth.tenant.plan ? auth.tenant.plan.charAt(0).toUpperCase() + auth.tenant.plan.slice(1) : 'Starter'} plan
              </p>
            </div>
            
            <!-- Current Badge -->
            <div class="px-2 py-1 bg-blue-600 text-white text-xs rounded-full font-medium">
              Current
            </div>
          </div>
        </div>
      </div>
      
      <!-- Other Businesses (when expanded) -->
      {#if isExpanded && auth.tenants && auth.tenants.length > 1}
        <div>
          <p class="text-sm font-medium text-gray-500 mb-2">Switch to</p>
          <div class="space-y-2">
            {#each auth.tenants as business}
              {#if business.id !== auth.tenant?.id}
                <button
                  onclick={() => switchBusiness(business)}
                  disabled={isSwitching}
                  class="w-full p-3 text-left bg-white border border-gray-200 rounded-lg 
                         hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div class="flex items-center gap-3">
                    <!-- Business Avatar -->
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 
                                flex items-center justify-center text-white font-semibold text-xs">
                      {business.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <!-- Business Info -->
                    <div class="flex-1">
                      <p class="font-medium text-gray-900">{business.name}</p>
                      <p class="text-sm text-gray-500">
                        {getUserRole(business)} • 
                        {business.plan ? business.plan.charAt(0).toUpperCase() + business.plan.slice(1) : 'Starter'} plan
                      </p>
                    </div>
                    
                    <!-- Switch Arrow or Loading -->
                    {#if isSwitching}
                      <div class="animate-spin h-4 w-4 border-2 border-gray-300 rounded-full border-t-blue-600"></div>
                    {:else}
                      <Icon name="chevronRight" class="w-4 h-4 text-gray-400" />
                    {/if}
                  </div>
                </button>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
      
      <!-- Business Actions -->
      <div class="pt-4 border-t border-gray-100">
        <div class="space-y-3">
          <button
            class="w-full p-3 text-left bg-gray-50 border border-gray-200 rounded-lg 
                   hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 
                   transition-colors"
            onclick={openLinkModal}
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-500 
                          flex items-center justify-center text-white">
                <Icon name="link" class="w-4 h-4" />
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900">Link Another Account</p>
                <p class="text-sm text-gray-500">Connect to an existing business</p>
              </div>
              <Icon name="chevronRight" class="w-4 h-4 text-gray-400" />
            </div>
          </button>
          
          <button
            class="w-full p-3 text-left bg-blue-50 border border-blue-200 rounded-lg 
                   hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 
                   transition-colors"
            onclick={openCreateModal}
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 
                          flex items-center justify-center text-white">
                <Icon name="plus" class="w-4 h-4" />
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900">Create New Business</p>
                <p class="text-sm text-gray-500">Set up a new business account</p>
              </div>
              <Icon name="chevronRight" class="w-4 h-4 text-gray-400" />
            </div>
          </button>
        </div>
      </div>
    </div>
  {:else}
    <!-- No Business Selected -->
    <div class="text-center py-6">
      <div class="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
        <Icon name="building" class="w-6 h-6 text-gray-400" />
      </div>
      <p class="text-gray-500 font-medium">No business selected</p>
      <p class="text-sm text-gray-400 mt-1">Please contact your administrator to get access</p>
    </div>
  {/if}
  
  <!-- Voice Command Tip -->
  {#if auth.tenant}
    <div class="bg-gray-50 rounded-lg p-3">
      <div class="flex items-start gap-2">
        <Icon name="microphone" class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p class="text-sm font-medium text-gray-700">Voice Command Tip</p>
          <p class="text-xs text-gray-600 mt-1">
            Say "which business" to hear your current business, or "help" for all voice commands
          </p>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Link Account Modal -->
{#if showLinkModal}
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">Link Another Account</h3>
        <p class="text-gray-600 mb-4">
          Enter an invitation code or email to connect to an existing business.
        </p>
        
        <div class="space-y-4">
          <div>
            <label for="invitation-input" class="block text-sm font-medium text-gray-700 mb-1">
              Invitation Code or Email
            </label>
            <input
              id="invitation-input"
              type="text"
              bind:value={linkCode}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter code or email..."
            />
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button
            onclick={() => showLinkModal = false}
            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onclick={handleLinkAccount}
            disabled={!linkCode.trim()}
            class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Link Account
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Create Business Modal -->
<CreateBusinessModal bind:open={showCreateModal} />

<style>
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>