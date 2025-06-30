<!-- src/routes/select-business/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import BusinessSelection from '$lib/components/auth/BusinessSelection.svelte';
  
  const auth = useAuth();
  
  onMount(() => {
    // Redirect if user is not authenticated
    if (!auth.isAuthenticated) {
      goto('/login');
      return;
    }
    
    // Redirect if user doesn't need business selection
    if (!auth.needsBusinessSelection()) {
      goto(auth.getPostLoginRedirect());
      return;
    }
  });
  
  // Watch for auth changes and redirect appropriately
  $effect(() => {
    if (!auth.isLoading && auth.isAuthenticated && auth.tenant) {
      goto('/my-day');
    }
  });
</script>

<svelte:head>
  <title>Select Business - VAHST</title>
  <meta name="description" content="Choose your business to continue" />
</svelte:head>

{#if auth.isAuthenticated}
  <BusinessSelection />
{:else}
  <!-- Loading or redirecting -->
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="w-8 h-8 mx-auto mb-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-gray-600">Redirecting...</p>
    </div>
  </div>
{/if}