<!-- src/lib/components/shared/BaseForm.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  
  interface Props {
    onsubmit: (e: SubmitEvent) => void | Promise<void>;
    loading?: boolean;
    children: Snippet;
  }
  
  let { onsubmit, loading = false, children }: Props = $props();
  
  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    await onsubmit(e);
  }
</script>

<form on:submit={handleSubmit} class="space-y-4">
  {@render children()}
  
  {#if loading}
    <div class="flex justify-center py-4">
      <div class="animate-spin h-6 w-6 border-2 border-blue-600 
                  border-t-transparent rounded-full"></div>
    </div>
  {/if}
</form>