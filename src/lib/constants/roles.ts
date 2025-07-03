// src/lib/constants/roles.ts
// Universal role definitions for the Vahst platform

export const USER_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  TEAM_MEMBER: 'team_member'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.OWNER]: 'Owner',
  [USER_ROLES.MANAGER]: 'Manager',
  [USER_ROLES.TEAM_MEMBER]: 'Team Member'
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [USER_ROLES.OWNER]: 'Full control - manage users, billing, settings, and all modules',
  [USER_ROLES.MANAGER]: 'Oversee teams, assign jobs, approve quotes/invoices, manage schedules',
  [USER_ROLES.TEAM_MEMBER]: 'Field workers - access assigned tasks, field mode, voice notes'
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [USER_ROLES.OWNER]: ['all'],
  [USER_ROLES.MANAGER]: [
    'manage_team',
    'assign_jobs',
    'approve_quotes',
    'approve_invoices', 
    'manage_schedules',
    'manage_clients',
    'manage_jobs',
    'view_reports',
    'view_analytics'
  ],
  [USER_ROLES.TEAM_MEMBER]: [
    'view_assigned_jobs',
    'update_job_status',
    'add_notes',
    'use_voice_notes',
    'field_mode',
    'view_own_schedule',
    'update_time_tracking'
  ]
};

export const ROLE_COLORS: Record<UserRole, string> = {
  [USER_ROLES.OWNER]: 'bg-purple-100 text-purple-800',
  [USER_ROLES.MANAGER]: 'bg-blue-100 text-blue-800',
  [USER_ROLES.TEAM_MEMBER]: 'bg-green-100 text-green-800'
};

// Helper to get role badge color
export function getRoleBadgeColor(role: string): string {
  return ROLE_COLORS[role as UserRole] || 'bg-gray-100 text-gray-800';
}