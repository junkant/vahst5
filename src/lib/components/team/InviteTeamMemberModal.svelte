<!-- src/lib/components/team/InviteTeamMemberModal.svelte -->
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
      error = err instanceof Error ? err.message : 'Failed to send invite';
    } finally {
      isLoading = false;
    }
  }
  
  function copyInviteLink() {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      // You could add a toast notification here
    }
  }
  
  function closeModal() {
    if (!isLoading) {
      open = false;
      // Reset form
      email = '';
      role = USER_ROLES.TEAM_MEMBER;
      error = null;
      inviteLink = null;
    }
  }
</script>

{#if $dialogOpen}
  <div
    use:melt={$overlay}
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
    transition:fade={{ duration: 150 }}
  />
  
  <div
    use:melt={$content}
    class="fixed left-[50%] top-[50%] z-50 w-[90vw] max-w-md 
           translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-0 
           shadow-2xl overflow-hidden"
    transition:scale={{ duration: 150, start: 0.95 }}
  >
    <!-- Header -->
    <div class="px-6 py-4 border-b">
      <h2 use:melt={$title} class="text-lg font-semibold text-gray-900">
        Invite Team Member
      </h2>
      <p use:melt={$description} class="text-sm text-gray-500 mt-1">
        Send an invitation to join your team
      </p>
    </div>
    
    <!-- Content -->
    <div class="p-6">
      {#if inviteLink}
        <!-- Success State -->
        <div class="text-center py-4">
          <div class="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <Icon name="checkCircle" class="w-8 h-8 text-green-600" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Invitation Created!</h3>
          <p class="text-sm text-gray-600 mb-4">
            Share this link with the team member to join your business:
          </p>
          
          <div class="bg-gray-50 rounded-lg p-3 mb-4 flex items-center gap-2">
            <input
              type="text"
              value={inviteLink}
              readonly
              class="flex-1 bg-transparent text-sm text-gray-700 outline-none"
            />
            <button
              onclick={copyInviteLink}
              class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md
                     hover:bg-gray-50 transition-colors"
            >
              Copy
            </button>
          </div>
          
          <p class="text-xs text-gray-500 mb-4">
            Note: You'll need to manually send this link to the invited member. 
            The invitation expires in 7 days.
          </p>
          
          <div class="flex gap-3">
            <button
              onclick={() => { inviteLink = null; }}
              class="flex-1 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 
                     font-medium rounded-lg transition-colors"
            >
              Invite Another
            </button>
            <button
              onclick={closeModal}
              class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 
                     font-medium rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      {:else}
        <!-- Form State -->
        <form onsubmit={handleSubmit}>
          {#if error}
            <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <Icon name="alertCircle" class="w-4 h-4 text-red-600 flex-shrink-0" />
              <p class="text-sm text-red-800">{error}</p>
            </div>
          {/if}
          
          <!-- Email Input -->
          <div class="mb-6">
            <label for="invite-email" class="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              bind:value={email}
              placeholder="team.member@example.com"
              required
              disabled={isLoading}
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                     focus:ring-blue-500 focus:border-blue-500 transition-colors
                     disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          
          <!-- Role Selection -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Select Role
            </label>
            <div class="space-y-3">
              {#each invitableRoles as roleOption}
                <label class="relative flex items-start p-3 border-2 rounded-lg cursor-pointer
                              transition-all hover:bg-gray-50
                              {role === roleOption 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200'}">
                  <input
                    type="radio"
                    name="role"
                    value={roleOption}
                    bind:group={role}
                    disabled={isLoading}
                    class="sr-only"
                  />
                  <div class="flex items-center gap-3 w-full">
                    <div class="flex-shrink-0">
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
                <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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