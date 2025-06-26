<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  
  const auth = useAuth();
  
  onMount(() => {
    // Initialize theme
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('theme') || 'light';
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  });

    import { browser } from '$app/environment';
  
  if (browser) {
    console.log('Firebase API Key:', import.meta.env.PUBLIC_FIREBASE_API_KEY);
  }
</script>

<slot />