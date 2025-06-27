// src/lib/stores/voice.svelte.ts
import { goto } from '$app/navigation';
import { useClients } from './client.svelte';

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
  
  constructor() {
    if (typeof window !== 'undefined') {
      // Check for browser support - Chrome uses webkitSpeechRecognition
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
    
    // Adjust settings for better detection
    this.recognition.continuous = true; // Keep listening
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;
    
    this.recognition.onstart = () => {
      console.log('Voice recognition started');
      this.isListening = true;
      this.error = null;
      this.transcript = '';
    };
    
    this.recognition.onaudiostart = () => {
      console.log('Audio capture started');
    };
    
    this.recognition.onsoundstart = () => {
      console.log('Sound detected');
    };
    
    this.recognition.onspeechstart = () => {
      console.log('Speech detected');
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
      console.log('Transcript:', this.transcript, 'Final:', !!finalTranscript);
      
      if (finalTranscript) {
        // Stop recognition after getting final result
        this.recognition?.stop();
        this.processCommand(finalTranscript);
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      // Ignore no-speech errors when continuous mode is on
      if (event.error === 'no-speech') {
        console.log('No speech detected, still listening...');
        return;
      }
      
      this.error = `Error: ${event.error}`;
      this.isListening = false;
      
      // More specific error messages
      if (event.error === 'not-allowed') {
        this.error = 'Microphone access denied. Please allow microphone access.';
      } else if (event.error === 'network') {
        this.error = 'Network error. Please check your connection.';
      } else if (event.error === 'audio-capture') {
        this.error = 'No microphone found. Please check your microphone.';
      } else if (event.error === 'aborted') {
        // User stopped, no error needed
        this.error = null;
      }
    };
    
    this.recognition.onend = () => {
      console.log('Voice recognition ended');
      this.isListening = false;
    };
    
    this.recognition.onnomatch = () => {
      console.log('No match found');
      this.error = 'Could not understand. Please try again.';
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
    {
      patterns: [/clear client|deselect client|no client/i],
      action: () => {
        this.clients.clearSelection();
        this.speak('Client selection cleared');
      },
      description: 'Clear client selection'
    },
    
    // Quick actions
    {
      patterns: [/new job|create job|start job/i],
      action: () => {
        if (this.clients.selectedClient) {
          // TODO: Navigate to new job creation
          this.speak(`Creating new job for ${this.clients.selectedClient.name}`);
        } else {
          this.speak('Please select a client first');
        }
      },
      description: 'Create new job'
    },
    {
      patterns: [/new invoice|create invoice/i],
      action: () => {
        if (this.clients.selectedClient) {
          // TODO: Navigate to invoice creation
          this.speak(`Creating invoice for ${this.clients.selectedClient.name}`);
        } else {
          this.speak('Please select a client first');
        }
      },
      description: 'Create new invoice'
    },
    
    // Information queries
    {
      patterns: [/what client|which client|current client/i],
      action: () => {
        if (this.clients.selectedClient) {
          this.speak(`Currently working with ${this.clients.selectedClient.name}`);
        } else {
          this.speak('No client selected');
        }
      },
      description: 'Get current client'
    },
    {
      patterns: [/help|what can you do|commands/i],
      action: () => {
        this.speak('You can say: go to my day, show tasks, select client, new job, or ask what client is selected');
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
    this.speak('Sorry, I didn\'t understand that command. Say help for available commands.');
  }
  
  private speak(text: string) {
    // Skip speech synthesis during recognition to avoid conflicts
    if (this.isListening) {
      console.log('Would speak:', text);
      return;
    }
    
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    
    if (this.synthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      this.synthesis.speak(utterance);
    }
  }
  
  startListening() {
    if (!this.isSupported) {
      this.error = 'Voice control is not supported in your browser';
      alert('Voice control is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    
    if (this.isListening) {
      this.stopListening();
      return;
    }
    
    // Clear previous state
    this.transcript = '';
    this.error = null;
    
    try {
      this.recognition?.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      this.error = 'Failed to start voice recognition. Please try again.';
      this.isListening = false;
    }
  }
  
  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.abort(); // Use abort instead of stop for immediate termination
        this.isListening = false;
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
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
    stopListening: () => voiceStore?.stopListening()
  };
}