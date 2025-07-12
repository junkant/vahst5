<!-- src/lib/components/auth/RegisterForm.svelte - UPDATED -->
<script>
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  let { open = $bindable(false) } = $props();
  
  const auth = useAuth();
  
  // Form state
  let formData = $state({
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    agreeToTerms: false
  });
  
  let isLoading = $state(false);
  let error = $state('');
  
  async function handleSubmit(event) {
    event.preventDefault();
    error = '';
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      error = 'Passwords do not match';
      return;
    }
    
    if (formData.password.length < 6) {
      error = 'Password must be at least 6 characters';
      return;
    }
    
    if (!formData.businessName.trim()) {
      error = 'Business name is required';
      return;
    }
    
    if (!formData.agreeToTerms) {
      error = 'Please agree to the terms and conditions';
      return;
    }
    
    isLoading = true;
    
    try {
      const result = await auth.signUp(
        formData.email, 
        formData.password, 
        formData.businessName.trim()
      );
      
      if (result.error) {
        error = result.error;
      } else {
        // Success - close modal and redirect
        open = false;
        
        // Use smart redirect - user will have a business now
        const redirectPath = auth.getPostLoginRedirect();
        goto(redirectPath);
        
        // Reset form
        formData = {
          email: '',
          password: '',
          confirmPassword: '',
          businessName: '',
          agreeToTerms: false
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
      password: '',
      confirmPassword: '',
      businessName: '',
      agreeToTerms: false
    };
  }
  
  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  }
  
  function switchToLogin() {
    open = false;
    // Trigger login modal using custom event
    window.dispatchEvent(new CustomEvent('openLogin'));
  }
</script>

{#if open}
  <!-- Overlay -->
  <div 
    class="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
    onclick={handleOverlayClick}
    onkeydown={(e) => e.key === 'Escape' && closeDialog()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="register-form-title"
    tabindex="-1"
  >
    <!-- Modal -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-all">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 pb-4">
        <h2 id="register-form-title" class="text-2xl font-bold text-gray-900 dark:text-gray-100">Start Your Journey</h2>
        <button 
          onclick={closeDialog}
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Close form"
        >
          <Icon name="close" class="w-6 h-6" />
        </button>
      </div>
      
      <!-- Content -->
      <form onsubmit={handleSubmit} class="p-6 pt-2">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Create your business account • Full access to all features
        </p>
        
        {#if error}
          <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        {/if}
        
        <div class="space-y-4">
          <!-- Business Name -->
          <div>
            <label for="register-business" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Business Name *
            </label>
            <input
              id="register-business"
              type="text"
              bind:value={formData.businessName}
              required
              disabled={isLoading}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="ABC Plumbing"
            />
          </div>
          
          <!-- Email -->
          <div>
            <label for="register-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address *
            </label>
            <input
              id="register-email"
              type="email"
              bind:value={formData.email}
              required
              disabled={isLoading}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="you@company.com"
            />
          </div>
          
          <!-- Password -->
          <div>
            <label for="register-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password *
            </label>
            <input
              id="register-password"
              type="password"
              bind:value={formData.password}
              required
              minlength="6"
              disabled={isLoading}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="••••••••"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Must be at least 6 characters</p>
          </div>
          
          <!-- Confirm Password -->
          <div>
            <label for="register-confirm" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm Password *
            </label>
            <input
              id="register-confirm"
              type="password"
              bind:value={formData.confirmPassword}
              required
              minlength="6"
              disabled={isLoading}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="••••••••"
            />
          </div>
          
          <!-- Terms -->
          <div>
            <label class="flex items-start">
              <input 
                type="checkbox" 
                bind:checked={formData.agreeToTerms}
                disabled={isLoading}
                class="mt-1 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 shadow-sm focus:border-blue-300 dark:focus:border-blue-500 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:ring-opacity-50" 
              />
              <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">
                I agree to the <a href="/terms" class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">Terms of Service</a> 
                and <a href="/privacy" class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">Privacy Policy</a>
              </span>
            </label>
          </div>
        </div>
        
        <!-- Submit Button -->
        <button
          type="submit"
          disabled={isLoading || !formData.agreeToTerms}
          class="w-full mt-6 bg-green-600 dark:bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if isLoading}
            <Icon name="refresh" class="w-4 h-4 animate-spin" />
            Creating Account...
          {:else}
            Create Account
          {/if}
        </button>
        
        <!-- Switch to Login -->
        <p class="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account? 
          <button
            type="button"
            onclick={switchToLogin}
            disabled={isLoading}
            class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium disabled:opacity-50"
          >
            Sign in
          </button>
        </p>
      </form>
    </div>
  </div>
{/if}