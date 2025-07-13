<!-- src/lib/components/task/TaskDetail.svelte -->
<script lang="ts">
  import type { Task, TaskStatus } from '$lib/types/task';
  import { useJobStore } from '$lib/stores/task.svelte';
  import { getStatusColor, getStatusIcon, getPriorityColor, canTransitionTo } from '$lib/types/task';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
  import StatusTimeline from './StatusTimeline.svelte';
  import PhotoUpload from './PhotoUpload.svelte';
  import { goto } from '$app/navigation';
  import PermissionGate from '$lib/components/permissions/PermissionGate.svelte';
  import { useFeatureFlags } from '$lib/stores/featureFlags.svelte';
  
  // Date formatting utility
  function formatDateTime(date: Date | any): string {
    const d = date instanceof Date ? date : date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  
  interface Props {
    task: Task;
  }
  
  let { task }: Props = $props();
  
  const taskStore = useJobStore();
  const toast = useToast();
  
  // Permission checks
  const featureFlags = useFeatureFlags();
  const canUpdateStatus = $derived(featureFlags.can('task_management_update_status'));
  const canAddNotes = $derived(featureFlags.can('task_management_add_notes'));
  
  let showStatusMenu = $state(false);
  let showTimeline = $state(false);
  let addingNote = $state(false);
  let noteText = $state('');
  let noteType = $state<'general' | 'technical' | 'customer' | 'internal'>('general');
  let notePrivate = $state(false);
  
  // Available status transitions
  const availableTransitions = $derived(() => {
    const transitions: Array<{ status: TaskStatus; label: string; icon: string }> = [];
    
    if (canTransitionTo(task.status, 'scheduled')) {
      transitions.push({ status: 'scheduled', label: 'Schedule', icon: 'calendar' });
    }
    if (canTransitionTo(task.status, 'in_progress')) {
      transitions.push({ status: 'in_progress', label: 'Start Task', icon: 'play' });
    }
    if (canTransitionTo(task.status, 'completed')) {
      transitions.push({ status: 'completed', label: 'Complete', icon: 'check' });
    }
    if (canTransitionTo(task.status, 'invoiced')) {
      transitions.push({ status: 'invoiced', label: 'Create Invoice', icon: 'receipt' });
    }
    if (canTransitionTo(task.status, 'paid')) {
      transitions.push({ status: 'paid', label: 'Mark Paid', icon: 'dollarSign' });
    }
    
    return transitions;
  });
  
  // Update task status
  async function updateStatus(newStatus: TaskStatus) {
    try {
      await taskStore.updateTaskStatus(task.id, newStatus);
      showStatusMenu = false;
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  }
  
  // Add note
  async function addNote() {
    if (!noteText.trim()) return;
    
    try {
      await taskStore.addNote(task.id, noteText, noteType, notePrivate);
      noteText = '';
      addingNote = false;
      toast.success('Note added');
    } catch (error) {
      toast.error('Failed to add note');
    }
  }
  
  // Navigate to client
  function navigateToClient() {
    goto(`/clients/${task.clientId}`);
  }
</script>

<div class="task-detail bg-gray-50 dark:bg-gray-900 min-h-screen pb-20">
  <!-- Header -->
  <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
    <div class="px-4 py-3">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
            {task.title}
          </h1>
          {#if task.taskNumber}
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">#{task.taskNumber}</p>
          {/if}
        </div>
        
        <PermissionGate action="task_management_update_status">
          <button
            onclick={() => showStatusMenu = !showStatusMenu}
            class="relative ml-3 px-3 py-1.5 text-sm font-medium rounded-full 
                   bg-{getStatusColor(task.status)}-100 text-{getStatusColor(task.status)}-800
                   hover:bg-{getStatusColor(task.status)}-200 transition-colors"
          >
            <Icon name={getStatusIcon(task.status)} class="w-4 h-4 inline mr-1" />
            {task.status.replace('_', ' ')}
          </button>
          {#snippet fallback()}
            <span class="ml-3 px-3 py-1.5 text-sm font-medium rounded-full 
                         bg-{getStatusColor(task.status)}-100 text-{getStatusColor(task.status)}-800">
              <Icon name={getStatusIcon(task.status)} class="w-4 h-4 inline mr-1" />
              {task.status.replace('_', ' ')}
            </span>
          {/snippet}
        </PermissionGate>
      </div>
      
      <!-- Status change menu -->
      {#if showStatusMenu}
        <div class="absolute right-4 top-16 bg-white dark:bg-gray-800 rounded-lg shadow-lg border 
                    border-gray-200 dark:border-gray-700 py-2 min-w-[180px] z-20">
          {#if availableTransitions.length > 0}
            {#each availableTransitions as transition}
              <button
                onclick={() => updateStatus(transition.status)}
                class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700
                       flex items-center gap-2"
              >
                <Icon name={transition.icon} class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                {transition.label}
              </button>
            {/each}
          {:else}
            <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              No status changes available
            </div>
          {/if}
        </div>
      {/if}
      
      <!-- Quick actions -->
      <div class="flex items-center gap-2 mt-3">
        <PermissionGate action="task_management_update_status">
          {#if task.status === 'scheduled'}
            <button
              onclick={() => updateStatus('in_progress')}
              class="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium
                     hover:bg-green-700 transition-colors"
            >
              Start Task
            </button>
          {:else if task.status === 'in_progress'}
            <button
              onclick={() => updateStatus('completed')}
              class="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium
                     hover:bg-blue-700 transition-colors"
            >
              Complete Task
            </button>
          {/if}
        </PermissionGate>
        
        <button
          onclick={() => showTimeline = true}
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300
                 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Icon name="clock" class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
  
  <!-- Content sections -->
  <div class="px-4 py-4 space-y-4">
    <!-- Priority indicator -->
    {#if task.priority !== 'normal'}
      <div class="bg-{getPriorityColor(task.priority)}-50 border border-{getPriorityColor(task.priority)}-200 
                  rounded-lg px-4 py-3">
        <div class="flex items-center gap-2">
          <Icon name="alertTriangle" class="w-5 h-5 text-{getPriorityColor(task.priority)}-600" />
          <span class="font-medium text-{getPriorityColor(task.priority)}-800">
            {task.priority} priority
          </span>
        </div>
      </div>
    {/if}
    
    <!-- Client info -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <button
        onclick={navigateToClient}
        class="w-full text-left group"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Client</h3>
            <p class="font-medium text-gray-900 dark:text-gray-100">{task.client.name}</p>
            {#if task.client.phone}
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{task.client.phone}</p>
            {/if}
          </div>
          <Icon name="chevronRight" class="w-5 h-5 text-gray-400 dark:text-gray-500
                                           group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
        </div>
      </button>
    </div>
    
    <!-- Schedule info -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Schedule</h3>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Scheduled</span>
          <span class="font-medium text-gray-900 dark:text-gray-100">{formatDateTime(task.scheduledStart)}</span>
        </div>
        
        {#if task.actualStart}
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">Started</span>
            <span class="font-medium text-gray-900 dark:text-gray-100">{formatDateTime(task.actualStart)}</span>
          </div>
        {/if}
        
        {#if task.actualEnd}
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">Completed</span>
            <span class="font-medium text-gray-900 dark:text-gray-100">{formatDateTime(task.actualEnd)}</span>
          </div>
        {/if}
        
        {#if task.duration}
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">Duration</span>
            <span class="font-medium text-gray-900 dark:text-gray-100">
              {Math.floor(task.duration / 60)}h {task.duration % 60}m
            </span>
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Location -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Location</h3>
      <address class="not-italic text-gray-900 dark:text-gray-100">
        {task.address.street}<br>
        {#if task.address.city}
          {task.address.city}, {task.address.state} {task.address.zip}
        {/if}
      </address>
      
      {#if task.address.accessNotes}
        <div class="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm text-yellow-800 dark:text-yellow-200">
          <Icon name="info" class="w-4 h-4 inline mr-1" />
          {task.address.accessNotes}
        </div>
      {/if}
      
      <button
        onclick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(
          `${task.address.street} ${task.address.city} ${task.address.state}`
        )}`)}
        class="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
      >
        <Icon name="mapPin" class="w-4 h-4" />
        Get directions
      </button>
    </div>
    
    <!-- Technicians -->
    {#if task.assignedToNames?.length}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Assigned Technicians</h3>
        <div class="space-y-2">
          {#each task.assignedToNames as name, i}
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center 
                          justify-center text-sm font-medium text-gray-700 dark:text-gray-200">
                {name.charAt(0).toUpperCase()}
              </div>
              <span class="text-gray-900 dark:text-gray-100">
                {name}
                {#if task.leadTechnician === task.assignedTo[i]}
                  <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">(Lead)</span>
                {/if}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    <!-- Description -->
    {#if task.description}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h3>
        <p class="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{task.description}</p>
      </div>
    {/if}
    
    <!-- AI Predictions -->
    {#if task.predictions}
      <div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
        <div class="flex items-center gap-2 mb-3">
          <Icon name="sparkles" class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 class="font-medium text-indigo-900 dark:text-indigo-100">AI Insights</h3>
        </div>
        
        <div class="space-y-3 text-sm">
          {#if task.predictions.duration}
            <div>
              <span class="text-indigo-700 dark:text-indigo-300">Estimated duration:</span>
              <span class="font-medium text-indigo-900 dark:text-indigo-100 ml-1">
                {Math.floor(task.predictions.duration.minutes / 60)}h 
                {task.predictions.duration.minutes % 60}m
              </span>
              <span class="text-indigo-600 dark:text-indigo-400 ml-1">
                ({Math.round(task.predictions.duration.confidence * 100)}% confidence)
              </span>
            </div>
          {/if}
          
          {#if task.predictions.complexity}
            <div>
              <span class="text-indigo-700 dark:text-indigo-300">Complexity:</span>
              <span class="font-medium text-indigo-900 dark:text-indigo-100 ml-1">
                {task.predictions.complexity.level}
              </span>
            </div>
          {/if}
          
          {#if task.predictions.requiredEquipment?.items.length}
            <div>
              <span class="text-indigo-700 dark:text-indigo-300">Suggested equipment:</span>
              <ul class="mt-1 space-y-1">
                {#each task.predictions.requiredEquipment.items as item}
                  <li class="flex items-center gap-1 text-indigo-900 dark:text-indigo-100">
                    <Icon name="check" class="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    {item}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      </div>
    {/if}
    
    <!-- Photos -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
          Photos ({task.photos?.length || 0})
        </h3>
      </div>
      
      <PhotoUpload 
        taskId={task.id}
        existingPhotos={task.photos || []}
      />
    </div>
    
    <!-- Notes & Comments -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
          Notes ({task.notes?.length || 0})
        </h3>
        <PermissionGate action="task_management_add_notes">
          <button
            onclick={() => addingNote = true}
            class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Add note
          </button>
        </PermissionGate>
      </div>
      
      {#if addingNote}
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3 bg-white dark:bg-gray-800">
          <textarea
            bind:value={noteText}
            placeholder="Add a note..."
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                   focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            rows="3"
          ></textarea>
          
          <div class="flex items-center gap-2 mt-2">
            <select
              bind:value={noteType}
              class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="general">General</option>
              <option value="technical">Technical</option>
              <option value="customer">Customer</option>
              <option value="internal">Internal</option>
            </select>
            
            <label class="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                bind:checked={notePrivate}
                class="rounded border-gray-300 dark:border-gray-600"
              />
              Private
            </label>
            
            <div class="flex-1"></div>
            
            <button
              onclick={() => { addingNote = false; noteText = ''; }}
              class="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            
            <button
              onclick={addNote}
              disabled={!noteText.trim()}
              class="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded 
                     hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      {/if}
      
      <div class="space-y-3">
        {#each task.notes || [] as note}
          <div class="border-l-2 border-gray-200 dark:border-gray-700 pl-3">
            <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span class="font-medium">{note.createdByName}</span>
              <span>•</span>
              <span>{new Date(note.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
              {#if note.type !== 'general'}
                <span class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                  {note.type}
                </span>
              {/if}
              {#if note.isPrivate}
                <Icon name="lock" class="w-3 h-3" />
              {/if}
            </div>
            <p class="text-gray-900 dark:text-gray-100 text-sm whitespace-pre-wrap">{note.text}</p>
          </div>
        {/each}
      </div>
    </div>
  </div>
  
  <!-- Status Timeline Modal -->
  {#if showTimeline}
    <StatusTimeline 
      statusHistory={task.statusHistory}
      onClose={() => showTimeline = false}
    />
  {/if}
</div>

<style>
  .task-detail {
    -webkit-overflow-scrolling: touch;
  }
</style>