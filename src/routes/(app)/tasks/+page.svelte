<!-- src/routes/(app)/tasks/+page.svelte -->
<script lang="ts">
  import { useClients } from '$lib/stores/client.svelte';
  import { onMount } from 'svelte';
  
  const clients = useClients();
  
  // Mock data for tasks - replace with your actual store
  let tasks = $state([
    {
      id: 1,
      title: 'Complete project proposal',
      clientId: 1,
      clientName: 'Acme Corp',
      status: 'in-progress',
      priority: 'high',
      dueDate: '2025-01-08',
      description: 'Draft and finalize Q1 project proposal'
    },
    {
      id: 2,
      title: 'Review design mockups',
      clientId: 2,
      clientName: 'TechStart Inc',
      status: 'pending',
      priority: 'medium',
      dueDate: '2025-01-10',
      description: 'Provide feedback on homepage redesign'
    },
    {
      id: 3,
      title: 'Invoice for December',
      clientId: 1,
      clientName: 'Acme Corp',
      status: 'completed',
      priority: 'low',
      dueDate: '2024-12-31',
      description: 'Monthly retainer invoice'
    }
  ]);
  
  let filter = $state('all');
  let showNewTaskForm = $state(false);
  let newTask = $state({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: ''
  });
  
  // Filter tasks based on selected filter and client
  let filteredTasks = $derived(() => {
    let result = [...tasks]; // Create a copy to avoid mutation
    
    // Filter by client if one is selected
    if (clients.selectedClient) {
      result = result.filter(task => task.clientId === clients.selectedClient.id);
    }
    
    // Filter by status
    if (filter !== 'all') {
      result = result.filter(task => task.status === filter);
    }
    
    // Sort by due date and priority - return a new sorted array
    return [...result].sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  });
  
  function toggleTaskStatus(taskId: number) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.status = task.status === 'completed' ? 'pending' : 'completed';
    }
  }
  
  function createTask() {
    if (!newTask.title.trim()) return;
    
    const task = {
      id: Date.now(),
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      dueDate: newTask.dueDate,
      status: 'pending' as const,
      clientId: clients.selectedClient?.id || null,
      clientName: clients.selectedClient?.name || 'No client'
    };
    
    tasks.push(task);
    
    // Reset form
    newTask = {
      title: '',
      description: '',
      priority: 'medium',
      dueDate: ''
    };
    showNewTaskForm = false;
  }
  
  function getPriorityColor(priority: string) {
    switch(priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }
</script>

<div class="min-h-screen bg-gray-50 pb-20">
  <!-- Header -->
  <header class="bg-white shadow-sm sticky top-0 z-20">
    <div class="px-4 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Tasks</h1>
          {#if clients.selectedClient}
            <p class="text-sm text-gray-500 mt-1">
              Showing tasks for {clients.selectedClient.name}
            </p>
          {/if}
        </div>
        <button
          onclick={() => showNewTaskForm = true}
          class="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Task
        </button>
      </div>
      
      <!-- Filter Tabs -->
      <div class="flex gap-2 mt-4 border-b border-gray-200">
        <button
          onclick={() => filter = 'all'}
          class="pb-2 px-1 {filter === 'all' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}"
        >
          All ({tasks.length})
        </button>
        <button
          onclick={() => filter = 'pending'}
          class="pb-2 px-1 {filter === 'pending' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}"
        >
          Pending ({tasks.filter(t => t.status === 'pending').length})
        </button>
        <button
          onclick={() => filter = 'in-progress'}
          class="pb-2 px-1 {filter === 'in-progress' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}"
        >
          In Progress ({tasks.filter(t => t.status === 'in-progress').length})
        </button>
        <button
          onclick={() => filter = 'completed'}
          class="pb-2 px-1 {filter === 'completed' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}"
        >
          Completed ({tasks.filter(t => t.status === 'completed').length})
        </button>
      </div>
    </div>
  </header>
  
  <!-- Tasks List -->
  <div class="p-4 space-y-3">
    {#if filteredTasks().length === 0}
      <div class="text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <p class="text-gray-500 mt-4">No tasks found</p>
        <button
          onclick={() => showNewTaskForm = true}
          class="text-blue-600 mt-2 hover:underline"
        >
          Create your first task
        </button>
      </div>
    {/if}
    
    {#each filteredTasks() as task (task.id)}
      <div class="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-start gap-3">
          <!-- Checkbox -->
          <button
            onclick={() => toggleTaskStatus(task.id)}
            class="mt-1 w-5 h-5 rounded border-2 {task.status === 'completed' ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'} flex items-center justify-center text-xs"
            aria-label="{task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}: {task.title}"
          >
            {task.status === 'completed' ? '✓' : ''}
          </button>
          
          <!-- Task Content -->
          <div class="flex-1">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-medium {task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}">
                  {task.title}
                </h3>
                {#if task.description}
                  <p class="text-sm text-gray-500 mt-1">{task.description}</p>
                {/if}
                <div class="flex items-center gap-3 mt-2">
                  <span class="text-xs text-gray-500">{task.clientName}</span>
                  <span class="text-xs px-2 py-1 rounded-full {getPriorityColor(task.priority)}">
                    {task.priority}
                  </span>
                  {#if task.dueDate}
                    <span class="text-xs text-gray-500">
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  {/if}
                </div>
              </div>
              
              <!-- Actions -->
              <button 
                class="text-gray-400 hover:text-gray-600"
                aria-label="More actions for {task.title}"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- New Task Modal -->
{#if showNewTaskForm}
  <div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
    <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-6">
      <h2 class="text-xl font-semibold mb-4">New Task</h2>
      
      <form onsubmit={(e) => { e.preventDefault(); createTask(); }}>
        <div class="space-y-4">
          <div>
            <label for="task-title" class="block text-sm font-medium text-gray-700 mb-1">
              Task Title
            </label>
            <input
              id="task-title"
              type="text"
              bind:value={newTask.title}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What needs to be done?"
              required
            />
          </div>
          
          <div>
            <label for="task-description" class="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="task-description"
              bind:value={newTask.description}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Add details..."
            ></textarea>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="task-priority" class="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="task-priority"
                bind:value={newTask.priority}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label for="task-due-date" class="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                id="task-due-date"
                type="date"
                bind:value={newTask.dueDate}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {#if clients.selectedClient}
            <div class="text-sm text-gray-500">
              Task will be assigned to: <span class="font-medium">{clients.selectedClient.name}</span>
            </div>
          {/if}
        </div>
        
        <div class="flex gap-3 mt-6">
          <button
            type="button"
            onclick={() => showNewTaskForm = false}
            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Task
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}