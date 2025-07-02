<script context="module" lang="ts">
  export const icons = {
    // Navigation
    close: 'M6 18L18 6M6 6l12 12',
    chevronDown: 'M19 9l-7 7-7-7',
    chevronUp: 'M5 15l7-7 7 7',
    chevronLeft: 'M15 19l-7-7 7-7',
    chevronRight: 'M9 5l7 7-7 7',
    menu: 'M4 6h16M4 12h16M4 18h16',
    
    // Actions
    plus: 'M12 4v16m8-8H4',
    edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    save: 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4',
    
    // Status
    check: 'M5 13l4 4L19 7',
    x: 'M6 18L18 6M6 6l12 12',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    
    // Objects
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    
    // Lightning for voice
    lightning: 'M13 10V3L4 14h7v7l9-11h-7z',
    microphone: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4m-4 0h8'
  };
</script>

<!-- Usage example component -->
<script lang="ts">
  export let name: keyof typeof icons;
  export let size: number = 24;
  export let strokeWidth: number = 2;
  export let className: string = '';
</script>

<svg 
  width={size} 
  height={size} 
  fill="none" 
  stroke="currentColor" 
  stroke-width={strokeWidth}
  stroke-linecap="round" 
  stroke-linejoin="round"
  viewBox="0 0 24 24"
  class={className}
>
  <path d={icons[name]} />
</svg>