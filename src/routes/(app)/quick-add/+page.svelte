<script>
  import { createDialog, melt } from '@melt-ui/svelte';
  import { goto } from '$app/navigation';
  import { useClients } from '$lib/stores/client.svelte';
  import NewClientForm from '$lib/components/client/NewClientForm.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { useFeatureFlags } from '$lib/stores/featureFlags.svelte';
  
  const clients = useClients();
  
  // Quick action dialogs
  const newClientDialog = createDialog();
  const newJobDialog = createDialog();
  
  // Permission checks
  const featureFlags = useFeatureFlags();
  const canCreateClient = $derived(featureFlags.can('user_management_create_client'));
  const canCreateTask = $derived(featureFlags.can('task_management_create_task'));
  const canCreateInvoice = $derived(featureFlags.can('financial_create_invoice'));
  
  const quickActions = $derived([
    {
      title: 'New Client',
      description: 'Add a new client to your database',
      icon: 'user-plus',
      color: 'bg-blue-500',
      action: () => newClientDialog.open.set(true),
      visible: canCreateClient,
      permission: 'user_management_create_client'
    },
    {
      title: 'New Job',
      description: 'Create a job for an existing client',
      icon: 'clipboard',
      color: 'bg-green-500',
      action: () => {
        if (clients.selectedClient) {
          // If client is selected, go directly to new job for that client
          goto(`/clients/${clients.selectedClient.id}/jobs/new`);
        } else if (clients.clients.length > 0) {
          // If no client selected but clients exist, show client selector first
          goto('/clients?action=new-job');
        } else {
          // No clients yet, prompt to create one first
          goto('/clients/new');
        }
      },
      visible: canCreateTask,
      permission: 'task_management_create_task'
    },
    {
      title: 'Quick Invoice',
      description: 'Generate an invoice from completed work',
      icon: 'receipt',
      color: 'bg-purple-500',
      action: () => goto('/invoices/new'),
      visible: canCreateInvoice,
      permission: 'financial_create_invoice'
    },
    {
      title: 'Take Photo',
      description: 'Document equipment or job site',
      icon: 'camera',
      color: 'bg-orange-500',
      action: () => goto('/photos/new'),
      visible: true, // Photos might not need special permission
      permission: null
    }
  ].filter(action => action.visible));
</script>

<div class="flex flex-col h-full bg-gray-50">
  <div class="bg-white border-b border-gray-200 p-4">
    <h1 class="text-xl font-semibold text-gray-900">Quick Actions</h1>
    <p class="text-sm text-gray-500 mt-1">What would you like to do?</p>
  </div>
  
  <div class="flex-1 overflow-y-auto p-4">
    <div class="grid grid-cols-2 gap-4">
      {#each quickActions() as action}
        <button 
          class="bg-white rounded-lg border border-gray-200 p-4 
                 hover:shadow-md hover:border-gray-300 transition-all 
                 duration-200 text-left group"
          on:click={action.action}>
          
          <div class="{action.color} w-12 h-12 rounded-lg flex items-center 
                      justify-center mb-3 group-hover:scale-110 transition-transform">
            {#if action.icon === 'user-plus'}
              <Icon name="userPlus" class="w-6 h-6 text-white" />
            {:else if action.icon === 'clipboard'}
              <Icon name="clipboard" class="w-6 h-6 text-white" />
            {:else if action.icon === 'receipt'}
              <Icon name="receipt" class="w-6 h-6 text-white" />
            {:else if action.icon === 'camera'}
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            {/if}
          </div>
          
          <h3 class="font-medium text-gray-900 mb-1">{action.title}</h3>
          <p class="text-sm text-gray-500">{action.description}</p>
        </button>
      {/each}
    </div>
    
    <!-- Recent Activity -->
    <div class="mt-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
      <div class="space-y-3">
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900">Job completed</p>
              <p class="text-xs text-gray-500">Johnson Residence • 2 hours ago</p>
            </div>
            <span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
              Completed
            </span>
          </div>
        </div>
        
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900">Invoice sent</p>
              <p class="text-xs text-gray-500">Smith Office • Yesterday</p>
            </div>
            <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
              Pending
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- New Client Dialog -->
  <NewClientForm bind:open={$newClientDialog.states.open} />
</div>