<!-- src/routes/+page.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import BottomNav from '$lib/components/common/BottomNav.svelte';
  import LoginForm from '$lib/components/auth/LoginForm.svelte';
  import RegisterForm from '$lib/components/auth/RegisterForm.svelte';
  
  const auth = useAuth();
  
  let showLogin = $state(false);
  let showRegister = $state(false);
  
  // Redirect if already authenticated
  $effect(() => {
    if (auth.isAuthenticated && auth.hasTenant) {
      goto('/my-day');
    }
  });
  
  // Listen for modal events from other components
  $effect(() => {
    const handleOpenLogin = () => {
      showLogin = true;
      showRegister = false;
    };
    
    const handleOpenRegister = () => {
      showRegister = true;
      showLogin = false;
    };
    
    window.addEventListener('openLoginModal', handleOpenLogin);
    window.addEventListener('openRegisterModal', handleOpenRegister);
    
    return () => {
      window.removeEventListener('openLoginModal', handleOpenLogin);
      window.removeEventListener('openRegisterModal', handleOpenRegister);
    };
  });
  
  function openLogin() {
    showLogin = true;
    showRegister = false;
  }
  
  function openRegister() {
    showRegister = true;
    showLogin = false;
  }
  
  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Hero Section -->
  <section class="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 text-white">
    <div class="absolute inset-0 opacity-10">
      <div class="absolute transform rotate-45 -right-10 -top-10 w-40 h-40 bg-white rounded-lg"></div>
      <div class="absolute transform rotate-12 -left-5 bottom-20 w-32 h-32 bg-white rounded-lg"></div>
    </div>
    
    <div class="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
      <div class="text-center">
        <h1 class="text-4xl sm:text-6xl font-bold mb-6">
          Field Service.<br />
          Done Right.<br />
          <span class="text-blue-200">Finally.</span>
        </h1>
        
        <p class="text-xl sm:text-2xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Built for the field, not the office. Vahst puts your clients first and keeps your team moving.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onclick={openRegister}
            class="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
          >
            Start Free Trial
          </button>
          <button
            onclick={() => scrollToSection('features')}
            class="px-8 py-4 bg-blue-700 text-white rounded-lg font-semibold text-lg hover:bg-blue-600 transition-colors"
          >
            See How It Works
          </button>
        </div>
        
        <p class="mt-4 text-sm text-blue-200">
          No credit card required • 14-day free trial
        </p>
      </div>
    </div>
  </section>
  
  <!-- Features Section -->
  <section id="features" class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Built for Field Workers
        </h2>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          Stop fighting with software designed for office workers. Vahst is built from the ground up for people on the move.
        </p>
      </div>
      
      <div class="grid md:grid-cols-3 gap-8">
        <!-- Client-First Design -->
        <div class="text-center">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Client-Centric Workflow</h3>
          <p class="text-gray-600">
            Everything revolves around your clients. See their history, equipment, and preferences at a glance.
          </p>
        </div>
        
        <!-- Voice-First -->
        <div class="text-center">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Voice Commands</h3>
          <p class="text-gray-600">
            Hands dirty? No problem. Use voice commands to log notes, create jobs, and update statuses.
          </p>
        </div>
        
        <!-- Mobile-First -->
        <div class="text-center">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Mobile-First Design</h3>
          <p class="text-gray-600">
            Works perfectly on any device. Access everything you need from your phone, tablet, or truck computer.
          </p>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Pricing Section -->
  <section id="pricing" class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Simple, Transparent Pricing
        </h2>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          One price per user. All features included. Add modules as you grow.
        </p>
      </div>
      
      <div class="max-w-4xl mx-auto">
        <!-- Main Pricing Card -->
        <div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl p-8 text-white mb-8">
          <div class="flex flex-col md:flex-row items-center justify-between">
            <div>
              <h3 class="text-2xl font-bold mb-2">Full Access</h3>
              <p class="text-blue-100 mb-4 md:mb-0">Everything you need to run your field service business</p>
            </div>
            <div class="text-center md:text-right">
              <div class="text-5xl font-bold">$39.99</div>
              <p class="text-blue-100">per user / month</p>
            </div>
          </div>
        </div>
        
        <!-- What's Included -->
        <div class="bg-gray-50 rounded-2xl p-8 mb-8">
          <h3 class="text-xl font-semibold text-gray-900 mb-6">All Features Included</h3>
          <div class="grid md:grid-cols-2 gap-4">
            {#each [
              'Unlimited clients & jobs',
              'Voice-powered workflows',
              'Real-time scheduling',
              'Invoice & payment processing',
              'Equipment tracking',
              'Job history & notes',
              'Mobile & desktop apps',
              'Customer portal',
              'Team collaboration',
              'Basic reporting',
              'Email & phone support',
              '99.9% uptime guarantee'
            ] as feature}
              <div class="flex items-start">
                <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-gray-700">{feature}</span>
              </div>
            {/each}
          </div>
        </div>
        
        <!-- Optional Modules -->
        <div class="bg-white border-2 border-gray-200 rounded-2xl p-8">
          <div class="flex items-start justify-between mb-6">
            <div>
              <h3 class="text-xl font-semibold text-gray-900">Power-Up Modules</h3>
              <p class="text-gray-600 mt-1">Advanced features for growing businesses</p>
            </div>
            <div class="text-right">
              <span class="text-2xl font-bold text-gray-900">$12</span>
              <p class="text-sm text-gray-600">per module / month</p>
            </div>
          </div>
          
          <div class="space-y-4">
            <div class="flex items-start p-4 bg-gray-50 rounded-lg">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h4 class="font-semibold text-gray-900">Advanced Analytics</h4>
                <p class="text-sm text-gray-600 mt-1">Custom dashboards, predictive insights, and detailed performance metrics</p>
              </div>
            </div>
            
            <div class="flex items-start p-4 bg-gray-50 rounded-lg">
              <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 class="font-semibold text-gray-900">Smart Scheduling</h4>
                <p class="text-sm text-gray-600 mt-1">AI-powered route optimization and automated appointment booking</p>
              </div>
            </div>
            
            <div class="flex items-start p-4 bg-gray-50 rounded-lg">
              <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 class="font-semibold text-gray-900">Inventory Management</h4>
                <p class="text-sm text-gray-600 mt-1">Track parts, equipment, and supplies across trucks and warehouses</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- CTA -->
        <div class="text-center mt-12">
          <button
            onclick={openRegister}
            class="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
          >
            Start Your 14-Day Free Trial
          </button>
          <p class="mt-4 text-sm text-gray-600">
            No credit card required • Cancel anytime • Full access to all features
          </p>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Social Proof Section -->
  <section class="py-20 bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Trusted by Field Service Pros
        </h2>
        <p class="text-xl text-gray-600">
          Join thousands of technicians who've ditched the paperwork
        </p>
      </div>
      
      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-white p-6 rounded-lg shadow-sm">
          <div class="flex mb-4">
            {#each Array(5) as _}
              <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
              </svg>
            {/each}
          </div>
          <p class="text-gray-700 mb-4">
            "Finally, software that gets it. I can update job status with my voice while my hands are full of tools."
          </p>
          <p class="text-sm text-gray-600 font-semibold">Mike T. - HVAC Tech</p>
        </div>
        
        <div class="bg-white p-6 rounded-lg shadow-sm">
          <div class="flex mb-4">
            {#each Array(5) as _}
              <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
              </svg>
            {/each}
          </div>
          <p class="text-gray-700 mb-4">
            "The client-first approach is genius. Everything I need is right there when I pull up to a job."
          </p>
          <p class="text-sm text-gray-600 font-semibold">Sarah L. - Plumber</p>
        </div>
        
        <div class="bg-white p-6 rounded-lg shadow-sm">
          <div class="flex mb-4">
            {#each Array(5) as _}
              <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
              </svg>
            {/each}
          </div>
          <p class="text-gray-700 mb-4">
            "Cut my end-of-day paperwork from 2 hours to 15 minutes. Worth every penny."
          </p>
          <p class="text-sm text-gray-600 font-semibold">James R. - Electrician</p>
        </div>
      </div>
      
      <div class="mt-12 text-center">
        <div class="inline-flex items-center gap-8 text-gray-600">
          <div>
            <p class="text-3xl font-bold text-gray-900">10,000+</p>
            <p class="text-sm">Active Users</p>
          </div>
          <div class="w-px h-12 bg-gray-300"></div>
          <div>
            <p class="text-3xl font-bold text-gray-900">4.9/5</p>
            <p class="text-sm">Average Rating</p>
          </div>
          <div class="w-px h-12 bg-gray-300"></div>
          <div>
            <p class="text-3xl font-bold text-gray-900">50%</p>
            <p class="text-sm">Time Saved</p>
          </div>
        </div>
      </div>
    </div>
  </section>
  
  <!-- CTA Section -->
  <section class="py-20 bg-blue-600 text-white">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 class="text-3xl sm:text-4xl font-bold mb-4">
        Ready to Transform Your Field Service?
      </h2>
      <p class="text-xl text-blue-100 mb-8">
        Join thousands of techs who've already made the switch
      </p>
      <button
        onclick={openRegister}
        class="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
      >
        Start Your Free 14-Day Trial
      </button>
      <p class="mt-4 text-sm text-blue-200">
        No credit card required • Set up in minutes
      </p>
    </div>
  </section>
  
  <!-- Bottom Navigation -->
  <BottomNav mode="landing" {openLogin} {openRegister} />
  
  <!-- Auth Modals -->
  <LoginForm bind:open={showLogin} />
  <RegisterForm bind:open={showRegister} />
</div>