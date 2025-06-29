// src/lib/voice/init.ts
import { registerNavigationCommands } from './modules/navigation-commands';
import { registerClientCommands } from './modules/client-commands';
import { useVoice } from '$lib/stores/voice-enhanced.svelte';

let initialized = false;

export async function initializeVoiceCommands() {
  if (initialized) return;
  
  console.log('🎤 Initializing voice command system...');
  
  try {
    // Dynamically import to avoid loading for unauthenticated users
    const { useVoice } = await import('$lib/stores/voice-enhanced.svelte');
    const voice = useVoice();
    
    // Register all command modules
    registerNavigationCommands();
    registerClientCommands(voice.speak);
    
    // TODO: Add more command modules as they're created
    // registerJobCommands(voice.speak);
    // registerTaskCommands(voice.speak);
    // registerFinanceCommands(voice.speak);
    
    initialized = true;
    console.log('✅ Voice commands initialized');
    
    // Log available commands in development
    if (import.meta.env.DEV) {
      const commands = voice.getAvailableCommands();
      console.log(`📋 ${commands.length} voice commands registered`);
      console.log('Available commands:', commands.map(c => c.id));
    }
  } catch (error) {
    console.error('Failed to initialize voice commands:', error);
  }
}