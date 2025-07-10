<!-- src/routes/(app)/tasks/[id]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { useEnhancedTaskStore } from '$lib/stores/task-enhanced.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { onMount } from 'svelte';
  import TaskDetail from '$lib/components/task/TaskDetail.svelte';
  
  const taskStore = useEnhancedTaskStore();
  const tenant = useTenant();
  
  // Get task ID from route
  const taskId = $derived($page.params.id);
  
  // Track initialization
  let isInitialized = $state(false);
  let hasCheckedTask = $state(false);
  
  // Get task from store
  const task = $derived(taskId ? taskStore.getTaskById(taskId) : null);
  
  // Initialize store on mount
  onMount(() => {
    // Ensure store is initialized with current tenant
    if (tenant.current?.id && !isInitialized) {
      taskStore.initializeTenant(tenant.current.id);
      isInitialized = true;
    }
    
    // Give the store time to load tasks
    const timeoutId = setTimeout(() => {
      hasCheckedTask = true;
    }, 1500);
    
    return () => {
      clearTimeout(timeoutId);
    };
  });
  
  // Handle task not found after checking
  $effect(() => {
    if (hasCheckedTask && !task && !taskStore.isLoading) {
      goto('/tasks');
    }
  });
</script>

{#if taskStore.isLoading || !hasCheckedTask}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading task...</p>
    </div>
  </div>
{:else if task}
  <TaskDetail {task} />
{:else}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
      <p class="text-gray-600 mb-4">Task not found</p>
      <button
        onclick={() => goto('/tasks')}
        class="text-blue-600 hover:text-blue-700 font-medium"
      >
        Back to Tasks
      </button>
    </div>
  </div>
{/if}
