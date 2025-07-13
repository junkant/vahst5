<script lang="ts">
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useFeatureFlags } from '$lib/stores/featureFlags.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
  import { FEATURE_FLAG_TEMPLATES } from '$lib/permissions/defaults';
  import type { Role, FeatureCategory } from '$lib/permissions/types';
  import PermissionGate from '$lib/components/permissions/PermissionGate.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const auth = useAuth();
  const flags = useFeatureFlags();
  const toast = useToast();

  // Category metadata for display
  const categoryMeta: Record<FeatureCategory, { label: string; icon: string; description: string }> = {
    task_management: { 
      label: 'Task Management', 
      icon: 'layout',
      description: 'Control who can create, assign, and manage tasks'
    },
    user_management: { 
      label: 'User Management', 
      icon: 'users',
      description: 'Manage team member invitations and permissions'
    },
    financial: { 
      label: 'Financial', 
      icon: 'dollar-sign',
      description: 'Access to invoices, billing, and financial data'
    },
    reporting: { 
      label: 'Reporting', 
      icon: 'file-text',
      description: 'View and export analytics and reports'
    },
    client_portal: { 
      label: 'Client Portal', 
      icon: 'users',
      description: 'Features available to clients in their portal'
    },
    system_settings: { 
      label: 'System Settings', 
      icon: 'settings',
      description: 'Configure tenant and system settings'
    },
    experimental: { 
      label: 'Experimental', 
      icon: 'beaker',
      description: 'Beta features and experimental functionality'
    }
  };

  // Group flags by category
  const flagsByCategory = $derived(() => {
    const grouped: Record<FeatureCategory, Array<{ key: string; enabled: boolean; label: string }>> = {
      task_management: [],
      user_management: [],
      financial: [],
      reporting: [],
      client_portal: [],
      system_settings: [],
      experimental: []
    };

    // Add all flags to their categories
    flags.flags.forEach((enabled, key) => {
      const category = key.split('_').slice(0, 2).join('_') as FeatureCategory;
      const label = key.split('_').slice(2).join(' ')
        .replace(/^\w/, c => c.toUpperCase())
        .replace(/_/g, ' ');
      
      if (grouped[category]) {
        grouped[category].push({ key, enabled, label });
      }
    });

    // Sort flags within each category
    Object.keys(grouped).forEach(cat => {
      grouped[cat as FeatureCategory].sort((a, b) => a.label.localeCompare(b.label));
    });

    return grouped;
  });

  // Available roles
  const roles: Role[] = ['owner', 'manager', 'team_member', 'client'];
  
  // Selected filters
  let selectedCategory = $state<FeatureCategory | 'all'>('all');
  let selectedRole = $state<Role | 'all'>('all');
  let showOnlyEnabled = $state(false);

  // Filtered flags based on selections
  const filteredCategories = $derived(() => {
    if (selectedCategory === 'all') {
      return Object.entries(flagsByCategory());
    }
    return [[selectedCategory, flagsByCategory()[selectedCategory]]] as const;
  });

  // Toggle a feature flag
  async function toggleFlag(flagKey: string, enabled: boolean) {
    try {
      await flags.toggleFlag(flagKey, enabled);
      toast.success(`Feature ${enabled ? 'enabled' : 'disabled'}: ${flagKey}`);
    } catch (error) {
      console.error('Failed to toggle feature flag:', error);
      toast.error('Failed to update feature flag');
    }
  }

  // Apply a template
  async function applyTemplate(templateKey: keyof typeof FEATURE_FLAG_TEMPLATES) {
    const template = FEATURE_FLAG_TEMPLATES[templateKey];
    
    try {
      for (const flagKey of template.flags) {
        await flags.toggleFlag(flagKey, true);
      }
      toast.success(`Applied template: ${template.name}`);
    } catch (error) {
      console.error('Failed to apply template:', error);
      toast.error('Failed to apply template');
    }
  }
</script>

