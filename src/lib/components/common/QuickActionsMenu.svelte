<!--
  @component QuickActionsMenu
  @description Quick actions popup menu for app navigation
  @usage <QuickActionsMenu bind:show />
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  interface Props {
    show: boolean;
  }
  
  let { show = $bindable(false) }: Props = $props();
  
  const quickActions = [
    { path: '/quick-add', icon: 'plus', label: 'Quick Add' },
    { path: '/clients', icon: 'users', label: 'Clients' },
    { path: '/jobs', icon: 'briefcase', label: 'Jobs' },
    { path: '/more', icon: 'dots', label: 'More' }
  ];
  
  function navigateAndClose(path: string) {
    goto(path);
    show = false;
  }
</script>

{#if show}
  <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
    <div class="p-2">
      {#each quickActions as action}
        <button
          type="button"
          onclick={() => navigateAndClose(action.path)}
          class="w-full px-4 py-3 text-left hover:bg-gray-50 rounded-lg flex items-center space-x-3 cursor-pointer transition-colors"
        >
          <Icon name={action.icon} class="w-5 h-5 text-gray-600" />
          <span class="text-gray-900">{action.label}</span>
        </button>
      {/each}
    </div>
  </div>
{/if}