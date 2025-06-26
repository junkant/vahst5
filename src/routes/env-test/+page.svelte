<script>
  import { browser } from '$app/environment';
  
  // Get ALL environment variables
  const allEnvVars = browser ? import.meta.env : {};
  const testVar = import.meta.env.PUBLIC_TEST_VAR;
</script>

<div class="p-4">
  <h1 class="text-2xl mb-4">Environment Variables Test</h1>
  
  <h2 class="text-xl mb-2">Test Variable:</h2>
  <p>PUBLIC_TEST_VAR: {testVar || '❌ NOT FOUND'}</p>
  
  <h2 class="text-xl mb-2">All import.meta.env:</h2>
  <pre class="bg-gray-100 p-4 rounded mb-4">{JSON.stringify(allEnvVars, null, 2)}</pre>
</div>