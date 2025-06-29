<!-- src/routes/(app)/settings/profile/+page.svelte -->
<script lang="ts">
  import { useAuth } from '$lib/stores/auth.svelte';
  
  const auth = useAuth();
</script>

<div class="space-y-6">
  <div class="space-y-0.5">
    <h2 class="text-2xl font-bold tracking-tight">Profile</h2>
    <p class="text-gray-600">
      Manage your account information
    </p>
  </div>

  {#if auth.user}
    <div class="space-y-4">
      <!-- User Info -->
      <div class="rounded-lg border p-6 space-y-4">
        <h3 class="text-lg font-medium">Account Information</h3>
        
        <div class="space-y-3">
          <div>
            <p class="text-sm font-medium text-gray-500">Email</p>
            <p class="text-gray-900">{auth.user.email}</p>
          </div>
          
          <div>
            <p class="text-sm font-medium text-gray-500">User ID</p>
            <p class="text-sm text-gray-600 font-mono">{auth.user.uid}</p>
          </div>
          
          <div>
            <p class="text-sm font-medium text-gray-500">Account Created</p>
            <p class="text-gray-900">
              {auth.user.metadata.creationTime ? 
                new Date(auth.user.metadata.creationTime).toLocaleDateString() : 
                'Unknown'}
            </p>
          </div>
        </div>
      </div>

      <!-- Tenant Info -->
      {#if auth.tenant}
        <div class="rounded-lg border p-6 space-y-4">
          <h3 class="text-lg font-medium">Organization</h3>
          
          <div class="space-y-3">
            <div>
              <p class="text-sm font-medium text-gray-500">Company Name</p>
              <p class="text-gray-900">{auth.tenant.name}</p>
            </div>
            
            <div>
              <p class="text-sm font-medium text-gray-500">Plan</p>
              <p class="text-gray-900 capitalize">{auth.tenant.plan}</p>
            </div>
            
            <div>
              <p class="text-sm font-medium text-gray-500">Role</p>
              <p class="text-gray-900 capitalize">{auth.userRole || 'Member'}</p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Actions -->
      <div class="space-y-3">
        <button
          class="w-full btn-secondary"
          onclick={() => console.log('Edit profile')}
        >
          Edit Profile
        </button>
        
        <button
          class="w-full btn-secondary text-red-600 hover:bg-red-50"
          onclick={() => auth.signOut()}
        >
          Sign Out
        </button>
      </div>
    </div>
  {:else}
    <p class="text-gray-500">Not signed in</p>
  {/if}
</div>