<!-- src/routes/+page.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import BottomNav from '$lib/components/common/BottomNav.svelte';
  import LoginForm from '$lib/components/auth/LoginForm.svelte';
  import RegisterForm from '$lib/components/auth/RegisterForm.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
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
            onclick={openLogin}
            class="px-8 py-4 bg-blue-500 text-white rounded-lg font-semibold text-lg hover:bg-blue-400 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Features Section -->
  <section id="features" class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Everything You Need, Nothing You Don't
        </h2>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto">
          Designed by field service pros, for field service pros. Every feature has been battle-tested in the real world.
        </p>
      </div>
      
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <!-- Voice Control -->
        <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Voice-First Design</h3>
          <p class="text-gray-600">
            Update jobs, create tasks, and navigate hands-free. Perfect for when you're under a sink or up a ladder.
          </p>
        </div>
        
        <!-- Client Management -->
        <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
            <Icon name="users" class="w-6 h-6 text-green-600" />
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Client-Centric Workflow</h3>
          <p class="text-gray-600">
            Every feature starts with selecting a client. See their history, preferences, and job details instantly.
          </p>
        </div>
        
        <!-- Offline Mode -->
        <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Works Anywhere</h3>
          <p class="text-gray-600">
            No signal? No problem. Keep working offline and everything syncs when you're back in range.
          </p>
        </div>
        
        <!-- Quick Actions -->
        <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
            <Icon name="lightning" class="w-6 h-6 text-yellow-600" />
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Lightning Fast</h3>
          <p class="text-gray-600">
            Quick actions, smart shortcuts, and predictive features help you get more done in less time.
          </p>
        </div>
        
        <!-- Multi-Business -->
        <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Multi-Business Support</h3>
          <p class="text-gray-600">
            Run multiple businesses or work for different companies? Switch between them with one tap.
          </p>
        </div>
        
        <!-- Smart Scheduling -->
        <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
            <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">Smart Scheduling</h3>
          <p class="text-gray-600">
            AI-powered scheduling that considers travel time, job complexity, and your preferences.
          </p>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Pricing Section -->
  <section id="pricing" class="py-20 bg-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Simple, Transparent Pricing
        </h2>
        <p class="text-xl text-gray-600">
          Start free, upgrade when you're ready. No surprises.
        </p>
      </div>
      
      <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <!-- Starter Plan -->
        <div class="bg-white rounded-2xl shadow-xl p-8">
          <div class="mb-8">
            <h3 class="text-2xl font-bold text-gray-900">Starter</h3>
            <p class="text-gray-600 mt-2">Perfect for solo techs and small teams</p>
            <div class="mt-4">
              <span class="text-4xl font-bold">$29</span>
              <span class="text-gray-600">/month per user</span>
            </div>
          </div>
          
          <ul class="space-y-4 mb-8">
            {#each [
              'Unlimited clients & jobs',
              'Voice control & navigation',
              'Offline mode',
              'Mobile & web apps',
              'Basic reporting',
              '14-day free trial'
            ] as feature}
              <li class="flex items-start">
                <Icon name="check" class="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                <span class="text-gray-700">{feature}</span>
              </li>
            {/each}
          </ul>
          
          <button
            onclick={openRegister}
            class="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Start Free Trial
          </button>
        </div>
        
        <!-- Pro Plan -->
        <div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl p-8 text-white relative">
          <div class="absolute top-4 right-4 bg-yellow-400 text-blue-900 px-3 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </div>
          
          <div class="mb-8">
            <h3 class="text-2xl font-bold">Professional</h3>
            <p class="text-blue-100 mt-2">For growing businesses</p>
            <div class="mt-4">
              <span class="text-4xl font-bold">$49</span>
              <span class="text-blue-100">/month per user</span>
            </div>
          </div>
          
          <ul class="space-y-4 mb-8">
            {#each [
              'Everything in Starter',
              'Advanced scheduling',
              'Team management',
              'Custom workflows',
              'Priority support',
              'API access'
            ] as feature}
              <li class="flex items-start">
                <Icon name="check" class="w-5 h-5 text-white mr-3 mt-0.5" />
                <span>{feature}</span>
              </li>
            {/each}
          </ul>
          
          <button
            onclick={openRegister}
            class="w-full py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Start Free Trial
          </button>
        </div>
      </div>
      
      <!-- Enterprise -->
      <div class="mt-12 text-center">
        <p class="text-gray-600">
          Need something bigger? 
          <button class="text-blue-600 font-semibold hover:underline">
            Contact us for Enterprise pricing
          </button>
        </p>
      </div>
    </div>
  </section>
  
  <!-- Testimonials Section -->
  <section class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 class="text-3xl font-bold text-center text-gray-900 mb-12">
        Loved by Field Service Pros
      </h2>
      
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
            "Game changer. I can update jobs while driving between sites using just my voice. 
            Saves me 30 minutes every day."
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
            "Finally, software that gets it. Everything revolves around the client, not the job. 
            Everything I need is right there when I pull up to a job."
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
  
  <!-- Bottom Navigation - Fixed the props passing -->
  <BottomNav mode="landing" openLogin={openLogin} openRegister={openRegister} />
  
  <!-- Auth Modals -->
  <LoginForm bind:open={showLogin} />
  <RegisterForm bind:open={showRegister} />
</div>