import { getContext, setContext } from 'svelte';
import { useFeatureFlags } from '$lib/stores/featureFlags.svelte';

const PERMISSION_CONTEXT_KEY = Symbol.for('permissions');

/**
 * Permission context interface
 */
export interface PermissionContext {
  can: (action: string, context?: any) => boolean;
  isEnabled: (flagKey: string) => boolean;
  flags: Map<string, boolean>;
}

/**
 * Set up permission context (call in root layout)
 */
export function setPermissionContext(): PermissionContext {
  const featureFlagStore = useFeatureFlags();
  
  const context: PermissionContext = {
    can: (action: string, context?: any) => featureFlagStore.can(action, context),
    isEnabled: (flagKey: string) => featureFlagStore.isEnabled(flagKey),
    get flags() { return featureFlagStore.flags; }
  };
  
  setContext(PERMISSION_CONTEXT_KEY, context);
  return context;
}

/**
 * Get permission context in components
 */
export function getPermissionContext(): PermissionContext {
  const context = getContext<PermissionContext>(PERMISSION_CONTEXT_KEY);
  
  if (!context) {
    throw new Error(
      'Permission context not found. ' +
      'Make sure to call setPermissionContext() in a parent component.'
    );
  }
  
  return context;
}

/**
 * Helper hook for permission checks
 */
export function usePermission(action: string, context?: any): boolean {
  const permissions = getPermissionContext();
  return permissions.can(action, context);
}

/**
 * Helper hook for feature flag checks
 */
export function useFeatureFlag(flagKey: string): boolean {
  const permissions = getPermissionContext();
  return permissions.isEnabled(flagKey);
}
