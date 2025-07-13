<!-- src/routes/(app)/debug-permissions/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useFeatureFlags } from '$lib/stores/featureFlags.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { ensureTenantFeatureFlags, repairAllUserTenants } from '$lib/utils/repairFeatureFlags';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const auth = useAuth();
  const flags = useFeatureFlags();
  const tenant = useTenant();
  
  let isRepairing = false;
  let repairMessage = '';
  let showAllPermissions = false;
  
  // Key permissions to test
  const keyPermissions = [
    'user_management_invite_member',
    'user_management_manage_team',
    'task_management_create_task',
    'task_management_edit_task',
    'financial_create_invoices',  // Changed to plural
    'system_settings_manage_features'
  ];
  
  // Get all permissions
  const allPermissions = $derived(() => {
    if (!flags.loading && flags.getAllPermissions) {
      return flags.getAllPermissions();
    }
    return {};
  });
  
  // Debug info
  const debugInfo = $derived(() => ({
    user: {
      uid: auth.user?.uid || 'Not logged in',
      email: auth.user?.email || 'N/A'
    },
    tenant: {
      id: auth.tenant?.id || 'No tenant',
      name: auth.tenant?.name || 'N/A',
      role: auth.tenant?.role || tenant.userRole || 'Unknown'
    },
    flags: {
      loading: flags.loading,
      error: flags.error?.message || null,
      lastSync: flags.lastSync?.toLocaleString() || 'Never'
    },
    permissions: Object.entries(allPermissions())
      .filter(([key, value]) => value)
      .map(([key]) => key)
      .length
  }));
  
  async function repairFeatureFlags() {
    if (!auth.user || !auth.tenant) {
      repairMessage = 'Must be logged in with a tenant selected';
      return;
    }
    
    isRepairing = true;
    repairMessage = 'Checking feature flags...';
    
    try {
      // Import Firebase functions
      const { doc, setDoc, getDoc, Timestamp } = await import('firebase/firestore');
      const { db } = await import('$lib/firebase/config');
      
      const tenantId = auth.tenant.id;
      const userId = auth.user.uid;
      
      // Check if document exists
      const flagsRef = doc(db, 'tenantFeatureFlags', tenantId);
      const flagsDoc = await getDoc(flagsRef);
      
      if (!flagsDoc.exists()) {
        repairMessage = 'Creating feature flags document...';
        
        // Create comprehensive feature flags
        const featureFlags = {
          flags: {},
          defaultsForRoles: {
            owner: [
              'task_management_create_task',
              'task_management_assign_task',
              'task_management_edit_task',
              'task_management_delete_task',
              'task_management_update_status',
              'task_management_add_notes',
              'task_management_view_all_tasks',
              'user_management_invite_member',
              'user_management_remove_member',
              'user_management_approve_member',
              'user_management_change_roles',
              'user_management_create_client',
              'user_management_edit_client',
              'user_management_delete_client',
              'user_management_manage_team',
              'financial_create_invoices',  // Note: plural
              'financial_view_invoices_all',
              'system_settings_manage_tenant',
              'system_settings_manage_features'
            ],
            manager: [
              'task_management_create_task',
              'task_management_assign_task',
              'task_management_edit_task',
              'task_management_update_status',
              'task_management_add_notes',
              'task_management_view_all_tasks',
              'user_management_invite_member',
              'user_management_create_client',
              'user_management_edit_client',
              'financial_view_invoices_team'
            ],
            team_member: [
              'task_management_view_assigned_tasks',
              'task_management_update_status',
              'task_management_add_notes',
              'task_management_complete_own_tasks'
            ],
            client: [
              'client_portal_view_projects',
              'client_portal_view_invoices'
            ]
          },
          createdAt: Timestamp.now(),
          createdBy: userId
        };
        
        await setDoc(flagsRef, featureFlags);
        repairMessage = '✅ Feature flags created successfully!';
      } else {
        repairMessage = '✅ Feature flags already exist';
      }
      
      // Force reload after 2 seconds
      repairMessage += '\n🔄 Reloading page in 2 seconds...';
      setTimeout(() => window.location.reload(), 2000);
      
    } catch (error) {
      console.error('Repair error:', error);
      repairMessage = `❌ Error: ${error.message}`;
    } finally {
      isRepairing = false;
    }
  }
  
  function checkPermission(permission: string) {
    return flags.can(permission);
  }
  
  // Add to window for console debugging
  onMount(() => {
    if (typeof window !== 'undefined') {
      window.vahstDebug = {
        auth,
        flags,
        tenant,
        checkPermission,
        getAllPermissions: () => flags.getAllPermissions?.() || {}
      };
      console.log('🔧 Debug tools available at window.vahstDebug');
    }
  });
</script>

<style>
  .permission-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 0.5rem;
  }
  
  .mono {
    font-family: ui-monospace, monospace;
    font-size: 0.875rem;
  }
</style>

