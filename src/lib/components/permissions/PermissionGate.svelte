<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useFeatureFlags } from '$lib/stores/featureFlags.svelte';

  interface Props {
    flag?: string;
    action?: string;
    context?: any;
    fallback?: Snippet;
    children: Snippet;
  }

  let { flag, action, context, fallback, children }: Props = $props();

  // Get the feature flags store
  const featureFlags = useFeatureFlags();

  // Check access based on flag or action
  const canAccess = $derived(() => {
    if (flag) {
      return featureFlags.isEnabled(flag);
    } else if (action) {
      return featureFlags.can(action, context);
    }
    // If neither flag nor action provided, default to true
    return true;
  });
</script>

{#if canAccess()}
  {@render children()}
{:else if fallback}
  {@render fallback()}
{/if}
