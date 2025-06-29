<!-- src/routes/(app)/voice-debug/+page.svelte -->
<script lang="ts">
  import { useVoice } from '$lib/stores/voice.svelte';
  
  const voice = useVoice();
  
  let testInput = $state('');
  let testResults = $state<any[]>([]);
  
  // Simple command list for now
  const commands = [
    {
      id: 'nav.my-day',
      patterns: ['go to my day', 'show my day', 'my day'],
      description: 'Navigate to My Day'
    },
    {
      id: 'nav.tasks',
      patterns: ['show tasks', 'go to tasks', 'tasks'],
      description: 'Navigate to Tasks'
    },
    {
      id: 'nav.money',
      patterns: ['show money', 'go to money', 'money', 'finances'],
      description: 'Navigate to Money'
    },
    {
      id: 'nav.clients',
      patterns: ['show clients', 'go to clients', 'clients'],
      description: 'Navigate to Clients'
    },
    {
      id: 'client.select',
      patterns: ['select client [name]', 'choose client [name]', 'client [name]'],
      description: 'Select a client by name'
    },
    {
      id: 'help',
      patterns: ['help', 'what can you do', 'commands'],
      description: 'Show available commands'
    }
  ];
  
  function testCommand() {
    if (!testInput) return;
    
    // Simulate speaking the command
    voice.speak(`Testing: ${testInput}`);
    
    // Add to test history
    testResults = [{
      input: testInput,
      timestamp: new Date().toLocaleTimeString(),
      response: 'Command spoken'
    }, ...testResults.slice(0, 9)];
    
    testInput = '';
  }
  
  function testVoiceAPI() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = speechSynthesis.getVoices();
      console.log('Available voices:', voices);
      
      const testUtterance = new SpeechSynthesisUtterance('Voice API test successful');
      speechSynthesis.speak(testUtterance);
    }
  }
  
  function testMicrophone() {
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log('Microphone access granted');
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
          console.error('Microphone access denied:', err);
        });
    }
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
        <span class="text-gray-600">Browser:</span>
        <span class="ml-2 font-medium">{typeof window !== 'undefined' && navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'}</span>
      </div>
      <div>
        <span class="text-gray-600">Protocol:</span>
        <span class="ml-2 font-medium">{typeof window !== 'undefined' ? window.location.protocol : 'N/A'}</span>
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
  
  <!-- Test Controls -->
  <div class="bg-white rounded-lg shadow p-4 mb-6">
    <h2 class="text-lg font-semibold mb-4">Test Voice Functions</h2>
    
    <!-- Voice Control Buttons -->
    <div class="flex gap-2 mb-4">
      <button
        onclick={() => voice.startListening()}
        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        disabled={!voice.isSupported || voice.isListening}
      >
        {voice.isListening ? 'Listening...' : 'Start Listening'}
      </button>
      <button
        onclick={() => voice.stopListening()}
        class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        disabled={!voice.isListening}
      >
        Stop
      </button>
      <button
        onclick={testVoiceAPI}
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Test Speech
      </button>
      <button
        onclick={testMicrophone}
        class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        Test Mic
      </button>
    </div>
    
    <!-- Test Speech Output -->
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={testInput}
        onkeydown={(e) => e.key === 'Enter' && testCommand()}
        placeholder="Type text to speak..."
        class="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onclick={testCommand}
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Speak
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
            <div class="text-xs text-gray-600">{result.response}</div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
  <!-- Available Commands -->
  <div class="bg-white rounded-lg shadow p-4">
    <h2 class="text-lg font-semibold mb-4">Available Voice Commands</h2>
    
    <div class="space-y-3">
      {#each commands as cmd}
        <div class="border rounded-lg p-3">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <p class="font-medium text-sm">{cmd.id}</p>
              <p class="text-xs text-gray-600 mt-1">{cmd.description}</p>
              <div class="mt-2">
                <p class="text-xs font-medium text-gray-500">Say:</p>
                <div class="flex flex-wrap gap-1 mt-1">
                  {#each cmd.patterns as pattern}
                    <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      "{pattern}"
                    </span>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
  
  <!-- Browser Compatibility -->
  <div class="bg-white rounded-lg shadow p-4 mt-6">
    <h2 class="text-lg font-semibold mb-4">Browser Compatibility</h2>
    <div class="space-y-2 text-sm">
      <div class="flex items-center">
        <span class="w-24 text-gray-600">Chrome:</span>
        <span class="text-green-600">✓ Full support</span>
      </div>
      <div class="flex items-center">
        <span class="w-24 text-gray-600">Edge:</span>
        <span class="text-green-600">✓ Full support</span>
      </div>
      <div class="flex items-center">
        <span class="w-24 text-gray-600">Safari:</span>
        <span class="text-yellow-600">⚠ Limited support</span>
      </div>
      <div class="flex items-center">
        <span class="w-24 text-gray-600">Firefox:</span>
        <span class="text-red-600">✗ Not supported</span>
      </div>
    </div>
  </div>
</div>