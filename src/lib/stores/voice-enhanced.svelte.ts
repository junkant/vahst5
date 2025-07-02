// src/lib/stores/voice-enhanced.svelte.ts
import { page } from '$app/stores';
import { VoiceCommandRegistry } from '$lib/voice/commands.registry';
import { VoiceContextManager } from '$lib/voice/context.svelte.ts';
import { useClients } from './client.svelte';
import { useAuth } from './auth.svelte';
import { useToast } from '$lib/stores/toast.svelte';
const toast = useToast();

class VoiceControlStore {
  // State
  isListening = $state(false);
  transcript = $state('');
  error = $state<string | null>(null);
  isSupported = $state(false);
  isSpeaking = $state(false);
  
  // Core services
  private recognition: SpeechRecognition | null = null;
  private synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private audioContext: AudioContext | null = null;
  
  // Registry and context
  private registry = VoiceCommandRegistry.getInstance();
  private contextManager = new VoiceContextManager();
  
  // Store dependencies
  private clients = useClients();
  private auth = useAuth();
  
  constructor() {
    if (typeof window !== 'undefined') {
      // Check for browser support
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.isSupported = !!SpeechRecognition;
      
      if (this.isSupported) {
        this.recognition = new SpeechRecognition();
        this.setupRecognition();
        
        // Only initialize commands if we're in a browser context
        if (typeof document !== 'undefined') {
          this.initializeCommands();
          this.setupContextTracking();
        }
      }
    }
  }
  
  private setupContextTracking() {
    // Track route changes
    $effect(() => {
      const currentPage = page.subscribe(($page) => {
        this.contextManager.updateContext({
          currentRoute: $page.url.pathname
        });
      });
      return currentPage;
    });
    
    // Track client selection
    $effect(() => {
      this.contextManager.updateContext({
        selectedClient: this.clients.selectedClient
      });
    });
    
    // Track user role
    $effect(() => {
      if (this.auth.user) {
        this.contextManager.updateContext({
          userRole: this.auth.user.role || 'user'
        });
      }
    });
  }
  
  private initializeCommands() {
    // Import and register all command modules
    import('$lib/voice/modules/navigation-commands').then(module => {
      module.registerNavigationCommands();
    });
    
    import('$lib/voice/modules/client-commands').then(module => {
      module.registerClientCommands(this.speak.bind(this));
    });
    
    // Register help commands directly
    this.registerHelpCommands();
  }
  
  private registerHelpCommands() {
    // Help command
    this.registry.register({
      id: 'help.general',
      category: 'help',
      patterns: [
        /help|what can you do|show commands|voice commands/i,
        /what can i say|available commands|command list/i
      ],
      handler: async () => {
        const context = this.contextManager.getContext();
        const availableCommands = this.registry.getAvailableCommands(context);
        
        const commandsByCategory = {
          navigation: [] as string[],
          action: [] as string[],
          query: [] as string[]
        };
        
        availableCommands.forEach(cmd => {
          if (cmd.examples.length > 0 && cmd.category in commandsByCategory) {
            commandsByCategory[cmd.category as keyof typeof commandsByCategory].push(cmd.examples[0]);
          }
        });
        
        let helpText = "You can say things like: ";
        
        if (commandsByCategory.navigation.length > 0) {
          helpText += `Navigation: ${commandsByCategory.navigation.slice(0, 3).join(', ')}. `;
        }
        
        if (commandsByCategory.action.length > 0) {
          helpText += `Actions: ${commandsByCategory.action.slice(0, 3).join(', ')}. `;
        }
        
        if (commandsByCategory.query.length > 0) {
          helpText += `Questions: ${commandsByCategory.query.slice(0, 3).join(', ')}. `;
        }
        
        helpText += "Say 'more commands' for the full list.";
        
        this.speak(helpText);
      },
      description: 'Show available voice commands',
      examples: ['Help', 'What can you do', 'Show commands'],
      availableOffline: true
    });
    
    // More commands
    this.registry.register({
      id: 'help.more',
      category: 'help',
      patterns: [/more commands|all commands|full list|show all commands/i],
      handler: async () => {
        const examples = this.registry.getAllExamples();
        const commandList = examples.slice(0, 10).join(', ');
        this.speak(`Here are more commands: ${commandList}`);
        
        // Also show visual list
        toast.info(`Voice Commands:\n${examples.join('\n')}`, {
          duration: 10000
        });
      },
      description: 'Show all available commands',
      examples: ['More commands', 'All commands', 'Full list'],
      availableOffline: true
    });
  }
  
  private setupRecognition() {
    if (!this.recognition) return;
    
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;
    
    this.recognition.onstart = () => {
      console.log('Voice recognition started');
      this.isListening = true;
      this.error = null;
      this.transcript = '';
      this.playActivationSound();
    };
    
    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      this.transcript = finalTranscript || interimTranscript;
      
      if (finalTranscript) {
        this.recognition?.stop();
        this.processCommand(finalTranscript);
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        console.log('No speech detected. Restarting...');
        this.isListening = false;
        setTimeout(() => {
          if (!this.isListening && this.recognition) {
            this.startListening();
          }
        }, 500);
        return;
      }
      
      this.error = this.getErrorMessage(event.error);
      this.isListening = false;
    };
    
