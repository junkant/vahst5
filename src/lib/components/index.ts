// src/lib/components/index.ts
// Common Components
export { default as BottomNav } from './common/BottomNav.svelte';
export { default as TopBar } from './common/TopBar.svelte';
export { default as LandingHeader } from './common/LandingHeader.svelte';
export { default as Toaster } from './common/Toaster.svelte';
export { default as OfflineIndicator } from './common/OfflineIndicator.svelte';
export { default as PwaInstallPrompt } from './common/PwaInstallPrompt.svelte';

// Auth Components
export { default as LoginForm } from './auth/LoginForm.svelte';
export { default as RegisterForm } from './auth/RegisterForm.svelte';

// Client Components
export { default as ClientDetail } from './client/ClientDetail.svelte';
export { default as ClientSelector } from './client/ClientSelector.svelte';
export { default as NewClientForm } from './client/NewClientForm.svelte';

// Settings Components
export { default as NotificationPrompt } from './notifications/NotificationPrompt.svelte';

// Export lazy loading helpers
export const lazyComponents = {
  ClientDetail: () => import('./client/ClientDetail.svelte'),
  NewClientForm: () => import('./client/NewClientForm.svelte'),
  ClientSelector: () => import('./client/ClientSelector.svelte'),
};