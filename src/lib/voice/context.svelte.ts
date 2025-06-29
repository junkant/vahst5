// src/lib/voice/context.svelte.ts
import type { VoiceContext } from './commands.registry';

export class VoiceContextManager {
  private context = $state<VoiceContext>({
    currentRoute: '/',
    selectedClient: null,
    selectedJob: null,
    userRole: 'user',
    isOnline: true,
    lastCommand: null,
    conversationHistory: []
  });
  
  constructor() {
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.updateContext({ isOnline: true }));
      window.addEventListener('offline', () => this.updateContext({ isOnline: false }));
    }
  }
  
  updateContext(updates: Partial<VoiceContext>) {
    this.context = { ...this.context, ...updates };
    console.log('Voice context updated:', updates);
  }
  
  getContext(): VoiceContext {
    return this.context;
  }
  
  addToHistory(command: string) {
    const history = [...this.context.conversationHistory, command];
    // Keep only last 10 commands
    if (history.length > 10) {
      history.shift();
    }
    this.updateContext({
      lastCommand: command,
      conversationHistory: history
    });
  }
  
  clearHistory() {
    this.updateContext({
      lastCommand: null,
      conversationHistory: []
    });
  }
  
  // Helper to check if we're in a specific context
  isInContext(contextType: 'client' | 'job' | 'finance' | 'settings'): boolean {
    const route = this.context.currentRoute;
    switch (contextType) {
      case 'client':
        return route.includes('client') || this.context.selectedClient !== null;
      case 'job':
        return route.includes('job') || this.context.selectedJob !== null;
      case 'finance':
        return route.includes('money') || route.includes('invoice') || route.includes('quote');
      case 'settings':
        return route.includes('settings');
      default:
        return false;
    }
  }
}