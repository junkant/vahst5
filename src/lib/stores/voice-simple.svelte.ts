// src/lib/stores/voice-simple.svelte.ts
import { goto } from '$app/navigation';
import { useClients } from './client.svelte';
import { useAuth } from './auth.svelte'; 
import { useToast } from '$lib/stores/toast.svelte';
import { scheduledTasks, type ScheduledTask } from './calendar.svelte';
import { get } from 'svelte/store';
const toast = useToast();

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
  private auth = useAuth();  // ADD THIS LINE
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
  
  // HELPER METHOD: Check if user has selected a tenant
  private checkTenantContext(): boolean {
    if (!this.auth.tenant) {
      this.speak('Please select a business first from your profile settings');
      return false;
    }
    return true;
  }
  
  // HELPER METHOD: Get current tenant name for feedback
  private getTenantName(): string {
    return this.auth.tenant?.name || 'current business';
  }
  
  // Parse natural language date/time
  private parseDateTime(dateStr: string, timeStr: string): { date: string; time: string } | null {
    const today = new Date();
    let targetDate = today;
    
    // Parse relative dates
    if (dateStr.includes('today')) {
      targetDate = today;
    } else if (dateStr.includes('tomorrow')) {
      targetDate = new Date(today);
      targetDate.setDate(today.getDate() + 1);
    } else if (dateStr.includes('monday') || dateStr.includes('tuesday') || 
               dateStr.includes('wednesday') || dateStr.includes('thursday') || 
               dateStr.includes('friday') || dateStr.includes('saturday') || 
               dateStr.includes('sunday')) {
      // Find next occurrence of the day
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.findIndex(day => dateStr.toLowerCase().includes(day));
      const currentDay = today.getDay();
      
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      
      targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysToAdd);
    }
    
    // Parse time
    let hours = 0;
    let minutes = 0;
    
    // Match patterns like "2pm", "2:30pm", "14:30"
    const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const isPM = timeMatch[3]?.toLowerCase() === 'pm';
      
      if (timeMatch[3]) { // 12-hour format
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
      }
    }
    
    const dateISO = targetDate.toISOString().split('T')[0];
    const timeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    return { date: dateISO, time: timeFormatted };
  }
  
  private commands: VoiceCommand[] = [
    // Navigation commands
    {
      patterns: [/go to my day|show my day|my day/i],
      action: () => {
        if (!this.checkTenantContext()) return;
        goto('/my-day');
        this.speak(`Going to My Day for ${this.getTenantName()}`);
      },
      description: 'Navigate to My Day'
    },
    {
      patterns: [/show tasks|go to tasks|tasks/i],
      action: () => {
        if (!this.checkTenantContext()) return;
        goto('/tasks');
        this.speak(`Showing tasks for ${this.getTenantName()}`);
      },
      description: 'Navigate to Tasks'
    },
    {
      patterns: [/show money|go to money|money|finances/i],
      action: () => {
        if (!this.checkTenantContext()) return;
        goto('/money');
        this.speak(`Opening finances for ${this.getTenantName()}`);
      },
      description: 'Navigate to Money'
    },
    {
      patterns: [/show clients|go to clients|clients/i],
      action: () => {
        if (!this.checkTenantContext()) return;
        goto('/clients');
        this.speak(`Showing clients for ${this.getTenantName()}`);
      },
      description: 'Navigate to Clients'
    },
    
    // Client selection (tenant-aware)
    {
      patterns: [/select client (.+)|choose client (.+)|client (.+)/i],
      action: (matches) => {
        if (!this.checkTenantContext()) return;
        
        const clientName = matches?.[1] || matches?.[2] || matches?.[3];
        if (clientName) {
          const client = this.findClientByName(clientName);
          if (client) {
            this.clients.selectClient(client);
            this.speak(`Selected ${client.name} in ${this.getTenantName()}`);
          } else {
            this.speak(`Could not find client ${clientName} in ${this.getTenantName()}`);
          }
        }
      },
      description: 'Select a client by name'
    },
    
    // NEW: Business context commands
    {
      patterns: [/which business|what business|current business|which tenant|what tenant/i],
      action: () => {
        if (!this.auth.tenant) {
          this.speak('No business is currently selected. Please go to your profile to select a business.');
          return;
        }
        this.speak(`You are currently working with ${this.auth.tenant.name}`);
      },
      description: 'Get current business name'
    },
    
    // NEW: Find client command (tenant-scoped)
    {
      patterns: [/find client (.+)|search for client (.+)|look for client (.+)/i],
      action: (matches) => {
        if (!this.checkTenantContext()) return;
        
        const clientName = matches?.[1];
        if (clientName) {
          // Navigate to clients page with search query
          goto(`/clients?search=${encodeURIComponent(clientName)}`);
          this.speak(`Searching for ${clientName} in ${this.getTenantName()}`);
        }
      },
      description: 'Search for a client by name'
    },
    
    // Calendar commands
    {
      patterns: [/show calendar|open calendar|go to calendar|calendar/i],
      action: () => {
        if (!this.checkTenantContext()) return;
        goto('/calendar');
        this.speak(`Opening calendar for ${this.getTenantName()}`);
      },
      description: 'Navigate to calendar'
    },
    {
      patterns: [/show week view|week view|weekly view/i],
      action: () => {
        if (!this.checkTenantContext()) return;
        goto('/calendar?view=week');
        this.speak('Showing week view');
      },
      description: 'Show calendar week view'
    },
    {
      patterns: [/show day view|day view|daily view|today's schedule/i],
      action: () => {
        if (!this.checkTenantContext()) return;
        goto('/calendar?view=day');
        this.speak('Showing today\'s schedule');
      },
      description: 'Show calendar day view'
    },
    {
      patterns: [/schedule (.+) (?:on|for) (.+) at (.+)/i],
      action: (matches) => {
        if (!this.checkTenantContext()) return;
        if (!matches) return;
        
        const taskTitle = matches[1];
        const dateStr = matches[2];
        const timeStr = matches[3];
        
        const parsed = this.parseDateTime(dateStr, timeStr);
        if (!parsed) {
          this.speak("I couldn't understand that date and time. Try saying something like 'schedule oil change tomorrow at 2pm'");
          return;
        }
        
        // Create a new scheduled task
        const newTask: ScheduledTask = {
          id: crypto.randomUUID(),
          title: taskTitle,
          completed: false,
          createdAt: Date.now(),
          scheduledDate: parsed.date,
          scheduledTime: parsed.time,
          duration: 60, // Default 1 hour
          priority: 'medium',
          tags: ['scheduled'],
          tenantId: this.auth.tenant?.id
        };
        
        // Add to scheduled tasks
        scheduledTasks.update(tasks => [...tasks, newTask]);
        
        // Navigate to the calendar on that date
        goto(`/calendar?view=day&date=${parsed.date}`);
        
        this.speak(`Scheduled ${taskTitle} for ${parsed.date} at ${parsed.time}`);
      },
      description: 'Schedule a task'
    },
    {
      patterns: [/what's scheduled (?:for|on) (.+)|what do I have (.+)|show schedule (?:for|on) (.+)/i],
      action: (matches) => {
        if (!this.checkTenantContext()) return;
        const dateStr = matches?.[1] || matches?.[2] || matches?.[3];
        if (!dateStr) return;
        
        const parsed = this.parseDateTime(dateStr, '');
        if (!parsed) return;
        
        goto(`/calendar?view=day&date=${parsed.date}`);
        this.speak(`Showing schedule for ${dateStr}`);
      },
      description: 'Show schedule for a specific day'
    },
    {
      patterns: [/business hours|business settings|schedule settings/i],
      action: () => {
        if (!this.checkTenantContext()) return;
        goto('/settings/business');
        this.speak('Opening business settings');
      },
      description: 'Open business settings'
    },
    
    // Help (updated with tenant context)
    {
      patterns: [/help|what can you do|commands/i],
      action: () => {
        const businessContext = this.auth.tenant 
          ? ` for ${this.auth.tenant.name}` 
          : '. Please select a business first from your profile for full functionality';
        
        this.speak(`I can help you navigate${businessContext}. Try saying: go to my day, show tasks, show clients, show calendar, schedule a task, or select a client by name.`);
      },
      description: 'Show help'
    }
  ];
  
  private findClientByName(name: string): any {
    const searchTerm = name.toLowerCase();
    
    // UPDATED: Only search within current tenant's clients
    const tenantClients = this.clients.clients.filter(client => 
      client.tenantId === this.auth.tenant?.id
    );
    
    return tenantClients.find(client => 
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
    
    // No command matched - provide context-aware error message
    const helpMessage = this.auth.tenant 
      ? `I didn't catch that. Try saying help for available commands in ${this.auth.tenant.name}.`
      : "I didn't catch that. Please select a business first from your profile, then try saying help for available commands.";
    
    this.speak(helpMessage);
  }
  
  startListening() {
    if (!this.isSupported) {
      this.error = 'Voice recognition not supported';
      return;
    }
    
    if (!this.recognition) {
      this.error = 'Voice recognition not initialized';
      return;
    }
    
    if (this.isListening) {
      return;
    }
    
    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      this.error = 'Failed to start voice recognition';
    }
  }
  
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }
  
  speak(text: string) {
    if (!this.synthesis || !text) return;
    
    // Cancel any ongoing speech
    this.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    this.synthesis.speak(utterance);
  }
  
  private playActivationSound() {
    if (!this.audioContext) {
      try {
        this.audioContext = new AudioContext();
      } catch (e) {
        console.warn('AudioContext not supported');
        return;
      }
    }
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }
  
  private getErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      'not-allowed': 'Voice access denied. Please allow microphone access.',
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