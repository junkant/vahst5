<!-- src/lib/components/auth/LoginForm.svelte - UPDATED -->
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
    
    try {
      const result = await auth.signIn(formData.email, formData.password);
      
      if (result.error) {
        error = result.error;
      } else {
        // Success - close modal and redirect based on auth state
        open = false;
        
        // Use the auth store's smart redirect logic
        const redirectPath = auth.getPostLoginRedirect();
        goto(redirectPath);
        
        // Reset form
        formData = {
          email: '',
          password: ''
        };
      }
    } catch (err) {
      error = 'An unexpected error occurred';
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
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
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
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Signing in...
          {:else}
            Sign In
          {/if}
        </button>
        
        <!-- Switch to Register -->
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