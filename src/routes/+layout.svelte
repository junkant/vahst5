<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
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
  const tenant = useTenant();
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
  
  // Check if we're on an error page
  const isErrorPage = $derived($page.error !== null);
  
  // Determine navigation mode
  const navMode = $derived(isPublicPage ? 'landing' : 'app');
  
  // Initialize tenant data when auth changes
  $effect(() => {
    if (auth.user) {
      tenant.initialize(auth.user);
    } else {
      tenant.cleanup();
    }
  });
  
  // Initialize client store when tenant changes
  $effect(() => {
    const currentTenantId = tenant.current?.id;
    
    if (currentTenantId && !isPublicPage && !isBusinessSelectionPage) {
      // Initialize client store for current tenant
      initializeClientStore(currentTenantId);
      console.log(`📋 Initializing clients for tenant: ${tenant.current.name}`);
    } else if (!currentTenantId && !isPublicPage && !isBusinessSelectionPage) {
      // No tenant selected, cleanup clients
      clients.cleanup();
    }
  });
  
  // Initialize job store when tenant changes
  $effect(() => {
    if (!isPublicPage && !isBusinessSelectionPage && tenant.current?.id) {
      initializeJobStore(tenant.current.id);
    }
    
    // Cleanup when tenant changes or component unmounts
    return () => {
      cleanupJobStore();
    };
  });
  
  // Update client jobs when selected client changes
  $effect(() => {
    if (!isPublicPage && !isBusinessSelectionPage && tenant.current?.id && clients.selectedClient?.id) {
      updateClientJobsSubscription(tenant.current.id, clients.selectedClient.id);
    }
  });
  
  // Process offline queue when user logs in
  $effect(() => {
    if (auth.user && tenant.current && offline.isOnline && offline.hasQueuedOperations) {
      setTimeout(() => {
        offline.processQueue();
      }, 1000);
    }
  });
  
  // Save queue to localStorage whenever it changes
  $effect(() => {
    offline.saveQueueToStorage();
  });
  
  // Handle redirects
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
      
      // Handle business selection flow
      if (auth.isAuthenticated && !isBusinessSelectionPage && !isPublicPage) {
        if (auth.needsBusinessSelection()) {
          goto('/select-business');
          return;
        }
      }
      
      // Redirect from business selection if not needed
      if (isBusinessSelectionPage && auth.isAuthenticated && !auth.needsBusinessSelection()) {
        goto('/my-day');
        return;
      }
      
      // Redirect unauthenticated users from business selection
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
  <main class="{!isPublicPage && !isBusinessSelectionPage ? 'pb-20' : ''}">
    {@render children()}
  </main>

  <!-- Bottom Navigation (hide on business selection only) -->
  {#if !isBusinessSelectionPage}
    <BottomNav mode={navMode} />
  {/if}
  
  <!-- App-wide components -->
  <OfflineIndicator />
  <PwaInstallPrompt />
  
  <!-- Only show NotificationPrompt for authenticated users with selected tenant -->
  {#if auth.isAuthenticated && tenant.hasTenant && !isPublicPage && !isBusinessSelectionPage}
    <NotificationPrompt />
  {/if}
  
  <Toaster />
</div>