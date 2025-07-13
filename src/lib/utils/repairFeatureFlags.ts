// src/lib/utils/repairFeatureFlags.ts
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '$lib/firebase/config';
import { createInitialFeatureFlags } from '$lib/permissions/defaults';

/**
 * Ensure a tenant has feature flags document
 * Creates one if missing
 */
export async function ensureTenantFeatureFlags(
  tenantId: string, 
  createdBy: string
): Promise<boolean> {
  try {
    // Check if feature flags document exists
    const flagsRef = doc(db, 'tenantFeatureFlags', tenantId);
    const flagsDoc = await getDoc(flagsRef);
    
    if (!flagsDoc.exists()) {
      console.log(`Creating missing feature flags for tenant ${tenantId}`);
      const featureFlags = createInitialFeatureFlags(tenantId, createdBy);
      await setDoc(flagsRef, featureFlags);
      console.log(`✅ Feature flags created for tenant ${tenantId}`);
      return true;
    }
    
    return false; // Already exists
  } catch (error) {
    console.error('Failed to ensure feature flags:', error);
    throw error;
  }
}

/**
 * Check and repair all tenants for a user
 * Useful for migration or fixing existing data
 */
export async function repairAllUserTenants(userId: string): Promise<void> {
  try {
    // Get user's tenants
    const { getUserTenants } = await import('$lib/firebase/firestore');
    const tenants = await getUserTenants(userId);
    
    let repaired = 0;
    for (const tenant of tenants) {
      const wasRepaired = await ensureTenantFeatureFlags(
        tenant.id, 
        tenant.ownerId || userId
      );
      if (wasRepaired) repaired++;
    }
    
    if (repaired > 0) {
      console.log(`✅ Repaired feature flags for ${repaired} tenant(s)`);
    } else {
      console.log('✅ All tenants have feature flags');
    }
  } catch (error) {
    console.error('Failed to repair user tenants:', error);
    throw error;
  }
}

/**
 * Create default feature flags document
 * Used when we can't use the full createInitialFeatureFlags function
 */
export function getMinimalFeatureFlags(tenantId: string, createdBy: string) {
  return {
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
        'financial_create_invoice',
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
    createdAt: new Date(),
    createdBy: createdBy
  };
}