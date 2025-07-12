<!-- Simple wrapper around TaskCreationModal for calendar usage -->
<script lang="ts">
  import TaskCreationModal from '$lib/components/task/TaskCreationModal.svelte';
  import type { Task } from '$lib/types/task';
  
  interface Props {
    open: boolean;
    date: string;
    time: string;
    task: Task | null;
  }
  
  let { open = $bindable(), date, time, task }: Props = $props();
</script>

<TaskCreationModal 
  bind:open
  {task}
  initialDate={date}
  initialTime={time}
  compact={true}
  title={task ? 'Edit Task' : 'Schedule Task'}
/>
