<!-- src/lib/components/auth/BusinessSelection.svelte -->
<script lang="ts">
  import { useAuth } from '$lib/stores/auth.svelte';
  import { goto } from '$app/navigation';
  import CreateBusinessModal from '../settings/CreateBusinessModal.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  const auth = useAuth();
  
  let showCreateModal = $state(false);
  
  function selectBusiness(tenant: any) {
    auth.setTenant(tenant);
    goto('/my-day'); // Redirect to main app
  }
  
  function openCreateModal() {
    showCreateModal = true;
  }
  
  // Handle when business is created in modal
  function handleBusinessCreated() {
    showCreateModal = false;
    // User will be automatically redirected by the auth state change
  }
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
    <!-- Header -->
    <div class="text-center mb-6">
      <div class="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
        <Icon name="building" class="w-8 h-8 text-blue-600" />
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Choose Your Business</h1>
      <p class="text-gray-600">
        {#if auth.user?.email}
          Welcome back, {auth.user.email}
        {:else}
          Welcome back
        {/if}
      </p>
    </div>
    
    <!-- Business List -->
    {#if auth.tenants && auth.tenants.length > 0}
      <div class="space-y-3 mb-6">
        {#each auth.tenants as tenant}
          <button
            onclick={() => selectBusiness(tenant)}
            class="w-full p-4 text-left bg-gray-50 border border-gray-200 rounded-lg 
                   hover:bg-gray-100 hover:border-gray-300 focus:outline-none focus:ring-2 
                   focus:ring-blue-500 focus:border-blue-500 transition-all group"
          >
            <div class="flex items-center gap-3">
              <!-- Business Avatar -->
              <div class="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 
                          flex items-center justify-center text-white font-semibold">
                {tenant.name.charAt(0).toUpperCase()}
              </div>
              
              <!-- Business Info -->
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {tenant.name}
                </p>
                <p class="text-sm text-gray-500">
                  {#if tenant.type}
                    {tenant.type.charAt(0).toUpperCase() + tenant.type.slice(1)} • Full Access
                  {:else}
                    Full Access
                  {/if}
                </p>
              </div>
              
              <!-- Arrow -->
              <Icon name="chevronRight" class="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
          </button>
        {/each}
      </div>
    {:else}
      <!-- No businesses message -->
      <div class="text-center py-8 mb-6">
        <div class="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Icon name="building" class="w-6 h-6 text-gray-400" />
        </div>
        <p class="text-gray-500 font-medium">No businesses found</p>
        <p class="text-sm text-gray-400 mt-1">Create your first business to get started</p>
      </div>
    {/if}
    
    <!-- Actions -->
    <div class="space-y-3">
      <button
        onclick={openCreateModal}
        class="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
               focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
               flex items-center justify-center gap-2"
      >
        <Icon name="plus" class="w-5 h-5" />
        Create New Business
      </button>
      
      <button
        onclick={() => auth.signOut()}
        class="w-full p-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 
               focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
      >
        Sign Out
      </button>
    </div>
    
    <!-- Help Text -->
    <div class="mt-6 text-center">
      <p class="text-xs text-gray-500">
        Need access to an existing business? 
        <button class="text-blue-600 hover:underline">Contact your administrator</button>
      </p>
    </div>
  </div>
</div>

<!-- Create Business Modal -->
<CreateBusinessModal 
  bind:open={showCreateModal} 
  on:businessCreated={handleBusinessCreated}
/>