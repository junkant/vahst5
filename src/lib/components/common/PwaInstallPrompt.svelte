<script lang="ts">
  import { browser } from '$app/environment';
  import { fade } from 'svelte/transition';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  let showPrompt = $state(false);
  let deferredPrompt = $state<any>(null);
  let isInstalled = $state(false);
  
  // Check if already installed
  if (browser) {
    // Check if running as installed PWA
    isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true;
    
    // Listen for manual trigger from header button
    window.addEventListener('showInstallPrompt', () => {
      if (deferredPrompt && !isInstalled) {
        showPrompt = true;
      }
    });
    
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show prompt after user has used the app for a bit
      const hasSeenPrompt = localStorage.getItem('pwa-prompt-seen');
      const promptCount = parseInt(localStorage.getItem('pwa-prompt-count') || '0');
      
      if (!hasSeenPrompt && promptCount > 3) {
        showPrompt = true;
      }
      
      // Increment visit count
      localStorage.setItem('pwa-prompt-count', (promptCount + 1).toString());
    });
    
    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      isInstalled = true;
      showPrompt = false;
      deferredPrompt = null;
    });
  }
  
  async function handleInstall() {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    // Clear the prompt
    deferredPrompt = null;
    showPrompt = false;
    localStorage.setItem('pwa-prompt-seen', 'true');
  }
  
  function handleDismiss() {
    showPrompt = false;
    localStorage.setItem('pwa-prompt-seen', 'true');
    
    // Show again after 7 days
    setTimeout(() => {
      localStorage.removeItem('pwa-prompt-seen');
    }, 7 * 24 * 60 * 60 * 1000);
  }
</script>

{#if showPrompt && !isInstalled}
  <div 
    class="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40"
    transition:fade
  >
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
      <div class="flex items-start gap-3">
        <!-- App Icon -->
        <div class="flex-shrink-0">
          <img 
            src="/icon-96.svg" 
            alt="VAHST" 
            class="w-12 h-12 rounded-lg"
          />
        </div>
        
        <!-- Content -->
        <div class="flex-1">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Install VAHST App
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Add VAHST to your home screen for quick access and offline use.
          </p>
          
          <!-- Actions -->
          <div class="flex gap-2">
            <button
              onclick={handleInstall}
              class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              Install
            </button>
            <button
              onclick={handleDismiss}
              class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors text-sm"
            >
              Not now
            </button>
          </div>
        </div>
        
        <!-- Close button -->
        <button
          onclick={handleDismiss}
          class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Dismiss"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
{/if}