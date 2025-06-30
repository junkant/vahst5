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
  let toolAnimationIndex = $state(0);
  
  const tools = ['🔧', '🔨', '⚡'];
  const funMessages = [
    "Looks like this page took an unscheduled maintenance break!",
    "Even our best technicians couldn't find this page!",
    "This page went off-grid faster than a field worker's signal!",
    "Houston, we have a 404 problem!"
  ];
  
  const randomMessage = funMessages[Math.floor(Math.random() * funMessages.length)];
  
  // Animated tool rotation
  let toolInterval: number;
  $effect(() => {
    toolInterval = setInterval(() => {
      toolAnimationIndex = (toolAnimationIndex + 1) % tools.length;
    }, 1200);
    
    return () => clearInterval(toolInterval);
  });
  
  function openLoginModal() {
    showLoginModal = true;
  }
  
  function openRegisterModal() {
    showRegisterModal = true;
  }
  
  function goHome() {
    if (auth.isAuthenticated) {
      goto('/my-day');
    } else {
      goto('/');
    }
  }
  
  function goBack() {
    history.back();
  }
</script>

<svelte:head>
  <title>Page Not Found - VAHST</title>
  <meta name="description" content="The page you're looking for doesn't exist" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4 pb-24 pt-20 relative overflow-hidden">
  <!-- Animated Background Elements -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <!-- Subtle Grid Pattern -->
    <div class="absolute inset-0 opacity-30" style="background-image: url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;);"></div>
  </div>
  
  <!-- Main Content -->
  <div class="max-w-2xl mx-auto text-center relative z-10">
    <!-- Animated 404 -->
    <div class="mb-8">
      <div class="flex items-center justify-center gap-4 mb-4">
        <span class="text-8xl font-bold text-blue-600">4</span>
        <div class="relative">
          <span class="text-8xl font-bold text-gray-300">0</span>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-3xl">{tools[toolAnimationIndex]}</span>
          </div>
        </div>
        <span class="text-8xl font-bold text-blue-600">4</span>
      </div>
      
      <!-- Error Status Text -->
      <div class="text-2xl font-semibold text-gray-700 mb-2">
        Page Not Found
      </div>
    </div>
    
    <!-- Fun Message -->
    <div class="mb-8">
      <p class="text-lg text-gray-600 mb-4 animate-fade-in">
        {randomMessage}
      </p>
      <p class="text-gray-500">
        The page you're looking for might have been moved, deleted, or you entered the wrong URL.
      </p>
    </div>
    
    <!-- Action Buttons -->
    <div class="space-y-4">
      <!-- For Authenticated Users -->
      {#if auth.isAuthenticated}
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onclick={goHome}
            class="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all
                   transform hover:scale-105 shadow-lg font-medium"
          >
            🏠 Go to Dashboard
          </button>
          
          <button
            onclick={goBack}
            class="px-8 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 
                   focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all
                   transform hover:scale-105 shadow-lg font-medium"
          >
            ← Go Back
          </button>
        </div>
        
        <!-- Voice Tip for Authenticated Users -->
        <!-- Removed per user request -->
        
      {:else}
        <!-- For Non-Authenticated Users -->
        <div class="space-y-6">
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onclick={openLoginModal}
              class="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all
                     transform hover:scale-105 shadow-lg font-medium"
            >
              🔐 Sign In
            </button>
            
            <button
              onclick={openRegisterModal}
              class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 
                     focus:outline-none focus:ring-2 focus:ring-green-500 transition-all
                     transform hover:scale-105 shadow-lg font-medium"
            >
              ✨ Get Started
            </button>
          </div>
          
          <button
            onclick={goHome}
            class="px-6 py-2 text-gray-600 hover:text-gray-800 underline 
                   hover:no-underline transition-colors"
          >
            ← Back to Home
          </button>
          
          <!-- Feature Highlight for Visitors -->
          <div class="mt-8 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-200">
            <h3 class="text-lg font-semibold text-gray-900 mb-3">
              🎯 Voice-Controlled Field Service Management
            </h3>
            <div class="grid sm:grid-cols-2 gap-4 text-sm text-gray-700">
              <div class="flex items-start gap-2">
                <span class="text-blue-600">🗣️</span>
                <span>Navigate hands-free with voice commands</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-green-600">📱</span>
                <span>Manage clients, jobs & schedules</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-purple-600">⚡</span>
                <span>Works offline for field workers</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-orange-600">🏢</span>
                <span>Multi-business support</span>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Login Modal using your existing component -->
<LoginForm bind:open={showLoginModal} />

<!-- Register Modal using your existing component -->  
<RegisterForm bind:open={showRegisterModal} />

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fade-in 1s ease-out;
  }
</style>