<!-- Example: TaskActionButtons.svelte -->
<!-- This example shows how to use the new permission system in components -->
<script lang="ts">
  import PermissionGate from '$lib/components/permissions/PermissionGate.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import type { Task } from '$lib/types/task';
  
  interface Props {
    task: Task;
    onEdit?: () => void;
    onDelete?: () => void;
    onAssign?: () => void;
  }
  
  let { task, onEdit, onDelete, onAssign }: Props = $props();
</script>

<div class="flex items-center gap-2">
  <!-- Edit button - checks if user can edit this specific task -->
  <PermissionGate 
    action="task_management_edit_task" 
    context={{ taskId: task.id, assignedTo: task.assignedTo }}
  >
    <button
      onclick={onEdit}
      class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      aria-label="Edit task"
    >
      <Icon name="edit" class="w-4 h-4" />
    </button>
  </PermissionGate>
  
  <!-- Assign button - only for users who can assign tasks -->
  <PermissionGate action="task_management_assign_task">
    <button
      onclick={onAssign}
      class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
      aria-label="Assign task"
    >
      <Icon name="user-plus" class="w-4 h-4" />
    </button>
  </PermissionGate>
  
  <!-- Delete button - only for users who can delete tasks -->
  <PermissionGate action="task_management_delete_task">
    <button
      onclick={onDelete}
      class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      aria-label="Delete task"
    >
      <Icon name="trash-2" class="w-4 h-4" />
    </button>
    
    {#snippet fallback()}
      <!-- Show nothing or a disabled state for users without permission -->
      <span class="text-xs text-gray-500">No delete permission</span>
    {/snippet}
  </PermissionGate>
</div>
