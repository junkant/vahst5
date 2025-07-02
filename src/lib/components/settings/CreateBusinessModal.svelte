<!-- src/lib/components/settings/CreateBusinessModal.svelte -->
<script lang="ts">
  import { useAuth } from '$lib/stores/auth.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const auth = useAuth();
  
  let { open = $bindable(false) } = $props();
  
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let formData = $state({
    businessName: '',
    businessType: ''
  });
  
  async function createBusiness() {
    if (!formData.businessName.trim()) {
      error = 'Business name is required';
      return;
    }
    
    if (!auth.user) {
      error = 'You must be logged in to create a business';
      return;
    }
    
    isLoading = true;
    error = null;
    
    try {
      // Use the auth store's createBusiness method
      const newTenant = await auth.createBusiness(
        formData.businessName, 
        formData.businessType || undefined
      );
      
      // Reset form and close modal
      formData = { businessName: '', businessType: '' };
      open = false;
      
      console.log('✅ Business created successfully:', newTenant.name);
      
    } catch (err) {
      console.error('Failed to create business:', err);
      error = err instanceof Error ? err.message : 'Failed to create business';
    } finally {
      isLoading = false;
    }
  }
  
  function closeModal() {
    if (!isLoading) {
      formData = { businessName: '', businessType: '' };
      error = null;
      open = false;
    }
  }
  
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !isLoading) {
      closeModal();
    }
  }
</script>

{#if open}
  <div 
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="create-business-title"
    tabindex="0"
  >
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <div class="p-6">
        <h3 id="create-business-title" class="text-lg font-semibold mb-4">Create New Business</h3>
        <p class="text-gray-600 mb-4">
          Set up a new business account with full access to all features.
        </p>
        
        {#if error}
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">{error}</p>
          </div>
        {/if}
        
        <form onsubmit={(e) => { e.preventDefault(); createBusiness(); }}>
          <div class="space-y-4">
            <div>
              <label for="business-name" class="block text-sm font-medium text-gray-700 mb-1">
                Business Name *
              </label>
              <input
                id="business-name"
                type="text"
                bind:value={formData.businessName}
                disabled={isLoading}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Enter business name..."
                required
              />
            </div>
            
            <div>
              <label for="business-type" class="block text-sm font-medium text-gray-700 mb-1">
                Business Type (Optional)
              </label>
              <select 
                id="business-type"
                bind:value={formData.businessType}
                disabled={isLoading}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Select type...</option>
                <option value="hvac">HVAC</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="general">General Contracting</option>
                <option value="landscaping">Landscaping</option>
                <option value="cleaning">Cleaning Services</option>
                <option value="roofing">Roofing</option>
                <option value="painting">Painting</option>
                <option value="flooring">Flooring</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button
              type="button"
              onclick={closeModal}
              disabled={isLoading}
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.businessName.trim()}
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {#if isLoading}
                <Icon name="refresh" class="w-4 h-4 animate-spin" />
                Creating...
              {:else}
                Create Business
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}