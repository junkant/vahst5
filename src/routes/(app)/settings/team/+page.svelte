<!-- src/routes/(app)/settings/team/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { USER_ROLES, ROLE_LABELS, getRoleBadgeColor, type UserRole } from '$lib/constants/roles';
  import CreateInviteModal from '$lib/components/invites/CreateInviteModal.svelte';
  import InviteCard from '$lib/components/invites/InviteCard.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { formatDate } from '$lib/utils/invites';
  
  const tenant = useTenant();
  const auth = useAuth();
  
  let showCreateInviteModal = $state(false);
  let searchQuery = $state('');
  let roleFilter = $state('all');
  let activeTab = $state<'members' | 'invites'>('members');
  
  // Initialize on mount
  onMount(() => {
    if (auth.user && tenant.current) {
      tenant.initialize(auth.user);
      tenant.loadTeamMembers();
    } else {
      console.log('Team page - Auth user:', auth.user);
      console.log('Team page - Current tenant:', tenant.current);
    }
  });
  
  // Filtered team members
  const filteredMembers = $derived(() => {
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
  });
  
  // Filtered invites
  const filteredInvites = $derived(() => {
    let invites = [...tenant.invites];
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      invites = invites.filter(i => 
        i.recipientEmail.toLowerCase().includes(query) ||
        i.recipientName?.toLowerCase().includes(query) ||
        i.code.toLowerCase().includes(query)
      );
    }
    
    // Sort by created date (newest first)
    return invites.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  });
  
  // Check if current user can manage team
  const canManageTeam = $derived(() => {
    return tenant.canManageTeam;
  });
  
  // Stats
  const stats = $derived(() => ({
    totalMembers: tenant.team.length,
    owners: tenant.team.filter(m => m.role === USER_ROLES.OWNER).length,
    managers: tenant.team.filter(m => m.role === USER_ROLES.MANAGER).length,
    teamMembers: tenant.team.filter(m => m.role === USER_ROLES.TEAM_MEMBER).length,
    pendingInvites: tenant.invites.filter(i => i.status === 'active' || i.status === 'pending_approval').length,
    pendingApprovals: tenant.invites.filter(i => i.status === 'pending_approval').length
  }));
  
  async function handleRoleChange(memberId: string, newRole: string) {
    const result = await tenant.updateTeamMemberRole(memberId, newRole as UserRole);
    if (!result.success) {
      // TODO: Show toast instead
      alert(result.error || 'Failed to update role');
    }
  }
  
  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }
    
    const result = await tenant.removeTeamMember(memberId);
    if (!result.success) {
      alert(result.error || 'Failed to remove team member');
    }
  }
  
  async function handleCancelInvite(inviteId: string) {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }
    
    const result = await tenant.cancelInvite(inviteId);
    if (!result.success) {
      alert(result.error || 'Failed to cancel invitation');
    }
  }
  
  async function handleApproveInvite(inviteId: string) {
    // TODO: Implement approve invite function
    console.log('Approve invite:', inviteId);
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
      <h1 class="text-2xl font-bold text-gray-900">Team Management</h1>
      <p class="text-gray-600 mt-1">
        Manage your team members and send invitations
      </p>
    </div>
    
    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg border p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon name="users" class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p class="text-sm text-gray-500">Total Members</p>
            <p class="text-xl font-semibold">{stats.totalMembers}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg border p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Icon name="crown" class="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p class="text-sm text-gray-500">Owners</p>
            <p class="text-xl font-semibold">{stats.owners}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg border p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Icon name="mail" class="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p class="text-sm text-gray-500">Pending Invites</p>
            <p class="text-xl font-semibold">{stats.pendingInvites}</p>
          </div>
        </div>
      </div>
      
      {#if stats.pendingApprovals > 0}
        <div class="bg-white rounded-lg border p-4 border-orange-200 bg-orange-50">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Icon name="alertCircle" class="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p class="text-sm text-orange-700">Needs Approval</p>
              <p class="text-xl font-semibold text-orange-900">{stats.pendingApprovals}</p>
            </div>
          </div>
        </div>
      {/if}
    </div>
    
    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex space-x-8">
        <button
          onclick={() => activeTab = 'members'}
          class="py-2 px-1 border-b-2 font-medium text-sm transition-colors
                 {activeTab === 'members' 
                   ? 'border-blue-500 text-blue-600' 
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          Team Members
          <span class="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600">
            {stats.totalMembers}
          </span>
        </button>
        
        <button
          onclick={() => activeTab = 'invites'}
          class="py-2 px-1 border-b-2 font-medium text-sm transition-colors
                 {activeTab === 'invites' 
                   ? 'border-blue-500 text-blue-600' 
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        >
          Invitations
          <span class="ml-2 py-0.5 px-2 rounded-full text-xs 
                 {stats.pendingInvites > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}">
            {stats.pendingInvites}
          </span>
        </button>
      </nav>
    </div>
    
    <!-- Actions Bar -->
    <div class="bg-white rounded-lg border p-4 mb-6">
      <div class="flex flex-col md:flex-row gap-4">
        <!-- Search -->
        <div class="flex-1">
          <div class="relative">
            <Icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder={activeTab === 'members' ? 'Search team members...' : 'Search invitations...'}
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        {#if activeTab === 'members'}
          <!-- Role Filter -->
          <select
            bind:value={roleFilter}
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                   focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Roles</option>
            <option value={USER_ROLES.OWNER}>Owners</option>
            <option value={USER_ROLES.MANAGER}>Managers</option>
            <option value={USER_ROLES.TEAM_MEMBER}>Team Members</option>
          </select>
        {/if}
        
        <!-- Invite Buttons -->
        {#if canManageTeam}
          <button
            onclick={() => showCreateInviteModal = true}
            class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg
                   hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
                   focus:ring-offset-2 transition-colors flex items-center gap-2"
          >
            <Icon name="userPlus" class="w-5 h-5" />
            Invite Member
          </button>
        {/if}
      </div>
    </div>
    
    <!-- Content -->
    {#if activeTab === 'members'}
      <!-- Team Members List -->
      <div class="bg-white rounded-lg border overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                {#if canManageTeam}
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                {/if}
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#if filteredMembers.length > 0}
                {#each filteredMembers as member}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span class="text-sm font-medium text-gray-600">
                            {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div class="ml-3">
                          <div class="text-sm font-medium text-gray-900">
                            {member.name || 'No name'}
                          </div>
                          <div class="text-sm text-gray-500">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 py-1 text-xs font-medium rounded-full {getRoleBadgeColor(member.role)}">
                        {ROLE_LABELS[member.role] || member.role}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 py-1 text-xs font-medium rounded-full
                             {member.status === 'active' 
                               ? 'bg-green-100 text-green-800' 
                               : 'bg-gray-100 text-gray-800'}">
                        {member.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(member.joinedAt)}
                    </td>
                    {#if canManageTeam}
                      <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div class="flex items-center justify-end gap-2">
                          {#if member.id !== auth.user?.uid && member.role !== USER_ROLES.OWNER}
                            <select
                              value={member.role}
                              onchange={(e) => handleRoleChange(member.id, e.currentTarget.value)}
                              class="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value={USER_ROLES.TEAM_MEMBER}>Team Member</option>
                              <option value={USER_ROLES.MANAGER}>Manager</option>
                            </select>
                            
                            <button
                              onclick={() => handleRemoveMember(member.id, member.name || member.email)}
                              class="text-red-600 hover:text-red-800"
                            >
                              <Icon name="trash2" class="w-4 h-4" />
                            </button>
                          {/if}
                        </div>
                      </td>
                    {/if}
                  </tr>
                {/each}
              {:else}
                <tr>
                  <td colspan={canManageTeam ? 5 : 4} class="px-6 py-12 text-center text-gray-500">
                    {#if tenant.isLoadingTeam}
                      Loading team members...
                    {:else}
                      No team members found
                    {/if}
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    {:else}
      <!-- Invitations Tab -->
      <div class="space-y-4">
        {#if filteredInvites.length > 0}
          {#each filteredInvites as invite}
            <InviteCard 
              {invite} 
              onCancel={() => handleCancelInvite(invite.id)}
              onApprove={() => handleApproveInvite(invite.id)}
              {canManageTeam}
            />
          {/each}
        {:else}
          <div class="bg-white rounded-lg border p-12 text-center">
            <Icon name="mail" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">No pending invitations</h3>
            <p class="text-gray-500 mb-4">
              Invite team members to start collaborating
            </p>
            {#if canManageTeam}
              <button
                onclick={() => showCreateInviteModal = true}
                class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg
                       hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <Icon name="userPlus" class="w-5 h-5" />
                Send First Invite
              </button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<!-- Modals -->
{#if showCreateInviteModal}
  <CreateInviteModal
    bind:open={showCreateInviteModal}
    onSuccess={() => {
      tenant.loadTeamMembers();
      activeTab = 'invites';
    }}
  />
{/if}