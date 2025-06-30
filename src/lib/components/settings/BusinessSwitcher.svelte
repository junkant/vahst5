<!-- src/lib/components/settings/BusinessSwitcher.svelte -->
<script lang="ts">
  import { useAuth } from '$lib/stores/auth.svelte';
  import CreateBusinessModal from './CreateBusinessModal.svelte';
  
  const auth = useAuth();
  
  let isExpanded = $state(false);
  let showLinkModal = $state(false);
  let showCreateModal = $state(false);
  
  function switchBusiness(tenant: any) {
    if (tenant && tenant.id !== auth.tenant?.id) {
      auth.setTenant(tenant);
      console.log('Switched to business:', tenant.name);
    }
  }
  
  function toggleExpanded() {
    isExpanded = !isExpanded;
  }
  
  function openLinkModal() {
    showLinkModal = true;
  }
  
  function openCreateModal() {
    showCreateModal = true;
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
              <p class="text-sm text-gray-600">Full Access</p>
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
            {#each auth.tenants as tenant}
              {#if tenant.id !== auth.tenant?.id}
                <button
                  onclick={() => switchBusiness(tenant)}
                  class="w-full p-3 text-left bg-white border border-gray-200 rounded-lg 
                         hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 
                         transition-colors"
                >
                  <div class="flex items-center gap-3">
                    <!-- Business Avatar -->
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 
                                flex items-center justify-center text-white font-semibold text-xs">
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <!-- Business Info -->
                    <div class="flex-1">
                      <p class="font-medium text-gray-900">{tenant.name}</p>
                      <p class="text-sm text-gray-500">Full Access</p>
                    </div>
                    
                    <!-- Switch Arrow -->
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
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
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.1a9.04 9.04 0 002.668-6.56l-3.77-3.771zm8.5-8.5a4 4 0 00-5.656 0l-1.102 1.1a9.04 9.04 0 00-2.668 6.56l3.77 3.771a4 4 0 005.656 0l4-4z" />
                </svg>
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900">Link Another Account</p>
                <p class="text-sm text-gray-500">Connect to an existing business</p>
              </div>
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
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
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900">Create New Business</p>
                <p class="text-sm text-gray-500">Set up a new business account</p>
              </div>
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  {:else}
    <!-- No Business Selected -->
    <div class="text-center py-6">
      <div class="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <p class="text-gray-500 font-medium">No business selected</p>
      <p class="text-sm text-gray-400 mt-1">Please contact your administrator to get access</p>
    </div>
  {/if}
  
  <!-- Voice Command Tip -->
  <div class="bg-gray-50 rounded-lg p-3">
    <div class="flex items-start gap-2">
      <svg class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
      <div>
        <p class="text-sm font-medium text-gray-700">Voice Command Tip</p>
        <p class="text-xs text-gray-600 mt-1">
          Say "which business" to hear your current business, or "help" for all voice commands
        </p>
      </div>
    </div>
  </div>
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
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Invitation Code or Email
            </label>
            <input
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            onclick={() => showLinkModal = false}
            class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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