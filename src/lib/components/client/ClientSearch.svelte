<script>
  import { createCombobox, melt } from '@melt-ui/svelte';
  import { useClients } from '$lib/stores/client.svelte';
  
  export let onSelect = () => {};
  export let placeholder = 'Search clients...';
  
  const clients = useClients();
  
  const {
    elements,
    states,
    helpers
  } = createCombobox({
    forceVisible: true,
    items: clients.clients,
    itemToString: (item) => item?.name || '',
    onSelectedChange: ({ next }) => {
      if (next) {
        onSelect(next);
        helpers.closeMenu();
      }
      return next;
    }
  });
  
  function filterFunction(item, inputValue) {
    const searchTerm = inputValue.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchTerm) ||
      item.address?.toLowerCase().includes(searchTerm) ||
      item.phone?.includes(searchTerm)
    );
  }
</script>

<div class="relative">
  <div class="relative">
    <input
      use:melt={$elements.input}
      class="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 
             rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 
             focus:border-transparent"
      {placeholder}
    />
    <svg class="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" 
         fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  </div>
  
  {#if $states.open}
    <div
      use:melt={$elements.menu}
      class="absolute left-0 right-0 mt-1 bg-white rounded-lg shadow-lg 
             border border-gray-200 max-h-80 overflow-auto z-50"
    >
      {#each $states.filteredItems as item, index (item.id)}
        <div
          use:melt={$elements.option({ index })}
          class="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b 
                 border-gray-100 last:border-0
                 {$states.highlightedItem === item ? 'bg-gray-50' : ''}"
        >
          <div class="font-medium text-gray-900">{item.name}</div>
          <div class="text-sm text-gray-500">{item.address}</div>
          {#if item.phone}
            <div class="text-xs text-gray-400 mt-1">{item.phone}</div>
          {/if}
        </div>
      {:else}
        <div class="px-4 py-8 text-center text-gray-500">
          No clients found
        </div>
      {/each}
    </div>
  {/if}
</div>