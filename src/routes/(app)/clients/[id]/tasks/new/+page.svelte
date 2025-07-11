<!-- src/routes/(app)/clients/[id]/tasks/new/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { useClients } from '$lib/stores/client.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import TaskForm from '$lib/components/task/TaskForm.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { toast } from '$lib/utils/toast';
  import type { CreateTaskInput } from '$lib/types/task';
  
  // Get client ID from route
  const clientId = $derived($page.params.id);
  
  // Stores
  const taskStore = useJobStore();
  const clientStore = useClients();
  const tenantStore = useTenant();
  
  // Get client
  const client = $derived(clientStore.clients.find(c => c.id === clientId));
  
  // Submit state
  let isSubmitting = $state(false);
  
  // Navigate back
  function navigateBack() {
    goto(`/clients/${clientId}/tasks`);
  }
  
  // Create task
  async function handleSubmit(taskData: CreateTaskInput) {
    isSubmitting = true;
    
    try {
      const task = await taskStore.createTask(taskData);
      toast.success('Task created successfully');
      goto(`/clients/${clientId}/tasks/${task.id}`);
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create task');
      isSubmitting = false;
    }
  }
  
  // Initialize store with tenant
  $effect(() => {
    if (tenantStore.current?.id) {
      taskStore.setTenant(tenantStore.current.id);
    }
  });
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
    <div class="px-4 py-3">
      <div class="flex items-center gap-3">
        <button
          onclick={navigateBack}
          class="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Icon name="arrowLeft" class="w-5 h-5" />
        </button>
        
        <h1 class="text-lg font-semibold text-gray-900">
          New Task
        </h1>
      </div>
    </div>
  </div>
  
  <!-- Client info -->
  {#if client}
    <div class="px-4 pt-4">
      <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 class="text-sm font-medium text-blue-900 mb-1">Client</h3>
        <p class="font-medium text-blue-900">{client.name}</p>
        {#if client.phone}
          <p class="text-sm text-blue-700">{client.phone}</p>
        {/if}
      </div>
    </div>
  {/if}
  
  <!-- Form Container -->
  <div class="p-4">
    <div class="bg-white rounded-lg shadow-sm p-6">
      <TaskForm
        initialClientId={clientId}
        onSubmit={handleSubmit}
        onCancel={navigateBack}
        submitLabel="Create Task"
        {isSubmitting}
      />
    </div>
  </div>
  
  <!-- Offline indicator -->
  {#if taskStore.isOffline}
    <div class="fixed bottom-20 left-4 right-4 bg-yellow-100 border border-yellow-400 
                text-yellow-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <Icon name="wifiOff" class="w-5 h-5" />
      <span class="text-sm">Creating task offline - will sync when connected</span>
    </div>
  {/if}
</div>
</script>
