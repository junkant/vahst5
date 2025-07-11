// src/lib/types/auth.ts
export type UserRole = 'owner' | 'admin' | 'manager' | 'team_member';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: UserRole;
  tenantId?: string;
  permissions: string[];
  createdAt: Date;
  lastLogin?: Date;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  role: UserRole;
  permissions: string[];
  joinedAt: Date;
  invitedBy?: string;
  status: 'active' | 'suspended';
}