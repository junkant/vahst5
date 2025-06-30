<!-- src/routes/+layout.svelte - Updated with Business Selection Logic -->
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
  import Toaster from '$lib/components/common/Toaster.svelte';
  
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
  
  // Check if we're on the business selection page
  const isBusinessSelectionPage = $derived($page.route.id === '/select-business');
  
  // Check if we're on an error page (don't redirect these)
  const isErrorPage = $derived($page.error !== null);
  
  // Determine navigation mode
  const navMode = $derived(isPublicPage ? 'landing' : 'app');
  
  // Initialize client store when tenant changes (only for authenticated users)
  $effect(() => {
    if (!isPublicPage && !isBusinessSelectionPage && auth.tenant?.id) {
      initializeClientStore(auth.tenant.id);
    }
  });
  
  // Initialize job store when tenant changes
  $effect(() => {
    if (!isPublicPage && !isBusinessSelectionPage && auth.tenant?.id) {
      initializeJobStore(auth.tenant.id);
    }
    
    // Cleanup when tenant changes or component unmounts
    return () => {
      cleanupJobStore();
    };
  });
  
  // Update client jobs when selected client changes
  $effect(() => {
    if (!isPublicPage && !isBusinessSelectionPage && auth.tenant?.id && clients.selectedClient?.id) {
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
  
  // ENHANCED REDIRECT LOGIC - Handle business selection flow (but not error pages)
  $effect(() => {
    if (!auth.isLoading && !isErrorPage) {
      // Redirect unauthenticated users from protected pages
      if (!auth.user && !isPublicPage && !isBusinessSelectionPage) {
        goto('/');
        return;
      }
      
      // Redirect authenticated users from public pages (but only if they have a selected tenant)
      if (auth.isAuthenticated && auth.hasTenant && isPublicPage) {
        goto('/my-day');
        return;
      }
      
      // NEW: Handle business selection flow
      if (auth.isAuthenticated && !isBusinessSelectionPage && !isPublicPage) {
        // User is authenticated and trying to access app routes
        if (auth.needsBusinessSelection()) {
          // User needs to select a business
          goto('/select-business');
          return;
        }
      }
      
      // NEW: Redirect from business selection if not needed
      if (isBusinessSelectionPage && auth.isAuthenticated && !auth.needsBusinessSelection()) {
        goto('/my-day');
        return;
      }
      
      // NEW: Redirect unauthenticated users from business selection
      if (isBusinessSelectionPage && !auth.isAuthenticated) {
        goto('/login');
        return;
      }
    }
  });
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Conditional Top Navigation -->
  {#if !isPublicPage && !isBusinessSelectionPage}
    <TopBar />
  {:else if $page.route.id === '/'}
    <LandingHeader />
  {/if}

  <!-- Main Content -->
  <main class="{!isPublicPage && !isBusinessSelectionPage ? 'pb-20' : ''}">>>
    {@render children()}
  </main>

  <!-- Bottom Navigation with dynamic mode (hide on business selection only) -->
  {#if !isBusinessSelectionPage}
    <BottomNav mode={navMode} />
  {/if}
  
  <!-- App-wide components -->
  <OfflineIndicator />
  <PwaInstallPrompt />
  
  <!-- Only show NotificationPrompt for authenticated users with selected tenant -->
  {#if auth.isAuthenticated && auth.hasTenant && !isPublicPage && !isBusinessSelectionPage}
    <NotificationPrompt />
  {/if}
  
  <Toaster />
</div>