// Main component exports organized by feature

// Auth Components
export * from './auth';

// Client Components
export * from './client';

// Task Components  
export * from './task';

// Team Components
export * from './team';

// Common UI Components
export * from './common';

// Layout Components
export * from './layout';

// Settings Components
export * from './settings';

// Notification Components
export * from './notifications';

// Invite Components
export * from './invites';

// Icon Components
export * from './icons';

// Tenant Components
export * from './tenant';

// Lazy loading helpers for code splitting
export const lazyComponents = {
  // Client components
  ClientDetail: () => import('./client/ClientDetail.svelte'),
  NewClientForm: () => import('./client/NewClientForm.svelte'),
  ClientSelector: () => import('./client/ClientSelector.svelte'),
  
  // Task components
  TaskDetail: () => import('./task/TaskDetail.svelte'),
  PhotoUpload: () => import('./task/PhotoUpload.svelte'),
  
  // Settings components
  StorageSettings: () => import('./settings/StorageSettings.svelte'),
  NotificationSettings: () => import('./settings/NotificationSettings.svelte'),
  
  // Invite components
  CreateInviteModal: () => import('./invites/CreateInviteModal.svelte'),
  BulkInviteModal: () => import('./invites/BulkInviteModal.svelte'),
};