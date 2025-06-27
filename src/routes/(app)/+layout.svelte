<!-- src/routes/(app)/+layout.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { initializeClientStore, updateClientJobsSubscription, useClients } from '$lib/stores/client.svelte';
  import TopBar from '$lib/components/common/TopBar.svelte';
  import BottomNav from '$lib/components/common/BottomNav.svelte';
  
  let { children } = $props();
  
  const auth = useAuth();
  const clients = useClients();
  
  // Initialize client store when tenant changes
  $effect(() => {
    initializeClientStore(auth.tenant?.id);
  });
  
  // Update client jobs when selected client changes
  $effect(() => {
    updateClientJobsSubscription(auth.tenant?.id, clients.selectedClient?.id);
  });
  
  // Temporarily disable auth redirect for testing
  // $effect(() => {
  //   if (!auth.isLoading && !auth.user) {
  //     goto('/login');
  //   }
  // });
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Top Navigation -->
  <TopBar />

  <!-- Main Content -->
  <main class="pb-20">
    {@render children()}
  </main>

  <!-- Bottom Navigation -->
  <BottomNav />
</div>