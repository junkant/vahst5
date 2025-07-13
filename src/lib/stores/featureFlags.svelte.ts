import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  Timestamp,
  type Unsubscribe 
} from 'firebase/firestore';
import { db } from '$lib/firebase/config';
import { useAuth } from '$lib/stores/auth.svelte';
import { BaseStore } from '$lib/stores/base.store';
import { PermissionManager } from '$lib/permissions';
import type { 
  TenantFeatureFlags, 
  UserFeatureFlags, 
  FeatureFlagAuditLog,
  Role 
} from '$lib/permissions/types';

// Local storage keys
const OFFLINE_FLAGS_KEY = 'feature_flags_snapshot';
const OFFLINE_FLAGS_TIMESTAMP = 'feature_flags_timestamp';

class FeatureFlagStore extends BaseStore {
  // Reactive state
  private state = $state({
    flags: new Map<string, boolean>(),
    loading: false,
    error: null as Error | null,
    lastSync: null as Date | null
  });
  
  // Internal state
  private permissionManager: PermissionManager | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private tenantFlags: TenantFeatureFlags | null = null;
  private userFlags: UserFeatureFlags | null = null;
  private authStore = useAuth();
  private effectCleanup: (() => void) | null = null;

  constructor() {
    super();
    // Initialize from local storage for offline support
    this.loadFromLocalStorage();
  }

  // BaseStore implementation
  init() {
    // Set up reactive subscription in init, not constructor
    this.effectCleanup = $effect.root(() => {
      $effect(() => {
        const user = this.authStore.user;
        const tenant = this.authStore.tenant;
        
        if (user && tenant) {
          // Get role from tenant data or userTenants
          const role = this.extractUserRole(user.uid, tenant);
          this.initialize(user.uid, tenant.id, role);
        } else {
          this.cleanupListeners();
        }
      });
    });
  }

  reset() {
    this.state.flags.clear();
    this.state.loading = false;
    this.state.error = null;
    this.state.lastSync = null;
    this.permissionManager = null;
    this.tenantFlags = null;
    this.userFlags = null;
  }

  /**
   * Extract user role from tenant data
   */
  private extractUserRole(userId: string, tenant: any): Role {
    // First check if role is directly on tenant (from auth store)
    if (tenant.role) {
      return tenant.role as Role;
    }
    
    // Check if current user is owner
    if (tenant.ownerId === userId) {
      return 'owner';
    }
    
    // Default to team_member
    return 'team_member';
  }

  /**
   * Initialize the store for a specific user and tenant
   */
  private async initialize(userId: string, tenantId: string, role: Role) {
    this.state.loading = true;
    this.state.error = null;

    try {
      // Set up Firebase listeners
      await this.setupListeners(userId, tenantId, role);
      
      // Update last sync time
      this.state.lastSync = new Date();
      
      // Save to local storage
      this.saveToLocalStorage();
    } catch (err) {
      console.error('Failed to initialize feature flags:', err);
      this.state.error = err as Error;
      // Still allow app to function with default permissions
      this.setDefaultPermissions(role);
    } finally {
      this.state.loading = false;
    }
  }

