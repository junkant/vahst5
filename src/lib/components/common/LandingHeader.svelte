<!-- src/lib/components/common/LandingHeader.svelte -->
<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { toast } from '$lib/utils/toast';
  
  let isInstalled = $state(false);
  let deferredPrompt = $state<any>(null);
  
  function scrollToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
  function openLogin() {
    window.dispatchEvent(new CustomEvent('openLoginModal'));
  }
  
  function openRegister() {
    window.dispatchEvent(new CustomEvent('openRegisterModal'));
  }
  
  function handleEnableApp() {
    if (isInstalled) {
      // If already installed, could open the app or show a message
      toast.info('VAHST is already installed! Check your home screen or app drawer.');
    } else if (deferredPrompt) {
      // Show install prompt
      window.dispatchEvent(new CustomEvent('showInstallPrompt'));
    } else {
      // Show instructions for manual install
      toast.info('To install VAHST: Use your browser menu and select "Install App" or "Add to Home Screen"');
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
          type="button"
          class="px-4 py-2 {isInstalled ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg transition-colors cursor-pointer"
          onclick={() => handleEnableApp()}
        >
          {isInstalled ? '✓ App Enabled' : 'Enable App'}
        </button>
        <button 
          type="button"
          onclick={() => openLogin()}
          class="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors cursor-pointer"
        >
          Login
        </button>
        <button 
          type="button"
          onclick={() => openRegister()}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Get Started
        </button>
      </nav>
    </div>
  </div>
</header>