<!-- src/lib/components/invites/QRDisplay.svelte -->
<script lang="ts">
  import Icon from '$lib/components/icons/Icon.svelte';
  import { logShare } from '$lib/firebase/invites';
  import type { TeamInvite } from '$lib/types/invites';
  
  interface Props {
    invite: TeamInvite;
  }
  
  let { invite }: Props = $props();
  let showingQR = $state(false);
  
  async function toggleQR() {
    showingQR = !showingQR;
    if (showingQR) {
      await logShare(invite.id, invite.tenantId, 'showed_qr');
    }
  }
  
  async function downloadQR() {
    if (!invite.qrCodeUrl) return;
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.download = `invite-${invite.code}.png`;
    link.href = invite.qrCodeUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    await logShare(invite.id, invite.tenantId, 'downloaded_qr');
  }
</script>

<div class="border border-gray-200 rounded-lg p-4">
  <button
    onclick={toggleQR}
    class="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
  >
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
        <Icon name="qrCode" class="w-6 h-6 text-blue-600" />
      </div>
      <div class="text-left">
        <div class="font-medium text-gray-900">Show QR Code</div>
        <div class="text-sm text-gray-600">Perfect for in-person invites</div>
      </div>
    </div>
    <Icon 
      name={showingQR ? 'chevronUp' : 'chevronDown'} 
      class="w-5 h-5 text-gray-400"
    />
  </button>
  
  {#if showingQR && invite.qrCodeUrl}
    <div class="mt-4 text-center animate-in fade-in slide-in-from-top-2 duration-200">
      <div class="bg-white p-4 rounded-lg inline-block shadow-sm border">
        <img 
          src={invite.qrCodeUrl} 
          alt="Invitation QR Code"
          class="mx-auto max-w-xs"
          width="300"
          height="300"
        />
      </div>
      <p class="text-sm text-gray-600 mt-3">
        Have them scan this code with their phone camera
      </p>
      <button
        onclick={downloadQR}
        class="mt-2 text-sm text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
      >
        <Icon name="download" class="w-4 h-4" />
        Download QR Code
      </button>
    </div>
  {/if}
</div>

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slide-in-from-top-2 {
    from {
      transform: translateY(-0.5rem);
    }
    to {
      transform: translateY(0);
    }
  }
  
  .animate-in {
    animation-duration: 200ms;
    animation-fill-mode: both;
  }
  
  .fade-in {
    animation-name: fade-in;
  }
  
  .slide-in-from-top-2 {
    animation-name: slide-in-from-top-2;
  }
</style>