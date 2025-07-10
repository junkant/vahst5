<!-- src/routes/(app)/settings/team/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import CreateInviteModal from '$lib/components/invites/CreateInviteModal.svelte';
  import BulkInviteModal from '$lib/components/invites/BulkInviteModal.svelte';
  import ApproveInviteModal from '$lib/components/invites/ApproveInviteModal.svelte';
  import SuggestMemberModal from '$lib/components/invites/SuggestMemberModal.svelte';
  import ViewInviteModal from '$lib/components/invites/ViewInviteModal.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
  import { formatRole, formatDate, getDaysUntilExpiry } from '$lib/utils/invites';
  import { resendInvite, cancelInvite } from '$lib/firebase/invites';
  import type { UserRole } from '$lib/stores/tenant.svelte';
  import type { TeamInvite, BulkInviteResult } from '$lib/types/invites';
  
  const tenant = useTenant();
  const auth = useAuth();
  const toast = useToast();
  
  // Modal states
  let showCreateInvite = $state(false);
  let showBulkInvite = $state(false);
  let showApproveModal = $state(false);
  let showSuggestModal = $state(false);
  let showViewInviteModal = $state(false);
  let selectedInviteForApproval = $state<TeamInvite | null>(null);
  let selectedInviteForViewing = $state<TeamInvite | null>(null);
  
  // UI states
  let searchQuery = $state('');
  let roleFilter = $state('all');
  let activeTab = $state<'members' | 'invitations'>('members');
  
  // User role constants
  const USER_ROLES = {
    OWNER: 'owner' as UserRole,
    MANAGER: 'manager' as UserRole,
    TEAM_MEMBER: 'team_member' as UserRole
  };
  
  // Load data on mount
  onMount(async () => {
    if (tenant.current) {
      await tenant.loadTeamMembers();
    }
  });
  
  // Current user role - using the exposed userRole from tenant store
  const currentUserRole = $derived(tenant.userRole);
  const isManager = $derived(currentUserRole === USER_ROLES.OWNER || currentUserRole === USER_ROLES.MANAGER);
  
  // Reload data when modal closes
  let previousShowCreateInvite = showCreateInvite;
  $effect(() => {
    if (previousShowCreateInvite && !showCreateInvite && tenant.current) {
      // Modal just closed, reload data
      tenant.loadTeamMembers();
    }
    previousShowCreateInvite = showCreateInvite;
  });
  
  // Filtered team members
  const filteredMembers = $derived((() => {
    let members = [...tenant.team];
    
    // Filter by role
    if (roleFilter !== 'all') {
      members = members.filter(m => m.role === roleFilter);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      members = members.filter(m => 
        m.email.toLowerCase().includes(query) ||
        m.name?.toLowerCase().includes(query)
      );
    }
    
    return members;
  })());
  
  // Filtered invites
  const filteredInvites = $derived((() => {
    let invites = [...tenant.invites];
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      invites = invites.filter(i => {
        const email = i.recipientEmail || i.email || '';
        const name = i.recipientName || i.name || '';
        return email.toLowerCase().includes(query) ||
               name.toLowerCase().includes(query) ||
               i.code.toLowerCase().includes(query);
      });
    }
    
    // Sort by created date (newest first)
    return invites.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  })());
  
  // Team stats
  const teamStats = $derived((() => {
    if (!tenant.current) return null;
    
    return {
      total: tenant.team.length,
      owners: tenant.team.filter(m => m.role === USER_ROLES.OWNER).length,
      managers: tenant.team.filter(m => m.role === USER_ROLES.MANAGER).length,
      teamMembers: tenant.team.filter(m => m.role === USER_ROLES.TEAM_MEMBER).length,
      pendingInvites: tenant.invites.filter(i => i.status === 'active' || i.status === 'pending_approval').length,
      pendingApprovals: tenant.invites.filter(i => i.status === 'pending_approval').length
    }
  })());
  
  async function handleRoleChange(memberId: string, newRole: string) {
    const memberName = tenant.team.find(m => m.id === memberId)?.name || 'Team member';
    
    const result = await toast.promise(
      tenant.updateTeamMemberRole(memberId, newRole as UserRole),
      {
        loading: 'Updating role...',
        success: `${memberName}'s role updated to ${formatRole(newRole)}`,
        error: (err) => err.error || 'Failed to update role'
      }
    );
  }
  
  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }
    
    const result = await toast.promise(
      tenant.removeTeamMember(memberId),
      {
        loading: 'Removing team member...',
        success: `${memberName} removed from the team`,
        error: (err) => err.error || 'Failed to remove team member'
      }
    );
  }
  
  async function handleCancelInvite(inviteId: string) {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }
    
    if (!tenant.current) return;
    
    try {
      const result = await cancelInvite(inviteId, tenant.current.id);
      if (result.success) {
        toast.success('Invitation cancelled');
        await tenant.loadTeamMembers();
      } else {
        toast.error('Failed to cancel invitation', result.error);
      }
    } catch (error) {
      toast.error('Failed to cancel invitation');
    }
  }
  
  async function handleResendInvite(invite: TeamInvite) {
    if (!tenant.current) return;
    
    try {
      const result = await resendInvite(invite.id, tenant.current.id);
      if (result.success) {
        toast.success('Invitation resent', `New expiry: 7 days from now`);
        await tenant.loadTeamMembers();
      } else {
        toast.error('Failed to resend invitation', result.error);
      }
    } catch (error) {
      toast.error('Failed to resend invitation');
    }
  }
  
  function handleApproveInvite(invite: TeamInvite) {
    selectedInviteForApproval = invite;
    showApproveModal = true;
  }
  
  function handleInviteSuccess() {
    // Refresh the team data to include the new invite
    tenant.loadTeamMembers();
    // Don't close the modal - let it show the success state
  }
  
  function handleBulkInviteSuccess(result: BulkInviteResult) {
    tenant.loadTeamMembers();
    showBulkInvite = false;
    
    if (result.successful.length > 0) {
      toast.success(
        `Successfully sent ${result.successful.length} invitation${result.successful.length !== 1 ? 's' : ''}`,
        result.failed.length > 0 ? `${result.failed.length} failed` : undefined
      );
    }
  }
  
  function handleApprovalSuccess() {
    tenant.loadTeamMembers();
    showApproveModal = false;
    selectedInviteForApproval = null;
  }
  
  function handleSuggestSuccess() {
    tenant.loadTeamMembers();
    showSuggestModal = false;
    toast.success('Team member suggestion submitted', 'Your suggestion has been sent to managers for approval');
  }
  
  function handleViewInvite(invite: TeamInvite) {
    selectedInviteForViewing = invite;
    showViewInviteModal = true;
  }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {#if !tenant.current}
    <!-- No tenant selected -->
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div class="flex">
        <Icon name="alertTriangle" class="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0" />
        <div>
          <h3 class="text-sm font-medium text-yellow-800">No Business Selected</h3>
          <p class="mt-1 text-sm text-yellow-700">
            Please select a business from your account to manage team members.
          </p>
          <a href="/select-business" class="mt-2 text-sm font-medium text-yellow-600 hover:text-yellow-500 inline-block">
            Select Business →
          </a>
        </div>
      </div>
    </div>
  {:else}
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Team Management</h1>
          <p class="text-gray-600 mt-1">
            Manage your team members and send invitations
          </p>
        </div>
        
        <!-- Action Buttons -->
        {#if isManager}
          <div class="flex gap-3">
            <button
              onclick={() => showBulkInvite = true}
              class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg 
                     hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Icon name="users" class="w-4 h-4" />
              Bulk Invite
            </button>
            <button
              onclick={() => showCreateInvite = true}
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     transition-colors flex items-center gap-2"
            >
              <Icon name="plus" class="w-4 h-4" />
              Invite Team Member
            </button>
          </div>
        {:else}
          <button
            onclick={() => showSuggestModal = true}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                   transition-colors flex items-center gap-2"
          >
            <Icon name="plus" class="w-4 h-4" />
            Suggest Team Member
          </button>
        {/if}
      </div>
      
      <!-- Stats -->
      {#if teamStats}
        <div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-white p-4 rounded-lg border border-gray-200">
            <p class="text-sm text-gray-600">Total Team</p>
            <p class="mt-1 text-2xl font-semibold text-gray-900">{teamStats.total}</p>
          </div>
          
          <div class="bg-white p-4 rounded-lg border border-gray-200">
            <p class="text-sm text-gray-600">Owners</p>
            <p class="mt-1 text-2xl font-semibold text-gray-900">{teamStats.owners}</p>
          </div>
          
          <div class="bg-white p-4 rounded-lg border border-gray-200">
            <p class="text-sm text-gray-600">Managers</p>
            <p class="mt-1 text-2xl font-semibold text-gray-900">{teamStats.managers}</p>
          </div>
          
          <div class="bg-white p-4 rounded-lg border border-gray-200">
            <p class="text-sm text-gray-600">Pending Invites</p>
            <p class="mt-1 text-2xl font-semibold text-gray-900">
              {teamStats.pendingInvites}
              {#if teamStats.pendingApprovals > 0}
                <span class="text-sm font-normal text-amber-600">
                  ({teamStats.pendingApprovals} need approval)
                </span>
              {/if}
            </p>
          </div>
        </div>
      {/if}
    </div>
    
    <!-- Tabs -->
    <div class="bg-white rounded-lg shadow">
      <div class="border-b border-gray-200">
        <nav class="flex -mb-px">
          <button
            onclick={() => activeTab = 'members'}
            class="px-6 py-3 text-sm font-medium border-b-2 transition-colors
                   {activeTab === 'members' 
                     ? 'text-blue-600 border-blue-600' 
                     : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}"
          >
            Team Members
            <span class="ml-2 px-2 py-0.5 text-xs rounded-full
                         {activeTab === 'members' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}">
              {tenant.team.length}
            </span>
          </button>
          
          <button
            onclick={() => activeTab = 'invitations'}
            class="px-6 py-3 text-sm font-medium border-b-2 transition-colors
                   {activeTab === 'invitations' 
                     ? 'text-blue-600 border-blue-600' 
                     : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}"
          >
            Invitations
            <span class="ml-2 px-2 py-0.5 text-xs rounded-full
                         {activeTab === 'invitations' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}">
              {tenant.invites.filter(i => i.status === 'active' || i.status === 'pending_approval').length}
            </span>
            {#if teamStats?.pendingApprovals && teamStats.pendingApprovals > 0}
              <span class="ml-1 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                {teamStats.pendingApprovals} pending
              </span>
            {/if}
          </button>
          

        </nav>
      </div>
      
      <!-- Search and Filter Bar -->
      <div class="p-4 bg-gray-50 border-b">
        <div class="flex flex-col sm:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1">
            <div class="relative">
              <Icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                bind:value={searchQuery}
                placeholder={activeTab === 'members' ? 'Search team members...' : 'Search invitations...'}
                class="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {#if activeTab === 'members'}
            <!-- Role Filter -->
            <select
              bind:value={roleFilter}
              class="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 
                     focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value={USER_ROLES.OWNER}>Owners</option>
              <option value={USER_ROLES.MANAGER}>Managers</option>
              <option value={USER_ROLES.TEAM_MEMBER}>Team Members</option>
            </select>
          {/if}
        </div>
      </div>
      
      <!-- Tab Content -->
      <div class="p-6">
        {#if activeTab === 'members'}
          <!-- Team Members List -->
          {#if tenant.isLoadingTeam}
            <div class="text-center py-8">
              <Icon name="loader2" class="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
              <p class="text-gray-600">Loading team members...</p>
            </div>
          {:else if filteredMembers.length === 0}
            <div class="text-center py-8">
              <Icon name="users" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p class="text-gray-600 mb-4">
                {searchQuery || roleFilter !== 'all' ? 'No team members found matching your criteria' : 'No team members yet'}
              </p>
              {#if !searchQuery && roleFilter === 'all' && isManager}
                <button
                  onclick={() => showCreateInvite = true}
                  class="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Invite your first team member
                </button>
              {/if}
            </div>
          {:else}
            <div class="space-y-4">
              {#each filteredMembers as member}
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span class="text-blue-600 font-semibold">
                        {member.name ? member.name[0].toUpperCase() : member.email[0].toUpperCase()}
                      </span>
                    </div>
                    
                    <div>
                      <p class="font-medium text-gray-900">
                        {member.name || 'Unnamed User'}
                        {#if member.id === auth.user?.uid}
                          <span class="text-sm text-gray-500">(You)</span>
                        {/if}
                      </p>
                      <p class="text-sm text-gray-600">{member.email}</p>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-4">
                    {#if isManager && member.id !== auth.user?.uid}
                      <select
                        value={member.role}
                        onchange={(e) => handleRoleChange(member.id, e.currentTarget.value)}
                        class="px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={USER_ROLES.TEAM_MEMBER}>Team Member</option>
                        <option value={USER_ROLES.MANAGER}>Manager</option>
                        <option value={USER_ROLES.OWNER}>Owner</option>
                      </select>
                    {:else}
                      <span class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border rounded-lg">
                        {formatRole(member.role)}
                      </span>
                    {/if}
                    
                    {#if isManager && member.id !== auth.user?.uid}
                      <button
                        onclick={() => handleRemoveMember(member.id, member.name || member.email)}
                        class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remove member"
                      >
                        <Icon name="trash2" class="w-4 h-4" />
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {:else if activeTab === 'invitations'}
          <!-- Invitations List -->
          {#if tenant.invites.length === 0}
            <div class="text-center py-8">
              <Icon name="mail" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p class="text-gray-600 mb-4">
                {searchQuery ? 'No invitations found matching your search' : 'No pending invitations'}
              </p>
              {#if !searchQuery}
                <button
                  onclick={() => showCreateInvite = true}
                  class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg
                         hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <Icon name="userPlus" class="w-5 h-5" />
                  Send First Invite
                </button>
              {/if}
            </div>
          {:else if filteredInvites.length === 0}
            <div class="text-center py-8">
              <p class="text-gray-600">No invitations match your search criteria</p>
            </div>
          {:else}
            <div class="space-y-4">
              {#each filteredInvites as invite}
                {@const daysLeft = getDaysUntilExpiry(invite.expiresAt)}
                {@const isExpired = invite.status === 'expired' || daysLeft <= 0}
                {@const needsApproval = invite.status === 'pending_approval'}
                {@const recipientEmail = invite.recipientEmail || invite.email}
                {@const recipientName = invite.recipientName || invite.name}
                {@const invitedRole = invite.invitedRole || invite.role}
                {@const createdByName = invite.createdBy?.name || invite.invitedByName || 'Unknown'}
                
                <div 
                  onclick={() => handleViewInvite(invite)}
                  class="p-4 border rounded-lg cursor-pointer {isExpired ? 'bg-gray-50 border-gray-200 opacity-60' : needsApproval ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'} transition-all duration-200">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-2">
                        <p class="font-medium text-gray-900">
                          {recipientEmail}
                        </p>
                        {#if recipientName}
                          <span class="text-sm text-gray-600">({recipientName})</span>
                        {/if}
                        
                        {#if needsApproval}
                          <span class="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full font-medium">
                            Needs Approval
                          </span>
                        {:else if isExpired}
                          <span class="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full font-medium">
                            Expired
                          </span>
                        {:else if invite.status === 'accepted'}
                          <span class="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                            Accepted
                          </span>
                        {/if}
                      </div>
                      
                      <div class="flex items-center gap-4 text-sm text-gray-600">
                        <span>Role: {formatRole(invitedRole)}</span>
                        <span>Code: <code class="font-mono font-bold">{invite.code}</code></span>
                        {#if !isExpired && !needsApproval && invite.status === 'active'}
                          <span>Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
                        {/if}
                      </div>
                      
                      <div class="mt-1 text-sm text-gray-500">
                        Invited by {createdByName} on {formatDate(invite.createdAt instanceof Date ? invite.createdAt : new Date(invite.createdAt))}
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-2 ml-4">
                      {#if needsApproval && isManager}
                        <button
                          onclick={() => handleApproveInvite(invite)}
                          class="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg
                                 hover:bg-green-700 transition-colors flex items-center gap-1"
                        >
                          <Icon name="check" class="w-3.5 h-3.5" />
                          Approve
                        </button>
                      {/if}
                      
                      {#if isExpired && !invite.acceptedAt}
                        <button
                          onclick={() => handleResendInvite(invite)}
                          class="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg
                                 hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                          <Icon name="refresh" class="w-3.5 h-3.5" />
                          Resend
                        </button>
                      {/if}
                      
                      {#if !invite.acceptedAt && invite.status !== 'cancelled'}
                        <button
                          onclick={() => handleCancelInvite(invite.id)}
                          class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Cancel invitation"
                        >
                          <Icon name="x" class="w-4 h-4" />
                        </button>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Modals -->
{#if showCreateInvite}
  <CreateInviteModal 
    bind:open={showCreateInvite}
    onSuccess={handleInviteSuccess}
  />
{/if}

{#if showBulkInvite}
  <BulkInviteModal 
    isOpen={showBulkInvite}
    onClose={() => showBulkInvite = false}
    onSuccess={handleBulkInviteSuccess}
  />
{/if}

{#if showApproveModal}
  <ApproveInviteModal
    isOpen={showApproveModal}
    invite={selectedInviteForApproval}
    onClose={() => {
      showApproveModal = false;
      selectedInviteForApproval = null;
    }}
    onSuccess={handleApprovalSuccess}
  />
{/if}

{#if showSuggestModal}
  <SuggestMemberModal
    isOpen={showSuggestModal}
    onClose={() => showSuggestModal = false}
    onSuccess={handleSuggestSuccess}
  />
{/if}

{#if showViewInviteModal}
  <ViewInviteModal
    isOpen={showViewInviteModal}
    invite={selectedInviteForViewing}
    onClose={() => {
      showViewInviteModal = false;
      selectedInviteForViewing = null;
    }}
  />
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