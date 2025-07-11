// src/lib/utils/permissions.ts
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

export const permissions = {
  // Client permissions
  canCreateClient: (user: User, tenant: Tenant): boolean => {
    const managerRoles: UserRole[] = ['owner', 'admin', 'manager'];
    return managerRoles.includes(user.role || 'team_member') ||
           tenant.settings?.allowTeamMemberCreateClients === true;
  },
  
  canEditClient: (user: User): boolean => {
    const managerRoles: UserRole[] = ['owner', 'admin', 'manager'];
    return managerRoles.includes(user.role || 'team_member');
  },
  
  canDeleteClient: (user: User): boolean => {
    const adminRoles: UserRole[] = ['owner', 'admin'];
    return adminRoles.includes(user.role || 'team_member');
  },
  
  // Task permissions
  canEditTask: (user: User, task: Task): boolean => {
    const managerRoles: UserRole[] = ['owner', 'admin', 'manager'];
    return managerRoles.includes(user.role || 'team_member') ||
           (task.assignedTo?.includes(user.uid) ?? false);
  },
  
  canCreateTask: (user: User): boolean => {
    const managerRoles: UserRole[] = ['owner', 'admin', 'manager'];
    return managerRoles.includes(user.role || 'team_member');
  },
  
  canDeleteTask: (user: User): boolean => {
    const managerRoles: UserRole[] = ['owner', 'admin', 'manager'];
    return managerRoles.includes(user.role || 'team_member');
  },
  
  // Settings permissions
  canViewSettings: (user: User): boolean => {
    const adminRoles: UserRole[] = ['owner', 'admin'];
    return adminRoles.includes(user.role || 'team_member');
  },
  
  canEditSettings: (user: User): boolean => {
    return user.role === 'owner';
  },
  
  // Team permissions
  canInviteTeamMembers: (user: User): boolean => {
    const managerRoles: UserRole[] = ['owner', 'admin', 'manager'];
    return managerRoles.includes(user.role || 'team_member');
  },
  
  canManageTeam: (user: User): boolean => {
    const adminRoles: UserRole[] = ['owner', 'admin'];
    return adminRoles.includes(user.role || 'team_member');
  },
  
  canRemoveTeamMember: (user: User): boolean => {
    const adminRoles: UserRole[] = ['owner', 'admin'];
    return adminRoles.includes(user.role || 'team_member');
  },
  
  // Invoice permissions
  canCreateInvoice: (user: User): boolean => {
    const managerRoles: UserRole[] = ['owner', 'admin', 'manager'];
    return managerRoles.includes(user.role || 'team_member');
  },
  
  canEditInvoice: (user: User): boolean => {
    const adminRoles: UserRole[] = ['owner', 'admin'];
    return adminRoles.includes(user.role || 'team_member');
  },
  
  canViewFinancials: (user: User): boolean => {
    const adminRoles: UserRole[] = ['owner', 'admin'];
    return adminRoles.includes(user.role || 'team_member');
  }
};