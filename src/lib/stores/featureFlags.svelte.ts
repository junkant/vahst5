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
    
    // Set up reactive subscription immediately during construction
    this.effectCleanup = $effect.root(() => {
      $effect(() => {
        const user = this.authStore.user;
        const tenant = this.authStore.tenant;
        
        if (user && tenant) {
          // Get role from userTenants data
          this.initialize(user.uid, tenant.id, tenant.role || 'team_member');
        } else {
          this.cleanupListeners();
        }
      });
    });
  }

  // BaseStore implementation
  init() {
    // No longer need $effect here since it's in constructor
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
    } finally {
      this.state.loading = false;
    }
  }

  /**
   * Set up real-time listeners for feature flags
   */
  private async setupListeners(userId: string, tenantId: string, role: Role) {
    // Clean up existing listeners
    this.cleanupListeners();

    // Listen to tenant feature flags
    const tenantFlagsRef = doc(db, 'tenantFeatureFlags', tenantId);
    const tenantUnsubscribe = onSnapshot(tenantFlagsRef, (snapshot) => {
      if (snapshot.exists()) {
        this.tenantFlags = snapshot.data() as TenantFeatureFlags;
        this.updatePermissionManager(userId, tenantId, role);
      }
    });
    this.unsubscribers.push(tenantUnsubscribe);

    // Listen to user-specific flags (stored in userTenants)
    const userTenantRef = doc(db, 'users', userId, 'userTenants', tenantId);
    const userUnsubscribe = onSnapshot(userTenantRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        this.userFlags = data.featureFlags || null;
        this.updatePermissionManager(userId, tenantId, role);
      }
    });
    this.unsubscribers.push(userUnsubscribe);
  }

  /**
   * Update the permission manager and refresh flags
   */
  private updatePermissionManager(userId: string, tenantId: string, role: Role) {
    if (!this.tenantFlags) return;

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
    if (!this.permissionManager) return false;
    return this.permissionManager.can(action, context);
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
