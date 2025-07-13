<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useFeatureFlags } from '$lib/stores/featureFlags.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';

  interface Props {
    flag?: string;
    action?: string;
    context?: any;
    fallback?: Snippet;
    children: Snippet;
  }

  let { flag, action, context, fallback, children }: Props = $props();

  // Get the stores
  const featureFlags = useFeatureFlags();
  const auth = useAuth();

  // Check if we're still loading
  const isLoading = $derived(featureFlags.loading);
  
  // For owners, show content while loading to prevent UI flashing
  const isOwner = $derived(auth.tenant?.role === 'owner' || auth.isOwner);

  // Check access based on flag or action
  const canAccess = $derived(() => {
    // If still loading and user is owner, show the content
    // This prevents the "New Task" button from disappearing and reappearing
    if (isLoading && isOwner) {
      return true;
    }
    
    // If still loading and not owner, hide content
    if (isLoading) {
      return false;
    }
    
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