<div class="max-w-7xl mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">Permission System Debug</h1>
    <p class="text-gray-600">Diagnose and repair permission system issues</p>
  </div>
  
  <!-- Debug Info -->
  <div class="bg-white rounded-lg shadow mb-6 p-6">
    <h2 class="text-lg font-semibold mb-4">System Status</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- User Info -->
      <div>
        <h3 class="font-medium text-gray-700 mb-2">User</h3>
        <dl class="space-y-1">
          <div class="flex justify-between">
            <dt class="text-sm text-gray-600">UID:</dt>
            <dd class="text-sm mono">{debugInfo().user.uid}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-sm text-gray-600">Email:</dt>
            <dd class="text-sm">{debugInfo().user.email}</dd>
          </div>
        </dl>
      </div>
      
      <!-- Tenant Info -->
      <div>
        <h3 class="font-medium text-gray-700 mb-2">Tenant</h3>
        <dl class="space-y-1">
          <div class="flex justify-between">
            <dt class="text-sm text-gray-600">ID:</dt>
            <dd class="text-sm mono">{debugInfo().tenant.id}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-sm text-gray-600">Name:</dt>
            <dd class="text-sm">{debugInfo().tenant.name}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-sm text-gray-600">Role:</dt>
            <dd class="text-sm font-medium text-blue-600">{debugInfo().tenant.role}</dd>
          </div>
        </dl>
      </div>
      
      <!-- Flags Info -->
      <div>
        <h3 class="font-medium text-gray-700 mb-2">Feature Flags</h3>
        <dl class="space-y-1">
          <div class="flex justify-between">
            <dt class="text-sm text-gray-600">Loading:</dt>
            <dd class="text-sm">{debugInfo().flags.loading ? '⏳ Yes' : '✅ No'}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-sm text-gray-600">Error:</dt>
            <dd class="text-sm text-red-600">{debugInfo().flags.error || 'None'}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-sm text-gray-600">Last Sync:</dt>
            <dd class="text-sm">{debugInfo().flags.lastSync}</dd>
          </div>
        </dl>
      </div>
      
      <!-- Permission Stats -->
      <div>
        <h3 class="font-medium text-gray-700 mb-2">Permissions</h3>
        <dl class="space-y-1">
          <div class="flex justify-between">
            <dt class="text-sm text-gray-600">Active Permissions:</dt>
            <dd class="text-sm font-medium">{debugInfo().permissions}</dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
  
  <!-- Repair Tool -->
  <div class="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
    <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
      <Icon name="wrench" class="w-5 h-5" />
      Repair Tools
    </h2>
    
    <p class="text-sm text-gray-700 mb-4">
      If permissions aren't working correctly, use this tool to ensure all tenants have proper feature flags.
    </p>
    
    <button
      onclick={repairFeatureFlags}
      disabled={isRepairing}
      class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {#if isRepairing}
        <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        Repairing...
      {:else}
        <Icon name="tool" class="w-4 h-4" />
        Repair Feature Flags
      {/if}
    </button>
    
    {#if repairMessage}
      <pre class="mt-4 p-3 bg-white rounded border text-sm whitespace-pre-wrap">{repairMessage}</pre>
    {/if}
  </div>
  
  <!-- Key Permissions Test -->
  <div class="bg-white rounded-lg shadow mb-6 p-6">
    <h2 class="text-lg font-semibold mb-4">Key Permissions Test</h2>
    
    <div class="space-y-2">
      {#each keyPermissions as permission}
        {@const hasPermission = checkPermission(permission)}
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
          <code class="text-sm">{permission}</code>
          <span class="px-2 py-1 text-xs font-medium rounded {hasPermission ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
            {hasPermission ? '✓ Allowed' : '✗ Denied'}
          </span>
        </div>
      {/each}
    </div>
  </div>
  
  <!-- All Permissions -->
  <div class="bg-white rounded-lg shadow p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">All Permissions</h2>
      <button
        onclick={() => showAllPermissions = !showAllPermissions}
        class="text-sm text-blue-600 hover:text-blue-700"
      >
        {showAllPermissions ? 'Hide' : 'Show'} All ({Object.keys(allPermissions()).length})
      </button>
    </div>
    
    {#if showAllPermissions}
      <div class="permission-grid">
        {#each Object.entries(allPermissions()).sort() as [permission, allowed]}
          <div class="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
            <code class="truncate mr-2">{permission}</code>
            <span class="{allowed ? 'text-green-600' : 'text-red-600'} font-medium">
              {allowed ? '✓' : '✗'}
            </span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
  <!-- Console Instructions -->
  <div class="mt-6 p-4 bg-gray-100 rounded-lg">
    <p class="text-sm text-gray-700">
      <strong>Console Debugging:</strong> Open browser console and use <code class="mono">window.vahstDebug</code> to access:
    </p>
    <ul class="mt-2 text-sm text-gray-600 list-disc list-inside">
      <li><code class="mono">vahstDebug.checkPermission('permission_name')</code> - Check specific permission</li>
      <li><code class="mono">vahstDebug.getAllPermissions()</code> - Get all permissions</li>
      <li><code class="mono">vahstDebug.auth</code> - Access auth store</li>
      <li><code class="mono">vahstDebug.flags</code> - Access feature flags store</li>
    </ul>
  </div>
</div>