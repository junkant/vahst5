<script>
  import { useAuth } from '$lib/stores/auth.svelte';
  
  const auth = useAuth();
</script>

<div class="flex flex-col h-full bg-gray-50">
  <div class="bg-white border-b border-gray-200 p-4">
    <h1 class="text-xl font-semibold text-gray-900">Tools</h1>
    <p class="text-sm text-gray-500 mt-1">Manage your business tools</p>
  </div>
  
  <div class="flex-1 overflow-y-auto p-4">
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="font-medium text-gray-900">Reports</h3>
        <p class="text-sm text-gray-500 mt-1">View business analytics</p>
      </div>
      
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="font-medium text-gray-900">Settings</h3>
        <p class="text-sm text-gray-500 mt-1">Configure your account</p>
      </div>
    </div>
  </div>
</div>