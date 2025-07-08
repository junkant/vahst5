<!-- src/routes/invite/[code]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { getInviteByCode, logInviteView, updateInviteStatus } from '$lib/firebase/invites';
  import { formatInviteCode, formatRole, getDaysUntilExpiry } from '$lib/utils/invites';
  import Icon from '$lib/components/icons/Icon.svelte';
  import type { TeamInvite } from '$lib/types/invites';
  
  const auth = useAuth();
  const tenant = useTenant();
  
  let inviteCode = $state($page.params.code);
  let status = $state<'loading' | 'signin' | 'preview' | 'accepting' | 'success' | 'error'>('loading');
  let error = $state<string | null>(null);
  let inviteDetails = $state<TeamInvite | null>(null);
  
  onMount(async () => {
    await loadInviteDetails();
  });
  
  async function loadInviteDetails() {
    try {
      // Format the code properly
      const formattedCode = formatInviteCode(inviteCode);
      
      // Try to get enhanced invite details first
      inviteDetails = await getInviteByCode(formattedCode);
      
      if (inviteDetails) {
        // Validate invite status
        if (inviteDetails.status === 'accepted') {
          status = 'error';
          error = 'This invitation has already been used';
          return;
        }
        
        if (inviteDetails.status === 'expired' || new Date() > inviteDetails.expiresAt) {
          status = 'error';
          error = 'This invitation has expired';
          if (inviteDetails.status !== 'expired') {
            await updateInviteStatus(inviteDetails.id, inviteDetails.tenantId, 'expired');
          }
          return;
        }
        
        if (inviteDetails.status === 'cancelled') {
          status = 'error';
          error = 'This invitation has been cancelled';
          return;
        }
        
        if (inviteDetails.status === 'pending_approval') {
          status = 'error';
          error = 'This invitation is pending approval from a manager';
          return;
        }
        
        // Log view
        await logInviteView(inviteDetails.id, inviteDetails.tenantId);
      }
      
      // Check authentication status
      if (!auth.user) {
        status = 'signin';
      } else if (inviteDetails) {
        status = 'preview';
      } else {
        // Fall back to direct acceptance if no enhanced details
        await acceptInvite();
      }
    } catch (err) {
      console.error('Error loading invite:', err);
      status = 'error';
      error = 'Failed to load invitation details';
    }
  }
  
  async function acceptInvite() {
    if (!auth.user) return;
    
    status = 'accepting';
    error = null;
    
    try {
      // Check email match if we have invite details
      if (inviteDetails && auth.user.email?.toLowerCase() !== inviteDetails.recipientEmail.toLowerCase()) {
        status = 'error';
        error = `This invitation is for ${inviteDetails.recipientEmail}. Please sign in with that email address.`;
        return;
      }
      
      // Use the existing tenant store method
      const result = await tenant.acceptInvite(inviteCode, auth.user);
      
      if (result.success) {
        status = 'success';
        
        // Update invite status if we have details
        if (inviteDetails) {
          try {
            const { acceptTeamInvite } = await import('$lib/firebase/invites');
            await acceptTeamInvite(inviteDetails.id, inviteDetails.tenantId, auth.user.uid);
          } catch (err) {
            console.error('Failed to update invite status:', err);
          }
        }
        
        // Reload user's tenants
        await auth.refreshTenants?.() || tenant.initialize(auth.user);
        
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
    goto('/login?invite=' + inviteCode);
  }
  
  async function signUp() {
    // Store the invite code for after signup
    sessionStorage.setItem('pendingInvite', inviteCode);
    goto('/register?invite=' + inviteCode);
  }
</script>

<svelte:head>
  <title>{inviteDetails ? `Join ${inviteDetails.tenantName}` : 'Team Invitation'} - Vahst</title>
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
          <p class="text-gray-600">Loading invitation...</p>
        </div>
        
      {:else if status === 'signin'}
        <!-- Sign In Required -->
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <Icon name="userPlus" class="w-8 h-8 text-yellow-600" />
          </div>
          
          {#if inviteDetails}
            <!-- Show invite details even when not signed in -->
            <h2 class="text-xl font-semibold text-gray-900 mb-2">
              Join {inviteDetails.tenantName}
            </h2>
            <p class="text-gray-600 mb-4">
              You've been invited by {inviteDetails.createdBy.name}
            </p>
            
            {#if inviteDetails.personalMessage}
              <div class="mb-4 p-3 bg-blue-50 rounded-lg text-left">
                <p class="text-sm text-blue-900 italic">"{inviteDetails.personalMessage}"</p>
              </div>
            {/if}
            
            <div class="bg-gray-50 rounded-lg p-3 mb-6 text-left space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Your email:</span>
                <span class="font-medium">{inviteDetails.recipientEmail}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Role:</span>
                <span class="font-medium">{formatRole(inviteDetails.invitedRole)}</span>
              </div>
            </div>
          {:else}
            <h2 class="text-xl font-semibold text-gray-900 mb-2">Sign In Required</h2>
            <p class="text-gray-600 mb-6">
              Please sign in or create an account to accept this invitation.
            </p>
          {/if}
          
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
        
      {:else if status === 'preview' && inviteDetails}
        <!-- Preview Invitation (user is signed in) -->
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <Icon name="userPlus" class="w-8 h-8 text-blue-600" />
          </div>
          
          <h2 class="text-xl font-semibold text-gray-900 mb-2">
            Join {inviteDetails.tenantName}
          </h2>
          <p class="text-gray-600 mb-4">
            {inviteDetails.createdBy.name} invited you to join the team
          </p>
          
          {#if inviteDetails.personalMessage}
            <div class="mb-4 p-3 bg-blue-50 rounded-lg text-left">
              <p class="text-sm text-blue-900 italic">"{inviteDetails.personalMessage}"</p>
            </div>
          {/if}
          
          <div class="bg-gray-50 rounded-lg p-3 mb-6 text-left space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Your email:</span>
              <span class="font-medium">{inviteDetails.recipientEmail}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Role:</span>
              <span class="font-medium">{formatRole(inviteDetails.invitedRole)}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Expires:</span>
              <span class="font-medium {getDaysUntilExpiry(inviteDetails.expiresAt) <= 2 ? 'text-orange-600' : ''}">
                {#if getDaysUntilExpiry(inviteDetails.expiresAt) === 0}
                  Today
                {:else if getDaysUntilExpiry(inviteDetails.expiresAt) === 1}
                  Tomorrow
                {:else}
                  In {getDaysUntilExpiry(inviteDetails.expiresAt)} days
                {/if}
              </span>
            </div>
          </div>
          
          {#if auth.user?.email?.toLowerCase() !== inviteDetails.recipientEmail.toLowerCase()}
            <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p class="text-sm text-yellow-800">
                You're signed in as <strong>{auth.user?.email}</strong>. 
                This invitation is for <strong>{inviteDetails.recipientEmail}</strong>.
              </p>
            </div>
          {/if}
          
          <button
            onclick={acceptInvite}
            disabled={auth.user?.email?.toLowerCase() !== inviteDetails.recipientEmail.toLowerCase()}
            class="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-xl
                   hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
                   focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Accept Invitation
          </button>
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
            You've successfully joined {inviteDetails?.tenantName || 'the team'}. 
            Redirecting you to your dashboard...
          </p>
        </div>
        
      {:else if status === 'error'}
        <!-- Error -->
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <Icon name="alertCircle" class="w-8 h-8 text-red-600" />
          </div>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">
            {error?.includes('expired') ? 'Invitation Expired' : 'Invalid Invitation'}
          </h2>
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