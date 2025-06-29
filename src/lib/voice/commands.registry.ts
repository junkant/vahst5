// src/lib/voice/commands.registry.ts

export interface VoiceCommandDefinition {
  id: string;
  category: 'navigation' | 'action' | 'query' | 'settings' | 'help';
  patterns: RegExp[];
  handler: (matches?: RegExpMatchArray, context?: VoiceContext) => Promise<void> | void;
  description: string;
  examples: string[];
  requiredPermissions?: string[];
  availableOffline?: boolean;
}

export interface VoiceContext {
  currentRoute: string;
  selectedClient: any | null; // Will be typed as Client when imported
  selectedJob: any | null; // Will be typed as Job when imported
  userRole: string;
  isOnline: boolean;
  lastCommand: string | null;
  conversationHistory: string[];
}

export class VoiceCommandRegistry {
  private static instance: VoiceCommandRegistry;
  private commands = new Map<string, VoiceCommandDefinition>();
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new VoiceCommandRegistry();
    }
    return this.instance;
  }
  
  register(command: VoiceCommandDefinition) {
    // Validate command before registering
    if (!command.id || !command.patterns.length || !command.handler) {
      throw new Error('Invalid command definition');
    }
    
    this.commands.set(command.id, command);
    console.log(`✓ Registered voice command: ${command.id}`);
  }
  
  unregister(commandId: string) {
    this.commands.delete(commandId);
  }
  
  getCommands(category?: string): VoiceCommandDefinition[] {
    if (category) {
      return Array.from(this.commands.values())
        .filter(cmd => cmd.category === category);
    }
    return Array.from(this.commands.values());
  }
  
  getCommand(id: string): VoiceCommandDefinition | undefined {
    return this.commands.get(id);
  }
  
  findMatch(transcript: string): { command: VoiceCommandDefinition; matches: RegExpMatchArray } | null {
    const normalized = transcript.toLowerCase().trim();
    
    for (const command of this.commands.values()) {
      for (const pattern of command.patterns) {
        const matches = normalized.match(pattern);
        if (matches) {
          return { command, matches };
        }
      }
    }
    return null;
  }
  
  // Get all unique command examples for help
  getAllExamples(): string[] {
    const examples = new Set<string>();
    this.commands.forEach(cmd => {
      cmd.examples.forEach(ex => examples.add(ex));
    });
    return Array.from(examples);
  }
  
  // Get commands available in current context
  getAvailableCommands(context: VoiceContext): VoiceCommandDefinition[] {
    return Array.from(this.commands.values()).filter(cmd => {
      // Check offline availability
      if (!context.isOnline && !cmd.availableOffline) {
        return false;
      }
      
      // Filter by route context
      if (cmd.category === 'navigation') return true;
      
      // Client-specific commands only when on client pages
      if (cmd.id.startsWith('client.') && !context.currentRoute.includes('client')) {
        return false;
      }
      
      // Job-specific commands only when on job pages
      if (cmd.id.startsWith('job.') && !context.currentRoute.includes('job')) {
        return false;
      }
      
      return true;
    });
  }
  
  // Find similar commands for suggestions
  findSimilarCommands(transcript: string, maxSuggestions = 3): VoiceCommandDefinition[] {
    const normalized = transcript.toLowerCase().trim();
    const words = normalized.split(' ');
    
    // Score each command based on word matches
    const scored = Array.from(this.commands.values()).map(cmd => {
      let score = 0;
      
      // Check pattern similarity
      cmd.patterns.forEach(pattern => {
        const patternStr = pattern.source.toLowerCase();
        words.forEach(word => {
          if (patternStr.includes(word)) score += 1;
        });
      });
      
      // Check example similarity
      cmd.examples.forEach(example => {
        const exampleLower = example.toLowerCase();
        words.forEach(word => {
          if (exampleLower.includes(word)) score += 0.5;
        });
      });
      
      return { command: cmd, score };
    });
    
    // Return top suggestions
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map(item => item.command);
  }
}