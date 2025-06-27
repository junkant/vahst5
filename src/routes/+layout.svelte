<!-- src/routes/+layout.svelte -->
<script>
  import { onMount } from 'svelte';
  import '../app.css';
  
  let { children } = $props();
  
  // Handle cross-component communication for auth modals
  onMount(() => {
    // Listen for login modal trigger
    const handleOpenLogin = () => {
      const loginEvent = new CustomEvent('openLoginModal');
      window.dispatchEvent(loginEvent);
    };
    
    // Listen for register modal trigger
    const handleOpenRegister = () => {
      const registerEvent = new CustomEvent('openRegisterModal');
      window.dispatchEvent(registerEvent);
    };
    
    window.addEventListener('openLogin', handleOpenLogin);
    window.addEventListener('openRegister', handleOpenRegister);
    
    return () => {
      window.removeEventListener('openLogin', handleOpenLogin);
      window.removeEventListener('openRegister', handleOpenRegister);
    };
  });
</script>

{@render children()}