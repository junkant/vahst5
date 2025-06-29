// src/lib/voice/modules/client-commands.ts
import { goto } from '$app/navigation';
import { VoiceCommandRegistry } from '../commands.registry';
import { useClients } from '$lib/stores/client.svelte';
import { toast } from '$lib/utils/toast';

export function registerClientCommands(speak: (text: string) => void) {
  const registry = VoiceCommandRegistry.getInstance();
  const clients = useClients();
  
  // Select client by name
  registry.register({
    id: 'client.select',
    category: 'action',
    patterns: [
      /select client (.+)|choose client (.+)|switch to (.+) client/i,
      /work with (.+)|client (.+)|pick client (.+)/i,
      /set client to (.+)|change client to (.+)/i
    ],
    handler: async (matches) => {
      const clientName = matches?.[1] || matches?.[2] || matches?.[3];
      if (!clientName) {
        speak('Please specify a client name');
        return;
      }
      
      // Search for client
      const searchTerm = clientName.toLowerCase();
      const client = clients.clients.find(c => 
        c.name.toLowerCase().includes(searchTerm)
      );
      
      if (client) {
        clients.selectClient(client);
        speak(`Selected ${client.name}`);
        toast.success(`Working with ${client.name}`);
      } else {
        speak(`Could not find client ${clientName}`);
        // Suggest similar clients
        const similar = clients.clients
          .filter(c => c.name.toLowerCase().includes(searchTerm.slice(0, 3)))
          .slice(0, 3);
        
        if (similar.length > 0) {
          const suggestions = similar.map(c => c.name).join(', ');
          speak(`Did you mean: ${suggestions}?`);
        }
      }
    },
    description: 'Select a client by name',
    examples: [
      'Select client John Smith',
      'Switch to ABC Company client',
      'Work with Johnson family'
    ],
    requiredPermissions: ['clients.read'],
    availableOffline: true
  });
  
  // Create new client
  registry.register({
    id: 'client.create',
    category: 'action',
    patterns: [
      /create client (.+)|new client (.+)|add client (.+)/i,
      /create new client (.+)|add new client (.+)/i
    ],
    handler: async (matches) => {
      const clientName = matches?.[1];
      if (!clientName) {
        speak('Please specify a client name');
        return;
      }
      
      // Navigate to new client form with pre-filled name
      await goto(`/clients/new?name=${encodeURIComponent(clientName)}`);
      speak(`Creating new client: ${clientName}`);
    },
    description: 'Create a new client',
    examples: [
      'Create client Jane Doe',
      'New client ABC Company',
      'Add client Smith Family'
    ],
    requiredPermissions: ['clients.create'],
    availableOffline: false
  });
  
  // Show client details
  registry.register({
    id: 'client.details',
    category: 'action',
    patterns: [
      /show client details|client details|show current client/i,
      /who is my client|current client|selected client/i
    ],
    handler: async (_, context) => {
      if (!context?.selectedClient) {
        speak('No client selected. Please select a client first');
        return;
      }
      
      const client = context.selectedClient;
      speak(`Current client is ${client.name}. ${client.phone ? `Phone: ${client.phone}` : ''}`);
      
      // Open client detail modal
      window.dispatchEvent(new CustomEvent('openClientDetail', { 
        detail: { client } 
      }));
    },
    description: 'Show details of selected client',
    examples: [
      'Show client details',
      'Who is my client',
      'Current client'
    ],
    availableOffline: true
  });
  
  // Search clients
  registry.register({
    id: 'client.search',
    category: 'query',
    patterns: [
      /search clients? for (.+)|find clients? (.+)|look up clients? (.+)/i,
      /search (.+) in clients|find (.+) client/i
    ],
    handler: async (matches) => {
      const searchTerm = matches?.[1] || matches?.[2] || matches?.[3];
      if (!searchTerm) {
        speak('What would you like to search for?');
        return;
      }
      
      await goto(`/clients?search=${encodeURIComponent(searchTerm)}`);
      speak(`Searching clients for ${searchTerm}`);
    },
    description: 'Search for clients',
    examples: [
      'Search clients for Smith',
      'Find clients Johnson',
      'Look up clients in Springfield'
    ],
    availableOffline: true
  });
  
  // Recent clients
  registry.register({
    id: 'client.recent',
    category: 'query',
    patterns: [
      /show recent clients|recent clients|last clients/i,
      /who were my recent clients|show last clients/i
    ],
    handler: async () => {
      const recent = clients.recentClients.slice(0, 3);
      if (recent.length === 0) {
        speak('No recent clients');
        return;
      }
      
      const names = recent.map(c => c.name).join(', ');
      speak(`Recent clients: ${names}`);
    },
    description: 'Show recent clients',
    examples: [
      'Show recent clients',
      'Recent clients',
      'Who were my recent clients'
    ],
    availableOffline: true
  });
  
  // Clear client selection
  registry.register({
    id: 'client.clear',
    category: 'action',
    patterns: [
      /clear client|deselect client|remove client selection/i,
      /no client|unselect client/i
    ],
    handler: async () => {
      clients.selectClient(null);
      speak('Client selection cleared');
    },
    description: 'Clear selected client',
    examples: [
      'Clear client',
      'Deselect client',
      'No client'
    ],
    availableOffline: true
  });
}