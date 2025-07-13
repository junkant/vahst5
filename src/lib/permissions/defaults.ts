import type { TenantFeatureFlags, Role } from './types';
import { Timestamp } from 'firebase/firestore';

/**
 * Default feature flags for new tenants
 */
export const DEFAULT_TENANT_FLAGS: TenantFeatureFlags = {
  flags: {},
  defaultsForRoles: {
    owner: [
      'task_management_create_task',
      'task_management_assign_task',
      'task_management_delete_task',
      'task_management_edit_task',
      'task_management_view_all_tasks',
      'user_management_invite_member',
      'user_management_remove_member',
      'user_management_approve_member',
      'user_management_change_roles',
      'user_management_create_client',
      'user_management_edit_client',
      'user_management_delete_client',
      'user_management_manage_team',
      'financial_view_invoices_all',
      'financial_create_invoices',
      'financial_edit_invoices',
      'financial_manage_billing',
      'financial_export_data',
      'reporting_view_all_reports',
      'reporting_export_data',
      'reporting_create_custom_reports',
      'system_settings_manage_tenant',
      'system_settings_manage_features',
      'system_settings_manage_integrations',
      'system_settings_view_settings',
      'client_portal_manage_access',
      'experimental_access_beta_features'
    ],
    manager: [
      'task_management_create_task',
      'task_management_assign_task',
      'task_management_edit_task',
      'task_management_view_team_tasks',
      'user_management_invite_member',
      'user_management_approve_member',
      'user_management_create_client',
      'user_management_edit_client',
      'financial_view_invoices_team',
      'financial_create_invoices',
      'reporting_view_team_reports',
      'reporting_export_data',
      'system_settings_manage_features',
      'client_portal_manage_access'
    ],
    team_member: [
      'task_management_create_task',
      'task_management_view_assigned_tasks',
      'task_management_complete_own_tasks',
      'task_management_suggest_members',
      'reporting_view_own_reports',
      'client_portal_view_access'
    ],
    client: [
      'client_portal_view_projects',
      'client_portal_submit_review',
      'client_portal_view_invoices',
      'client_portal_download_files',
      'client_portal_send_messages',
      'client_portal_view_timeline'
    ]
  }
};

/**
 * Create initial feature flags for a new tenant
 */
export function createInitialFeatureFlags(
  tenantId: string,
  createdBy: string
): TenantFeatureFlags {
  const now = Timestamp.now();
  
  // Create flags for experimental features (disabled by default)
  const experimentalFlags = {
    'experimental_ai_task_suggestions': {
      enabled: false,
      targetedRoles: ['owner', 'manager'] as Role[],
      enabledAt: now,
      enabledBy: createdBy,
      metadata: {
        description: 'AI-powered task suggestions based on patterns',
        category: 'experimental' as const,
        riskLevel: 'medium' as const
      }
    },
    'experimental_voice_commands': {
      enabled: false,
      targetedRoles: ['owner', 'manager', 'team_member'] as Role[],
      enabledAt: now,
      enabledBy: createdBy,
      metadata: {
        description: 'Voice command interface for hands-free operation',
        category: 'experimental' as const,
        riskLevel: 'low' as const
      }
    },
    'experimental_advanced_analytics': {
      enabled: false,
      targetedRoles: ['owner', 'manager'] as Role[],
      enabledAt: now,
      enabledBy: createdBy,
      metadata: {
        description: 'Advanced analytics and predictive insights',
        category: 'experimental' as const,
        riskLevel: 'low' as const
      }
    }
  };

  return {
    flags: experimentalFlags,
    defaultsForRoles: DEFAULT_TENANT_FLAGS.defaultsForRoles
  };
}

/**
 * Feature flag templates for quick setup
 */
export const FEATURE_FLAG_TEMPLATES = {
  beta_features: {
    name: 'Enable Beta Features',
    description: 'Give early access to new features being tested',
    flags: [
      'experimental_ai_task_suggestions',
      'experimental_voice_commands',
      'experimental_advanced_analytics'
    ]
  },
  restricted_financial: {
    name: 'Restricted Financial Access',
    description: 'Limit financial features to owners only',
    flags: [
      'financial_view_invoices_all',
      'financial_create_invoices',
      'financial_manage_billing'
    ],
    restrictToRoles: ['owner'] as Role[]
  },
  client_enhanced: {
    name: 'Enhanced Client Portal',
    description: 'Enable additional client portal features',
    flags: [
      'client_portal_upload_files',
      'client_portal_approve_quotes',
      'client_portal_schedule_meetings'
    ]
  }
};
