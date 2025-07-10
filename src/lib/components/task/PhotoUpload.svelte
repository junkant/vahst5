<!-- src/lib/components/task/PhotoUpload.svelte -->
<script lang="ts">
  import type { TaskPhoto } from '$lib/types/task';
  import { useEnhancedTaskStore } from '$lib/stores/task-enhanced.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { toast } from '$lib/utils/toast';
  
  interface Props {
    taskId: string;
    existingPhotos: TaskPhoto[];
  }
  
  let { taskId, existingPhotos }: Props = $props();
  
  const taskStore = useEnhancedTaskStore();
  
  let fileInput: HTMLInputElement;
  let uploading = $state(false);
  let selectedPhoto = $state<TaskPhoto | null>(null);
  let photoType = $state<TaskPhoto['type']>('during');
  let caption = $state('');
  
  // Photo type options
  const photoTypes: Array<{ value: TaskPhoto['type']; label: string; icon: string }> = [
    { value: 'before', label: 'Before', icon: 'camera' },
    { value: 'during', label: 'During', icon: 'wrench' },
    { value: 'after', label: 'After', icon: 'check' },
    { value: 'issue', label: 'Issue', icon: 'alertTriangle' },
    { value: 'equipment', label: 'Equipment', icon: 'package' }
  ];
  
  // Handle file selection
  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }
    
    uploading = true;
    
    try {
      await taskStore.addPhoto(taskId, file, photoType, caption);
      toast.success('Photo uploaded successfully');
      
      // Reset form
      caption = '';
      if (fileInput) fileInput.value = '';
    } catch (error) {
      toast.error('Failed to upload photo');
      console.error('Upload error:', error);
    } finally {
      uploading = false;
    }
  }
  
  // Open file picker
  function openFilePicker() {
    fileInput?.click();
  }
  
  // Format AI analysis
  function formatAIAnalysis(analysis?: TaskPhoto['aiAnalysis']): string[] {
    if (!analysis) return [];
    
    const items: string[] = [];
    
    if (analysis.equipmentDetected?.length) {
      items.push(`Equipment: ${analysis.equipmentDetected.join(', ')}`);
    }
    
    if (analysis.issuesDetected?.length) {
      items.push(`Issues: ${analysis.issuesDetected.join(', ')}`);
    }
    
    if (analysis.safetyHazards?.length) {
      items.push(`⚠️ Safety: ${analysis.safetyHazards.join(', ')}`);
    }
    
    return items;
  }
</script>

<div class="photo-upload">
  <!-- Photo type selector -->
  <div class="flex gap-2 mb-3 overflow-x-auto pb-1">
    {#each photoTypes as type}
      <button
        onclick={() => photoType = type.value}
        class="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap
               transition-colors {photoType === type.value ? 
                 'bg-blue-100 text-blue-700' : 
                 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
      >
        <Icon name={type.icon} class="w-4 h-4" />
        {type.label}
      </button>
    {/each}
  </div>
  
  <!-- Caption input -->
  <div class="mb-3">
    <input
      type="text"
      bind:value={caption}
      placeholder="Add caption (optional)"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  </div>
  
  <!-- Upload button -->
  <button
    onclick={openFilePicker}
    disabled={uploading}
    class="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg
           hover:border-gray-400 transition-colors flex items-center justify-center
           gap-2 text-gray-600 hover:text-gray-700 disabled:opacity-50
           disabled:cursor-not-allowed"
  >
    {#if uploading}
      <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent 
                  rounded-full animate-spin"></div>
      <span>Uploading...</span>
    {:else}
      <Icon name="camera" class="w-5 h-5" />
      <span>Take or select photo</span>
    {/if}
  </button>
  
  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    capture="environment"
    onchange={handleFileSelect}
    class="hidden"
  />
  
  <!-- Existing photos grid -->
  {#if existingPhotos.length > 0}
    <div class="grid grid-cols-3 gap-2 mt-4">
      {#each existingPhotos as photo}
        <button
          onclick={() => selectedPhoto = photo}
          class="relative aspect-square rounded-lg overflow-hidden bg-gray-100
                 hover:ring-2 hover:ring-blue-500 transition-all"
        >
          <img 
            src={photo.thumbnailUrl || photo.url} 
            alt={photo.caption || 'Task photo'}
            class="w-full h-full object-cover"
          />
          
          <!-- Type badge -->
          <span class="absolute top-1 left-1 px-1.5 py-0.5 bg-black bg-opacity-50 
                       text-white text-xs rounded">
            {photo.type}
          </span>
          
          <!-- AI indicator -->
          {#if photo.aiAnalysis}
            <div class="absolute top-1 right-1 w-5 h-5 bg-indigo-600 rounded-full 
                        flex items-center justify-center">
              <Icon name="sparkles" class="w-3 h-3 text-white" />
            </div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
  
  <!-- Photo detail modal -->
  {#if selectedPhoto}
    <div
      class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onclick={() => selectedPhoto = null}
      onkeydown={(e) => e.key === 'Escape' && (selectedPhoto = null)}
      role="button"
      tabindex="0"
      aria-label="Close photo viewer"
    >
      <div 
        class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Photo details"
      >
        <!-- Photo -->
        <div class="relative bg-gray-900">
          <img 
            src={selectedPhoto.url}
            alt={selectedPhoto.caption || 'Task photo'}
            class="w-full h-auto max-h-[60vh] object-contain"
          />
          
          <!-- Close button -->
          <button
            onclick={() => selectedPhoto = null}
            class="absolute top-2 right-2 p-2 bg-black bg-opacity-50 
                   rounded-full text-white hover:bg-opacity-70"
          >
            <Icon name="x" class="w-5 h-5" />
          </button>
        </div>
        
        <!-- Details -->
        <div class="p-4">
          {#if selectedPhoto.caption}
            <p class="text-gray-900 mb-2">{selectedPhoto.caption}</p>
          {/if}
          
          <div class="flex items-center gap-4 text-sm text-gray-500">
            <span class="capitalize">{selectedPhoto.type} photo</span>
            <span>•</span>
            <span>{new Date(selectedPhoto.takenAt).toLocaleString()}</span>
          </div>
          
          <!-- AI Analysis -->
          {#if selectedPhoto.aiAnalysis}
            {@const analysis = formatAIAnalysis(selectedPhoto.aiAnalysis)}
            {#if analysis.length > 0}
              <div class="mt-4 p-3 bg-indigo-50 rounded-lg">
                <div class="flex items-center gap-2 mb-2">
                  <Icon name="sparkles" class="w-4 h-4 text-indigo-600" />
                  <span class="text-sm font-medium text-indigo-900">AI Analysis</span>
                  <span class="text-xs text-indigo-600">
                    {Math.round((selectedPhoto.aiAnalysis.confidence || 0) * 100)}% confidence
                  </span>
                </div>
                <ul class="space-y-1">
                  {#each analysis as item}
                    <li class="text-sm text-indigo-800">{item}</li>
                  {/each}
                </ul>
              </div>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Ensure horizontal scroll for photo types on mobile */
  .photo-upload > div:first-child {
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  
  .photo-upload > div:first-child::-webkit-scrollbar {
    display: none;
  }
</style>