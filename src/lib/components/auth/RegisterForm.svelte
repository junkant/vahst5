<!-- src/lib/components/auth/RegisterForm.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  
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
    
    if (!formData.agreeToTerms) {
      error = 'Please agree to the terms and conditions';
      return;
    }
    
    isLoading = true;
    
    try {
      const result = await auth.signUp(
        formData.email, 
        formData.password, 
        formData.businessName
      );
      
      if (result.error) {
        error = result.error;
      } else {
        // Success - close modal and redirect to onboarding
        open = false;
        goto('/onboarding');
        
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
    // Trigger login modal
    window.dispatchEvent(new CustomEvent('openLogin'));
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
    aria-labelledby="register-form-title"
    tabindex="-1"
  >
    <!-- Modal -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 pb-4">
        <h2 id="register-form-title" class="text-2xl font-bold text-gray-900">Start Your Free Trial</h2>
        <button 
          onclick={closeDialog}
          class="text-gray-400 hover:text-gray-600"
          aria-label="Close form"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Content -->
      <form onsubmit={handleSubmit} class="p-6 pt-2">
        <p class="text-sm text-gray-600 mb-6">
          14-day free trial • No credit card required • Cancel anytime
        </p>
        
        {#if error}
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        {/if}
        
        <div class="space-y-4">
          <!-- Business Name -->
          <div>
            <label for="register-business" class="block text-sm font-medium text-gray-700 mb-1">
              Business Name
            </label>
            <input
              id="register-business"
              type="text"
              bind:value={formData.businessName}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your Company Name"
            />
          </div>
          
          <!-- Email -->
          <div>
            <label for="register-email" class="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              bind:value={formData.email}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@company.com"
            />
          </div>
          
          <!-- Password -->
          <div>
            <label for="register-password" class="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              bind:value={formData.password}
              required
              minlength="6"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
            <p class="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
          </div>
          
          <!-- Confirm Password -->
          <div>
            <label for="register-confirm" class="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="register-confirm"
              type="password"
              bind:value={formData.confirmPassword}
              required
              minlength="6"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          
          <!-- Terms -->
          <div>
            <label class="flex items-start">
              <input 
                type="checkbox" 
                bind:checked={formData.agreeToTerms}
                class="mt-1 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" 
              />
              <span class="ml-2 text-sm text-gray-600">
                I agree to the <a href="/terms" class="text-blue-600 hover:text-blue-500">Terms of Service</a> 
                and <a href="/privacy" class="text-blue-600 hover:text-blue-500">Privacy Policy</a>
              </span>
            </label>
          </div>
        </div>
        
        <!-- Submit Button -->
        <button
          type="submit"
          disabled={isLoading}
          class="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating Account...' : 'Start Free Trial'}
        </button>
        
        <!-- Benefits -->
        <div class="mt-6 pt-6 border-t border-gray-200">
          <p class="text-sm font-medium text-gray-700 mb-3">What's included:</p>
          <ul class="space-y-2 text-sm text-gray-600">
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Unlimited clients & jobs
            </li>
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Voice-powered workflows
            </li>
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Mobile & desktop access
            </li>
          </ul>
        </div>
        
        <!-- Switch to Login -->
        <p class="mt-4 text-center text-sm text-gray-600">
          Already have an account? 
          <button
            type="button"
            onclick={switchToLogin}
            class="text-blue-600 hover:text-blue-500 font-medium"
          >
            Sign in
          </button>
        </p>
      </form>
    </div>
  </div>
{/if}