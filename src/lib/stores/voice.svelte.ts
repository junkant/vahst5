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
  private pendingSpeech: string | null = null;
  private audioContext: AudioContext | null = null;
  
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
    this.recognition.continuous = false; // Changed: Better for Mac
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;
    
    // Add this: Log available audio constraints
    if ('getSupportedConstraints' in navigator.mediaDevices) {
      const supported = navigator.mediaDevices.getSupportedConstraints();
      console.log('Supported audio constraints:', supported);
    }
    
    this.recognition.onstart = () => {
      console.log('Voice recognition started');
      this.isListening = true;
      this.error = null;
      this.transcript = '';
      
      // Play activation sound
      this.playActivationSound();
      
      // Check current audio input
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        console.log('Available microphones:', audioInputs);
        const defaultMic = audioInputs.find(device => device.deviceId === 'default');
        console.log('Default microphone:', defaultMic?.label || 'Not found');
      });
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
      
      // Handle no-speech error differently
      if (event.error === 'no-speech') {
        console.log('No speech detected. Restarting...');
        this.isListening = false;
        // Automatically restart for better UX
        setTimeout(() => {
          if (!this.isListening && this.recognition) {
            console.log('Auto-restarting recognition...');
            this.startListening();
          }
        }, 500);
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
      
      // If there's a pending speech, speak it now
      if (this.pendingSpeech) {
        setTimeout(() => {
          this.speak(this.pendingSpeech!);
          this.pendingSpeech = null;
        }, 100);
      }
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
        this.speak('I can help you navigate Vahst. Try saying: go to my day, show tasks, select a client, or create a new job. What would you like to do?');
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
    this.speak('I didn\'t catch that. Could you try again? You can say "help" if you need assistance.');
  }
  
  private speak(text: string) {
    // If currently listening, save for later
    if (this.isListening) {
      console.log('Would speak:', text);
      this.pendingSpeech = text;
      return;
    }
    
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    
    if (this.synthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get available voices
      const voices = this.synthesis.getVoices();
      
      // Find a female, friendly voice (prioritized list)
      const preferredVoices = [
        'Samantha', // macOS - warm and friendly
        'Microsoft Zira', // Windows - calm and clear
        'Google US English Female', // Chrome - professional
        'Karen', // Australian - friendly
        'Fiona', // Scottish - distinctive but warm
        'Victoria', // UK - professional and calm
      ];
      
      // Try to find one of our preferred voices
      let selectedVoice = null;
      for (const voiceName of preferredVoices) {
        selectedVoice = voices.find(v => v.name.includes(voiceName));
        if (selectedVoice) break;
      }
      
      // Fallback: find any English female voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.lang.startsWith('en') && 
          (v.name.includes('Female') || v.name.includes('female'))
        );
      }
      
      // Apply the voice if found
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Using voice:', selectedVoice.name);
      }
      
      // Calm and friendly voice settings
      utterance.rate = 0.95;    // Slightly slower for calm delivery
      utterance.pitch = 1.05;   // Slightly higher for friendliness
      utterance.volume = 0.75;  // Gentle volume
      
      // Add a subtle pause at the beginning for a more natural feel
      const pausedText = ' ' + text;
      utterance.text = pausedText;
      
      this.synthesis.speak(utterance);
    }
  }
  
  // New method to handle Mac-specific microphone setup
  async requestMicrophoneWithConstraints() {
    try {
      // First, close any existing audio contexts
      if ((window as any).globalAudioContext) {
        (window as any).globalAudioContext.close();
      }
      
      // Request microphone with specific constraints for Mac
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false, // Important for Mac
          noiseSuppression: false, // Let Chrome handle speech detection
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      console.log('✓ Microphone access granted with optimized settings');
      
      // Important: Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('Failed to get microphone access:', error);
      return false;
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
    
    // Add pre-flight check
    console.log('Attempting to start voice recognition...');
    console.log('Recognition object exists:', !!this.recognition);
    console.log('Current URL protocol:', window.location.protocol);
    
    // Mac-specific: Request microphone permission first
    this.requestMicrophoneWithConstraints().then((granted) => {
      if (!granted) {
        this.error = 'Microphone permission denied';
        return;
      }
      
      try {
        this.recognition?.start();
        console.log('start() method called successfully');
      } catch (error: any) {
        console.error('Failed to start recognition:', error);
        
        // More specific error handling
        if (error.message?.includes('already started')) {
          // Try to stop and restart
          this.recognition?.abort();
          setTimeout(() => {
            this.recognition?.start();
          }, 100);
        } else {
          this.error = 'Failed to start voice recognition. Please try again.';
          this.isListening = false;
        }
      }
    });
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
  
  // New diagnostic method to help troubleshoot microphone issues
  async testMicrophone() {
    console.log('=== Microphone Test Started ===');
    console.log('Current URL:', window.location.href);
    console.log('Protocol:', window.location.protocol);
    
    // Test 1: Check if speech recognition is supported
    console.log('Speech Recognition supported:', this.isSupported);
    
    // Test 2: Try to get microphone permission explicitly
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✓ Microphone permission granted');
      console.log('Audio tracks:', stream.getAudioTracks().length);
      
      // Get microphone details
      const track = stream.getAudioTracks()[0];
      const settings = track.getSettings();
      console.log('Microphone:', track.label);
      console.log('Settings:', settings);
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('✗ Microphone permission denied:', error);
      return;
    }
    
    // Test 3: Check speech synthesis (text-to-speech)
    if (this.synthesis) {
      console.log('✓ Speech synthesis available');
      const voices = this.synthesis.getVoices();
      console.log('Available voices:', voices.length);
    }
    
    // Test 4: Try starting recognition
    try {
      this.recognition?.start();
      console.log('✓ Recognition started successfully');
      
      // Stop after 1 second
      setTimeout(() => {
        this.recognition?.stop();
        console.log('Recognition stopped');
      }, 1000);
    } catch (error) {
      console.error('✗ Failed to start recognition:', error);
    }
    
    console.log('=== Microphone Test Complete ===');
  }
  
  // Monitor audio levels to see if microphone is picking up sound
  async monitorAudioLevel() {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);

      javascriptNode.onaudioprocess = () => {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        
        // Calculate average volume
        let values = 0;
        const length = array.length;
        for (let i = 0; i < length; i++) {
          values += array[i];
        }
        const average = values / length;
        
        // Log the audio level
        if (average > 5) {
          console.log('Audio level:', '█'.repeat(Math.floor(average / 5)), average.toFixed(0));
        }
        
        // If we're getting good audio levels but speech recognition isn't working
        if (average > 20 && this.isListening && !this.transcript) {
          console.log('⚠️ Audio detected but speech recognition not responding');
        }
      };
      
      // Stop monitoring after 10 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        console.log('Audio monitoring stopped');
      }, 10000);
      
      console.log('Audio monitoring started - speak now to see levels');
      console.log('Will monitor for 10 seconds...');
    } catch (error) {
      console.error('Error setting up audio monitoring:', error);
    }
  }
  
  // Test method for debugging Mac audio issues
  async testSpeechRecognitionWithDelay() {
    console.log('=== Testing Speech Recognition with Delay ===');
    
    // Step 1: Get mic permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✓ Mic permission granted');
      
      // Keep stream active for a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2: Start recognition while stream is active
      console.log('Starting recognition...');
      this.recognition?.start();
      
      // Step 3: Speak after a delay
      console.log('Ready! Start speaking in 3...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('2...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('1...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('SPEAK NOW!');
      
      // Keep stream active for 5 more seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        console.log('Test complete. Did it work?');
      }, 5000);
      
    } catch (error) {
      console.error('Test failed:', error);
    }
  }
  
  // Create a signature "vahst" sound using Web Audio API
  private playActivationSound() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      
      // Create oscillators for our signature sound
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      // Connect nodes
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Vahst signature sound: warm and welcoming
      // First tone: C5 (523.25 Hz) - warm start
      osc1.frequency.setValueAtTime(523.25, now);
      // Second tone: G5 (783.99 Hz) - friendly lift
      osc2.frequency.setValueAtTime(783.99, now + 0.08);
      
      // Gentler volume envelope for a softer feel
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02); // Softer attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25); // Longer, gentler fade
      
      // Oscillator types for a warm, rounded sound
      osc1.type = 'sine';
      osc2.type = 'triangle'; // Warmer than sine for second tone
      
      // Play the tones with slight overlap for smoothness
      osc1.start(now);
      osc1.stop(now + 0.12);
      
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
      
      console.log('♪ Vahst activation sound played');
    } catch (error) {
      console.error('Could not play activation sound:', error);
    }
  }
  
  // Alternative: Play a completion sound when recognition ends
  private playCompletionSound() {
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
      
      // Single descending tone for completion
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
      
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc.type = 'sine';
      osc.start(now);
      osc.stop(now + 0.15);
      
    } catch (error) {
      console.error('Could not play completion sound:', error);
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
    stopListening: () => voiceStore?.stopListening(),
    testMicrophone: () => voiceStore?.testMicrophone(),
    monitorAudioLevel: () => voiceStore?.monitorAudioLevel(),
    testSpeechRecognitionWithDelay: () => voiceStore?.testSpeechRecognitionWithDelay()
  };
}