  /**
   * Set default permissions based on role when Firebase fails
   */
  private setDefaultPermissions(role: Role) {
    // Create a permission manager with comprehensive defaults
    const defaultFlags = {
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
          'user_management_edit_client'
        ],
        team_member: [
          'task_management_view_assigned_tasks',
          'task_management_update_status',
          'task_management_add_notes',
          'task_management_complete_own_tasks'
        ],
        client: ['client_portal_view_projects']
      }
    };
    
    this.permissionManager = new PermissionManager(
      this.authStore.user?.uid || '',
      this.authStore.tenant?.id || '',
      role,
      defaultFlags
    );
    
    this.refreshAllFlags();
  }

  /**
   * Set up real-time listeners for feature flags
   */
  private async setupListeners(userId: string, tenantId: string, role: Role) {
    // Clean up existing listeners
    this.cleanupListeners();

    // Listen to tenant feature flags
    const tenantFlagsRef = doc(db, 'tenantFeatureFlags', tenantId);
    const tenantUnsubscribe = onSnapshot(
      tenantFlagsRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          this.tenantFlags = snapshot.data() as TenantFeatureFlags;
          this.updatePermissionManager(userId, tenantId, role);
        } else {
          console.warn(`No feature flags document for tenant ${tenantId}, using defaults`);
          this.setDefaultPermissions(role);
        }
      },
      (error) => {
        console.error('Error listening to tenant flags:', error);
        this.setDefaultPermissions(role);
      }
    );
    this.unsubscribers.push(tenantUnsubscribe);

    // Listen to user-specific flags (stored in userTenants)
    const userTenantRef = doc(db, 'users', userId, 'userTenants', tenantId);
    const userUnsubscribe = onSnapshot(
      userTenantRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          this.userFlags = data.featureFlags || null;
          
          // Also update role if available
          if (data.role && this.permissionManager) {
            const newRole = data.role as Role;
            this.updatePermissionManager(userId, tenantId, newRole);
          }
        }
      },
      (error) => {
        // User flags are optional, so just log
        console.log('No user-specific feature flags');
      }
    );
    this.unsubscribers.push(userUnsubscribe);
  }

  /**
   * Update the permission manager and refresh flags
   */
  private updatePermissionManager(userId: string, tenantId: string, role: Role) {
    if (!this.tenantFlags) {
      this.setDefaultPermissions(role);
      return;
    }

    this.permissionManager = new PermissionManager(
      userId,
      tenantId,
      role,
      this.tenantFlags,
      this.userFlags || undefined
    );

    // Update all flags
    this.refreshAllFlags();
  }

  /**
   * Refresh all flag evaluations
   */
  private refreshAllFlags() {
    if (!this.permissionManager) return;

    const allPermissions = this.permissionManager.getAllPermissions();
    this.state.flags.clear();
    
    Object.entries(allPermissions).forEach(([flag, enabled]) => {
      this.state.flags.set(flag, enabled);
    });
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flagKey: string): boolean {
    return this.state.flags.get(flagKey) ?? false;
  }

  /**
   * Check if user can perform an action with context
   */
  can(action: string, context?: any): boolean {
    if (!this.permissionManager) {
      console.warn('Permission manager not initialized, denying access');
      return false;
    }
    return this.permissionManager.can(action, context);
  }

  /**
   * Get all permissions for debugging
   */
  getAllPermissions(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    this.state.flags.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Toggle a feature flag (for admins)
   */
  async toggleFlag(flagKey: string, enabled: boolean, metadata?: any): Promise<void> {
    const user = this.authStore.user;
    const tenant = this.authStore.tenant;
    
    if (!user || !tenant) {
      throw new Error('No authenticated user or tenant');
    }

    // Check permission to manage features
    if (!this.can('system_settings_manage_features')) {
      throw new Error('Insufficient permissions to manage features');
    }

    try {
      // Update the flag
      const tenantFlagsRef = doc(db, 'tenantFeatureFlags', tenant.id);
      await setDoc(tenantFlagsRef, {
        flags: {
          [flagKey]: {
            enabled,
            enabledAt: Timestamp.now(),
            enabledBy: user.uid,
            targetedRoles: ['owner', 'manager', 'team_member', 'client'],
            metadata
          }
        }
      }, { merge: true });

      // Create audit log
      await this.createAuditLog(flagKey, enabled ? 'enabled' : 'disabled', {
        performedBy: user.uid,
        metadata
      });
    } catch (err) {
      console.error('Failed to toggle feature flag:', err);
      throw err;
    }
  }

  /**
   * Create an audit log entry
   */
  private async createAuditLog(
    flagKey: string, 
    action: 'enabled' | 'disabled' | 'modified',
    details: any
  ): Promise<void> {
    const tenant = this.authStore.tenant;
    if (!tenant) return;

    const auditRef = doc(
      collection(db, 'featureFlagAudit', tenant.id, 'logs')
    );

    const auditLog: FeatureFlagAuditLog = {
      flagKey,
      action,
      performedBy: details.performedBy,
      performedAt: Timestamp.now(),
      previousState: null, // TODO: Track previous state
      newState: details.metadata,
      context: {
        userAgent: navigator.userAgent,
        reason: details.reason
      }
    };

    await setDoc(auditRef, auditLog);
  }

  /**
   * Local storage management for offline support
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(OFFLINE_FLAGS_KEY);
      const timestamp = localStorage.getItem(OFFLINE_FLAGS_TIMESTAMP);
      
      if (stored && timestamp) {
        const flags = JSON.parse(stored);
        const lastSync = new Date(timestamp);
        
        // Only use cached flags if they're less than 24 hours old
        if (Date.now() - lastSync.getTime() < 24 * 60 * 60 * 1000) {
          this.state.flags = new Map(Object.entries(flags));
          this.state.lastSync = lastSync;
        }
      }
    } catch (err) {
      console.error('Failed to load flags from local storage:', err);
    }
  }

  private saveToLocalStorage(): void {
    try {
      const flagsObject: Record<string, boolean> = {};
      this.state.flags.forEach((value, key) => {
        flagsObject[key] = value;
      });
      
      localStorage.setItem(OFFLINE_FLAGS_KEY, JSON.stringify(flagsObject));
      localStorage.setItem(OFFLINE_FLAGS_TIMESTAMP, new Date().toISOString());
    } catch (err) {
      console.error('Failed to save flags to local storage:', err);
    }
  }

  /**
   * Clean up listener subscriptions
   */
  private cleanupListeners(): void {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
  }

  /**
   * Clean up all resources (BaseStore override)
   */
  destroy() {
    this.cleanupListeners();
    if (this.effectCleanup) {
      this.effectCleanup();
      this.effectCleanup = null;
    }
    super.destroy();
  }

  // Getters for external access
  get flags() { return this.state.flags; }
  get loading() { return this.state.loading; }
  get error() { return this.state.error; }
  get lastSync() { return this.state.lastSync; }
}

// Singleton instance
let instance: FeatureFlagStore | null = null;

// Export hook following project pattern
export function useFeatureFlags() {
  if (!instance) {
    instance = new FeatureFlagStore();
    instance.init(); // Initialize after creation
  }
  return instance;
}

// Cleanup function for auth store
export function cleanupFeatureFlagStore() {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}