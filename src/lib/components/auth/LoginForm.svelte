<!-- src/lib/components/auth/LoginForm.svelte - FIXED VERSION -->
<script>
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  let { open = $bindable(false) } = $props();
  
  const auth = useAuth();
  
  // Form state
  let formData = $state({
    email: '',
    password: ''
  });
  
  let isLoading = $state(false);
  let error = $state('');
  
  async function handleSubmit(event) {
    event.preventDefault();
    error = '';
    isLoading = true;
    
    console.log('Starting login with:', formData.email);
    
    try {
      const result = await auth.signIn(formData.email, formData.password);
      console.log('Sign in result:', result);
      
      if (result.error) {
        console.error('Sign in error:', result.error);
        error = result.error;
      } else {
        console.log('Sign in successful');
        // Success - close modal
        open = false;
        
        // Reset form
        formData = {
          email: '',
          password: ''
        };
        
        // IMPORTANT: Wait for tenants to be loaded before redirecting
        // Create an effect to watch for tenant loading completion
        let checkCount = 0;
        let checkInterval = setInterval(() => {
          checkCount++;
          console.log(`Checking tenants (${checkCount}):`, {
            tenantsLoaded: auth.tenantsLoaded,
            tenants: auth.tenants,
            tenant: auth.tenant
          });
          
          if (auth.tenantsLoaded) {
            clearInterval(checkInterval);
            
            // Now check where to redirect
            const redirectPath = auth.getPostLoginRedirect();
            console.log('Redirecting to:', redirectPath);
            goto(redirectPath);
          }
        }, 100); // Check every 100ms
        
        // Timeout after 5 seconds to prevent infinite waiting
        setTimeout(() => {
          clearInterval(checkInterval);
          console.warn('Timeout waiting for tenants to load');
          // Force redirect if tenants haven't loaded
          const redirectPath = auth.getPostLoginRedirect();
          goto(redirectPath);
        }, 5000);
      }
    } catch (err) {
      console.error('Unexpected error during sign in:', err);
      error = err.message || 'An unexpected error occurred';
    } finally {
      isLoading = false;
    }
  }
  
  function closeDialog() {
    open = false;
    error = '';
    // Reset form
    formData = {
      email: '',
      password: ''
    };
  }
  
  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  }
  
  function switchToRegister() {
    open = false;
    // Trigger register modal using custom event
    window.dispatchEvent(new CustomEvent('openRegister'));
  }
</script>

{#if open}
  <!-- Overlay -->
  <div 
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    onclick={handleOverlayClick}
    onkeydown={(e) => e.key === 'Escape' && closeDialog()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="login-form-title"
    tabindex="-1"
  >
    <!-- Modal -->
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 pb-4">
        <h2 id="login-form-title" class="text-2xl font-bold text-gray-900">Welcome Back</h2>
        <button 
          onclick={closeDialog}
          class="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
          aria-label="Close form"
        >
          <Icon name="close" class="w-6 h-6" />
        </button>
      </div>
      
      <!-- Content -->
      <form onsubmit={handleSubmit} class="p-6 pt-2">
        {#if error}
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        {/if}
        
        <div class="space-y-4">
          <!-- Email -->
          <div>
            <label for="login-email" class="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              bind:value={formData.email}
              required
              disabled={isLoading}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="you@company.com"
            />
          </div>
          
          <!-- Password -->
          <div>
            <label for="login-password" class="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              bind:value={formData.password}
              required
              disabled={isLoading}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="••••••••"
            />
          </div>
          
          <!-- Remember me & Forgot password -->
          <div class="flex items-center justify-between">
            <label class="flex items-center">
              <input 
                type="checkbox" 
                disabled={isLoading}
                class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" 
              />
              <span class="ml-2 text-sm text-gray-600">Remember me</span>
            </label>
            <button 
              type="button" 
              disabled={isLoading}
              class="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
            >
              Forgot password?
            </button>
          </div>
        </div>
        
        <!-- Submit Button -->
        <button
          type="submit"
          disabled={isLoading}
          class="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if isLoading}
            <Icon name="refresh" class="w-4 h-4 animate-spin" />
            Signing in...
          {:else}
            Sign In
          {/if}
        </button>
        
        <!-- Test Button for Debugging -->
        <div class="mt-4 p-3 bg-gray-100 rounded-lg">
          <p class="text-xs text-gray-600 mb-2">Debug: Click to test login with demo credentials</p>
          <button
            type="button"
            onclick={() => {
              formData.email = 'demo@example.com';
              formData.password = 'demo123';
              console.log('Auth state:', { 
                user: auth.user, 
                isLoading: auth.isLoading,
                error: auth.error,
                tenants: auth.tenants,
                tenant: auth.tenant
              });
            }}
            class="text-xs text-blue-600 hover:text-blue-700"
          >
            Fill Demo Credentials & Log State
          </button>
        </div>
        <p class="mt-4 text-center text-sm text-gray-600">
          Don't have an account? 
          <button
            type="button"
            onclick={switchToRegister}
            disabled={isLoading}
            class="text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50"
          >
            Sign up
          </button>
        </p>
      </form>
    </div>
  </div>
{/if}