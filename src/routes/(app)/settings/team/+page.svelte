<!-- src/routes/(app)/settings/team/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { USER_ROLES, ROLE_LABELS, getRoleBadgeColor, type UserRole } from '$lib/constants/roles';
  import InviteTeamMemberModal from '$lib/components/team/InviteTeamMemberModal.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const tenant = useTenant();
  const auth = useAuth();
  
  let showInviteModal = $state(false);
  let searchQuery = $state('');
  let roleFilter = $state('all');
  
  // Initialize on mount
  onMount(() => {
    if (auth.user) {
      tenant.initialize(auth.user);
      tenant.loadTeamMembers();
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
  
  // Check if current user can manage team
  const canManageTeam = $derived(() => {
    return tenant.canManageTeam;
  });
  
  async function handleRoleChange(memberId: string, newRole: string) {
    const result = await tenant.updateTeamMemberRole(memberId, newRole as UserRole);
    if (!result.success) {
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
    const result = await tenant.cancelInvite(inviteId);
    if (!result.success) {
      alert(result.error || 'Failed to cancel invite');
    }
  }
  
  function formatDate(date: Date) {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
</script>

<svelte:head>
  <title>Team Management - Vahst</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-4 pb-24">
  <!-- Header -->
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">Team Management</h1>
    <p class="text-gray-600">
      Manage your team members and their permissions
    </p>
  </div>
  
  <!-- Team Stats (removed seats available) -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <div class="bg-white rounded-lg border p-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Icon name="users" class="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p class="text-sm text-gray-500">Total Members</p>
          <p class="text-xl font-semibold">{tenant.team.length}</p>
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
          <p class="text-xl font-semibold">{tenant.team.filter(m => m.role === USER_ROLES.OWNER).length}</p>
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
          <p class="text-xl font-semibold">{tenant.invites.length}</p>
        </div>
      </div>
    </div>
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
            placeholder="Search team members..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg 
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
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
      
      <!-- Invite Button -->
      {#if canManageTeam}
        <button
          onclick={() => showInviteModal = true}
          class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg
                 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
                 focus:ring-offset-2 transition-colors flex items-center gap-2"
        >
          <Icon name="userPlus" class="w-5 h-5" />
          Invite Team Member
        </button>
      {/if}
    </div>
  </div>
  
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
                        {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {member.name || member.email}
                      </div>
                      {#if member.name}
                        <div class="text-sm text-gray-500">{member.email}</div>
                      {/if}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  {#if canManageTeam && member.id !== auth.user?.uid}
                    <select
                      value={member.role}
                      onchange={(e) => handleRoleChange(member.id, e.currentTarget.value)}
                      class="text-sm border border-gray-300 rounded px-2 py-1 
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={USER_ROLES.TEAM_MEMBER}>Team Member</option>
                      <option value={USER_ROLES.MANAGER}>Manager</option>
                      <option value={USER_ROLES.OWNER}>Owner</option>
                    </select>
                  {:else}
                    <span class="px-2 py-1 text-xs font-medium rounded-full {getRoleBadgeColor(member.role)}">
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs font-medium rounded-full 
                               {member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                    {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(member.joinedAt)}
                </td>
                {#if canManageTeam}
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {#if member.id !== auth.user?.uid}
                      <button
                        onclick={() => handleRemoveMember(member.id, member.name || member.email)}
                        class="text-red-600 hover:text-red-800 font-medium"
                      >
                        Remove
                      </button>
                    {/if}
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
  
  <!-- Pending Invites -->
  {#if tenant.invites.length > 0}
    <div class="mt-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Pending Invites</h2>
      <div class="bg-white rounded-lg border overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invited By
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                {#if canManageTeam}
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                {/if}
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each tenant.invites as invite}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invite.email}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full {getRoleBadgeColor(invite.role)}">
                      {ROLE_LABELS[invite.role] || invite.role}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invite.invitedByName || 'Unknown'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(invite.expiresAt)}
                  </td>
                  {#if canManageTeam}
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onclick={() => handleCancelInvite(invite.id)}
                        class="text-red-600 hover:text-red-800 font-medium"
                      >
                        Cancel
                      </button>
                    </td>
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Invite Team Member Modal -->
{#if showInviteModal}
  <InviteTeamMemberModal
    bind:open={showInviteModal}
    onSuccess={() => tenant.loadTeamMembers()}
  />
{/if}