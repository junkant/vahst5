<!-- src/lib/components/invites/SuggestMemberModal.svelte -->
<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
  import type { UserRole } from '$lib/stores/tenant.svelte';
  
  interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
  }
  
  let { isOpen, onClose, onSuccess }: Props = $props();
  
  const auth = useAuth();
  const tenant = useTenant();
  const toast = useToast();
  
  // Form state
  let formData = $state({
    email: '',
    name: '',
    phone: '',
    role: 'team_member' as UserRole,
    reason: '',
    message: ''
  });
  
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  
  // Reset form when modal opens/closes
  $effect(() => {
    if (!isOpen) {
      formData = {
        email: '',
        name: '',
        phone: '',
        role: 'team_member',
        reason: '',
        message: ''
      };
      error = null;
    }
  });
  
  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = null;
    
    if (!auth.user || !tenant.tenant) {
      error = 'Authentication required';
      return;
    }
    
    // Validate reason
    if (!formData.reason.trim()) {
      error = 'Please provide a reason for suggesting this team member';
      return;
    }
    
    isLoading = true;
    
    try {
      // Create the suggestion (it will automatically need approval)
      const result = await tenant.inviteTeamMember(
        formData.email,
        formData.role,
        {
          id: auth.user.uid,
          name: auth.user.displayName || auth.user.email || 'Team Member'
        },
        {
          name: formData.name,
          phone: formData.phone,
          message: formData.message || formData.reason,
          template: 'casual'
        }
      );
      
      if (result.success) {
        toast.success(
          'Suggestion submitted',
          'Your team member suggestion has been sent to managers for approval'
        );
        onSuccess?.();
        onClose();
      } else {
        error = result.error || 'Failed to submit suggestion';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to submit suggestion';
    } finally {
      isLoading = false;
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <button 
      class="fixed inset-0 bg-black/50"
      transition:fade={{ duration: 200 }}
      onclick={onClose}
      aria-label="Close modal"
      tabindex="-1"
    ></button>
    
    <!-- Modal -->
    <div class="relative min-h-screen flex items-center justify-center p-4">
      <div 
        transition:scale={{ duration: 200, start: 0.95 }}
        class="relative bg-white rounded-xl shadow-xl w-full max-w-lg"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b">
          <h2 class="text-xl font-semibold text-gray-900">
            Suggest a Team Member
          </h2>
          <button
            onclick={onClose}
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <Icon name="x" class="w-5 h-5" />
          </button>
        </div>
        
        <!-- Content -->
        <form onsubmit={handleSubmit} class="p-6">
          <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex gap-3">
              <Icon name="info" class="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p class="text-sm font-medium text-blue-900">Manager Approval Required</p>
                <p class="text-sm text-blue-700 mt-1">
                  Your suggestion will be sent to managers for approval before an invitation is sent.
                </p>
              </div>
            </div>
          </div>
          
          {#if error}
            <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          {/if}
          
          <div class="space-y-4">
            <!-- Email -->
            <div>
              <label for="suggest-email" class="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                id="suggest-email"
                type="email"
                bind:value={formData.email}
                required
                disabled={isLoading}
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                       disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="colleague@company.com"
              />
            </div>
            
            <!-- Name -->
            <div>
              <label for="suggest-name" class="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                id="suggest-name"
                type="text"
                bind:value={formData.name}
                required
                disabled={isLoading}
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                       disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="John Smith"
              />
            </div>
            
            <!-- Phone -->
            <div>
              <label for="suggest-phone" class="block text-sm font-medium text-gray-700 mb-1">
                Phone <span class="text-gray-500">(Optional)</span>
              </label>
              <input
                id="suggest-phone"
                type="tel"
                bind:value={formData.phone}
                disabled={isLoading}
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                       disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <!-- Suggested Role -->
            <div>
              <label for="suggest-role" class="block text-sm font-medium text-gray-700 mb-1">
                Suggested Role
              </label>
              <select
                id="suggest-role"
                bind:value={formData.role}
                disabled={isLoading}
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                       disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="team_member">Team Member</option>
                <option value="manager">Manager</option>
              </select>
              <p class="mt-1 text-xs text-gray-500">
                Managers can approve invitations and manage the team
              </p>
            </div>
            
            <!-- Reason -->
            <div>
              <label for="suggest-reason" class="block text-sm font-medium text-gray-700 mb-1">
                Why should we add this person? *
              </label>
              <textarea
                id="suggest-reason"
                bind:value={formData.reason}
                required
                disabled={isLoading}
                rows="3"
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                       disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="They have experience with HVAC systems and would be a great addition to our service team..."
              ></textarea>
            </div>
            
            <!-- Personal Message -->
            <div>
              <label for="suggest-message" class="block text-sm font-medium text-gray-700 mb-1">
                Personal Message <span class="text-gray-500">(Optional)</span>
              </label>
              <textarea
                id="suggest-message"
                bind:value={formData.message}
                disabled={isLoading}
                rows="2"
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                       disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Hey! We'd love to have you join our team at..."
              ></textarea>
              <p class="mt-1 text-xs text-gray-500">
                This message will be included in the invitation if approved
              </p>
            </div>
          </div>
        </form>
        
        <!-- Footer -->
        <div class="flex gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onclick={onClose}
            disabled={isLoading}
            class="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 
                   font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 
                   disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="suggest-form"
            onclick={handleSubmit}
            disabled={isLoading || !formData.email || !formData.name || !formData.reason}
            class="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg
                   hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                   transition-colors flex items-center justify-center gap-2"
          >
            {#if isLoading}
              <Icon name="loader2" class="w-4 h-4 animate-spin" />
              Submitting...
            {:else}
              <Icon name="send" class="w-4 h-4" />
              Submit Suggestion
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>