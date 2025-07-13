import type { 
  Role, 
  TenantFeatureFlags, 
  UserFeatureFlags, 
  PermissionCheckResult,
  PermissionCacheEntry 
} from './types';

// Default feature flags for each role
const DEFAULT_ROLE_FLAGS: Record<Role, string[]> = {
  owner: [
    // Owners get everything by default - COMPREHENSIVE LIST
    // Task Management
    'task_management_create_task',
    'task_management_assign_task',
    'task_management_edit_task',
    'task_management_delete_task',
    'task_management_update_status',
    'task_management_add_notes',
    'task_management_view_all_tasks',
    'task_management_view_team_tasks',
    'task_management_view_assigned_tasks',
    'task_management_complete_own_tasks',
    // User Management
    'user_management_invite_member',
    'user_management_remove_member',
    'user_management_approve_member',
    'user_management_change_roles',
    'user_management_create_client',
    'user_management_edit_client',
    'user_management_delete_client',
    'user_management_view_all_clients',
    'user_management_manage_team',
    // Financial
    'financial_view_invoices_all',
    'financial_view_invoices_team',
    'financial_create_invoice',
    'financial_edit_invoice',
    'financial_delete_invoice',
    'financial_record_payment',
    'financial_manage_expenses',
    'financial_manage_billing',
    'financial_export_data',
    'financial_view_reports',
    // Reporting
    'reporting_view_all_reports',
    'reporting_view_team_reports',
    'reporting_view_own_reports',
    'reporting_export_data',
    'reporting_create_custom_reports',
    // System Settings
    'system_settings_manage_tenant',
    'system_settings_manage_features',
    'system_settings_manage_integrations',
    'system_settings_manage_storage',
    'system_settings_view_settings',
    'system_settings_view_audit_logs',
    // Client Portal
    'client_portal_manage_access',
    'client_portal_view_projects',
    'client_portal_submit_review',
    'client_portal_view_invoices',
    'client_portal_download_files',
    'client_portal_send_messages',
    'client_portal_view_timeline',
    // Experimental
    'experimental_access_beta_features',
    'experimental_ai_task_suggestions',
    'experimental_voice_commands',
    'experimental_advanced_analytics'
  ],
  manager: [
    // Managers get team and task management
    'task_management_create_task',
    'task_management_assign_task',
    'task_management_edit_task',
    'task_management_update_status',
    'task_management_add_notes',
    'task_management_view_all_tasks',
    'task_management_view_team_tasks',
    'user_management_invite_member',
    'user_management_approve_member',
    'user_management_create_client',
    'user_management_edit_client',
    'user_management_view_all_clients',
    'financial_view_invoices_team',
    'financial_create_invoice',
    'financial_record_payment',
    'financial_manage_expenses',
    'reporting_view_team_reports',
    'reporting_export_data',
    'system_settings_manage_features',
  ],
  team_member: [
    // Team members get basic task features
    'task_management_create_task',
    'task_management_view_assigned_tasks',
    'task_management_complete_own_tasks',
    'task_management_update_status', // For their own tasks
    'task_management_add_notes',
    'user_management_create_client', // If enabled by tenant
    'reporting_view_own_reports',
  ],
  client: [
    // Clients get portal access only
    'client_portal_view_projects',
    'client_portal_submit_review',
    'client_portal_view_invoices',
    'client_portal_download_files',
  ],
};

export class PermissionManager {
  private cache = new Map<string, PermissionCacheEntry>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(
    private userId: string,
    private tenantId: string,
    private userRole: Role,
    private tenantFlags: TenantFeatureFlags,
    private userFlags?: UserFeatureFlags
  ) {}

  /**
   * Check if a user can perform a specific action
   */
  can(action: string, context?: any): boolean {
    const result = this.evaluate(action, context);
    return result.allowed;
  }

  /**
   * Check multiple permissions at once
   */
  canMultiple(actions: string[]): Record<string, boolean> {
    const results: Record<string, boolean> = {};
    
    for (const action of actions) {
      results[action] = this.can(action);
    }
    
    return results;
  }

