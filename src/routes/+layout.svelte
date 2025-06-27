<!-- src/routes/(app)/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { initializeClientStore, updateClientJobsSubscription, useClients } from '$lib/stores/client.svelte';
  import { useOffline } from '$lib/stores/offline.svelte';
  import TopBar from '$lib/components/common/TopBar.svelte';
  import BottomNav from '$lib/components/common/BottomNav.svelte';
  import OfflineIndicator from '$lib/components/common/OfflineIndicator.svelte';
  import PwaInstallPrompt from '$lib/components/common/PwaInstallPrompt.svelte';
  
  let { children } = $props();
  
  const auth = useAuth();
  const clients = useClients();
  const offline = useOffline();
  
  // Initialize client store when tenant changes
  $effect(() => {
    initializeClientStore(auth.tenant?.id);
  });
  
  // Update client jobs when selected client changes
  $effect(() => {
    updateClientJobsSubscription(auth.tenant?.id, clients.selectedClient?.id);
  });
  
  // Process offline queue when user logs in
  $effect(() => {
    if (auth.user && auth.tenant && offline.isOnline && offline.hasQueuedOperations) {
      // Small delay to ensure auth context is fully established
      setTimeout(() => {
        offline.processQueue();
      }, 1000);
    }
  });
  
  // Save queue to localStorage whenever it changes
  $effect(() => {
    offline.saveQueueToStorage();
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
  
  <!-- Offline Status Indicator -->
  <OfflineIndicator />
  
  <!-- PWA Install Prompt -->
  <PwaInstallPrompt />
</div>