<PermissionGate action="system_settings_manage_features">
  <div class="max-w-7xl mx-auto p-4 space-y-6">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div class="flex items-center gap-3 mb-4">
        <Icon name="shield" size={32} class="text-blue-600" />
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Feature Permissions</h1>
          <p class="text-gray-600 dark:text-gray-400">
            Control feature access for different roles in your organization
          </p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="flex flex-wrap gap-3 mt-6">
        <h3 class="w-full text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Templates:</h3>
        {#each Object.entries(FEATURE_FLAG_TEMPLATES) as [key, template]}
          <button
            onclick={() => applyTemplate(key)}
            class="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
          >
            {template.name}
          </button>
        {/each}
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Filters</h2>
      
      <div class="grid md:grid-cols-3 gap-4">
        <!-- Category Filter -->
        <div>
          <label for="category" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category
          </label>
          <select
            id="category"
            bind:value={selectedCategory}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {#each Object.entries(categoryMeta) as [value, meta]}
              <option {value}>{meta.label}</option>
            {/each}
          </select>
        </div>

        <!-- Role Filter -->
        <div>
          <label for="role" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Role
          </label>
          <select
            id="role"
            bind:value={selectedRole}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            {#each roles as role}
              <option value={role}>{role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}</option>
            {/each}
          </select>
        </div>

        <!-- Show Only Enabled -->
        <div class="flex items-end">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={showOnlyEnabled}
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Show only enabled features
            </span>
          </label>
        </div>
      </div>
    </div>

    <!-- Feature Flags List -->
    <div class="space-y-6">
      {#each filteredCategories() as [category, categoryFlags]}
        {#if !showOnlyEnabled || categoryFlags.some(f => f.enabled)}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
            <!-- Category Header -->
            <div class="p-6 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-3">
                <Icon name={categoryMeta[category as FeatureCategory].icon} size={24} class="text-gray-600 dark:text-gray-400" />
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {categoryMeta[category as FeatureCategory].label}
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {categoryMeta[category as FeatureCategory].description}
                  </p>
                </div>
              </div>
            </div>

            <!-- Flags in Category -->
            <div class="divide-y divide-gray-200 dark:divide-gray-700">
              {#each categoryFlags as flag}
                {#if !showOnlyEnabled || flag.enabled}
                  <div class="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div class="flex items-center justify-between">
                      <div class="flex-1">
                        <h4 class="text-base font-medium text-gray-900 dark:text-white">
                          {flag.label}
                        </h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Permission key: <code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{flag.key}</code>
                        </p>
                      </div>
                      
                      <!-- Toggle Switch -->
                      <button
                        onclick={() => toggleFlag(flag.key, !flag.enabled)}
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {flag.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}"
                        role="switch"
                        aria-checked={flag.enabled}
                      >
                        <span class="sr-only">Enable {flag.label}</span>
                        <span
                          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {flag.enabled ? 'translate-x-6' : 'translate-x-1'}"
                        ></span>
                      </button>
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>

    <!-- Info Box -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
      <div class="flex gap-3">
        <Icon name="info" size={20} class="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div class="text-sm text-blue-900 dark:text-blue-100">
          <p class="font-medium mb-2">About Feature Permissions</p>
          <ul class="space-y-1 list-disc list-inside text-blue-800 dark:text-blue-200">
            <li>Changes take effect immediately for all users</li>
            <li>User-specific overrides take precedence over role defaults</li>
            <li>All changes are logged in the audit trail</li>
            <li>Experimental features should be tested thoroughly before enabling</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  {#snippet fallback()}
    <div class="max-w-4xl mx-auto p-8">
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div class="flex items-center gap-3">
          <Icon name="shield" size={24} class="text-red-600 dark:text-red-400" />
          <div>
            <h3 class="text-lg font-semibold text-red-900 dark:text-red-100">Access Denied</h3>
            <p class="text-red-700 dark:text-red-300 mt-1">
              You don't have permission to manage feature flags. Only owners and managers can access this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  {/snippet}
</PermissionGate>
