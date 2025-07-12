<!-- src/lib/components/shared/ThemeToggle.svelte -->
<script lang="ts">
  import { useUI } from '$lib/stores/ui.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  interface Props {
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }
  
  let { showLabel = false, size = 'md' }: Props = $props();
  
  const ui = useUI();
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };
  
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  const themes = [
    { value: 'light', icon: 'sun', label: 'Light' },
    { value: 'dark', icon: 'moon', label: 'Dark' },
    { value: 'system', icon: 'computer', label: 'System' }
  ] as const;
  
  function getThemeIcon(theme: string): string {
    if (theme === 'system') {
      return ui.systemTheme === 'dark' ? 'moon' : 'sun';
    }
    return theme === 'dark' ? 'moon' : 'sun';
  }
  
  function getNextTheme(): string {
    const themeOrder = ['light', 'dark', 'system'];
    const currentIndex = themeOrder.indexOf(ui.theme);
    return themeOrder[(currentIndex + 1) % themeOrder.length];
  }
</script>

<div class="flex items-center gap-2">
  {#if showLabel}
    <!-- Segmented Control Style -->
    <div class="inline-flex rounded-lg bg-gray-100 dark:bg-gray-700/50 p-1">
      {#each themes as theme}
        <button
          onclick={() => ui.setTheme(theme.value)}
          class="relative px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200
                 {ui.theme === theme.value 
                   ? 'text-gray-900 dark:text-gray-100' 
                   : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}"
          aria-label="Set {theme.label} theme"
          aria-pressed={ui.theme === theme.value}
        >
          {#if ui.theme === theme.value}
            <div class="absolute inset-0 bg-white dark:bg-gray-600 rounded-md shadow-sm" 
                 transition:scale={{ duration: 200 }}></div>
          {/if}
          <span class="relative flex items-center gap-1.5">
            <Icon name={theme.icon} class={iconSizes[size]} />
            {theme.label}
          </span>
        </button>
      {/each}
    </div>
  {:else}
    <!-- Icon Button Style -->
    <button
      onclick={() => ui.cycleTheme()}
      class="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 
             hover:text-gray-700 dark:hover:text-gray-200
             hover:bg-gray-100 dark:hover:bg-gray-700/50
             transition-all duration-200 group"
      aria-label="Toggle theme (current: {ui.theme})"
      title={`Switch to ${getNextTheme()} theme`}
    >
      <!-- Background effect on hover -->
      <div class="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/0 to-purple-500/0 
                  group-hover:from-blue-500/10 group-hover:to-purple-500/10 
                  dark:group-hover:from-blue-400/20 dark:group-hover:to-purple-400/20
                  transition-all duration-300"></div>
      
      <!-- Icon with rotation animation -->
      <div class="relative {sizeClasses[size]} flex items-center justify-center">
        {#key ui.theme}
          <div class="absolute inset-0 flex items-center justify-center animate-theme-switch">
            <Icon name={getThemeIcon(ui.theme)} class={iconSizes[size]} />
          </div>
        {/key}
      </div>
      
      <!-- Tooltip -->
      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs 
                  bg-gray-900 dark:bg-gray-700 text-white rounded opacity-0 
                  group-hover:opacity-100 pointer-events-none transition-opacity duration-200
                  whitespace-nowrap">
        {#if ui.theme === 'system'}
          System ({ui.systemTheme})
        {:else}
          {ui.theme.charAt(0).toUpperCase() + ui.theme.slice(1)}
        {/if}
      </div>
    </button>
  {/if}
  
  {#if !showLabel}
    <!-- Keyboard shortcut hint -->
    <div class="hidden lg:flex items-center text-xs text-gray-400 dark:text-gray-500">
      <kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[10px]">
        {navigator?.platform?.includes('Mac') ? '⌘' : 'Ctrl'}
      </kbd>
      <span class="mx-1">+</span>
      <kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[10px]">
        ⇧
      </kbd>
      <span class="mx-1">+</span>
      <kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[10px]">
        D
      </kbd>
    </div>
  {/if}
</div>

<style>
  @keyframes theme-switch {
    0% {
      transform: scale(0) rotate(-180deg);
      opacity: 0;
    }
    50% {
      transform: scale(1.1) rotate(-90deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }
  
  .animate-theme-switch {
    animation: theme-switch 0.3s ease-out;
  }
</style>
