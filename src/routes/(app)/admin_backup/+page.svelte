<script lang="ts">
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
  import { clearOldPermissionsData, verifyCleanup } from '$lib/permissions/migration';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const auth = useAuth();
  const toast = useToast();
  
  let migrationStatus = $state<'idle' | 'running' | 'success' | 'error'>('idle');
  let migrationResult = $state<any>(null);
  let verificationResult = $state<any>(null);
  
  async function runMigration() {
    if (!confirm('⚠️ This will clear all old permission data. Make sure you have a backup! Continue?')) {
      return;
    }
    
    migrationStatus = 'running';
    migrationResult = null;
    
    try {
      const result = await clearOldPermissionsData();
      
      if (result.success) {
        migrationStatus = 'success';
        migrationResult = result;
        toast.success('Permission data cleaned successfully!');
        
        // Run verification
        const verification = await verifyCleanup();
        verificationResult = verification;
      } else {
        migrationStatus = 'error';
        migrationResult = result;
        toast.error('Migration failed: ' + result.error);
      }
    } catch (error) {
      migrationStatus = 'error';
      migrationResult = { error: error.message };
      toast.error('Migration error: ' + error.message);
    }
  }
  
  async function runVerification() {
    try {
      const result = await verifyCleanup();
      verificationResult = result;
      
      if (result.success) {
        toast.success('Verification complete - all clean!');
      } else {
        toast.warning('Verification found issues');
      }
    } catch (error) {
      toast.error('Verification error: ' + error.message);
    }
  }
</script>

{#if auth.isOwner}
  <div class="max-w-4xl mx-auto p-6 space-y-8">
    <!-- Migration Complete Notice -->
    <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
      <div class="flex items-center gap-3">
        <Icon name="check-circle" size={24} class="text-green-600 dark:text-green-400" />
        <div>
          <h3 class="text-lg font-semibold text-green-900 dark:text-green-100">Migration Complete!</h3>
          <p class="text-green-700 dark:text-green-300 mt-1">
            The permission system has been successfully migrated. You can manage permissions in Settings → Permissions.
          </p>
          <a href="/settings/permissions" class="inline-flex items-center gap-2 mt-3 text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 font-medium">
            Go to Permissions Settings →
          </a>
        </div>
      </div>
    </div>

    <!-- Keep migration tools collapsed -->
    <details class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <summary class="cursor-pointer font-semibold text-gray-900 dark:text-white">
        Migration Tools (Already Complete)
      </summary>
      
      <div class="mt-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Clean Old Permission Data
        </h2>
      
      <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
        <div class="flex gap-3">
          <Icon name="alert-circle" size={20} class="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div class="text-sm text-yellow-900 dark:text-yellow-100">
            <p class="font-medium mb-2">⚠️ Warning: This action will:</p>
            <ul class="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-200">
              <li>Remove old permission fields from user documents</li>
              <li>Clean up userTenants collection</li>
              <li>Delete any legacy permission collections</li>
              <li>Initialize feature flags for all existing tenants</li>
            </ul>
            <p class="mt-2 font-medium">Make sure you have a backup before proceeding!</p>
          </div>
        </div>
      </div>

      <div class="flex gap-4">
        <button
          onclick={runMigration}
          disabled={migrationStatus === 'running'}
          class="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {#if migrationStatus === 'running'}
            <Icon name="loader" size={20} class="animate-spin" />
            Running Migration...
          {:else}
            <Icon name="trash-2" size={20} />
            Run Migration
          {/if}
        </button>

        <button
          onclick={runVerification}
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Icon name="check-circle" size={20} />
          Verify Cleanup
        </button>
      </div>

      <!-- Migration Results -->
      {#if migrationResult}
        <div class="mt-6 p-4 rounded-lg {migrationStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}">
          {#if migrationStatus === 'success'}
            <h3 class="font-medium text-green-900 dark:text-green-100 mb-2">
              ✅ Migration Successful!
            </h3>
            <div class="text-sm text-green-800 dark:text-green-200 space-y-1">
              <p>Users cleaned: {migrationResult.stats.usersCleaned}</p>
              <p>User-tenant relations cleaned: {migrationResult.stats.userTenantsCleaned}</p>
              <p>Tenants cleaned: {migrationResult.stats.tenantsCleaned}</p>
              <p>Feature flags initialized: {migrationResult.stats.flagsInitialized}</p>
            </div>
          {:else}
            <h3 class="font-medium text-red-900 dark:text-red-100 mb-2">
              ❌ Migration Failed
            </h3>
            <p class="text-sm text-red-800 dark:text-red-200">
              {migrationResult.error}
            </p>
          {/if}
        </div>
      {/if}

      <!-- Verification Results -->
      {#if verificationResult}
        <div class="mt-6 p-4 rounded-lg {verificationResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'}">
          {#if verificationResult.success}
            <h3 class="font-medium text-green-900 dark:text-green-100">
              ✅ Verification Passed - All Clean!
            </h3>
          {:else}
            <h3 class="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
              ⚠️ Issues Found
            </h3>
            <ul class="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              {#each verificationResult.issues as issue}
                <li>• {issue}</li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    </details>

    <!-- Instructions -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
      <h3 class="font-medium text-blue-900 dark:text-blue-100 mb-3">
        Migration Steps:
      </h3>
      <ol class="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
        <li>Make sure you have a backup of your Firestore data</li>
        <li>Run the migration using the button above</li>
        <li>Verify the cleanup was successful</li>
        <li>Test the new permission system in Settings → Permissions</li>
        <li>Update your security rules with the new rules from <code class="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">firestore.rules</code></li>
      </ol>
    </div>
  </div>
{:else}
  <div class="max-w-4xl mx-auto p-8">
    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
      <div class="flex items-center gap-3">
        <Icon name="alert-circle" size={24} class="text-red-600 dark:text-red-400" />
        <div>
          <h3 class="text-lg font-semibold text-red-900 dark:text-red-100">Access Denied</h3>
          <p class="text-red-700 dark:text-red-300 mt-1">
            Only business owners can access the admin panel.
          </p>
        </div>
      </div>
    </div>
  </div>
{/if}
