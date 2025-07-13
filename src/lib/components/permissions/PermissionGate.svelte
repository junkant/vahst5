<script lang="ts">
  import { getContext } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { PermissionContext } from '$lib/permissions/context';

  interface Props {
    flag?: string;
    action?: string;
    context?: any;
    fallback?: Snippet;
    children: Snippet;
  }

  let { flag, action, context, fallback, children }: Props = $props();

  // Try to get permission context, but don't throw if not found
  const PERMISSION_CONTEXT_KEY = Symbol.for('permissions');
  let permissions: PermissionContext | undefined = undefined;
  
  try {
    permissions = getContext<PermissionContext>(PERMISSION_CONTEXT_KEY);
  } catch (e) {
    // Context not available yet
  }

  // Check access based on flag or action
  const canAccess = $derived(() => {
    if (!permissions) {
      // If no permissions context, default to hiding content
      // This prevents errors during initial render
      return false;
    }
    
    if (flag) {
      return permissions.isEnabled(flag);
    } else if (action) {
      return permissions.can(action, context);
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
