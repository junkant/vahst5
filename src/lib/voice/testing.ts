// src/lib/voice/testing.ts
import { VoiceCommandRegistry, type VoiceContext } from './commands.registry';

export interface TestResult {
  success: boolean;
  commandId?: string;
  error?: string;
  matches?: RegExpMatchArray;
}

export class VoiceCommandTester {
  private static registry = VoiceCommandRegistry.getInstance();
  
  /**
   * Test if a transcript matches the expected command
   */
  static async testCommand(
    transcript: string,
    expectedCommandId: string,
    mockContext?: Partial<VoiceContext>
  ): Promise<TestResult> {
    const match = this.registry.findMatch(transcript);
    
    if (!match) {
      return {
        success: false,
        error: `No command matched: "${transcript}"`
      };
    }
    
    if (match.command.id !== expectedCommandId) {
      return {
        success: false,
        commandId: match.command.id,
        error: `Wrong command matched. Expected: ${expectedCommandId}, Got: ${match.command.id}`
      };
    }
    
    // Test with mock context
    const defaultContext: VoiceContext = {
      currentRoute: '/',
      selectedClient: null,
      selectedJob: null,
      userRole: 'user',
      isOnline: true,
      lastCommand: null,
      conversationHistory: []
    };
    
    const context = { ...defaultContext, ...mockContext };
    
    try {
      await match.command.handler(match.matches, context);
      return {
        success: true,
        commandId: match.command.id,
        matches: match.matches
      };
    } catch (error) {
      return {
        success: false,
        commandId: match.command.id,
        error: `Handler error: ${error}`
      };
    }
  }
  
  /**
   * Test multiple transcripts for a command
   */
  static async testCommandVariations(
    transcripts: string[],
    expectedCommandId: string
  ): Promise<{ transcript: string; result: TestResult }[]> {
    const results = [];
    
    for (const transcript of transcripts) {
      const result = await this.testCommand(transcript, expectedCommandId);
      results.push({ transcript, result });
    }
    
    return results;
  }
  
  /**
   * Get all commands that match a transcript
   */
  static findAllMatches(transcript: string): string[] {
    const normalized = transcript.toLowerCase().trim();
    const matches: string[] = [];
    
    this.registry.getCommands().forEach(command => {
      command.patterns.forEach(pattern => {
        if (pattern.test(normalized)) {
          matches.push(command.id);
        }
      });
    });
    
    return matches;
  }
  
  /**
   * Test command coverage - find commands without examples
   */
  static getCommandCoverage(): {
    total: number;
    withExamples: number;
    withoutExamples: string[];
  } {
    const commands = this.registry.getCommands();
    const withoutExamples: string[] = [];
    
    commands.forEach(cmd => {
      if (cmd.examples.length === 0) {
        withoutExamples.push(cmd.id);
      }
    });
    
    return {
      total: commands.length,
      withExamples: commands.length - withoutExamples.length,
      withoutExamples
    };
  }
  
  /**
   * Generate test cases from command examples
   */
  static generateTestCases(): { commandId: string; example: string }[] {
    const testCases: { commandId: string; example: string }[] = [];
    
    this.registry.getCommands().forEach(command => {
      command.examples.forEach(example => {
        testCases.push({
          commandId: command.id,
          example
        });
      });
    });
    
    return testCases;
  }
  
  /**
   * Run all test cases
   */
  static async runAllTests(): Promise<{
    passed: number;
    failed: number;
    failures: { commandId: string; example: string; error: string }[];
  }> {
    const testCases = this.generateTestCases();
    let passed = 0;
    let failed = 0;
    const failures: { commandId: string; example: string; error: string }[] = [];
    
    for (const testCase of testCases) {
      const result = await this.testCommand(testCase.example, testCase.commandId);
      
      if (result.success) {
        passed++;
      } else {
        failed++;
        failures.push({
          commandId: testCase.commandId,
          example: testCase.example,
          error: result.error || 'Unknown error'
        });
      }
    }
    
    console.log(`Voice Command Tests: ${passed} passed, ${failed} failed`);
    if (failures.length > 0) {
      console.error('Failures:', failures);
    }
    
    return { passed, failed, failures };
  }
}

// Export convenience functions for testing in development
export const testVoiceCommand = VoiceCommandTester.testCommand.bind(VoiceCommandTester);
export const testAllCommands = VoiceCommandTester.runAllTests.bind(VoiceCommandTester);
export const findMatches = VoiceCommandTester.findAllMatches.bind(VoiceCommandTester);