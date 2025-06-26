<script>
  import { useClients } from '$lib/stores/client';
  
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
  class="w-full bg-white rounded-lg border border-gray-200 p-4 
         hover:border-primary-300 hover:shadow-sm transition-all duration-200 
         text-left group"
  on:click={() => clients.selectClient(client)}>
  
  <div class="flex items-start justify-between">
    <div class="flex-1">
      <h3 class="font-medium text-gray-900 group-hover:text-primary-600 
                 transition-colors">
        {client.name}
      </h3>
      <p class="text-sm text-gray-500 mt-1">{client.address}</p>
      
      <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
        <span class="flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatLastVisit(client.lastVisit)}
        </span>
        
        {#if client.phone}
          <span class="flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {client.phone}
          </span>
        {/if}
      </div>
    </div>
    
    <svg class="w-5 h-5 text-gray-400 group-hover:text-primary-600 
                transition-colors" 
         fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M9 5l7 7-7 7" />
    </svg>
  </div>
</button>