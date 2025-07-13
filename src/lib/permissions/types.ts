import type { Timestamp } from 'firebase/firestore';

// Core role types
export type Role = 'owner' | 'manager' | 'team_member' | 'client';

// Feature categories for organization
export type FeatureCategory = 
  | 'task_management'    // Creating, assigning, completing tasks
  | 'user_management'    // Inviting, approving, removing users
  | 'financial'          // Viewing invoices, quotes, billing
  | 'reporting'          // Access to analytics and reports
  | 'client_portal'      // Client-specific features
  | 'system_settings'    // Tenant configuration
  | 'experimental';      // Beta features

// Risk levels for feature flags
export type RiskLevel = 'low' | 'medium' | 'high';

// Feature flag metadata
export interface FeatureFlagMetadata {
  description: string;
  category: FeatureCategory;
  riskLevel: RiskLevel;
}

// Individual feature flag configuration
export interface FeatureFlag {
  enabled: boolean;
  targetedRoles: Role[];
  targetedUsers?: string[];
  excludedUsers?: string[];
  enabledAt: Timestamp;
  enabledBy: string;
  expiresAt?: Timestamp;
  metadata?: FeatureFlagMetadata;
}

// Tenant-level feature flags
export interface TenantFeatureFlags {
  flags: Record<string, FeatureFlag>;
  defaultsForRoles: Record<Role, string[]>;
}

// User-specific feature flag overrides
export interface UserFeatureFlags {
  [flagKey: string]: {
    enabled: boolean;
    enabledAt?: Timestamp;
    enabledBy?: string;
    metadata?: any;
  };
}

// Extended user tenant relationship
export interface UserTenantRelation {
  role: Role;
  status: 'active' | 'pending' | 'suspended';
  joinedAt: Timestamp;
  approvedBy?: string;
  featureFlags?: UserFeatureFlags;
  customPermissions?: string[];
}

// Audit log entry
export interface FeatureFlagAuditLog {
  flagKey: string;
  action: 'enabled' | 'disabled' | 'modified';
  performedBy: string;
  performedAt: Timestamp;
  previousState: any;
  newState: any;
  context: {
    userAgent?: string;
    ipAddress?: string;
    reason?: string;
  };
}

// Permission check result with context
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  source?: 'role_default' | 'tenant_flag' | 'user_override' | 'context_rule';
}

// Cache entry for permission evaluations
export interface PermissionCacheEntry {
  value: boolean;
  expiresAt: number;
  context: string;
}
