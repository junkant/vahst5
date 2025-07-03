<!-- src/routes/+page.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
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
</script>

<svelte:head>
  <title>VAHST - Field Service Management Made Simple</title>
  <meta name="description" content="The voice-first field service management app designed for HVAC, plumbing, and electrical professionals. Manage clients, jobs, and invoices hands-free." />
</svelte:head>

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
          class="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg shadow-lg"
        >
          Start Free Trial
        </button>
        <button
          onclick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          class="px-8 py-4 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors text-lg"
        >
          See How It Works
        </button>
      </div>
      
      <p class="mt-8 text-blue-200">
        No credit card required • 14-day free trial • Cancel anytime
      </p>
    </div>
  </div>
</section>

<!-- Trust Indicators -->
<section class="py-12 bg-white border-b">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      <div>
        <div class="text-3xl font-bold text-gray-900">500+</div>
        <div class="text-gray-600">Active Businesses</div>
      </div>
      <div>
        <div class="text-3xl font-bold text-gray-900">10k+</div>
        <div class="text-gray-600">Jobs Completed</div>
      </div>
      <div>
        <div class="text-3xl font-bold text-gray-900">99%</div>
        <div class="text-gray-600">Uptime</div>
      </div>
      <div>
        <div class="text-3xl font-bold text-gray-900">4.9★</div>
        <div class="text-gray-600">User Rating</div>
      </div>
    </div>
  </div>
</section>

<!-- Features Section -->
<section id="features" class="py-20 bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
        Everything You Need, Nothing You Don't
      </h2>
      <p class="text-xl text-gray-600">
        Powerful features designed for the way you actually work
      </p>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      <!-- Voice Control -->
      <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
          <Icon name="microphone" class="w-6 h-6 text-blue-600" />
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-3">Voice-First Design</h3>
        <p class="text-gray-600">
          Update jobs, add notes, and navigate hands-free. Perfect when you're under a sink or in an attic.
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
          <Icon name="inbox" class="w-6 h-6 text-purple-600" />
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
          <Icon name="building" class="w-6 h-6 text-red-600" />
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-3">Multi-Business Support</h3>
        <p class="text-gray-600">
          Run multiple businesses or work for different companies? Switch between them with one tap.
        </p>
      </div>
      
      <!-- Smart Scheduling -->
      <div class="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
        <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
          <Icon name="calendar" class="w-6 h-6 text-indigo-600" />
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-3">Smart Scheduling</h3>
        <p class="text-gray-600">
          AI-powered scheduling that considers travel time, job complexity, and your preferences.
        </p>
      </div>
    </div>
  </div>
</section>
<!-- Pricing Section - Replace the existing pricing section in +page.svelte -->
<section id="pricing" class="py-20 bg-white">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
        Simple, Transparent Pricing
      </h2>
      <p class="text-xl text-gray-600">
        One price. All features. No surprises.
      </p>
    </div>
    
    <!-- Single Pricing Card -->
    <div class="max-w-md mx-auto">
      <div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl p-8 text-white relative">
        <div class="absolute top-4 right-4 bg-yellow-400 text-blue-900 px-3 py-1 rounded-full text-sm font-semibold">
          All Features Included
        </div>
        
        <div class="text-center mb-8">
          <h3 class="text-2xl font-bold mb-2">VAHST Complete</h3>
          <p class="text-blue-100 mb-6">Everything you need for field service success</p>
          <div class="mb-2">
            <span class="text-5xl font-bold">$39.99</span>
          </div>
          <p class="text-blue-100">per user/month</p>
        </div>
        
        <ul class="space-y-4 mb-8">
          {#each [
            'Unlimited clients & jobs',
            'Voice-powered workflows',
            'Smart scheduling & dispatch',
            'Invoicing & payments',
            'Team management',
            'Offline mode',
            'Mobile & web apps',
            'Custom workflows',
            'Advanced reporting',
          ] as feature}
            <li class="flex items-start">
              <Icon name="check" class="w-5 h-5 text-white mr-3 mt-0.5 flex-shrink-0" />
              <span class="text-white">{feature}</span>
            </li>
          {/each}
        </ul>
        
        <button
          onclick={openRegister}
          class="w-full py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg"
        >
          Start Free Trial
        </button>
        
        <p class="text-center text-blue-100 text-sm mt-4">
          14-day free trial • No credit card required
        </p>
      </div>
    </div>
    
    <!-- Trust badges -->
    <div class="mt-12 text-center">
      <p class="text-gray-600 mb-6">Trusted by field service professionals</p>
      <div class="flex justify-center items-center space-x-8 opacity-60">
        <div class="text-2xl">🔧</div>
        <div class="text-2xl">⚡</div>
        <div class="text-2xl">🏠</div>
        <div class="text-2xl">🔨</div>
        <div class="text-2xl">🚰</div>
      </div>
    </div>
  </div>
</section>

<!-- Testimonials Section -->
<section class="py-20 bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 class="text-3xl font-bold text-center text-gray-900 mb-12">
      Loved by Field Service Pros
    </h2>
    
    <div class="grid md:grid-cols-3 gap-8">
      <div class="bg-white p-6 rounded-lg shadow-sm">
        <div class="flex mb-4">
          {#each Array(5) as _}
            <Icon name="star" class="w-5 h-5 text-yellow-400 fill-current" />
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
            <Icon name="star" class="w-5 h-5 text-yellow-400 fill-current" />
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
            <Icon name="star" class="w-5 h-5 text-yellow-400 fill-current" />
          {/each}
        </div>
        <p class="text-gray-700 mb-4">
          "Cut my end-of-day paperwork from 2 hours to 15 minutes. Worth every penny."
        </p>
        <p class="text-sm text-gray-600 font-semibold">James R. - Electrician</p>
      </div>
    </div>
  </div>
</section>

<!-- CTA Section -->
<section class="py-20 bg-blue-600">
  <div class="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
    <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">
      Ready to Transform Your Business?
    </h2>
    <p class="text-xl text-blue-100 mb-8">
      Join thousands of field service professionals who've made the switch
    </p>
    <button
      onclick={openRegister}
      class="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg shadow-lg"
    >
      Start Your Free Trial
    </button>
    <p class="text-blue-100 mt-4">
      No credit card required • 14-day free trial • Cancel anytime
    </p>
  </div>
</section>

<!-- Login/Register Forms -->
<LoginForm bind:open={showLogin} />
<RegisterForm bind:open={showRegister} />