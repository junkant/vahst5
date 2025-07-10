<!-- src/lib/components/invites/CopyButtons.svelte -->
<script lang="ts">
  import Icon from '$lib/components/icons/Icon.svelte';
  import { logShare } from '$lib/firebase/invites';
  import { getEmailTemplate, getSMSTemplate } from '$lib/utils/inviteTemplates';
  import type { TeamInvite } from '$lib/types/invites';
  
  interface Props {
    invite: TeamInvite;
  }
  
  let { invite }: Props = $props();
  let copiedItem = $state<string | null>(null);
  
  interface CopyOption {
    id: string;
    label: string;
    icon: string;
    description: string;
    getCopyText: () => string;
    logMethod: 'copied_email' | 'copied_sms' | 'copied_link';
  }
  
  const copyOptions: CopyOption[] = [
    {
      id: 'email',
      label: 'Copy for Email',
      icon: 'mail',
      description: 'Full invitation with formatting',
      getCopyText: () => {
        const template = getEmailTemplate(invite, invite.messageTemplate || 'casual');
        return `Subject: ${template.subject}\n\n${template.body}`;
      },
      logMethod: 'copied_email'
    },
    {
      id: 'sms',
      label: 'Copy for SMS',
      icon: 'messageSquare',
      description: 'Short message format',
      getCopyText: () => getSMSTemplate(invite),
      logMethod: 'copied_sms'
    },
    {
      id: 'link',
      label: 'Copy Link Only',
      icon: 'link',
      description: 'Just the invitation URL',
      getCopyText: () => invite.shortUrl,
      logMethod: 'copied_link'
    }
  ];
  
  async function copyToClipboard(option: CopyOption) {
    try {
      const text = option.getCopyText();
      await navigator.clipboard.writeText(text);
      
      // Show copied feedback
      copiedItem = option.id;
      setTimeout(() => {
        copiedItem = null;
      }, 2000);
      
      // Log the share
      await logShare(invite.id, invite.tenantId, option.logMethod);
    } catch (error) {
      console.error('Failed to copy:', error);
      // TODO: Show error toast
    }
  }
</script>

<div class="space-y-3">
  <h3 class="font-medium text-gray-900">Share this invitation</h3>
  
  <div class="space-y-2">
    {#each copyOptions as option}
      <button
        onclick={() => copyToClipboard(option)}
        class="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 
               transition-all duration-200 group relative overflow-hidden"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center
                        group-hover:bg-gray-200 transition-colors">
              <Icon name={option.icon} class="w-5 h-5 text-gray-600" />
            </div>
            <div class="text-left">
              <div class="font-medium text-gray-900">{option.label}</div>
              <div class="text-sm text-gray-600">{option.description}</div>
            </div>
          </div>
          
          {#if copiedItem === option.id}
            <div class="flex items-center gap-2 text-green-600 animate-in fade-in slide-in-from-right-2">
              <Icon name="check" class="w-5 h-5" />
              <span class="text-sm font-medium">Copied!</span>
            </div>
          {:else}
            <Icon name="copy" class="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          {/if}
        </div>
      </button>
    {/each}
  </div>
  
  <div class="pt-3 border-t">
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <div class="text-sm font-medium text-gray-900">Invitation Code</div>
        <div class="font-mono text-lg">{invite.code}</div>
      </div>
      <button
        onclick={async () => {
          await navigator.clipboard.writeText(invite.code);
          copiedItem = 'code';
          setTimeout(() => copiedItem = null, 2000);
        }}
        class="p-2 hover:bg-gray-200 rounded-lg transition-colors"
      >
        {#if copiedItem === 'code'}
          <Icon name="check" class="w-5 h-5 text-green-600" />
        {:else}
          <Icon name="copy" class="w-5 h-5 text-gray-600" />
        {/if}
      </button>
    </div>
  </div>
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
  
  @keyframes slide-in-from-right-2 {
    from {
      transform: translateX(0.5rem);
    }
    to {
      transform: translateX(0);
    }
  }
  
  .animate-in {
    animation-duration: 200ms;
    animation-fill-mode: both;
  }
  
  .fade-in {
    animation-name: fade-in;
  }
  
  .slide-in-from-right-2 {
    animation-name: slide-in-from-right-2;
  }
</style>