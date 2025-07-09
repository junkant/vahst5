<!-- src/lib/components/invites/ApproveInviteModal.svelte -->
<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { approveInvite } from '$lib/firebase/invites';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
  import { formatRole, formatDate } from '$lib/utils/invites';
  import type { TeamInvite } from '$lib/types/invites';
  
  interface Props {
    isOpen: boolean;
    invite: TeamInvite | null;
    onClose: () => void;
    onSuccess?: () => void;
  }
  
  let { isOpen, invite, onClose, onSuccess }: Props = $props();
  
  const auth = useAuth();
  const toast = useToast();
  
  let isLoading = $state(false);
  
  async function handleApprove() {
    if (!invite || !auth.user) return;
    
    isLoading = true;
    
    try {
      const result = await approveInvite(
        invite.id,
        invite.tenantId,
        {
          uid: auth.user.uid,
          displayName: auth.user.displayName
        }
      );
      
      if (result.success) {
        toast.success('Invitation approved', `${invite.recipientEmail} can now join the team`);
        onSuccess?.();
        onClose();
      } else {
        toast.error('Failed to approve invitation', result.error);
      }
    } catch (error) {
      toast.error('Failed to approve invitation', 'Please try again');
    } finally {
      isLoading = false;
    }
  }
</script>

{#if isOpen && invite}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <button 
      class="fixed inset-0 bg-black/50"
      transition:fade={{ duration: 200 }}
      onclick={onClose}
      aria-label="Close modal"
      tabindex="-1"
    ></button>
    
    <!-- Modal -->
    <div class="relative min-h-screen flex items-center justify-center p-4">
      <div 
        transition:scale={{ duration: 200, start: 0.95 }}
        class="relative bg-white rounded-xl shadow-xl w-full max-w-md"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b">
          <h2 class="text-xl font-semibold text-gray-900">
            Approve Team Invitation
          </h2>
          <button
            onclick={onClose}
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <Icon name="x" class="w-5 h-5" />
          </button>
        </div>
        
        <!-- Content -->
        <div class="p-6">
          <div class="mb-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Icon name="userPlus" class="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p class="font-medium text-gray-900">{invite.recipientEmail}</p>
                {#if invite.recipientName}
                  <p class="text-sm text-gray-600">{invite.recipientName}</p>
                {/if}
              </div>
            </div>
            
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Requested by:</span>
                <span class="font-medium text-gray-900">{invite.createdBy.name}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-gray-600">Role:</span>
                <span class="font-medium text-gray-900">{formatRole(invite.invitedRole)}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-gray-600">Created:</span>
                <span class="font-medium text-gray-900">{formatDate(invite.createdAt)}</span>
              </div>
              
              {#if invite.personalMessage}
                <div class="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p class="text-xs font-medium text-gray-500 mb-1">Personal Message:</p>
                  <p class="text-sm text-gray-700">{invite.personalMessage}</p>
                </div>
              {/if}
            </div>
          </div>
          
          <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div class="flex gap-3">
              <Icon name="alertTriangle" class="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p class="text-sm font-medium text-amber-900">
                  Team Member Suggestion
                </p>
                <p class="text-sm text-amber-700 mt-1">
                  This invitation was created by a team member and requires manager approval before it can be accepted.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onclick={onClose}
            disabled={isLoading}
            class="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 
                   font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 
                   disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onclick={handleApprove}
            disabled={isLoading}
            class="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg
                   hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                   transition-colors flex items-center justify-center gap-2"
          >
            {#if isLoading}
              <Icon name="loader2" class="w-4 h-4 animate-spin" />
              Approving...
            {:else}
              <Icon name="check" class="w-4 h-4" />
              Approve Invitation
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

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