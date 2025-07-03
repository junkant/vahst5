<!-- src/lib/components/common/LandingBottomNav.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  // Determine if we're on the home page
  const isHomePage = $derived($page.url.pathname === '/');
  
  function scrollToSection(id: string) {
    if (!isHomePage) {
      // If not on home page, navigate to home first, then scroll
      goto(`/#${id}`);
      return;
    }
    
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
  function handleFeatureClick() {
    if (isHomePage) {
      scrollToSection('features');
    } else {
      goto('/#features');
    }
  }
  
  function handlePricingClick() {
    if (isHomePage) {
      scrollToSection('pricing');
    } else {
      goto('/#pricing');
    }
  }
  
  function emitLoginModal() {
    window.dispatchEvent(new CustomEvent('openLoginModal'));
  }
  
  function emitRegisterModal() {
    window.dispatchEvent(new CustomEvent('openRegisterModal'));
  }
</script>

<nav class="fixed bottom-0 left-0 right-0 z-40">
  <!-- Shadow and curve effect -->
  <div class="absolute inset-x-0 bottom-0 h-16 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"></div>
  
  <!-- Navigation content -->
  <div class="relative bg-white rounded-t-[2rem] px-6 pt-1 pb-2">
    <div class="flex items-center justify-around">
      <!-- Features - Smart navigation -->
      <button 
        type="button"
        class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors text-gray-600 hover:text-blue-600 cursor-pointer"
        onclick={handleFeatureClick}
      >
        <Icon name="clipboard" class="w-6 h-6 mb-0.5" />
        <span class="text-xs">Features</span>
      </button>
      
      <!-- Pricing - Smart navigation -->
      <button 
        type="button"
        class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors text-gray-600 hover:text-blue-600 cursor-pointer"
        onclick={handlePricingClick}
      >
        <Icon name="dollar" class="w-6 h-6 mb-0.5" />
        <span class="text-xs">Pricing</span>
      </button>
      
      <!-- Center CTA -->
      <button 
        type="button"
        class="flex items-center justify-center w-14 h-14 -mt-4 bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105 cursor-pointer"
        onclick={emitRegisterModal}
        aria-label="Start free trial"
      >
        <Icon name="lightning" class="w-8 h-8 text-white" />
      </button>
      
      <!-- Login -->
      <button 
        type="button"
        class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors text-gray-600 hover:text-blue-600 cursor-pointer"
        onclick={emitLoginModal}
      >
        <Icon name="login" class="w-6 h-6 mb-0.5" />
        <span class="text-xs">Login</span>
      </button>
      
      <!-- Register -->
      <button 
        type="button"
        class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors text-gray-600 hover:text-blue-600 cursor-pointer"
        onclick={emitRegisterModal}
      >
        <Icon name="userPlus" class="w-6 h-6 mb-0.5" />
        <span class="text-xs">Sign Up</span>
      </button>
    </div>
  </div>
</nav>