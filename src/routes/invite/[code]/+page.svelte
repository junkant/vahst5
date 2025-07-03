<!-- src/routes/invite/[code]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const auth = useAuth();
  const tenant = useTenant();
  
  let inviteCode = $state($page.params.code);
  let status = $state<'loading' | 'signin' | 'accepting' | 'success' | 'error'>('loading');
  let error = $state<string | null>(null);
  let inviteDetails = $state<any>(null);
  
  onMount(async () => {
    // Check if user is authenticated
    if (!auth.user) {
      status = 'signin';
      return;
    }
    
    // Try to accept the invite
    await acceptInvite();
  });
  
  async function acceptInvite() {
    if (!auth.user) return;
    
    status = 'accepting';
    error = null;
    
    try {
      const result = await tenant.acceptInvite(inviteCode, auth.user);
      
      if (result.success) {
        status = 'success';
        // Reload user's tenants
        await auth.refreshTenants();
        
        // Redirect after a short delay
        setTimeout(() => {
          goto('/select-business');
        }, 2000);
      } else {
        status = 'error';
        error = result.error || 'Failed to accept invitation';
      }
    } catch (err) {
      status = 'error';
      error = err instanceof Error ? err.message : 'An unexpected error occurred';
    }
  }
  
  async function signIn() {
    // Store the invite code for after signin
    sessionStorage.setItem('pendingInvite', inviteCode);
    goto('/login');
  }
  
  async function signUp() {
    // Store the invite code for after signup
    sessionStorage.setItem('pendingInvite', inviteCode);
    goto('/register');
  }
</script>

<svelte:head>
  <title>Team Invitation - Vahst</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-4">
        <Icon name="mail" class="w-10 h-10 text-blue-600" />
      </div>
      <h1 class="text-3xl font-bold text-gray-900">Team Invitation</h1>
    </div>
    
    <!-- Content Card -->
    <div class="bg-white rounded-2xl shadow-xl p-8">
      {#if status === 'loading'}
        <!-- Loading State -->
        <div class="text-center py-8">
          <div class="w-12 h-12 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-gray-600">Checking invitation...</p>
        </div>
        
      {:else if status === 'signin'}
        <!-- Sign In Required -->
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <Icon name="userPlus" class="w-8 h-8 text-yellow-600" />
          </div>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Sign In Required</h2>
          <p class="text-gray-600 mb-6">
            You've been invited to join a team on Vahst. Please sign in or create an account to accept this invitation.
          </p>
          
          <div class="space-y-3">
            <button
              onclick={signIn}
              class="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-xl
                     hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
                     focus:ring-offset-2 transition-colors"
            >
              Sign In to Accept
            </button>
            
            <button
              onclick={signUp}
              class="w-full px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl
                     hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 
                     focus:ring-offset-2 transition-colors"
            >
              Create New Account
            </button>
          </div>
        </div>
        
      {:else if status === 'accepting'}
        <!-- Accepting Invitation -->
        <div class="text-center py-8">
          <div class="w-12 h-12 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-gray-600">Accepting invitation...</p>
        </div>
        
      {:else if status === 'success'}
        <!-- Success -->
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <Icon name="checkCircle" class="w-8 h-8 text-green-600" />
          </div>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Welcome to the Team!</h2>
          <p class="text-gray-600">
            You've successfully joined the team. Redirecting you to your dashboard...
          </p>
        </div>
        
      {:else if status === 'error'}
        <!-- Error -->
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <Icon name="alertCircle" class="w-8 h-8 text-red-600" />
          </div>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
          <p class="text-gray-600 mb-6">
            {error || 'This invitation link is invalid or has expired.'}
          </p>
          
          <button
            onclick={() => goto('/')}
            class="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-xl
                   hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 
                   focus:ring-offset-2 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>