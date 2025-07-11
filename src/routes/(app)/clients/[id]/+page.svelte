<!-- src/routes/(app)/clients/[id]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useClients } from '$lib/stores/client.svelte';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { onMount } from 'svelte';
  import { untrack } from 'svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { formatPhoneNumber } from '$lib/utils/format';
  
  const clients = useClients();
  const taskStore = useJobStore();
  const tenant = useTenant();
  
  // Get client ID from route
  const clientId = $derived($page.params.id);
  
  // Track initialization
  let isInitialized = $state(false);
  let isLoadingClient = $state(true);
  
  // Get client from store
  const client = $derived(clientId ? clients.clients.find(c => c.id === clientId) : null);
  
  // Get tasks for this client
  const clientTasks = $derived(clientId ? taskStore.getTasksForClient(clientId) : []);
  
  // Task stats
  const taskStats = $derived({
    total: clientTasks.length,
    active: clientTasks.filter(t => ['scheduled', 'in_progress'].includes(t.status)).length,
    completed: clientTasks.filter(t => t.status === 'completed').length,
    overdue: clientTasks.filter(t => {
      if (t.status !== 'scheduled' || !t.scheduledStart) return false;
      const date = t.scheduledStart instanceof Date ? t.scheduledStart : t.scheduledStart.toDate();
      return date < new Date();
    }).length
  });
  
  // Initialize on mount
  onMount(() => {
    console.log('Client detail page mounted, clientId:', clientId);
    
    const tenantId = untrack(() => tenant.current?.id);
    if (tenantId && clientId) {
      // Initialize stores
      if (!isInitialized) {
        clients.subscribeTenant(tenantId);
        taskStore.setTenant(tenantId);
        isInitialized = true;
      }
      
      // Subscribe to this client's tasks
      console.log('Subscribing to client tasks:', clientId);
      taskStore.subscribeToClient(clientId);
      
      // Give stores time to load
      setTimeout(() => {
        isLoadingClient = false;
      }, 1000);
    }
    
    return () => {
      console.log('Client detail page unmounting');
    };
  });
  
  // Navigation functions
  function goBack() {
    goto('/clients');
  }
  
  function viewTasks() {
    if (clientId) {
      goto(`/clients/${clientId}/tasks`);
    }
  }
  
  function createTask() {
    if (clientId) {
      goto(`/tasks/new?client=${clientId}`);
    }
  }
  
  function editClient() {
    if (clientId) {
      goto(`/clients/${clientId}/edit`);
    }
  }
  
  // Format address
  function formatAddress(address: any): string {
    if (!address) return '';
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean);
    return parts.join(', ');
  }
</script>

{#if isLoadingClient}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading client...</p>
    </div>
  </div>
{:else if !client}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <Icon name="users" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p class="text-gray-600 mb-4">Client not found</p>
      <button
        onclick={goBack}
        class="text-blue-600 hover:text-blue-700 font-medium"
      >
        Back to Clients
      </button>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- Header -->
    <div class="bg-white shadow-sm">
      <div class="px-4 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button
            onclick={goBack}
            class="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="arrowLeft" class="w-5 h-5" />
          </button>
          <h1 class="text-xl font-semibold text-gray-900">{client.name}</h1>
        </div>
        <button
          onclick={editClient}
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Icon name="edit" class="w-5 h-5" />
        </button>
      </div>
    </div>
    
    <!-- Client Info -->
    <div class="p-4 space-y-4">
      <!-- Contact Info -->
      <div class="bg-white rounded-lg shadow-sm p-4">
        <h2 class="text-sm font-medium text-gray-500 mb-3">Contact Information</h2>
        <div class="space-y-3">
          {#if client.email}
            <div class="flex items-center space-x-3">
              <Icon name="mail" class="w-5 h-5 text-gray-400" />
              <a href="mailto:{client.email}" class="text-blue-600 hover:text-blue-700">
                {client.email}
              </a>
            </div>
          {/if}
          
          {#if client.phone}
            <div class="flex items-center space-x-3">
              <Icon name="phone" class="w-5 h-5 text-gray-400" />
              <a href="tel:{client.phone}" class="text-blue-600 hover:text-blue-700">
                {formatPhoneNumber(client.phone)}
              </a>
            </div>
          {/if}
          
          {#if client.address}
            <div class="flex items-start space-x-3">
              <Icon name="location" class="w-5 h-5 text-gray-400 mt-0.5" />
              <span class="text-gray-900">{formatAddress(client.address)}</span>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Task Summary -->
      <div class="bg-white rounded-lg shadow-sm p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-medium text-gray-500">Tasks</h2>
          <button
            onclick={viewTasks}
            class="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
          </button>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center">
            <div class="text-2xl font-semibold text-gray-900">{taskStats.active}</div>
            <div class="text-sm text-gray-500">Active</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-semibold text-green-600">{taskStats.completed}</div>
            <div class="text-sm text-gray-500">Completed</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-semibold text-red-600">{taskStats.overdue}</div>
            <div class="text-sm text-gray-500">Overdue</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-semibold text-gray-900">{taskStats.total}</div>
            <div class="text-sm text-gray-500">Total</div>
          </div>
        </div>
        
        <button
          onclick={createTask}
          class="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
        >
          Create New Task
        </button>
      </div>
      
      <!-- Recent Tasks -->
      {#if clientTasks.length > 0}
        <div class="bg-white rounded-lg shadow-sm p-4">
          <h2 class="text-sm font-medium text-gray-500 mb-3">Recent Tasks</h2>
          <div class="space-y-2">
            {#each clientTasks.slice(0, 3) as task}
              <button
                onclick={() => goto(`/tasks/${task.id}`)}
                class="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="font-medium text-gray-900">{task.title}</h3>
                    <p class="text-sm text-gray-500">
                      {task.status === 'scheduled' && task.scheduledStart
                        ? `Scheduled: ${new Date(task.scheduledStart).toLocaleDateString()}`
                        : task.status.replace('_', ' ')}
                    </p>
                  </div>
                  <Icon name="chevronRight" class="w-5 h-5 text-gray-400" />
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
      
      <!-- Additional Info -->
      {#if client.notes}
        <div class="bg-white rounded-lg shadow-sm p-4">
          <h2 class="text-sm font-medium text-gray-500 mb-3">Notes</h2>
          <p class="text-gray-900">{client.notes}</p>
        </div>
      {/if}
    </div>
  </div>
{/if}
