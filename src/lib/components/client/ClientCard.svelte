<script>
  import { useClients } from '$lib/stores/client.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  export let client;
  
  const clients = useClients();
  
  function formatLastVisit(date) {
    if (!date) return 'Never';
    const days = Math.floor((Date.now() - date.toMillis()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }
</script>

<button 
  class="w-full bg-white dark:bg-gray-800 
         rounded-lg border border-gray-200 dark:border-gray-700 
         p-4 hover:border-blue-300 dark:hover:border-blue-600 
         hover:shadow-sm dark:hover:shadow-gray-900/50 
         transition-all duration-200 text-left group"
  on:click={() => clients.selectClient(client)}>
  
  <div class="flex items-start justify-between">
    <div class="flex-1">
      <h3 class="font-medium text-gray-900 dark:text-gray-100 
                 group-hover:text-blue-600 dark:group-hover:text-blue-400 
                 transition-colors">
        {client.name}
      </h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {client.address}
      </p>
      
      <div class="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
        <span class="flex items-center gap-1">
          <Icon name="calendar" class="w-3.5 h-3.5" size={2} />
          {formatLastVisit(client.lastVisit)}
        </span>
        
        {#if client.phone}
          <span class="flex items-center gap-1">
            <Icon name="phone" class="w-3.5 h-3.5" size={2} />
            {client.phone}
          </span>
        {/if}
      </div>
    </div>
    
    <Icon name="chevronRight" 
          class="w-5 h-5 text-gray-400 dark:text-gray-500 
                 group-hover:text-blue-600 dark:group-hover:text-blue-400 
                 transition-colors" />
  </div>
</button>