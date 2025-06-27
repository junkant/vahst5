<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  
  let isInstalled = $state(false);
  let deferredPrompt: any = null;
  
  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
  
  function openLogin() {
    window.dispatchEvent(new Event('openLoginModal'));
  }
  
  function handleEnableApp() {
    if (isInstalled) {
      // If already installed, could open the app or show a message
      alert('VAHST is already installed! Check your home screen or app drawer.');
    } else if (deferredPrompt) {
      // Show install prompt
      window.dispatchEvent(new Event('showInstallPrompt'));
    } else {
      // Show instructions for manual install
      alert('To install VAHST: Use your browser menu and select "Install App" or "Add to Home Screen"');
    }
  }
  
  // Check if PWA is installed
  onMount(() => {
    if (browser) {
      // Check if already installed
      isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                   (window.navigator as any).standalone === true;
      
      // Listen for install prompt
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
      });
      
      // Update if app gets installed
      window.addEventListener('appinstalled', () => {
        isInstalled = true;
        deferredPrompt = null;
      });
    }
  });
</script>

<header class="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-40">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <div class="flex items-center">
        <span class="text-2xl font-bold text-blue-600">VAHST</span>
      </div>
      
      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center gap-6">
        <button 
          class="px-4 py-2 {isInstalled ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg transition-colors"
          onclick={handleEnableApp}
        >
          {isInstalled ? '✓ App Enabled' : 'Enable App'}
        </button>
        <button 
          onclick={openLogin}
          class="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
        >
          Login
        </button>
        <button 
          onclick={() => window.dispatchEvent(new Event('openRegisterModal'))}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Get Started
        </button>
      </nav>
    </div>
  </div>
</header>