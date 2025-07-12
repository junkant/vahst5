<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  import { onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { initializeClientStore, useClients, cleanupClientStore } from '$lib/stores/client.svelte';
  import { useJobStore, cleanupJobStore } from '$lib/stores/task.svelte';
  import { cleanupTeamStore } from '$lib/stores/team.svelte';
  import { useOffline } from '$lib/stores/offline.svelte';
  import { useUI } from '$lib/stores/ui.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
  import { getCalendarTaskSync, destroyCalendarTaskSync } from '$lib/services/calendar-task-sync';
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import BottomNav from '$lib/components/layout/BottomNav.svelte';
  import LandingBottomNav from '$lib/components/layout/LandingBottomNav.svelte';
  import LandingHeader from '$lib/components/layout/LandingHeader.svelte';
  import OfflineIndicator from '$lib/components/common/OfflineIndicator.svelte';
  import PwaInstallPrompt from '$lib/components/common/PwaInstallPrompt.svelte';
  import NotificationPrompt from '$lib/components/notifications/NotificationPrompt.svelte';
  import Toaster from '$lib/components/common/Toaster.svelte';
  import TaskCreationModal from '$lib/components/task/TaskCreationModal.svelte';
  import { useTaskCreation } from '$lib/composables/useTaskCreation.svelte';
  import LoginForm from '$lib/components/auth/LoginForm.svelte';
  import RegisterForm from '$lib/components/auth/RegisterForm.svelte';
  
  let { children } = $props();
  
  const auth = useAuth();
  const clients = useClients();
  const taskStore = useJobStore();
  const offline = useOffline();
  const ui = useUI();
  const toast = useToast();
  const taskCreation = auth.isAuthenticated ? useTaskCreation() : null;
  
  // Modal states for login/register
  let showLoginModal = $state(false);
  let showRegisterModal = $state(false);
  
  // Keyboard shortcut for dark mode toggle (Cmd/Ctrl + Shift + D)
  $effect(() => {
    if (!browser) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + Shift + D
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        ui.toggleTheme();
        
        // Show toast notification
        const themeLabel = ui.effectiveTheme === 'dark' ? 'Dark' : 'Light';
        toast.success(`${themeLabel} mode activated`);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
  
  // Event listeners for modal opening
  $effect(() => {
    if (!browser) return;
    
    const handleOpenLogin = () => {
      showLoginModal = true;
      showRegisterModal = false;
    };
    
    const handleOpenRegister = () => {
      showRegisterModal = true;
      showLoginModal = false;
    };
    
    window.addEventListener('openLoginModal', handleOpenLogin);
    window.addEventListener('openRegisterModal', handleOpenRegister);
    
    return () => {
      window.removeEventListener('openLoginModal', handleOpenLogin);
      window.removeEventListener('openRegisterModal', handleOpenRegister);
    };
  });
  
  // List of routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/onboarding', '/select-business'];
  
  // Check if current route is an invite route
  const isInviteRoute = $derived($page.route.id?.startsWith('/invite/'));
  
  // Determine if we're on a public page
  const isPublicPage = $derived(
    publicRoutes.includes($page.route.id || '') ||
    $page.route.id?.includes('(public)') ||
    isInviteRoute || // Add invite routes as public
    // Only treat error pages as public if user is not authenticated
    ($page.error !== null && !auth.user)
  );
  
  // Track if we're still initializing
  const isInitializing = $derived(
    !isPublicPage && (
      auth.isLoading || 
      !auth.tenantsLoaded ||
      (auth.isAuthenticated && auth.needsBusinessSelection() && !auth.tenant)
    )
  );
  
  // Track if we've already checked auth for this route
  let hasCheckedAuth = $state(false);
  
  // Handle authentication and tenant selection redirects
  $effect(() => {
    // Skip if we're on a public page or initializing
    if (isPublicPage || isInitializing) return;
    
    // Skip if we've already checked this route
    if (hasCheckedAuth) return;
    
    // Skip if tenant isn't loaded yet
    if (!auth.tenantsLoaded) return;
    
    // Mark as checked
    hasCheckedAuth = true;
    
    // Check authentication
    if (!auth.user) {
      goto('/login');
      return;
    }
    
    // Check if user needs to select/create a business
    if (!auth.tenant) {
      // Skip redirect if we're already on a settings page
      if ($page.route.id?.includes('settings')) return;
      
      if (auth.tenants.length === 0) {
        // No businesses, go create one
        goto('/select-business');
      } else if (auth.tenants.length > 0) {
        // Has businesses but none selected
        goto('/select-business');
      }
    }
  });
  
  // Reset auth check when route changes
  $effect(() => {
    if ($page.route.id) {
      hasCheckedAuth = false;
    }
  });
  
  // Initialize task store with tenant
  let lastInitializedTenantId = $state<string | null>(null);
  
  $effect(() => {
    const currentTenantId = auth.tenant?.id;
    
    // Only initialize if tenant changed and we have a tenant
    if (currentTenantId && currentTenantId !== lastInitializedTenantId) {
      lastInitializedTenantId = currentTenantId;
      taskStore.setTenant(currentTenantId);
    }
  });
  
  // Initialize calendar-task sync when tenant is set
  $effect(() => {
    const currentTenantId = auth.tenant?.id;
    
    if (currentTenantId && !isPublicPage) {
      // Initialize sync service
      getCalendarTaskSync();
    }
  });
  
  // Cleanup stores when component unmounts (client-side only)
  if (browser) {
    onDestroy(() => {
      // Use safe cleanup that checks if functions exist
      try {
        if (typeof cleanupJobStore === 'function') {
          cleanupJobStore();
        }
        if (typeof cleanupClientStore === 'function') {
          cleanupClientStore();
        }
        if (typeof cleanupTeamStore === 'function') {
          cleanupTeamStore();
        }
        if (typeof destroyCalendarTaskSync === 'function') {
          destroyCalendarTaskSync();
        }
        
        // Also cleanup the store instances if they have cleanup methods
        if (taskStore && typeof taskStore.cleanup === 'function') {
          taskStore.cleanup();
        }
        if (clients && typeof clients.cleanup === 'function') {
          clients.cleanup();
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
  }
</script>

<!-- Show loading state while initializing -->
{#if isInitializing}
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div class="text-center">
      <div class="inline-flex items-center justify-center w-12 h-12 mb-4">
        <svg class="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p class="text-gray-600">Loading...</p>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
    <!-- Top Navigation -->
    {#if isPublicPage}
      <LandingHeader />
    {:else}
      <TopBar />
    {/if}
    
    <!-- Main Content -->
    <main class="flex-1 flex flex-col {isPublicPage ? '' : 'pb-20'}">
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
    
    <!-- Global Task Creation Modal -->
    {#if auth.isAuthenticated && taskCreation}
    <TaskCreationModal 
      bind:open={taskCreation.state.isOpen}
      task={taskCreation.state.task}
      initialDate={taskCreation.state.initialDate}
      initialTime={taskCreation.state.initialTime}
      initialClientId={taskCreation.state.initialClientId}
      onSuccess={taskCreation.state.onSuccess}
    />
    {/if}
    
    <!-- Global Auth Modals -->
    {#if !auth.isAuthenticated}
      <LoginForm bind:open={showLoginModal} />
      <RegisterForm bind:open={showRegisterModal} />
    {/if}
  </div>
{/if}