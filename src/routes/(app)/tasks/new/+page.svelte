<!-- src/routes/(app)/tasks/new/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useClients } from '$lib/stores/client.svelte';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { onMount } from 'svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import TaskForm from '$lib/components/task/TaskForm.svelte';
  import { toast } from '$lib/utils/toast';
  import type { CreateTaskInput } from '$lib/types/task';
  
  const clients = useClients();
  const taskStore = useJobStore();
  const tenant = useTenant();
  
  // Get client ID from URL or use selected client
  let initialClientId = $state('');
  
  onMount(() => {
    const urlClientId = $page.url.searchParams.get('client');
    if (urlClientId && clients.clients.some(c => c.id === urlClientId)) {
      initialClientId = urlClientId;
    } else if (clients.selectedClient) {
      initialClientId = clients.selectedClient.id;
    }
  });
  
  // Submit state
  let isSubmitting = $state(false);
  
  async function handleSubmit(taskData: CreateTaskInput) {
    isSubmitting = true;
    
    try {
      const newTask = await taskStore.createTask(taskData);
      toast.success('Task created successfully');
      goto(`/tasks/${newTask.id}`);
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
      isSubmitting = false;
    }
  }
  
  // Initialize store with tenant
  $effect(() => {
    if (tenant.current?.id) {
      taskStore.setTenant(tenant.current.id);
    }
  });
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
    <div class="px-4 py-3">
      <div class="flex items-center">
        <button
          onclick={() => history.back()}
          class="mr-3 p-2 -ml-2 rounded-lg hover:bg-gray-100"
        >
          <Icon name="chevronLeft" class="w-5 h-5" />
        </button>
        <h1 class="text-xl font-semibold text-gray-900">New Task</h1>
      </div>
    </div>
    
    <!-- Selected Client Banner -->
    {#if clients.selectedClient}
      <div class="bg-blue-50 border-t border-blue-100 px-4 py-2">
        <div class="flex items-center justify-between">
          <p class="text-sm text-blue-800">
            Working with: <span class="font-semibold">{clients.selectedClient.name}</span>
          </p>
          <button
            type="button"
            onclick={() => { 
              initialClientId = ''; 
              clients.selectClient(null);
            }}
            class="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Change Client
          </button>
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Form Container -->
  <div class="p-4 max-w-2xl mx-auto">
    <div class="bg-white rounded-lg shadow-sm p-6">
      <TaskForm
        {initialClientId}
        onSubmit={handleSubmit}
        onCancel={() => history.back()}
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
