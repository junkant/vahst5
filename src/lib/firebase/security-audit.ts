// src/lib/firebase/security-audit.ts
export interface SecurityMismatch {
  rule: string;
  frontend: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
}

export const securityMismatches: SecurityMismatch[] = [
  {
    rule: 'tenants/{tenantId}/clients - create',
    frontend: 'All authenticated users can create',
    issue: 'Frontend allows all team members to create clients by default, but rules restrict to owner/admin/manager unless settings.allowTeamMemberCreateClients is true',
    severity: 'medium',
    recommendation: 'Add permission check in frontend using permissions.canCreateClient()'
  },
  {
    rule: 'tenants/{tenantId}/tasks - update',
    frontend: 'Task assignment not consistently checked',
    issue: 'Frontend doesn\'t always verify if user is assigned to task before allowing edits',
    severity: 'high',
    recommendation: 'Always check permissions.canEditTask() before allowing task updates'
  },
  {
    rule: 'tenants/{tenantId}/settings - read',
    frontend: 'Settings page accessible to all authenticated users',
    issue: 'Frontend shows settings link to all users, but rules restrict read access to owner/admin only',
    severity: 'low',
    recommendation: 'Hide settings link for users without permissions.canViewSettings()'
  },
  {
    rule: 'inviteCodes/{code} - read',
    frontend: 'Not implemented',
    issue: 'Invite codes are publicly readable (for accepting invites) but frontend doesn\'t validate',
    severity: 'medium',
    recommendation: 'Validate invite codes on frontend before attempting to read'
  },
  {
    rule: 'userTenants/{userId}',
    frontend: 'Direct access attempted',
    issue: 'Frontend might try to read other users\' tenant relationships',
    severity: 'high',
    recommendation: 'Only access current user\'s tenant relationships'
  }
];

// Audit results summary
export const auditSummary = {
  totalRules: 15,
  mismatches: securityMismatches.length,
  highSeverity: securityMismatches.filter(m => m.severity === 'high').length,
  mediumSeverity: securityMismatches.filter(m => m.severity === 'medium').length,
  lowSeverity: securityMismatches.filter(m => m.severity === 'low').length,
  
  recommendations: [
    'Implement centralized permission checking using permissions.ts',
    'Add frontend guards before all data mutations',
    'Hide UI elements based on user roles',
    'Validate all user inputs against security rules',
    'Add error handling for permission denied errors'
  ]
};