// src/lib/voice/modules/navigation-commands.ts
import { goto } from '$app/navigation';
import { VoiceCommandRegistry } from '../commands.registry';

export function registerNavigationCommands() {
  const registry = VoiceCommandRegistry.getInstance();
  
  // My Day navigation
  registry.register({
    id: 'nav.my-day',
    category: 'navigation',
    patterns: [
      /go to my day|show my day|my day|today|what's today/i,
      /show today's schedule|today's tasks/i
    ],
    handler: async () => {
      await goto('/my-day');
    },
    description: 'Navigate to My Day dashboard',
    examples: ['Go to my day', 'Show my day', "What's today"],
    availableOffline: true
  });
  
  // Clients navigation
  registry.register({
    id: 'nav.clients',
    category: 'navigation',
    patterns: [
      /show clients|go to clients|clients|client list/i,
      /show all clients|view clients/i
    ],
    handler: async () => {
      await goto('/clients');
    },
    description: 'Navigate to Clients list',
    examples: ['Show clients', 'Go to clients', 'Client list'],
    availableOffline: true
  });
  
  // Tasks navigation
  registry.register({
    id: 'nav.tasks',
    category: 'navigation',
    patterns: [
      /show tasks|go to tasks|tasks|task list/i,
      /show all tasks|view tasks|my tasks/i
    ],
    handler: async () => {
      await goto('/tasks');
    },
    description: 'Navigate to Tasks',
    examples: ['Show tasks', 'Go to tasks', 'My tasks'],
    availableOffline: true
  });
  
  // Money/Finance navigation
  registry.register({
    id: 'nav.money',
    category: 'navigation',
    patterns: [
      /show money|go to money|money|finances|financial/i,
      /show finances|view finances|financial dashboard/i
    ],
    handler: async () => {
      await goto('/money');
    },
    description: 'Navigate to Financial section',
    examples: ['Show money', 'Go to finances', 'Financial dashboard'],
    availableOffline: true
  });
  
  // Settings navigation
  registry.register({
    id: 'nav.settings',
    category: 'navigation',
    patterns: [
      /show settings|go to settings|settings|preferences/i,
      /open settings|view settings/i
    ],
    handler: async () => {
      await goto('/settings');
    },
    description: 'Navigate to Settings',
    examples: ['Show settings', 'Go to settings', 'Preferences'],
    availableOffline: true
  });
  
  // Go back
  registry.register({
    id: 'nav.back',
    category: 'navigation',
    patterns: [
      /go back|back|previous|previous page/i,
      /take me back|return/i
    ],
    handler: async () => {
      window.history.back();
    },
    description: 'Go back to previous page',
    examples: ['Go back', 'Previous page', 'Return'],
    availableOffline: true
  });
  
  // Go home
  registry.register({
    id: 'nav.home',
    category: 'navigation',
    patterns: [
      /go home|home|dashboard|main page/i,
      /take me home|back to home/i
    ],
    handler: async () => {
      await goto('/');
    },
    description: 'Go to home page',
    examples: ['Go home', 'Dashboard', 'Main page'],
    availableOffline: true
  });
}