<!-- src/lib/components/team/InviteTeamMemberModal.svelte - COMPLETE FIXED VERSION -->
<script lang="ts">
  import { createDialog, melt } from '@melt-ui/svelte';
  import { fade, scale } from 'svelte/transition';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { USER_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, type UserRole } from '$lib/constants/roles';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  interface Props {
    open?: boolean;
    onSuccess?: () => void;
  }
  
  let { open = $bindable(false), onSuccess }: Props = $props();
  
  const tenant = useTenant();
  const auth = useAuth();
  
  // Form state - default to team_member role
  let email = $state('');
  let role = $state<UserRole>(USER_ROLES.TEAM_MEMBER);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let inviteLink = $state<string | null>(null);
  
  // Available roles for invitation (exclude owner since only one owner should exist initially)
  const invitableRoles: UserRole[] = [USER_ROLES.MANAGER, USER_ROLES.TEAM_MEMBER];
  
  // Dialog
  const {
    elements: { trigger, overlay, content, title, description, close },
    states: { open: dialogOpen }
  } = createDialog({
    role: 'dialog',
    closeOnOutsideClick: false,
    closeOnEscape: true,
    preventScroll: true
  });
  
  // Sync open prop with dialog state
  $effect(() => {
    $dialogOpen = open;
  });
  
  $effect(() => {
    open = $dialogOpen;
  });
  
  // Form validation
  const isValidEmail = $derived(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  });
  
  async function handleSubmit(e: Event) {
    e.preventDefault();
    
    if (!isValidEmail) {
      error = 'Please enter a valid email address';
      return;
    }
    
    isLoading = true;
    error = null;
    inviteLink = null;
    
    try {
      const result = await tenant.inviteTeamMember(
        email.trim(),
        role,
        { 
          id: auth.user!.uid, 
          name: auth.user?.displayName || auth.user?.email || 'Team Admin' 
        }
      );
      
      if (result.success && result.invite) {
        // Generate invite link
        const baseUrl = window.location.origin;
        inviteLink = `${baseUrl}/invite/${result.invite.code}`;
        
        // Clear form for next invite
        email = '';
        role = USER_ROLES.TEAM_MEMBER;
        
        // Notify parent
        onSuccess?.();
      } else {
        error = result.error || 'Failed to send invite';
      }
    } catch (err) {
      console.error('Failed to invite team member:', err);
      error = err instanceof Error ? err.message : 'Failed to send invitation';
    } finally {
      isLoading = false;
    }
  }
  
  function copyInviteLink() {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      // You could show a toast here
    }
  }
  
  function closeModal() {
    open = false;
    // Reset form state
    email = '';
    role = USER_ROLES.TEAM_MEMBER;
    error = null;
    inviteLink = null;
  }
</script>

{#if $dialogOpen}
  <div use:melt={$overlay} class="fixed inset-0 z-50 bg-black/50" transition:fade={{ duration: 150 }}>
    <div
      use:melt={$content}
      class="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] 
             translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg"
      transition:scale={{ duration: 150, start: 0.95 }}
    >
      <!-- Header -->
      <div class="mb-6">
        <h2 use:melt={$title} class="text-lg font-semibold">
          Invite Team Member
        </h2>
        <p use:melt={$description} class="text-sm text-gray-600 mt-1">
          Invite someone to join your team
        </p>
        <button
          use:melt={$close}
          aria-label="Close"
          class="absolute right-4 top-4 p-1 rounded-lg hover:bg-gray-100"
        >
          <Icon name="x" class="w-5 h-5" />
        </button>
      </div>
      
      <!-- Content -->
      {#if inviteLink}
        <!-- Success State -->
        <div class="space-y-4">
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <Icon name="checkCircle" class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div class="flex-1">
                <p class="text-sm font-medium text-green-900">
                  Invitation created successfully!
                </p>
                <p class="text-sm text-green-700 mt-1">
                  Share this link with your team member:
                </p>
              </div>
            </div>
          </div>
          
          <!-- Invite Link -->
          <div class="relative">
            <input
              type="text"
              value={inviteLink}
              readonly
              class="w-full px-3 py-2 pr-24 border border-gray-300 rounded-lg bg-gray-50 
                     text-sm text-gray-600 font-mono"
            />
            <button
              onclick={copyInviteLink}
              class="absolute right-1 top-1 px-3 py-1 bg-blue-600 text-white text-sm 
                     rounded-md hover:bg-blue-700 transition-colors"
            >
              Copy
            </button>
          </div>
          
          <p class="text-xs text-gray-500">
            This link expires in 7 days. The recipient must use the email address: 
            <span class="font-medium">{email}</span>
          </p>
          
          <!-- Actions -->
          <div class="flex gap-3 mt-6">
            <button
              onclick={closeModal}
              class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg
                     hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            <button
              onclick={() => inviteLink = null}
              class="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg
                     hover:bg-blue-700 transition-colors"
            >
              Invite Another
            </button>
          </div>
        </div>
      {:else}
        <!-- Form -->
        <form onsubmit={handleSubmit} class="space-y-4">
          <!-- Error Display -->
          {#if error}
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
              <p class="text-sm text-red-700">{error}</p>
            </div>
          {/if}
          
          <!-- Email Input -->
          <div>
            <label for="invite-email" class="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              bind:value={email}
              required
              disabled={isLoading}
              placeholder="colleague@company.com"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          
          <!-- Role Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <div class="space-y-2">
              {#each invitableRoles as roleOption}
                <label 
                  for="role-{roleOption}"
                  class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer 
                         hover:bg-gray-50 transition-colors
                         {role === roleOption ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}"
                >
                  <input
                    id="role-{roleOption}"
                    type="radio"
                    name="role"
                    value={roleOption}
                    bind:group={role}
                    disabled={isLoading}
                    class="sr-only"
                  />
                  <div class="flex items-center">
                    <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center
                                {role === roleOption 
                                  ? 'border-blue-600 bg-blue-600' 
                                  : 'border-gray-300 bg-white'}">
                      {#if role === roleOption}
                        <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                      {/if}
                    </div>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">
                      {ROLE_LABELS[roleOption]}
                    </p>
                    <p class="text-xs text-gray-500 mt-0.5">
                      {ROLE_DESCRIPTIONS[roleOption]}
                    </p>
                  </div>
                </label>
              {/each}
            </div>
            <p class="text-xs text-gray-500 mt-2">
              Note: To transfer ownership, use the team management page after the member joins.
            </p>
          </div>
          
          <!-- Actions -->
          <div class="flex gap-3">
            <button
              type="button"
              onclick={closeModal}
              disabled={isLoading}
              class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 
                     font-medium rounded-lg transition-colors disabled:opacity-50 
                     disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValidEmail || isLoading}
              class="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg
                     hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
                     focus:ring-offset-2 transition-colors disabled:opacity-50 
                     disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {#if isLoading}
                <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Creating...
              {:else}
                Create Invitation
              {/if}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}