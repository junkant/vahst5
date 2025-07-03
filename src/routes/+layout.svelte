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
  import LandingBottomNav from '$lib/components/common/LandingBottomNav.svelte';
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
    $page.route.id === '/onboarding' ||
    $page.error !== null // Include error pages
  );
  
  // Check if we're on the business selection page - NO LONGER NEEDED
  // const isBusinessSelectionPage = $derived($page.route.id === '/select-business');
  
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
    
    if (currentTenantId && !isPublicPage) {
      // Initialize client store for current tenant
      initializeClientStore(currentTenantId);
      console.log(`📋 Initializing clients for tenant: ${tenant.current.name}`);
    } else if (!currentTenantId && !isPublicPage) {
      // No tenant selected, cleanup clients
      clients.cleanup();
    }
  });
  
  // Initialize job store when tenant changes
  $effect(() => {
    if (!isPublicPage && tenant.current?.id) {
      initializeJobStore(tenant.current.id);
    }
    
    // Cleanup when tenant changes or component unmounts
    return () => {
      cleanupJobStore();
    };
  });
  
  // Subscribe to job updates for selected client
  $effect(() => {
    if (clients.selectedClient && tenant.current?.id) {
      updateClientJobsSubscription(tenant.current.id, clients.selectedClient.id);
    }
  });
  
  // Handle redirect for authenticated users on public pages
  $effect(() => {
    if (!isPublicPage && !$page.error) {
      if (!auth.user) {
        // Redirect to login if not authenticated
        goto('/login');
      } else if (!tenant.current && !$page.route.id?.includes('settings')) {
        // Redirect to settings/profile if no tenant selected
        // But don't redirect if already in settings to avoid loops
        goto('/settings/profile');
      }
    }
  });
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Top Navigation -->
  {#if isPublicPage}
    <LandingHeader />
  {:else}
    <TopBar />
  {/if}
  
  <!-- Main Content -->
  <main class="flex-1 {isPublicPage ? '' : 'pb-20'}">
    {@render children()}
  </main>
  
  <!-- Bottom Navigation -->
  {#if isPublicPage}
    <LandingBottomNav />
  {:else}
    <BottomNav />
  {/if}
  
  <!-- Global Components - Only show auth-specific components when authenticated -->
  {#if !isPublicPage}
    <OfflineIndicator />
    <NotificationPrompt />
  {/if}
  
  <!-- PWA prompt can show everywhere -->
  <PwaInstallPrompt />
  
  <!-- Toaster is global for all pages -->
  <Toaster />
</div>