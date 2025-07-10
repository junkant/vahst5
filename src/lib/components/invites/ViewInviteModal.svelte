<!-- src/lib/components/invites/ViewInviteModal.svelte -->
<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import Icon from '$lib/components/icons/Icon.svelte';
  import QRDisplay from './QRDisplay.svelte';
  import CopyButtons from './CopyButtons.svelte';
  import type { TeamInvite } from '$lib/types/invites';
  
  interface Props {
    isOpen: boolean;
    invite: TeamInvite | null;
    onClose: () => void;
  }
  
  let { isOpen = false, invite, onClose }: Props = $props();
</script>

{#if isOpen && invite}
  <div class="fixed inset-0 bg-black/50 z-50" transition:fade={{ duration: 150 }}>
    <div
      class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
             bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-50"
      transition:scale={{ start: 0.95, duration: 150 }}
    >
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-900">
            Share Invitation
          </h2>
          <button
            onclick={onClose}
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <Icon name="x" class="w-5 h-5" />
          </button>
        </div>
        
        <!-- Invite details -->
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Recipient:</span>
              <span class="font-medium">{invite.recipientEmail}</span>
            </div>
            {#if invite.recipientName}
              <div class="flex justify-between">
                <span class="text-gray-600">Name:</span>
                <span class="font-medium">{invite.recipientName}</span>
              </div>
            {/if}
            <div class="flex justify-between">
              <span class="text-gray-600">Role:</span>
              <span class="font-medium capitalize">{invite.invitedRole.replace('_', ' ')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Invite Code:</span>
              <span class="font-mono font-bold">{invite.code}</span>
            </div>
          </div>
        </div>
        
        <!-- QR Code -->
        <div class="mb-6">
          <QRDisplay {invite} />
        </div>
        
        <!-- Copy options -->
        <div class="mb-6">
          <CopyButtons {invite} />
        </div>
        
        <!-- Close button -->
        <button
          onclick={onClose}
          class="w-full px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg
                 hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
