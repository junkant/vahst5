<!-- src/lib/components/invites/InviteCard.svelte -->
<script lang="ts">
  import Icon from '$lib/components/icons/Icon.svelte';
  import QRDisplay from './QRDisplay.svelte';
  import CopyButtons from './CopyButtons.svelte';
  import { formatDate, getDaysUntilExpiry, formatRole } from '$lib/utils/invites';
  import { ROLE_LABELS, getRoleBadgeColor } from '$lib/constants/roles';
  import type { TeamInvite } from '$lib/types/invites';
  
  interface Props {
    invite: TeamInvite;
    onCancel?: () => void;
    onApprove?: () => void;
    canManageTeam?: boolean;
  }
  
  let { invite, onCancel, onApprove, canManageTeam = false }: Props = $props();
  let expanded = $state(false);
  
  const statusColors = {
    'pending_approval': 'bg-orange-100 text-orange-800 border-orange-200',
    'active': 'bg-green-100 text-green-800 border-green-200',
    'accepted': 'bg-blue-100 text-blue-800 border-blue-200',
    'expired': 'bg-gray-100 text-gray-800 border-gray-200',
    'cancelled': 'bg-red-100 text-red-800 border-red-200'
  };
  
  const statusLabels = {
    'pending_approval': 'Needs Approval',
    'active': 'Active',
    'accepted': 'Accepted',
    'expired': 'Expired',
    'cancelled': 'Cancelled'
  };
  
  const daysUntilExpiry = $derived(() => {
    if (invite.status === 'accepted' || invite.status === 'cancelled' || invite.status === 'expired') {
      return 0;
    }
    return getDaysUntilExpiry(invite.expiresAt);
  });
  
  const isExpiringSoon = $derived(() => daysUntilExpiry <= 2 && daysUntilExpiry > 0);
</script>

<div class="bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow">
  <!-- Main Card Content -->
  <div class="p-4">
    <div class="flex items-start justify-between gap-4">
      <!-- Left side - Invite details -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-3 mb-2">
          <h3 class="font-medium text-gray-900 truncate">
            {invite.recipientEmail}
          </h3>
          <span class="px-2 py-1 text-xs font-medium rounded-full {statusColors[invite.status]} 
                       border flex-shrink-0">
            {statusLabels[invite.status]}
          </span>
        </div>
        
        {#if invite.recipientName}
          <p class="text-sm text-gray-600 mb-1">
            <Icon name="user" class="w-4 h-4 inline mr-1" />
            {invite.recipientName}
          </p>
        {/if}
        
        <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <span>
            <Icon name="briefcase" class="w-4 h-4 inline mr-1" />
            {ROLE_LABELS[invite.invitedRole] || invite.invitedRole}
          </span>
          <span>
            <Icon name="userCheck" class="w-4 h-4 inline mr-1" />
            Invited by {invite.createdBy.name}
          </span>
          <span>
            <Icon name="calendar" class="w-4 h-4 inline mr-1" />
            {formatDate(invite.createdAt)}
          </span>
          {#if invite.status === 'active' || invite.status === 'pending_approval'}
            <span class="{isExpiringSoon ? 'text-orange-600 font-medium' : ''}">
              <Icon name="clock" class="w-4 h-4 inline mr-1" />
              {#if daysUntilExpiry === 0}
                Expires today
              {:else if daysUntilExpiry === 1}
                Expires tomorrow
              {:else}
                Expires in {daysUntilExpiry} days
              {/if}
            </span>
          {/if}
        </div>
        
        {#if invite.personalMessage}
          <div class="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
            "{invite.personalMessage}"
          </div>
        {/if}
      </div>
      
      <!-- Right side - Actions -->
      <div class="flex items-center gap-2">
        {#if invite.status === 'pending_approval' && canManageTeam && onApprove}
          <button
            onclick={onApprove}
            class="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg
                   hover:bg-green-700 transition-colors"
          >
            Approve
          </button>
        {/if}
        
        {#if (invite.status === 'active' || invite.status === 'pending_approval') && canManageTeam && onCancel}
          <button
            onclick={onCancel}
            class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Cancel invitation"
          >
            <Icon name="x" class="w-5 h-5" />
          </button>
        {/if}
        
        <button
          onclick={() => expanded = !expanded}
          class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <Icon name={expanded ? 'chevronUp' : 'chevronDown'} class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
  
  <!-- Expanded Content -->
  {#if expanded}
    <div class="border-t px-4 py-4 space-y-4 bg-gray-50">
      <!-- Invite Code Display -->
      <div class="bg-white rounded-lg p-3 border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Invitation Code</p>
            <p class="font-mono text-lg font-bold">{invite.code}</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-600">Direct Link</p>
            <a 
              href={invite.shortUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              {invite.shortUrl}
              <Icon name="externalLink" class="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
      
      {#if invite.status === 'active'}
        <!-- QR Code -->
        <QRDisplay {invite} />
        
        <!-- Copy Options -->
        <CopyButtons {invite} />
      {/if}
      
      <!-- Activity Log -->
      {#if invite.shareLog.length > 0 || invite.firstViewedAt}
        <div class="space-y-2">
          <h4 class="text-sm font-medium text-gray-700">Activity</h4>
          <div class="space-y-1">
            {#if invite.firstViewedAt}
              <div class="text-sm text-gray-600">
                <Icon name="eye" class="w-4 h-4 inline mr-1" />
                First viewed: {formatDate(invite.firstViewedAt)}
              </div>
            {/if}
            {#if invite.acceptedAt}
              <div class="text-sm text-gray-600">
                <Icon name="checkCircle" class="w-4 h-4 inline mr-1" />
                Accepted: {formatDate(invite.acceptedAt)}
              </div>
            {/if}
            {#each invite.shareLog as event}
              <div class="text-sm text-gray-600">
                <Icon name="share2" class="w-4 h-4 inline mr-1" />
                {event.method.replace('_', ' ')}: {formatDate(event.timestamp)}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>