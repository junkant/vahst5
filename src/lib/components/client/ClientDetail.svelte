<!-- src/lib/components/client/ClientDetail.svelte -->
<script>
  import { createDialog, createTabs, melt } from '@melt-ui/svelte';
  import { slide } from 'svelte/transition';
  import { useClients } from '$lib/stores/client';
  import { goto } from '$app/navigation';
  
  export let client;
  
  const clients = useClients();
  
  const tabs = createTabs({
    defaultValue: 'overview'
  });
  
  const editDialog = createDialog();
  const deleteDialog = createDialog();
  
  const actions = [
    { label: 'Start Job', icon: 'play', primary: true, action: () => goto(`/jobs/new?client=${client.id}`) },
    { label: 'Call', icon: 'phone', action: () => window.location.href = `tel:${client.phone}` },
    { label: 'Navigate', icon: 'map', action: () => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(client.address)}`) },
    { label: 'Invoice', icon: 'receipt', action: () => goto(`/invoices/new?client=${client.id}`) }
  ];
  
  function formatLastVisit(date) {
    if (!date) return 'Never visited';
    const days = Math.floor((Date.now() - date.toMillis()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Visited today';
    if (days === 1) return 'Visited yesterday';
    if (days < 7) return `Visited ${days} days ago`;
    if (days < 30) return `Visited ${Math.floor(days / 7)} weeks ago`;
    return `Visited ${Math.floor(days / 30)} months ago`;
  }
  
  function handleEdit() {
    editDialog.open.set(true);
  }
  
  function handleDelete() {
    deleteDialog.open.set(true);
  }
</script>

<div class="fixed inset-0 bg-white z-30 flex flex-col" 
     transition:slide={{ duration: 300 }}>
  
  <!-- Header -->
  <div class="bg-primary-600 text-white safe-top">
    <div class="flex items-center justify-between p-4">
      <button class="p-2 -ml-2 rounded-lg hover:bg-primary-700 transition-colors"
              on:click={() => clients.clearSelection()}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <h1 class="text-lg font-semibold flex-1 text-center">{client.name}</h1>
      
      <button class="p-2 -mr-2 rounded-lg hover:bg-primary-700 transition-colors"
              on:click={handleEdit}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
    </div>
    
    <!-- Quick Info -->
    <div class="px-4 pb-4">
      <p class="text-primary-100 text-sm">{client.address}</p>
      {#if client.phone}
        <p class="text-primary-100 text-sm mt-1">{client.phone}</p>
      {/if}
      <p class="text-primary-200 text-xs mt-2">{formatLastVisit(client.lastVisit)}</p>
    </div>
  </div>
  
  <!-- Quick Actions -->
  <div class="bg-gray-50 border-b border-gray-200 px-4 py-3">
    <div class="flex gap-2 overflow-x-auto -mx-4 px-4 scroll-smooth">
      {#each actions as action}
        <button 
          class="flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap
                 {action.primary ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}
                 hover:shadow-sm transition-all flex-shrink-0"
          on:click={action.action}>
          
          {#if action.icon === 'play'}
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          {:else if action.icon === 'phone'}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          {:else if action.icon === 'map'}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          {:else if action.icon === 'receipt'}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
            </svg>
          {/if}
          <span class="font-medium text-sm">{action.label}</span>
        </button>
      {/each}
    </div>
  </div>
  
  <!-- Tabs -->
  <div class="flex-1 overflow-y-auto">
    <div use:melt={$tabs.elements.root}>
      <!-- Tab List -->
      <div use:melt={$tabs.elements.list} 
           class="flex border-b border-gray-200 bg-white sticky top-0 z-10">
        <button use:melt={$tabs.elements.trigger('overview')}
                class="flex-1 px-4 py-3 text-sm font-medium transition-colors
                       {$tabs.states.value === 'overview' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}">
          Overview
        </button>
        <button use:melt={$tabs.elements.trigger('jobs')}
                class="flex-1 px-4 py-3 text-sm font-medium transition-colors
                       {$tabs.states.value === 'jobs' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}">
          Jobs ({clients.clientJobs.length})
        </button>
        <button use:melt={$tabs.elements.trigger('equipment')}
                class="flex-1 px-4 py-3 text-sm font-medium transition-colors
                       {$tabs.states.value === 'equipment' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}">
          Equipment
        </button>
        <button use:melt={$tabs.elements.trigger('history')}
                class="flex-1 px-4 py-3 text-sm font-medium transition-colors
                       {$tabs.states.value === 'history' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}">
          History
        </button>
      </div>
      
      <!-- Tab Content -->
      <div class="p-4">
        {#if $tabs.states.value === 'overview'}
          <div use:melt={$tabs.elements.content('overview')} class="space-y-4">
            <!-- Contact Information -->
            <div class="bg-white rounded-lg border border-gray-200 p-4">
              <h3 class="font-semibold text-gray-900 mb-3">Contact Information</h3>
              <div class="space-y-3">
                {#if client.email}
                  <div class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div class="flex-1">
                      <p class="text-sm text-gray-600">Email</p>
                      <a href="mailto:{client.email}" class="text-primary-600 hover:underline">{client.email}</a>
                    </div>
                  </div>
                {/if}
                
                {#if client.phone}
                  <div class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div class="flex-1">
                      <p class="text-sm text-gray-600">Phone</p>
                      <a href="tel:{client.phone}" class="text-primary-600 hover:underline">{client.phone}</a>
                    </div>
                  </div>
                {/if}
                
                <div class="flex items-start gap-3">
                  <svg class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div class="flex-1">
                    <p class="text-sm text-gray-600">Address</p>
                    <p class="text-gray-900">{client.address}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Notes -->
            {#if client.notes}
              <div class="bg-white rounded-lg border border-gray-200 p-4">
                <h3 class="font-semibold text-gray-900 mb-3">Notes</h3>
                <p class="text-gray-700 whitespace-pre-wrap">{client.notes}</p>
              </div>
            {/if}
            
            <!-- Custom Fields -->
            {#if client.customFields && Object.keys(client.customFields).length > 0}
              <div class="bg-white rounded-lg border border-gray-200 p-4">
                <h3 class="font-semibold text-gray-900 mb-3">Additional Information</h3>
                <div class="space-y-2">
                  {#each Object.entries(client.customFields) as [key, value]}
                    <div class="flex justify-between py-1">
                      <span class="text-sm text-gray-600">{key}:</span>
                      <span class="text-sm text-gray-900">{value}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
          
        {:else if $tabs.states.value === 'jobs'}
          <div use:melt={$tabs.elements.content('jobs')} class="space-y-3">
            {#if clients.clientJobs.length === 0}
              <div class="text-center py-8">
                <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p class="text-gray-500 mb-3">No jobs yet</p>
                <button class="btn-primary text-sm"
                        on:click={() => goto(`/jobs/new?client=${client.id}`)}>
                  Create First Job
                </button>
              </div>
            {:else}
              {#each clients.clientJobs as job}
                <button class="w-full bg-white rounded-lg border border-gray-200 p-4 
                               hover:border-primary-300 hover:shadow-sm transition-all 
                               text-left"
                        on:click={() => goto(`/jobs/${job.id}`)}>
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h4 class="font-medium text-gray-900">{job.title}</h4>
                      <p class="text-sm text-gray-500 mt-1">
                        {new Date(job.scheduledDate.toMillis()).toLocaleDateString()}
                      </p>
                      {#if job.description}
                        <p class="text-sm text-gray-600 mt-2 line-clamp-2">
                          {job.description}
                        </p>
                      {/if}
                    </div>
                    <span class="px-2 py-1 text-xs font-medium rounded-full flex-shrink-0
                                 {job.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                  job.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                                  'bg-gray-100 text-gray-800'}">
                      {job.status}
                    </span>
                  </div>
                </button>
              {/each}
            {/if}
          </div>
          
        {:else if $tabs.states.value === 'equipment'}
          <div use:melt={$tabs.elements.content('equipment')} class="space-y-3">
            {#if !client.equipment || client.equipment.length === 0}
              <div class="text-center py-8">
                <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p class="text-gray-500 mb-3">No equipment registered</p>
                <button class="btn-primary text-sm"
                        on:click={() => goto(`/equipment/new?client=${client.id}`)}>
                  Add Equipment
                </button>
              </div>
            {:else}
              {#each client.equipment as equipment}
                <div class="bg-white rounded-lg border border-gray-200 p-4">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h4 class="font-medium text-gray-900">{equipment.name}</h4>
                      <p class="text-sm text-gray-500">{equipment.brand} - {equipment.model}</p>
                      <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>Serial: {equipment.serialNumber}</span>
                        <span>Installed: {equipment.installDate}</span>
                      </div>
                    </div>
                    {#if equipment.warrantyExpires && new Date(equipment.warrantyExpires) > new Date()}
                      <span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                        Warranty Active
                      </span>
                    {/if}
                  </div>
                  {#if equipment.nextServiceDate}
                    <div class="mt-3 pt-3 border-t border-gray-100">
                      <p class="text-xs text-gray-600">
                        Next service: {new Date(equipment.nextServiceDate).toLocaleDateString()}
                      </p>
                    </div>
                  {/if}
                </div>
              {/each}
            {/if}
          </div>
          
        {:else if $tabs.states.value === 'history'}
          <div use:melt={$tabs.elements.content('history')} class="space-y-3">
            <div class="text-center py-8 text-gray-500">
              <p>Service history timeline coming soon</p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
  
  <!-- Edit Dialog -->
  {#if $editDialog.states.open}
    <div use:melt={$editDialog.elements.overlay} 
         class="fixed inset-0 bg-black/50 z-50"></div>
    <div use:melt={$editDialog.elements.content}
         class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                bg-white rounded-lg shadow-xl p-6 w-[90%] max-w-md z-50">
      <h3 class="text-lg font-semibold mb-4">Edit Client</h3>
      <p class="text-gray-600">Edit functionality coming soon</p>
      <button use:melt={$editDialog.elements.close}
              class="mt-4 btn-primary">
        Close
      </button>
    </div>
  {/if}
  
  <!-- Delete Confirmation Dialog -->
  {#if $deleteDialog.states.open}
    <div use:melt={$deleteDialog.elements.overlay} 
         class="fixed inset-0 bg-black/50 z-50"></div>
    <div use:melt={$deleteDialog.elements.content}
         class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                bg-white rounded-lg shadow-xl p-6 w-[90%] max-w-md z-50">
      <h3 class="text-lg font-semibold mb-4">Delete Client?</h3>
      <p class="text-gray-600 mb-6">
        Are you sure you want to delete {client.name}? This action cannot be undone.
      </p>
      <div class="flex gap-3 justify-end">
        <button use:melt={$deleteDialog.elements.close}
                class="btn-secondary">
          Cancel
        </button>
        <button class="bg-red-600 text-white px-4 py-2 rounded-lg 
                       hover:bg-red-700 transition-colors">
          Delete Client
        </button>
      </div>
    </div>
  {/if}
</div>