    this.recognition.onend = () => {
      console.log('Voice recognition ended');
      this.isListening = false;
    };
  }
  
  private async processCommand(transcript: string) {
    console.log('Processing command:', transcript);
    
    // Update context
    this.contextManager.addToHistory(transcript);
    
    // Find matching command
    const match = this.registry.findMatch(transcript);
    
    if (match) {
      const { command, matches } = match;
      
      // Check permissions
      if (command.requiredPermissions?.length) {
        const hasPermission = await this.checkPermissions(command.requiredPermissions);
        if (!hasPermission) {
          this.speak("You don't have permission for that action");
          return;
        }
      }
      
      // Check offline availability
      if (!navigator.onLine && !command.availableOffline) {
        this.speak('That command requires an internet connection');
        return;
      }
      
      // Execute command
      try {
        const context = this.contextManager.getContext();
        await command.handler(matches, context);
        
        // If handler didn't speak, provide confirmation
        if (!this.isSpeaking && command.category === 'action') {
          this.speak('Done');
        }
      } catch (error) {
        console.error('Command error:', error);
        this.speak('Sorry, something went wrong');
        toast.error('Command failed');
      }
    } else {
      // Try to find similar commands
      const suggestions = this.registry.findSimilarCommands(transcript, 3);
      
      if (suggestions.length > 0) {
        const firstSuggestion = suggestions[0].examples[0];
        this.speak(`Did you mean: ${firstSuggestion}?`);
        
        // Show all suggestions visually
        const allSuggestions = suggestions.map(s => s.examples[0]).join('\n');
        toast.info(`Did you mean:\n${allSuggestions}`, { duration: 5000 });
      } else {
        this.speak("I didn't understand that. Say 'help' for available commands");
      }
    }
  }
  
  private async checkPermissions(permissions: string[]): Promise<boolean> {
    // TODO: Implement actual permission checking based on user role
    // For now, return true
    return true;
  }
  
  speak(text: string) {
    if (!this.synthesis) return;
    
    // Cancel any ongoing speech
    this.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    utterance.onstart = () => {
      this.isSpeaking = true;
    };
    
    utterance.onend = () => {
      this.isSpeaking = false;
    };
    
    this.synthesis.speak(utterance);
  }
  
  startListening() {
    if (!this.isSupported) {
      this.error = 'Voice control is not supported in your browser';
      toast.warning('Voice control requires Chrome, Edge, or Safari');
      return;
    }
    
    if (this.isListening) {
      this.stopListening();
      return;
    }
    
    this.requestMicrophonePermission().then((granted) => {
      if (!granted) {
        this.error = 'Microphone permission denied';
        return;
      }
      
      try {
        this.recognition?.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        this.error = 'Failed to start voice recognition';
      }
    });
  }
  
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }
  
  private async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }
  
  private playActivationSound() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Vahst signature sound
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc2.frequency.setValueAtTime(783.99, now + 0.08); // G5
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      
      osc1.type = 'sine';
      osc2.type = 'triangle';
      
      osc1.start(now);
      osc1.stop(now + 0.12);
      
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
      
      console.log('♪ Vahst activation sound played');
    } catch (error) {
      console.error('Could not play activation sound:', error);
    }
  }
  
  private getErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      'not-allowed': 'Microphone access denied. Please allow microphone access.',
      'network': 'Network error. Please check your connection.',
      'audio-capture': 'No microphone found. Please check your microphone.',
      'aborted': 'Voice recognition stopped.',
      'no-speech': 'No speech detected. Please try again.',
      'service-not-allowed': 'Voice recognition is not allowed. Please use HTTPS.'
    };
    
    return errorMessages[error] || `Voice error: ${error}`;
  }
  
  // Public methods for testing
  testCommand(transcript: string) {
    this.processCommand(transcript);
  }
  
  getAvailableCommands() {
    return this.registry.getAvailableCommands(this.contextManager.getContext());
  }
  
  registerCommand(command: any) {
    this.registry.register(command);
  }
}

// Create singleton instance
let voiceStore: VoiceControlStore | null = null;

export function useVoice() {
  if (!voiceStore) {
    voiceStore = new VoiceControlStore();
  }
  
  return {
    get isListening() { return voiceStore.isListening; },
    get transcript() { return voiceStore.transcript; },
    get error() { return voiceStore.error; },
    get isSupported() { return voiceStore.isSupported; },
    get isSpeaking() { return voiceStore.isSpeaking; },
    startListening: () => voiceStore?.startListening(),
    stopListening: () => voiceStore?.stopListening(),
    speak: (text: string) => voiceStore?.speak(text),
    testCommand: (transcript: string) => voiceStore?.testCommand(transcript),
    getAvailableCommands: () => voiceStore?.getAvailableCommands() || [],
    registerCommand: (command: any) => voiceStore?.registerCommand(command)
  };
}