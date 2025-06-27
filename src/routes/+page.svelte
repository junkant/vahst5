<!-- src/routes/+page.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    // Redirect to my-day dashboard on load
    goto('/my-day', { replaceState: true });
  });
</script>

<!-- Loading state while redirecting -->
<div class="h-screen bg-gray-50 flex items-center justify-center">
  <div class="text-center">
    <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
      <span class="text-white font-bold text-lg">V</span>
    </div>
    <h1 class="text-2xl font-semibold text-gray-900 mb-2">Vahst</h1>
    <p class="text-gray-500">Loading...</p>
  </div>
</div>