<!-- src/routes/+error.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import LoginForm from '$lib/components/auth/LoginForm.svelte';
  import RegisterForm from '$lib/components/auth/RegisterForm.svelte';
  
  const auth = useAuth();
  
  let showLoginModal = $state(false);
  let showRegisterModal = $state(false);
  
  // Event listeners for modal opening (CRITICAL FIX)
  $effect(() => {
    const handleOpenLogin = () => {
      showLoginModal = true;
      showRegisterModal = false;
    };
    
    const handleOpenRegister = () => {
      showRegisterModal = true;
      showLoginModal = false;
    };
    
    // Listen for the events that LandingHeader and LandingBottomNav emit
    window.addEventListener('openLoginModal', handleOpenLogin);
    window.addEventListener('openRegisterModal', handleOpenRegister);
    
    return () => {
      window.removeEventListener('openLoginModal', handleOpenLogin);
      window.removeEventListener('openRegisterModal', handleOpenRegister);
    };
  });
  
  function goHome() {
    goto('/');
  }
  
  function goBack() {
    history.back();
  }
  
  function openLoginModal() {
    showLoginModal = true;
    showRegisterModal = false;
  }
  
  function openRegisterModal() {
    showRegisterModal = true;
    showLoginModal = false;
  }
</script>

<svelte:head>
  <title>Page Not Found | VAHST</title>
  <meta name="description" content="The page you're looking for couldn't be found. Get back to managing your field service work with VAHST." />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
  <div class="max-w-lg mx-auto text-center">
    <!-- Error Code with Tool -->
    <div class="relative mb-8">
      <h1 class="text-8xl font-bold text-gray-300">404</h1>
      <div class="absolute -top-4 -right-4 text-4xl transform rotate-12">🔧</div>
    </div>
    
    <!-- Message -->
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-3">Page Not Found</h2>
      <p class="text-gray-600">
        Looks like this page took an unscheduled maintenance break.
      </p>
    </div>
    
    <!-- Action Buttons -->
    <div class="space-y-4">
      {#if auth.isAuthenticated}
        <!-- Authenticated Users -->
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onclick={goHome}
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                   transition-colors font-medium"
          >
            Go to Dashboard
          </button>
          
          <button
            onclick={goBack}
            class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 
                   transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      {:else}
        <!-- Non-Authenticated Users -->
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onclick={openLoginModal}
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     transition-colors font-medium"
            >
              Sign In
            </button>
            
            <button
              onclick={openRegisterModal}
              class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 
                     transition-colors font-medium"
            >
              Get Started
            </button>
          </div>
          
          <button
            onclick={goHome}
            class="text-gray-600 hover:text-gray-800 underline hover:no-underline transition-colors text-sm"
          >
            Back to Home
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Render the modal components -->
<LoginForm bind:open={showLoginModal} />
<RegisterForm bind:open={showRegisterModal} />