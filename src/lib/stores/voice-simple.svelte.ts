// src/lib/stores/voice-simple.svelte.ts
import { goto } from '$app/navigation';
import { useClients } from './client.svelte';
import { toast } from '$lib/utils/toast';

interface VoiceCommand {
  patterns: RegExp[];
  action: (matches?: RegExpMatchArray) => void;
  description: string;
}

class VoiceControlStore {
  isListening = $state(false);
  transcript = $state('');
  error = $state<string | null>(null);
  isSupported = $state(false);
  
  private recognition: SpeechRecognition | null = null;
  private synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private clients = useClients();
  private audioContext: AudioContext | null = null;
  
  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.isSupported = !!SpeechRecognition;
      
      if (this.isSupported) {
        this.recognition = new SpeechRecognition();
        this.setupRecognition();
      }
    }
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
        this.isListening = false;
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
  
  private commands: VoiceCommand[] = [
    // Navigation commands
    {
      patterns: [/go to my day|show my day|my day/i],
      action: () => {
        goto('/my-day');
        this.speak('Going to My Day');
      },
      description: 'Navigate to My Day'
    },
    {
      patterns: [/show tasks|go to tasks|tasks/i],
      action: () => {
        goto('/tasks');
        this.speak('Showing tasks');
      },
      description: 'Navigate to Tasks'
    },
    {
      patterns: [/show money|go to money|money|finances/i],
      action: () => {
        goto('/money');
        this.speak('Opening financial section');
      },
      description: 'Navigate to Money'
    },
    {
      patterns: [/show clients|go to clients|clients/i],
      action: () => {
        goto('/clients');
        this.speak('Showing clients');
      },
      description: 'Navigate to Clients'
    },
    
    // Client selection
    {
      patterns: [/select client (.+)|choose client (.+)|client (.+)/i],
      action: (matches) => {
        const clientName = matches?.[1] || matches?.[2] || matches?.[3];
        if (clientName) {
          const client = this.findClientByName(clientName);
          if (client) {
            this.clients.selectClient(client);
            this.speak(`Selected ${client.name}`);
          } else {
            this.speak(`Could not find client ${clientName}`);
          }
        }
      },
      description: 'Select a client by name'
    },
    
    // Help
    {
      patterns: [/help|what can you do|commands/i],
      action: () => {
        this.speak('I can help you navigate. Try saying: go to my day, show tasks, show clients, or select a client by name.');
      },
      description: 'Show help'
    }
  ];
  
  private findClientByName(name: string): any {
    const searchTerm = name.toLowerCase();
    return this.clients.clients.find(client => 
      client.name.toLowerCase().includes(searchTerm)
    );
  }
  
  private processCommand(transcript: string) {
    console.log('Processing command:', transcript);
    
    for (const command of this.commands) {
      for (const pattern of command.patterns) {
        const matches = transcript.match(pattern);
        if (matches) {
          command.action(matches);
          return;
        }
      }
    }
    
    // No command matched
    this.speak("I didn't catch that. Try saying help for available commands.");
  }
  
  speak(text: string) {
    if (!this.synthesis) return;
    
    this.synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    this.synthesis.speak(utterance);
  }
  
  async startListening() {
    if (!this.isSupported) {
      this.error = 'Voice control is not supported in your browser';
      toast.warning('Voice control requires Chrome, Edge, or Safari');
      return;
    }
    
    if (this.isListening) {
      this.stopListening();
      return;
    }
    
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true
        }
      });
      
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      // Start recognition
      this.recognition?.start();
    } catch (error) {
      console.error('Microphone permission denied:', error);
      this.error = 'Microphone permission denied';
    }
  }
  
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }
  
  private playActivationSound() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(523.25, now);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc.type = 'sine';
      osc.start(now);
      osc.stop(now + 0.15);
      
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
      'no-speech': 'No speech detected. Please try again.'
    };
    
    return errorMessages[error] || `Voice error: ${error}`;
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
    startListening: () => voiceStore?.startListening(),
    stopListening: () => voiceStore?.stopListening(),
    speak: (text: string) => voiceStore?.speak(text)
  };
}