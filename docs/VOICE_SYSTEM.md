# Voice System Documentation - Vahst V5

## Overview

Vahst includes an advanced voice control system that enables hands-free navigation and task management. Built on the Web Speech API with plans for TensorFlow.js enhancement, the system is designed for field workers who need to operate the app while their hands are busy.

## Current Implementation

### Architecture

```
src/lib/stores/
├── voice-simple.svelte.ts   # Main voice store with commands
├── voice.svelte.ts          # Re-export for compatibility
└── (future) voice-ai.ts     # TensorFlow.js enhancements
```

### Core Features

1. **Voice Commands** - Navigate and control app with speech
2. **Multi-Tenant Awareness** - Commands scoped to current business
3. **Audio Feedback** - Speech synthesis confirms actions
4. **Visual Feedback** - Microphone animation in bottom nav
5. **Error Handling** - Clear messages for common issues

## Voice Commands Reference

### Navigation Commands

| Command | Variations | Action |
|---------|------------|--------|
| My Day | "go to my day", "show my day", "my day" | Navigate to dashboard |
| Tasks | "show tasks", "go to tasks", "tasks" | Open tasks list |
| Money | "show money", "go to money", "finances" | Open financial section |
| Clients | "show clients", "go to clients", "clients" | Open clients list |

### Client Commands

| Command | Example | Action |
|---------|---------|--------|
| Select Client | "select client John Smith" | Select specific client |
| Find Client | "find client Smith" | Search for client |

### System Commands

| Command | Variations | Action |
|---------|------------|--------|
| Current Business | "which business", "what tenant" | Announce current business |
| Help | "help", "what can you do", "commands" | List available commands |

## Implementation Details

### Using Voice in Components

```typescript
import { useVoice } from '$lib/stores/voice.svelte';

const voice = useVoice();

// Check support
if (voice.isSupported) {
  // Start listening
  voice.startListening();
  
  // Access state
  $: isListening = voice.isListening;
  $: transcript = voice.transcript;
  $: error = voice.error;
}
```

### Adding New Commands

Edit `src/lib/stores/voice-simple.svelte.ts`:

```typescript
private commands: VoiceCommand[] = [
  // Existing commands...
  
  {
    patterns: [
      /create task|new task|add task/i,
      /start a new task for (.+)/i
    ],
    action: (matches) => {
      if (!this.checkTenantContext()) return;
      
      const clientName = matches?.[1];
      if (clientName) {
        // Navigate with client context
        goto(`/tasks/new?client=${encodeURIComponent(clientName)}`);
        this.speak(`Creating new task for ${clientName}`);
      } else {
        goto('/tasks/new');
        this.speak('Creating new task');
      }
    },
    description: 'Create a new task'
  }
];
```

### Voice Button Integration

The voice button is in `BottomNav.svelte`:

```svelte
<button 
  class="flex flex-col items-center py-1 px-3 rounded-lg transition-colors 
         {voice?.isListening ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}"
  onclick={handleVoiceClick}
>
  <Icon name="microphone" class="w-6 h-6 {voice?.isListening ? 'animate-pulse' : ''}" />
  {#if voice?.isListening}
    <div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
  {/if}
  <span class="text-xs">Voice</span>
</button>
```

## Multi-Tenant Support

All voice commands are tenant-aware:

1. **Context Check** - Commands verify tenant selection
2. **Scoped Search** - Client searches limited to current tenant
3. **Clear Feedback** - Announces which business is active
4. **Error Guidance** - Prompts to select business if needed

Example implementation:
```typescript
private checkTenantContext(): boolean {
  if (!this.auth.tenant) {
    this.speak('Please select a business first from your profile settings');
    return false;
  }
  return true;
}
```

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Recommended |
| Edge | ✅ Full | Good alternative |
| Safari | ⚠️ Limited | Requires permissions |
| Firefox | ❌ None | Not supported |

## Future Enhancements (TensorFlow.js)

### Phase 1: Enhanced Voice (Planned)
- **Noise Cancellation** - Filter HVAC/machinery sounds
- **Offline Commands** - No internet required
- **Custom Wake Words** - "Hey [AI Name]"
- **Speaker Identification** - Multi-user support

### Phase 2: Smart Features (Planned)
- **Natural Language** - "Schedule a repair for the Smiths tomorrow"
- **Context Awareness** - Commands based on current screen
- **Voice Notes** - Transcribe job notes
- **Equipment Detection** - "What model is this AC unit?"

### Implementation Roadmap
```typescript
// Future: src/lib/ai/voice-enhanced.ts
class VoiceAI {
  private noiseModel: tf.LayersModel;
  private commandModel: tf.LayersModel;
  
  async processAudioWithAI(audioData: Float32Array) {
    // Remove background noise
    const cleaned = await this.removeNoise(audioData);
    
    // Enhanced recognition
    const command = await this.recognizeCommand(cleaned);
    
    // Context-aware processing
    return this.executeWithContext(command);
  }
}
```

## Testing & Debugging

### Voice Debug Page
Navigate to `/voice-debug` when logged in to:
- Test microphone access
- View recognized commands
- Test speech synthesis
- Check browser compatibility

### Console Testing
```javascript
// Get voice instance
const voice = window.__voiceStore;

// Test speech
voice.speak('Testing voice output');

// Test command processing
voice.testCommand('go to my day');

// Check available commands
console.log(voice.getAvailableCommands());
```

## Troubleshooting

### Common Issues

**"Voice control not supported"**
- Use Chrome or Edge browser
- Ensure HTTPS connection (or localhost)

**"Voice access denied"**
- Check browser microphone permissions
- Settings → Site Settings → Microphone → Allow

**Commands not recognized**
- Speak clearly after the beep
- Check transcript to see what was heard
- Try command variations
- Ensure business is selected

**No audio feedback**
- Check system volume
- Test with: `voice.speak('test')`
- Verify speech synthesis not muted

## Performance Considerations

1. **Singleton Pattern** - One voice instance for entire app
2. **Lazy Loading** - Only loads for authenticated users
3. **Resource Cleanup** - Audio contexts properly disposed
4. **Battery Efficiency** - Recognition stops when not needed

## Accessibility Benefits

Voice control enhances accessibility by:
- Enabling hands-free operation
- Reducing repetitive actions
- Supporting mobility limitations
- Working with screen readers
- Providing audio feedback

## Best Practices

### For Developers
1. **Check Tenant Context** - Ensure business selected
2. **Provide Feedback** - Always speak confirmation
3. **Handle Errors** - Clear, actionable messages
4. **Test Commands** - Use voice debug page
5. **Document Changes** - Update command list

### For Users
1. **Clear Speech** - Wait for beep, speak clearly
2. **Simple Commands** - Use documented phrases
3. **Check Business** - Ensure correct tenant selected
4. **Allow Permissions** - Grant microphone access
5. **Use Chrome** - Best compatibility

## Security & Privacy

1. **HTTPS Required** - Voice only works over secure connections
2. **Local Processing** - No audio sent to servers (currently)
3. **Permission Based** - Explicit microphone permission required
4. **Tenant Isolated** - Commands scoped to current business
5. **No Recording** - Audio not stored or transmitted

## Integration with AI Debrief

Voice will integrate with the AI Debrief feature:

```typescript
// Future integration
class AIAssistant {
  private customName: string; // From AI Debrief settings
  
  async activateOnName(audioStream: MediaStream) {
    if (this.heardCustomName(audioStream)) {
      this.startListening();
      await this.speak(`Yes? How can I help?`);
    }
  }
}
```

---

*Last Updated: January 2025*  
*Version: 2.1 - Multi-tenant voice system*
