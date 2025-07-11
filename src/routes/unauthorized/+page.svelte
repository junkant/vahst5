<script lang="ts">
  import { goto } from '$app/navigation';
</script>

<div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
  <div class="max-w-md w-full text-center">
    <div class="mb-8">
      <div class="mx-auto h-24 w-24 bg-red-100 rounded-full flex items-center justify-center">
        <svg class="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    </div>
    
    <h1 class="text-2xl font-bold text-gray-900 mb-2">Unauthorized Access</h1>
    <p class="text-gray-600 mb-8">
      You don't have permission to access this page. Please contact your administrator if you believe this is an error.
    </p>
    
    <div class="space-y-3">
      <button
        onclick={() => goto('/clients')}
        class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Dashboard
      </button>
      
      <button
        onclick={() => history.back()}
        class="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
      >
        Go Back
      </button>
    </div>
  </div>
</div>