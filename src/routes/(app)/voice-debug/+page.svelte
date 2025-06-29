<!-- src/routes/(app)/voice-debug/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { useVoice } from '$lib/stores/voice-enhanced.svelte';
  import { VoiceCommandRegistry } from '$lib/voice/commands.registry';
  import { testAllCommands, findMatches } from '$lib/voice/testing';
  
  const voice = useVoice();
  const registry = VoiceCommandRegistry.getInstance();
  
  let commands = $state<any[]>([]);
  let testInput = $state('');
  let testResults = $state<any[]>([]);
  let commandsByCategory = $state<Record<string, any[]>>({});
  
  onMount(() => {
    loadCommands();
  });
  
  function loadCommands() {
    const allCommands = registry.getCommands();
    commands = allCommands;
    
    // Group by category
    const grouped: Record<string, any[]> = {};
    allCommands.forEach(cmd => {
      if (!grouped[cmd.category]) {
        grouped[cmd.category] = [];
      }
      grouped[cmd.category].push(cmd);
    });
    commandsByCategory = grouped;
  }
  
  function testCommand() {
    if (!testInput) return;
    
    const matches = findMatches(testInput);
    const match = registry.findMatch(testInput);
    
    testResults = [{
      input: testInput,
      matches: matches,
      bestMatch: match?.command.id || 'No match',
      timestamp: new Date().toLocaleTimeString()
    }, ...testResults.slice(0, 9)];
    
    // Actually execute the command
    voice.testCommand(testInput);
  }
  
  async function runAllTests() {
    const results = await testAllCommands();
    console.log('Test results:', results);
    alert(`Tests complete: ${results.passed} passed, ${results.failed} failed`);
  }
</script>

<div class="container mx-auto px-4 py-6">
  <h1 class="text-2xl font-bold mb-6">Voice Command Debug</h1>
  
  <!-- Voice Status -->
  <div class="bg-white rounded-lg shadow p-4 mb-6">
    <h2 class="text-lg font-semibold mb-2">Voice Status</h2>
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span class="text-gray-600">Supported:</span>
        <span class="ml-2 font-medium {voice.isSupported ? 'text-green-600' : 'text-red-600'}">
          {voice.isSupported ? 'Yes' : 'No'}
        </span>
      </div>
      <div>
        <span class="text-gray-600">Listening:</span>
        <span class="ml-2 font-medium {voice.isListening ? 'text-green-600' : 'text-gray-600'}">
          {voice.isListening ? 'Yes' : 'No'}
        </span>
      </div>
      <div>
        <span class="text-gray-600">Commands:</span>
        <span class="ml-2 font-medium">{commands.length}</span>
      </div>
      <div>
        <span class="text-gray-600">Speaking:</span>
        <span class="ml-2 font-medium {voice.isSpeaking ? 'text-blue-600' : 'text-gray-600'}">
          {voice.isSpeaking ? 'Yes' : 'No'}
        </span>
      </div>
    </div>
    
    {#if voice.transcript}
      <div class="mt-4 p-3 bg-gray-100 rounded">
        <span class="text-sm text-gray-600">Transcript:</span>
        <p class="font-medium">{voice.transcript}</p>
      </div>
    {/if}
    
    {#if voice.error}
      <div class="mt-4 p-3 bg-red-100 rounded">
        <span class="text-sm text-red-600">Error:</span>
        <p class="font-medium text-red-700">{voice.error}</p>
      </div>
    {/if}
  </div>
  
  <!-- Test Input -->
  <div class="bg-white rounded-lg shadow p-4 mb-6">
    <h2 class="text-lg font-semibold mb-2">Test Commands</h2>
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={testInput}
        onkeydown={(e) => e.key === 'Enter' && testCommand()}
        placeholder="Type a command to test..."
        class="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onclick={testCommand}
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Test
      </button>
      <button
        onclick={() => voice.startListening()}
        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        {voice.isListening ? 'Stop' : 'Listen'}
      </button>
    </div>
    
    <!-- Test Results -->
    {#if testResults.length > 0}
      <div class="mt-4 space-y-2">
        <h3 class="text-sm font-medium text-gray-600">Test History</h3>
        {#each testResults as result}
          <div class="p-2 bg-gray-50 rounded text-sm">
            <div class="flex justify-between">
              <span class="font-medium">{result.input}</span>
              <span class="text-gray-500 text-xs">{result.timestamp}</span>
            </div>
            <div class="text-xs text-gray-600">
              Match: <span class="font-medium">{result.bestMatch}</span>
              {#if result.matches.length > 1}
                <span class="ml-2">(+{result.matches.length - 1} others)</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
  <!-- Commands by Category -->
  <div class="bg-white rounded-lg shadow p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">Registered Commands</h2>
      <button
        onclick={runAllTests}
        class="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
      >
        Run All Tests
      </button>
    </div>
    
    {#each Object.entries(commandsByCategory) as [category, cmds]}
      <div class="mb-6">
        <h3 class="text-md font-medium text-gray-700 mb-2 capitalize">
          {category} ({cmds.length})
        </h3>
        <div class="space-y-2">
          {#each cmds as cmd}
            <div class="border rounded-lg p-3">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <p class="font-medium text-sm">{cmd.id}</p>
                  <p class="text-xs text-gray-600 mt-1">{cmd.description}</p>
                  <div class="mt-2">
                    <p class="text-xs font-medium text-gray-500">Examples:</p>
                    <div class="flex flex-wrap gap-1 mt-1">
                      {#each cmd.examples as example}
                        <button
                          onclick={() => { testInput = example; testCommand(); }}
                          class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                        >
                          "{example}"
                        </button>
                      {/each}
                    </div>
                  </div>
                </div>
                <div class="ml-3 text-xs space-y-1">
                  {#if cmd.availableOffline}
                    <span class="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded">
                      Offline
                    </span>
                  {/if}
                  {#if cmd.requiredPermissions?.length}
                    <span class="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                      Perms
                    </span>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>