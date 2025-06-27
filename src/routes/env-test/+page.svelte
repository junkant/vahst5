<script>
  import { browser } from '$app/environment';
  import { 
    PUBLIC_TEST_VAR,
    PUBLIC_FIREBASE_API_KEY,
    PUBLIC_FIREBASE_PROJECT_ID
  } from '$env/static/public';
  
  // Get ALL environment variables using Vite's approach (limited)
  const allEnvVars = browser ? import.meta.env : {};
  const viteTestVar = import.meta.env.PUBLIC_TEST_VAR;
  
  // Test if we can access Firebase vars via SvelteKit's approach
  const firebaseVarsWork = PUBLIC_FIREBASE_API_KEY && PUBLIC_FIREBASE_PROJECT_ID;
</script>

<div class="p-4 max-w-4xl mx-auto">
  <h1 class="text-3xl font-bold mb-6">Environment Variables Test</h1>
  
  <!-- SvelteKit Approach (Recommended) -->
  <div class="mb-8 p-4 bg-green-50 border border-green-200 rounded">
    <h2 class="text-xl font-semibold mb-4 text-green-800">✅ SvelteKit Approach ($env/static/public)</h2>
    
    <div class="space-y-2">
      <p><strong>PUBLIC_TEST_VAR:</strong> 
        <span class="font-mono bg-gray-100 px-2 py-1 rounded">
          {PUBLIC_TEST_VAR || '❌ NOT FOUND'}
        </span>
      </p>
      
      <p><strong>PUBLIC_FIREBASE_API_KEY:</strong> 
        <span class="font-mono bg-gray-100 px-2 py-1 rounded">
          {PUBLIC_FIREBASE_API_KEY ? `${PUBLIC_FIREBASE_API_KEY.substring(0, 10)}...` : '❌ NOT FOUND'}
        </span>
      </p>
      
      <p><strong>PUBLIC_FIREBASE_PROJECT_ID:</strong> 
        <span class="font-mono bg-gray-100 px-2 py-1 rounded">
          {PUBLIC_FIREBASE_PROJECT_ID || '❌ NOT FOUND'}
        </span>
      </p>
      
      <div class="mt-4 p-3 bg-white rounded border">
        <strong>Firebase Configuration Status:</strong>
        {#if firebaseVarsWork}
          <span class="text-green-600 font-semibold">✅ Ready to use!</span>
        {:else}
          <span class="text-red-600 font-semibold">❌ Missing variables</span>
        {/if}
      </div>
    </div>
  </div>
  
  <!-- Vite Approach (Limited) -->
  <div class="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
    <h2 class="text-xl font-semibold mb-4 text-yellow-800">⚠️ Vite Approach (import.meta.env)</h2>
    
    <p class="mb-4 text-sm text-yellow-700">
      This approach is limited and not recommended for SvelteKit projects.
    </p>
    
    <div class="space-y-2">
      <p><strong>PUBLIC_TEST_VAR:</strong> 
        <span class="font-mono bg-gray-100 px-2 py-1 rounded">
          {viteTestVar || '❌ NOT FOUND'}
        </span>
      </p>
      
      <details class="mt-4">
        <summary class="cursor-pointer font-semibold">All import.meta.env variables</summary>
        <pre class="bg-gray-100 p-4 rounded mt-2 text-sm overflow-auto">{JSON.stringify(allEnvVars, null, 2)}</pre>
      </details>
    </div>
  </div>
  
  <!-- Instructions -->
  <div class="p-4 bg-blue-50 border border-blue-200 rounded">
    <h2 class="text-xl font-semibold mb-4 text-blue-800">📋 Instructions</h2>
    
    <div class="space-y-3 text-sm">
      <div>
        <strong>✅ Expected Result:</strong> All variables in the green section should show values.
      </div>
      
      <div>
        <strong>📁 .env file location:</strong> Project root (same level as package.json)
      </div>
      
      <div>
        <strong>🔄 After changes:</strong> Restart your dev server (npm run dev)
      </div>
      
      <div>
        <strong>⚙️ Current .env should contain:</strong>
        <pre class="bg-white p-2 rounded mt-1 border text-xs">PUBLIC_TEST_VAR=Hello from Environment Variables!
PUBLIC_FIREBASE_API_KEY=your_api_key_here
PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain_here
PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket_here
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
PUBLIC_FIREBASE_APP_ID=your_app_id_here</pre>
      </div>
    </div>
  </div>
</div>