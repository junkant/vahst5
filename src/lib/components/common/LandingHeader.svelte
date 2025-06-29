<!-- src/lib/components/common/LandingHeader.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { toast } from '$lib/utils/toast';
  
  const auth = useAuth();
  
  let scrolled = $state(false);
  let mobileMenuOpen = $state(false);
  let deferredPrompt: any = null;
  let isPWAInstalled = $state(false);
  
  const navItems = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Contact', href: '#contact' }
  ];
  
  onMount(() => {
    // Check scroll position
    const handleScroll = () => {
      scrolled = window.scrollY > 20;
    };
    
    window.addEventListener('scroll', handleScroll);
    
    // Check if PWA is installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      isPWAInstalled = true;
    }
    
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });
    
    // Check if app was just installed
    window.addEventListener('appinstalled', () => {
      isPWAInstalled = true;
      deferredPrompt = null;
    });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  });
  
  async function handleAuth() {
    if (auth.user) {
      await goto('/my-day');
    } else {
      await goto('/login');
    }
  }
  
  async function handleEnableApp() {
    if (isPWAInstalled) {
      toast.info('VAHST is already installed! Check your home screen or app drawer.');
      return;
    }
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        isPWAInstalled = true;
      }
      
      deferredPrompt = null;
    } else {
      toast.info('To install VAHST: Use your browser menu and select "Install App" or "Add to Home Screen"');
    }
  }
  
  function scrollToSection(e: MouseEvent, href: string) {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      mobileMenuOpen = false;
    }
  }
</script>

<header class="fixed top-0 left-0 right-0 z-50 transition-all duration-300
  {scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <div class="flex items-center">
        <a href="/" class="flex items-center space-x-2">
          <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-xl">V</span>
          </div>
          <span class="font-bold text-xl {scrolled ? 'text-gray-900' : 'text-white'}">
            VAHST
          </span>
        </a>
      </div>
      
      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center space-x-8">
        {#each navItems as item}
          <a 
            href={item.href}
            onclick={(e) => scrollToSection(e, item.href)}
            class="text-sm font-medium transition-colors
              {scrolled ? 'text-gray-700 hover:text-blue-600' : 'text-white/90 hover:text-white'}"
          >
            {item.label}
          </a>
        {/each}
      </nav>
      
      <!-- Desktop CTA Buttons -->
      <div class="hidden md:flex items-center space-x-4">
        {#if !isPWAInstalled && deferredPrompt}
          <button
            onclick={handleEnableApp}
            class="px-4 py-2 text-sm font-medium rounded-lg transition-all
              {scrolled 
                ? 'text-blue-600 hover:bg-blue-50' 
                : 'text-white hover:bg-white/10'}"
          >
            Enable App
          </button>
        {/if}
        
        <button 
          onclick={handleAuth}
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg 
                 hover:bg-blue-700 transition-colors"
        >
          {auth.user ? 'Open App' : 'Get Started'}
        </button>
      </div>
      
      <!-- Mobile Menu Button -->
      <button
        onclick={() => mobileMenuOpen = !mobileMenuOpen}
        class="md:hidden p-2 rounded-lg transition-colors
          {scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}"
        aria-label="Toggle menu"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {#if mobileMenuOpen}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          {/if}
        </svg>
      </button>
    </div>
  </div>
  
  <!-- Mobile Menu -->
  {#if mobileMenuOpen}
    <div class="md:hidden bg-white border-t shadow-lg">
      <div class="px-4 py-6 space-y-4">
        {#each navItems as item}
          <a 
            href={item.href}
            onclick={(e) => scrollToSection(e, item.href)}
            class="block text-base font-medium text-gray-700 hover:text-blue-600"
          >
            {item.label}
          </a>
        {/each}
        
        <div class="pt-4 space-y-3 border-t">
          {#if !isPWAInstalled && deferredPrompt}
            <button
              onclick={handleEnableApp}
              class="w-full px-4 py-2 text-sm font-medium text-blue-600 
                     border border-blue-600 rounded-lg hover:bg-blue-50"
            >
              Enable App
            </button>
          {/if}
          
          <button 
            onclick={handleAuth}
            class="w-full px-4 py-2 text-sm font-medium text-white 
                   bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            {auth.user ? 'Open App' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</header>