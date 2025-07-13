// src/lib/utils/permissions.ts
// DEPRECATED: This file is kept for backward compatibility
// Use the new permission system with PermissionGate component and usePermission hook

import { useFeatureFlags } from '$lib/stores/featureFlags.svelte';
import type { User, UserRole } from '$lib/types/auth';

interface Tenant {
  id: string;
  name: string;
  settings?: {
    allowTeamMemberCreateClients?: boolean;
  };
}

interface Task {
  id: string;
  assignedTo?: string[];
}

// Get the feature flag store instance
let flagStore: ReturnType<typeof useFeatureFlags> | null = null;

function getFlags() {
  if (!flagStore) {
    flagStore = useFeatureFlags();
  }
  return flagStore;
}

export const permissions = {
  // Client permissions
  canCreateClient: (user: User, tenant: Tenant): boolean => {
    const flags = getFlags();
    return flags.can('user_management_create_client', { user, tenant });
  },
  
  canEditClient: (user: User): boolean => {
    const flags = getFlags();
    return flags.can('user_management_edit_client', { user });
  },
  
  canDeleteClient: (user: User): boolean => {
    const flags = getFlags();
    return flags.can('user_management_delete_client', { user });
  },
  
  // Task permissions
  canEditTask: (user: User, task: Task): boolean => {
    const flags = getFlags();
    return flags.can('task_management_edit_task', { user, task });
  },
  
  canCreateTask: (user: User): boolean => {
    const flags = getFlags();
    return flags.can('task_management_create_task', { user });
  },
  
  canDeleteTask: (user: User): boolean => {
    const flags = getFlags();
    return flags.can('task_management_delete_task', { user });
  },
  
  // Settings permissions
  canViewSettings: (user: User): boolean => {
    const flags = getFlags();
    return flags.can('system_settings_view_settings', { user });
  },
  
  canEditSettings: (user: User): boolean => {
    const flags = getFlags();
    return flags.can('system_settings_manage_tenant', { user });
  },
  
  // Team permissions
  canInviteTeamMembers: (user: User): boolean => {
    const flags = getFlags();
    return flags.can('user_management_invite_member', { user });
  },
  
  canManageTeam: (user: User): boolean => {
    const flags = getFlags();
    return flags.can('user_management_manage_team', { user });
  },
  
  canRemoveTeamMember: (user: User): boolean => {
    const flags = getFlags();
    return flags.can('user_management_remove_member', { user });
  },
  
  // Invoice permissions
  canCreateInvoice: (user: User): boolean => {
    const flags = getFlags();
    return flags.can('financial_create_invoices', { user });
  },
  
  canEditInvoice: (user: User): boolean => {
    const flags = getFlags();
    return flags.can('financial_edit_invoices', { user });
  },
  
  canViewFinancials: (user: User): boolean => {
    const flags = getFlags();
    return flags.can('financial_view_invoices_all', { user });
  }
};