  /**
   * Get detailed permission evaluation result
   */
  evaluate(action: string, context?: any): PermissionCheckResult {
    // Check cache first
    const cacheKey = this.getCacheKey(action, context);
    const cached = this.getFromCache(cacheKey);
    if (cached !== null) {
      return { allowed: cached, source: 'role_default' };
    }

    // Evaluate permission
    const result = this.evaluatePermission(action, context);
    
    // Cache the result
    this.setCache(cacheKey, result.allowed);
    
    return result;
  }

  /**
   * Core permission evaluation logic
   */
  private evaluatePermission(action: string, context?: any): PermissionCheckResult {
    // 1. Check user-specific overrides first (highest priority)
    if (this.userFlags?.[action]) {
      return {
        allowed: this.userFlags[action].enabled,
        source: 'user_override'
      };
    }

    // 2. Check tenant-level feature flags
    const tenantFlag = this.tenantFlags.flags[action];
    if (tenantFlag) {
      // Check if user is explicitly excluded
      if (tenantFlag.excludedUsers?.includes(this.userId)) {
        return { allowed: false, source: 'tenant_flag', reason: 'User explicitly excluded' };
      }

      // Check if user is explicitly included
      if (tenantFlag.targetedUsers?.includes(this.userId)) {
        return { allowed: tenantFlag.enabled, source: 'tenant_flag' };
      }

      // Check if user's role is targeted
      if (tenantFlag.targetedRoles.includes(this.userRole)) {
        // Check if flag has expired
        if (tenantFlag.expiresAt && new Date(tenantFlag.expiresAt.toMillis()) < new Date()) {
          return { allowed: false, source: 'tenant_flag', reason: 'Flag expired' };
        }
        
        return { allowed: tenantFlag.enabled, source: 'tenant_flag' };
      }
    }

    // 3. Check role-based defaults
    const roleDefaults = this.tenantFlags.defaultsForRoles[this.userRole] || DEFAULT_ROLE_FLAGS[this.userRole];
    if (roleDefaults.includes(action)) {
      return { allowed: true, source: 'role_default' };
    }

    // 4. Apply context-specific rules if provided
    if (context) {
      const contextResult = this.evaluateContextRules(action, context);
      if (contextResult !== null) {
        return { allowed: contextResult, source: 'context_rule' };
      }
    }

    // Default deny
    return { allowed: false, reason: 'No matching permission rule' };
  }

  /**
   * Evaluate context-specific permission rules
   */
  private evaluateContextRules(action: string, context: any): boolean | null {
    // Example: User can only complete their own tasks
    if (action === 'task_management_complete_task' && context.taskOwnerId) {
      return context.taskOwnerId === this.userId;
    }

    // Example: Manager can only view their team's data
    if (action === 'reporting_view_team_reports' && context.teamId) {
      // This would check if the user manages the specified team
      // For now, return null to fall through to other rules
      return null;
    }

    return null;
  }

  /**
   * Cache management
   */
  private getCacheKey(action: string, context?: any): string {
    const contextKey = context ? JSON.stringify(context) : '';
    return `${this.userId}:${this.tenantId}:${action}:${contextKey}`;
  }

  private getFromCache(key: string): boolean | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  private setCache(key: string, value: boolean): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTimeout,
      context: key
    });
  }

  /**
   * Clear all cached permissions
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get all permissions for the current user
   */
  getAllPermissions(): Record<string, boolean> {
    const allFlags = new Set<string>();
    
    // Collect all possible flags
    Object.keys(this.tenantFlags.flags).forEach(flag => allFlags.add(flag));
    Object.keys(this.userFlags || {}).forEach(flag => allFlags.add(flag));
    DEFAULT_ROLE_FLAGS[this.userRole].forEach(flag => allFlags.add(flag));
    
    const permissions: Record<string, boolean> = {};
    allFlags.forEach(flag => {
      permissions[flag] = this.can(flag);
    });
    
    return permissions;
  }
}
