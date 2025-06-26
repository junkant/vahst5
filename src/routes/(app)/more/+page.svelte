<script>
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  
  const auth = useAuth();
  
  const menuItems = [
    { label: 'Settings', path: '/settings', icon: '⚙️' },
    { label: 'Team', path: '/team', icon: '👥' },
    { label: 'Help', path: '/help', icon: '❓' },
    { label: 'About', path: '/about', icon: 'ℹ️' },
  ];
  
  async function handleSignOut() {
    await auth.signOut();
    goto('/login');
  }
</script>

<div class="flex flex-col h-full bg-gray-50">
  <div class="bg-white border-b border-gray-200 p-4">
    <h1 class="text-xl font-semibold text-gray-900">More</h1>
  </div>
  
  <div class="flex-1 overflow-y-auto">
    <div class="bg-white">
      {#each menuItems as item}
        <button 
          class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 border-b border-gray-100"
          on:click={() => goto(item.path)}>
          <div class="flex items-center gap-3">
            <span class="text-xl">{item.icon}</span>
            <span class="font-medium text-gray-900">{item.label}</span>
          </div>
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      {/each}
    </div>
    
    <div class="mt-8 px-4">
      <button 
        class="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
        on:click={handleSignOut}>
        Sign Out
      </button>
    </div>
  </div>
</div>