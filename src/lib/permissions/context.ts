import { useFeatureFlags } from '$lib/stores/featureFlags.svelte';

/**
 * Get the permission context reactively
 * No need for setContext/getContext - just use the store directly
 */
export function usePermission(action: string, context?: any) {
  const featureFlagStore = useFeatureFlags();
  return $derived(featureFlagStore.can(action, context));
}

/**
 * Helper hook for feature flag checks
 */
export function useFeatureFlag(flagKey: string) {
  const featureFlagStore = useFeatureFlags();
  return $derived(featureFlagStore.isEnabled(flagKey));
}

/**
 * Get all permissions (for debugging/display)
 */
export function usePermissions() {
  const featureFlagStore = useFeatureFlags();
  return {
    can: (action: string, context?: any) => featureFlagStore.can(action, context),
    isEnabled: (flagKey: string) => featureFlagStore.isEnabled(flagKey),
    get flags() { return featureFlagStore.flags; }
  };
}
