<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { initializeClientStore, updateClientJobsSubscription, useClients } from '$lib/stores/client.svelte';
  import { initializeJobStore, cleanupJobStore } from '$lib/stores/jobs.svelte';
  import { useOffline } from '$lib/stores/offline.svelte';
  import TopBar from '$lib/components/common/TopBar.svelte';
  import BottomNav from '$lib/components/common/BottomNav.svelte';
  import LandingHeader from '$lib/components/common/LandingHeader.svelte';
  import OfflineIndicator from '$lib/components/common/OfflineIndicator.svelte';
  import PwaInstallPrompt from '$lib/components/common/PwaInstallPrompt.svelte';
  import NotificationPrompt from '$lib/components/notifications/NotificationPrompt.svelte';
  
  let { children } = $props();
  
  const auth = useAuth();
  const clients = useClients();
  const offline = useOffline();
  
  // Determine if we're on a public page
  const isPublicPage = $derived(
    $page.route.id?.includes('(public)') || 
    $page.route.id === '/' ||
    $page.route.id === '/login' ||
    $page.route.id === '/register' ||
    $page.route.id === '/onboarding'
  );
  
  // Determine navigation mode
  const navMode = $derived(isPublicPage ? 'landing' : 'app');
  
  // Initialize client store when tenant changes (only for authenticated users)
  $effect(() => {
    if (!isPublicPage && auth.tenant?.id) {
      initializeClientStore(auth.tenant.id);
    }
  });
  
  // Initialize job store when tenant changes
  $effect(() => {
    if (!isPublicPage && auth.tenant?.id) {
      initializeJobStore(auth.tenant.id);
    }
    
    // Cleanup when tenant changes or component unmounts
    return () => {
      cleanupJobStore();
    };
  });
  
  // Update client jobs when selected client changes
  $effect(() => {
    if (!isPublicPage && auth.tenant?.id && clients.selectedClient?.id) {
      updateClientJobsSubscription(auth.tenant.id, clients.selectedClient.id);
    }
  });
  
  // Process offline queue when user logs in
  $effect(() => {
    if (auth.user && auth.tenant && offline.isOnline && offline.hasQueuedOperations) {
      setTimeout(() => {
        offline.processQueue();
      }, 1000);
    }
  });
  
  // Save queue to localStorage whenever it changes
  $effect(() => {
    offline.saveQueueToStorage();
  });
  
  // Redirect authenticated users from public pages to app
  $effect(() => {
    if (!auth.isLoading && auth.isAuthenticated && auth.hasTenant && isPublicPage) {
      goto('/my-day');
    }
  });
  
  // Redirect unauthenticated users from app pages to landing
  $effect(() => {
    if (!auth.isLoading && !auth.user && !isPublicPage) {
      goto('/');
    }
  });
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Conditional Top Navigation -->
  {#if !isPublicPage}
    <TopBar />
  {:else if $page.route.id === '/'}
    <LandingHeader />
  {/if}

  <!-- Main Content -->
  <main class="{!isPublicPage ? 'pb-20' : ''}">
    {@render children()}
  </main>

  <!-- Bottom Navigation with dynamic mode -->
  <BottomNav mode={navMode} />
  
  <!-- App-wide components -->
  <OfflineIndicator />
  <PwaInstallPrompt />
  <NotificationPrompt />
</div>