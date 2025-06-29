<!-- src/routes/(app)/settings/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  
  // This will redirect to the first settings page
  $effect(() => {
    goto('/settings/profile');
  });
</script>

<div class="text-center py-8">
  <p class="text-gray-500">Redirecting to settings...</p>
</div>