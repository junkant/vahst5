<!-- src/lib/components/invites/CreateInviteModal.svelte -->
<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { createInvite } from '$lib/firebase/invites';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import QRDisplay from './QRDisplay.svelte';
  import CopyButtons from './CopyButtons.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { USER_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, type UserRole } from '$lib/constants/roles';
  import type { TeamInvite } from '$lib/types/invites';
  
  interface Props {
    open?: boolean;
    onSuccess?: () => void;
  }
  
  let { open = $bindable(false), onSuccess }: Props = $props();
  
  const tenant = useTenant();
  const auth = useAuth();
  
  let stage = $state<'input' | 'created'>('input');
  let invite = $state<TeamInvite | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  
  // Form data
  let formData = $state({
    email: '',
    name: '',
    phone: '',
    role: 'team_member' as UserRole,
    message: '',
    template: 'casual' as 'casual' | 'formal'
  });
  
  // Available roles for invitation
  const availableRoles = [
    {
      value: USER_ROLES.MANAGER,
      label: ROLE_LABELS[USER_ROLES.MANAGER],
      description: ROLE_DESCRIPTIONS[USER_ROLES.MANAGER]
    },
    {
      value: USER_ROLES.TEAM_MEMBER,
      label: ROLE_LABELS[USER_ROLES.TEAM_MEMBER],
      description: ROLE_DESCRIPTIONS[USER_ROLES.TEAM_MEMBER]
    }
  ];
  
  // Email validation
  const isValidEmail = $derived(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(formData.email.trim());
  });
  
  // Reset modal when closing
  $effect(() => {
    if (!open) {
      setTimeout(() => {
        stage = 'input';
        invite = null;
        formData = {
          email: '',
          name: '',
          phone: '',
          role: 'team_member',
          message: '',
          template: 'casual'
        };
        error = null;
      }, 200);
    }
  });
  
  async function handleCreate(e: Event) {
    e.preventDefault();
    
    if (!isValidEmail) {
      error = 'Please enter a valid email address';
      return;
    }
    
    if (!tenant.current || !auth.user) {
      error = 'No tenant selected. Please refresh the page and try again.';
      return;
    }
    
    isLoading = true;
    error = null;
    
    try {
      // Get current user's role
      const currentUserRole = tenant.userRole || 'team_member';
      
      invite = await createInvite(
        tenant.current.id,
        tenant.current.name,
        formData,
        {
          uid: auth.user.uid,
          displayName: auth.user.displayName,
          email: auth.user.email,
          role: currentUserRole
        }
      );
      
      stage = 'created';
      onSuccess?.();
      
    } catch (err) {
      console.error('Failed to create invitation:', err);
      error = err instanceof Error ? err.message : 'Failed to create invitation';
    } finally {
      isLoading = false;
    }
  }
  
  function startNewInvite() {
    stage = 'input';
    invite = null;
    formData = {
      email: '',
      name: '',
      phone: '',
      role: 'team_member',
      message: '',
      template: 'casual'
    };
    error = null;
  }
  
  function closeModal() {
    open = false;
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black/50 z-50" transition:fade={{ duration: 150 }}>
    <div
      class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
             bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-50"
      transition:scale={{ start: 0.95, duration: 150 }}
    >
      {#if stage === 'input'}
        <!-- Input Form Stage -->
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900">
              Invite Team Member
            </h2>
            <button
              onclick={closeModal}
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <Icon name="x" class="w-5 h-5" />
            </button>
          </div>
          
          <!-- Form -->
          <form onsubmit={handleCreate} class="space-y-4">
            {#if error}
              <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            {/if}
            
            <div>
              <label for="invite-email" class="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                id="invite-email"
                type="email"
                bind:value={formData.email}
                required
                disabled={isLoading}
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                       disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="colleague@company.com"
              />
            </div>
            
            <div>
              <label for="invite-name" class="block text-sm font-medium text-gray-700 mb-1">
                Name <span class="text-gray-500">(Optional)</span>
              </label>
              <input
                id="invite-name"
                type="text"
                bind:value={formData.name}
                disabled={isLoading}
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                       disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="John Smith"
              />
            </div>
            
            <div>
              <label for="invite-phone" class="block text-sm font-medium text-gray-700 mb-1">
                Phone <span class="text-gray-500">(Optional)</span>
              </label>
              <input
                id="invite-phone"
                type="tel"
                bind:value={formData.phone}
                disabled={isLoading}
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                       disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <!-- Role selection -->
            <fieldset>
              <legend class="text-sm font-medium text-gray-700 mb-2">Role</legend>
              <div class="space-y-2">
                {#each availableRoles as role}
                  <label class="flex items-start p-3 border rounded-lg cursor-pointer 
                                hover:bg-gray-50 transition-colors
                                {formData.role === role.value ? 'border-blue-500 bg-blue-50' : ''}">
                    <input
                      type="radio"
                      bind:group={formData.role}
                      value={role.value}
                      disabled={isLoading}
                      class="mt-1"
                    />
                    <div class="ml-3">
                      <div class="font-medium">{role.label}</div>
                      <div class="text-sm text-gray-600">{role.description}</div>
                    </div>
                  </label>
                {/each}
              </div>
            </fieldset>
            
            <!-- Personal message -->
            <div>
              <label for="invite-message" class="block text-sm font-medium text-gray-700 mb-1">
                Personal Message <span class="text-gray-500">(Optional)</span>
              </label>
              <textarea
                id="invite-message"
                bind:value={formData.message}
                rows="3"
                disabled={isLoading}
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                       disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Looking forward to having you on the team!"
              ></textarea>
            </div>
            
            <!-- Message template -->
            <fieldset>
              <legend class="text-sm font-medium text-gray-700 mb-2">
                Message Style
              </legend>
              <div class="flex gap-2">
                <label class="flex-1">
                  <input
                    type="radio"
                    bind:group={formData.template}
                    value="casual"
                    disabled={isLoading}
                    class="sr-only"
                  />
                  <div class="p-3 border rounded-lg cursor-pointer text-center transition-all
                              {formData.template === 'casual' 
                                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                : 'hover:bg-gray-50'}">
                    <Icon name="smile" class="w-5 h-5 mx-auto mb-1" />
                    <span class="text-sm font-medium">Casual</span>
                  </div>
                </label>
                
                <label class="flex-1">
                  <input
                    type="radio"
                    bind:group={formData.template}
                    value="formal"
                    disabled={isLoading}
                    class="sr-only"
                  />
                  <div class="p-3 border rounded-lg cursor-pointer text-center transition-all
                              {formData.template === 'formal' 
                                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                : 'hover:bg-gray-50'}">
                    <Icon name="briefcase" class="w-5 h-5 mx-auto mb-1" />
                    <span class="text-sm font-medium">Formal</span>
                  </div>
                </label>
              </div>
            </fieldset>
            
            <!-- Actions -->
            <div class="flex gap-3 pt-4">
              <button
                type="button"
                onclick={closeModal}
                disabled={isLoading}
                class="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 
                       font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValidEmail || isLoading}
                class="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg
                       hover:bg-blue-700 transition-colors disabled:opacity-50 
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
        </div>
        
      {:else if stage === 'created' && invite}
        <!-- Success state with sharing options -->
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900">
              Invitation Ready!
            </h2>
            <button
              onclick={closeModal}
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <Icon name="x" class="w-5 h-5" />
            </button>
          </div>
          
          <!-- Success message -->
          <div class="text-center mb-6">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon name="check" class="w-8 h-8 text-green-600" />
            </div>
            <p class="text-gray-600">
              Invitation created for <strong>{invite.recipientEmail}</strong>
            </p>
            <p class="text-sm text-gray-500 mt-1">
              Invite code: <span class="font-mono font-bold">{invite.code}</span>
            </p>
          </div>
          
          <!-- QR Code -->
          <div class="mb-6">
            <QRDisplay {invite} />
          </div>
          
          <!-- Copy options -->
          <div class="mb-6">
            <CopyButtons {invite} />
          </div>
          
          <!-- Actions -->
          <div class="flex gap-3 pt-4 border-t">
            <button
              onclick={startNewInvite}
              class="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 
                     font-medium rounded-lg transition-colors"
            >
              Create Another
            </button>
            <button
              onclick={closeModal}
              class="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg
                     hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}