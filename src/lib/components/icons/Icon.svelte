<!-- src/lib/components/icons/Icon.svelte -->
<!--
  @component Icon
  @description Simple icon component that uses the centralized icon library
  @usage <Icon name="user" size={24} class="text-blue-600" />
-->
<script lang="ts">
  import IconLibrary, { type IconName } from './IconLibrary.svelte';
  
  interface Props {
    name: IconName;
    size?: number;
    strokeWidth?: number;
    class?: string;
    color?: string;
  }
  
  let { 
    name, 
    size = 24, 
    strokeWidth = 2, 
    class: className = '',
    color
  }: Props = $props();
</script>

<!-- Just pass through to IconLibrary -->
<IconLibrary {name} {size} {strokeWidth} class={className} {color} />