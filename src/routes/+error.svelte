<!-- src/routes/+error.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  
  const auth = useAuth();
  
  // Determine if this is a 404 error
  const is404 = $derived($page.status === 404);
  
  // Witty messages for 404 errors (no emojis as requested)
  const messages404 = [
    {
      heading: "Page Under Construction",
      subtext: "Our digital crew couldn't find what you're looking for. Maybe they're on a coffee break."
    },
    {
      heading: "Lost in the Field",
      subtext: "This page seems to have wandered off the job site. We've sent a search party."
    },
    {
      heading: "404: Page Not in Service",
      subtext: "Like a broken HVAC unit, this page needs some professional attention."
    },
    {
      heading: "Off the Grid",
      subtext: "This page is currently offline. Unlike our field service app, which works everywhere."
    },
    {
      heading: "Wrong Turn at the Server Room",
      subtext: "Looks like you've navigated to uncharted digital territory."
    }
  ];
  
  // Pick a random message
  const message = $derived(
    is404 
      ? messages404[Math.floor(Math.random() * messages404.length)]
      : {
          heading: `Error ${$page.status}`,
          subtext: $page.error?.message || 'An unexpected error occurred'
        }
  );
  
  function handleGoHome() {
    if (auth.isAuthenticated) {
      goto('/dashboard');
    } else {
      goto('/');
    }
  }
  
  function handleGoBack() {
    if (window.history.length > 1) {
      history.back();
    } else {
      handleGoHome();
    }
  }
</script>

<svelte:head>
  <title>{is404 ? 'Page Not Found' : `Error ${$page.status}`} | VAHST</title>
  <meta name="description" content={message.subtext} />
</svelte:head>

<!-- 
  Container that fills available space in the flex layout
  Since main has flex-1 flex flex-col, this will fill the space
-->
<div class="flex-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
  <!-- Content container with proper spacing -->
  <div class="w-full max-w-lg text-center px-4 py-8">
      <!-- Error Status with Icon -->
      <div class="relative inline-block mb-6">
        <h1 class="text-7xl sm:text-8xl font-bold text-gray-200 dark:text-gray-700">
          {$page.status}
        </h1>
        {#if is404}
          <!-- Wrench icon overlay -->
          <svg 
            class="absolute -top-1 -right-6 sm:-top-2 sm:-right-8 w-12 h-12 sm:w-16 sm:h-16 text-blue-500 dark:text-blue-400 transform rotate-12"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        {/if}
      </div>
      
      <!-- Error Message -->
      <div class="space-y-2 mb-8">
        <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {message.heading}
        </h2>
        <p class="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          {message.subtext}
        </p>
      </div>
      
      <!-- Action Buttons -->
      {#if auth.isAuthenticated}
        <!-- Authenticated User Actions -->
        <div class="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onclick={handleGoHome}
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                   transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Go to Dashboard
          </button>
          
          <button
            onclick={handleGoBack}
            class="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 
                   dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 
                   transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Go Back
          </button>
        </div>
        
        <!-- Quick Links for Authenticated Users -->
        {#if is404}
          <div class="pt-6 border-t border-gray-200 dark:border-gray-700">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Maybe you were looking for:
            </p>
            <nav class="flex flex-wrap gap-x-4 gap-y-2 justify-center text-sm">
              <a href="/dashboard" class="text-blue-600 dark:text-blue-400 hover:underline">
                Dashboard
              </a>
              <a href="/clients" class="text-blue-600 dark:text-blue-400 hover:underline">
                Clients
              </a>
              <a href="/tasks" class="text-blue-600 dark:text-blue-400 hover:underline">
                Tasks
              </a>
              <a href="/settings" class="text-blue-600 dark:text-blue-400 hover:underline">
                Settings
              </a>
            </nav>
          </div>
        {/if}
      {:else}
        <!-- Non-Authenticated User Action -->
        <button
          onclick={handleGoHome}
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          Go to Homepage
        </button>
      {/if}
      
      <!-- Technical Details (Development Mode) -->
      {#if import.meta.env.DEV && !is404}
        <details class="mt-8 text-left max-w-full">
          <summary class="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Technical Details
          </summary>
          <pre class="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs overflow-auto whitespace-pre-wrap break-words">
{JSON.stringify($page.error, null, 2)}
          </pre>
        </details>
      {/if}
  </div>
</div>