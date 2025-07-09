<!-- src/lib/components/invites/BulkInviteModal.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { createBulkInvites } from '$lib/firebase/invites';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import type { CreateInviteInput, BulkInviteResult, TeamInvite } from '$lib/types/invites';
  import type { UserRole } from '$lib/stores/tenant.svelte';
  
  interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (result: BulkInviteResult) => void;
  }
  
  let { isOpen, onClose, onSuccess }: Props = $props();
  
  // Get stores
  const auth = useAuth();
  const tenant = useTenant();
  
  // State
  let activeTab = $state<'manual' | 'csv'>('manual');
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let showPreview = $state(false);
  let showResults = $state(false);
  
  // Manual entry state
  let manualInput = $state('');
  let defaultRole = $state<UserRole>('team_member');
  let personalMessage = $state('');
  let messageTemplate = $state<'casual' | 'formal'>('casual');
  
  // CSV state
  let fileInput = $state<HTMLInputElement>();
  let csvFileName = $state('');
  
  // Invite list
  let inviteList = $state<CreateInviteInput[]>([]);
  let validationErrors = $state<string[]>([]);
  
  // Results
  let bulkResult = $state<BulkInviteResult | null>(null);
  
  // Validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Available roles based on current user role
  const availableRoles = $derived(() => {
    const currentRole = tenant.userRole;
    const roles = [
      { value: 'team_member', label: 'Team Member', description: 'Can manage assigned jobs and clients' }
    ];
    
    if (currentRole === 'owner' || currentRole === 'manager') {
      roles.push({ value: 'manager', label: 'Manager', description: 'Can manage team and approve invites' });
    }
    
    if (currentRole === 'owner') {
      roles.push({ value: 'owner', label: 'Owner', description: 'Full access to all features' });
    }
    
    return roles;
  });
  
  // Reset state when modal opens/closes
  $effect(() => {
    if (!isOpen) {
      resetState();
    }
  });
  
  function resetState() {
    activeTab = 'manual';
    manualInput = '';
    defaultRole = 'team_member';
    personalMessage = '';
    messageTemplate = 'casual';
    csvFileName = '';
    inviteList = [];
    validationErrors = [];
    error = null;
    showPreview = false;
    showResults = false;
    bulkResult = null;
    isLoading = false;
  }
  
  function handleManualInput() {
    error = null;
    validationErrors = [];
    inviteList = [];
    
    // Split by newlines and commas
    const entries = manualInput
      .split(/[\n,]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);
    
    if (entries.length === 0) {
      error = 'Please enter at least one email address';
      return;
    }
    
    const processedEmails = new Set<string>();
    
    entries.forEach((entry, index) => {
      // Extract email and optional name
      let email = '';
      let name = '';
      
      // Check if entry has angle brackets (Name <email@example.com>)
      const angleMatch = entry.match(/^(.+?)\s*<(.+?)>$/);
      if (angleMatch) {
        name = angleMatch[1].trim();
        email = angleMatch[2].trim();
      } else {
        email = entry;
      }
      
      // Validate email
      if (!emailRegex.test(email)) {
        validationErrors.push(`Line ${index + 1}: Invalid email format: ${entry}`);
        return;
      }
      
      // Check for duplicates
      const normalizedEmail = email.toLowerCase();
      if (processedEmails.has(normalizedEmail)) {
        validationErrors.push(`Line ${index + 1}: Duplicate email: ${email}`);
        return;
      }
      
      processedEmails.add(normalizedEmail);
      
      inviteList.push({
        email: normalizedEmail,
        name: name || undefined,
        role: defaultRole,
        message: personalMessage || undefined,
        template: messageTemplate
      });
    });
    
    if (inviteList.length > 0 && validationErrors.length === 0) {
      showPreview = true;
    }
  }
  
  async function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    error = null;
    validationErrors = [];
    inviteList = [];
    csvFileName = file.name;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        processCsvResults(results);
      },
      error: (err) => {
        error = `CSV parsing error: ${err.message}`;
      }
    });
  }
  
  function processCsvResults(results: Papa.ParseResult<any>) {
    const processedEmails = new Set<string>();
    
    results.data.forEach((row, index) => {
      // Look for email in various column names
      const email = (
        row.email || 
        row.Email || 
        row.EMAIL || 
        row['E-mail'] || 
        row['e-mail'] ||
        ''
      ).toString().trim();
      
      if (!email) {
        validationErrors.push(`Row ${index + 2}: No email found`);
        return;
      }
      
      if (!emailRegex.test(email)) {
        validationErrors.push(`Row ${index + 2}: Invalid email: ${email}`);
        return;
      }
      
      const normalizedEmail = email.toLowerCase();
      if (processedEmails.has(normalizedEmail)) {
        validationErrors.push(`Row ${index + 2}: Duplicate email: ${email}`);
        return;
      }
      
      processedEmails.add(normalizedEmail);
      
      // Extract other fields
      const name = (
        row.name || 
        row.Name || 
        row.NAME || 
        row['Full Name'] || 
        row['full name'] ||
        ''
      ).toString().trim();
      
      const phone = (
        row.phone || 
        row.Phone || 
        row.PHONE || 
        row.mobile || 
        row.Mobile ||
        ''
      ).toString().trim();
      
      // Check for role in CSV
      const csvRole = (
        row.role || 
        row.Role || 
        row.ROLE ||
        ''
      ).toString().trim().toLowerCase();
      
      let role: UserRole = defaultRole;
      if (csvRole === 'manager' && availableRoles().some(r => r.value === 'manager')) {
        role = 'manager';
      } else if (csvRole === 'owner' && availableRoles().some(r => r.value === 'owner')) {
        role = 'owner';
      }
      
      inviteList.push({
        email: normalizedEmail,
        name: name || undefined,
        phone: phone || undefined,
        role,
        message: personalMessage || undefined,
        template: messageTemplate
      });
    });
    
    if (inviteList.length === 0 && validationErrors.length === 0) {
      error = 'No valid email addresses found in CSV';
    } else if (inviteList.length > 0 && validationErrors.length === 0) {
      showPreview = true;
    }
  }
  
  function removeInvite(index: number) {
    inviteList = inviteList.filter((_, i) => i !== index);
    if (inviteList.length === 0) {
      showPreview = false;
    }
  }
  
  function updateInviteRole(index: number, role: UserRole) {
    inviteList[index].role = role;
  }
  
  async function sendInvites() {
    if (!auth.user || !tenant.tenant || inviteList.length === 0) return;
    
    isLoading = true;
    error = null;
    
    try {
      const result = await createBulkInvites(
        tenant.tenant.id,
        tenant.tenant.name,
        inviteList,
        {
          uid: auth.user.uid,
          displayName: auth.user.displayName,
          email: auth.user.email,
          role: tenant.userRole || 'team_member'
        }
      );
      
      bulkResult = result;
      showResults = true;
      showPreview = false;
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to send invites';
    } finally {
      isLoading = false;
    }
  }
  
  async function downloadAllInvites() {
    if (!bulkResult || bulkResult.successful.length === 0) return;
    
    // This would typically generate a PDF with all invite details
    // For now, we'll create a simple text file
    const content = bulkResult.successful.map(invite => 
      `Invite for: ${invite.recipientEmail}
Name: ${invite.recipientName || 'Not specified'}
Role: ${invite.invitedRole}
Code: ${invite.code}
Link: ${invite.shortUrl}
Expires: ${new Date(invite.expiresAt).toLocaleDateString()}
---`
    ).join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-invites-${bulkResult.sessionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  function startNewBulk() {
    resetState();
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/50" onclick={onClose}></div>
    
    <!-- Modal -->
    <div class="relative min-h-screen flex items-center justify-center p-4">
      <div class="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {#if !showResults}
          <!-- Header -->
          <div class="flex items-center justify-between p-6 border-b">
            <h2 class="text-xl font-semibold text-gray-900">
              Bulk Invite Team Members
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
          <div class="flex-1 overflow-y-auto p-6">
            {#if !showPreview}
              <!-- Tab Selection -->
              <div class="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6">
                <button
                  onclick={() => activeTab = 'manual'}
                  class="flex-1 py-2 px-4 rounded-md font-medium transition-colors
                         {activeTab === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
                >
                  Manual Entry
                </button>
                <button
                  onclick={() => activeTab = 'csv'}
                  class="flex-1 py-2 px-4 rounded-md font-medium transition-colors
                         {activeTab === 'csv' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
                >
                  Upload CSV
                </button>
              </div>
              
              {#if error}
                <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              {/if}
              
              {#if validationErrors.length > 0}
                <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p class="font-medium text-amber-900 mb-1">Validation Errors:</p>
                  <ul class="text-sm text-amber-700 space-y-0.5">
                    {#each validationErrors as err}
                      <li>• {err}</li>
                    {/each}
                  </ul>
                </div>
              {/if}
              
              <!-- Common Fields -->
              <div class="space-y-4 mb-6">
                <div>
                  <label for="default-role" class="block text-sm font-medium text-gray-700 mb-1">
                    Default Role
                  </label>
                  <select
                    id="default-role"
                    bind:value={defaultRole}
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {#each availableRoles() as role}
                      <option value={role.value}>{role.label}</option>
                    {/each}
                  </select>
                </div>
                
                <div>
                  <label for="message-template" class="block text-sm font-medium text-gray-700 mb-1">
                    Message Style
                  </label>
                  <select
                    id="message-template"
                    bind:value={messageTemplate}
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
                
                <div>
                  <label for="personal-message" class="block text-sm font-medium text-gray-700 mb-1">
                    Personal Message <span class="text-gray-500">(Optional)</span>
                  </label>
                  <textarea
                    id="personal-message"
                    bind:value={personalMessage}
                    rows="2"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Add a personal touch to your invitations..."
                  ></textarea>
                </div>
              </div>
              
              {#if activeTab === 'manual'}
                <!-- Manual Entry -->
                <div>
                  <label for="email-list" class="block text-sm font-medium text-gray-700 mb-1">
                    Email Addresses
                  </label>
                  <p class="text-sm text-gray-500 mb-2">
                    Enter one per line or separate with commas. You can use formats like:
                    <br />• email@example.com
                    <br />• John Smith &lt;john@example.com&gt;
                  </p>
                  <textarea
                    id="email-list"
                    bind:value={manualInput}
                    rows="8"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="jane.doe@company.com
John Smith <john.smith@company.com>
mike@example.com, sarah@example.com"
                  ></textarea>
                </div>
              {:else}
                <!-- CSV Upload -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Upload CSV File
                  </label>
                  <p class="text-sm text-gray-500 mb-3">
                    CSV should have columns for email, name (optional), phone (optional), and role (optional)
                  </p>
                  
                  <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      bind:this={fileInput}
                      type="file"
                      accept=".csv,.txt"
                      onchange={handleFileUpload}
                      class="hidden"
                      id="csv-upload"
                    />
                    
                    <Icon name="upload" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    
                    {#if csvFileName}
                      <p class="text-sm font-medium text-gray-900 mb-2">{csvFileName}</p>
                    {/if}
                    
                    <label
                      for="csv-upload"
                      class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white 
                             font-medium rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                    >
                      <Icon name="upload" class="w-4 h-4" />
                      {csvFileName ? 'Choose Different File' : 'Choose CSV File'}
                    </label>
                    
                    <p class="text-xs text-gray-500 mt-2">
                      Max file size: 5MB
                    </p>
                  </div>
                  
                  <details class="mt-4">
                    <summary class="text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
                      CSV Format Example
                    </summary>
                    <pre class="mt-2 p-3 bg-gray-50 rounded-lg text-xs overflow-x-auto">
email,name,phone,role
john@example.com,John Smith,+1234567890,team_member
jane@example.com,Jane Doe,,manager
mike@example.com,,,team_member</pre>
                  </details>
                </div>
              {/if}
            {:else}
              <!-- Preview -->
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">
                  Preview Invitations ({inviteList.length})
                </h3>
                
                <div class="space-y-2 max-h-96 overflow-y-auto">
                  {#each inviteList as invite, index}
                    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-900 truncate">
                          {invite.email}
                        </p>
                        {#if invite.name}
                          <p class="text-sm text-gray-600">{invite.name}</p>
                        {/if}
                      </div>
                      
                      <select
                        value={invite.role}
                        onchange={(e) => updateInviteRole(index, e.currentTarget.value as UserRole)}
                        class="px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                      >
                        {#each availableRoles() as role}
                          <option value={role.value}>{role.label}</option>
                        {/each}
                      </select>
                      
                      <button
                        onclick={() => removeInvite(index)}
                        class="p-1 hover:bg-gray-200 rounded transition-colors"
                        aria-label="Remove invite"
                      >
                        <Icon name="x" class="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  {/each}
                </div>
                
                <div class="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p class="text-sm text-blue-900">
                    <strong>Summary:</strong> {inviteList.length} invitation{inviteList.length !== 1 ? 's' : ''} will be sent
                    {#if personalMessage}
                      with your personal message
                    {/if}
                  </p>
                </div>
              </div>
            {/if}
          </div>
          
          <!-- Footer -->
          <div class="flex gap-3 p-6 border-t bg-gray-50">
            {#if !showPreview}
              <button
                onclick={onClose}
                class="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 
                       font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onclick={activeTab === 'manual' ? handleManualInput : () => fileInput?.click()}
                disabled={activeTab === 'manual' ? !manualInput.trim() : !csvFileName}
                class="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg
                       hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {activeTab === 'manual' ? 'Process Emails' : 'Process CSV'}
              </button>
            {:else}
              <button
                onclick={() => showPreview = false}
                class="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 
                       font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onclick={sendInvites}
                disabled={isLoading}
                class="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg
                       hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2"
              >
                {#if isLoading}
                  <Icon name="loader2" class="w-4 h-4 animate-spin" />
                  Sending...
                {:else}
                  <Icon name="send" class="w-4 h-4" />
                  Send {inviteList.length} Invitation{inviteList.length !== 1 ? 's' : ''}
                {/if}
              </button>
            {/if}
          </div>
        {:else}
          <!-- Results View -->
          <div class="p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold text-gray-900">
                Bulk Invite Results
              </h2>
              <button
                onclick={onClose}
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <Icon name="x" class="w-5 h-5" />
              </button>
            </div>
            
            {#if bulkResult}
              <!-- Summary -->
              <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Icon name="checkCircle" class="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p class="text-2xl font-bold text-green-900">
                        {bulkResult.successful.length}
                      </p>
                      <p class="text-sm text-green-700">Successful</p>
                    </div>
                  </div>
                </div>
                
                {#if bulkResult.failed.length > 0}
                  <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <Icon name="xCircle" class="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p class="text-2xl font-bold text-red-900">
                          {bulkResult.failed.length}
                        </p>
                        <p class="text-sm text-red-700">Failed</p>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
              
              <!-- Successful Invites -->
              {#if bulkResult.successful.length > 0}
                <div class="mb-6">
                  <h3 class="font-medium text-gray-900 mb-3">Successfully Sent</h3>
                  <div class="space-y-2 max-h-64 overflow-y-auto">
                    {#each bulkResult.successful as invite}
                      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p class="font-medium text-gray-900">{invite.recipientEmail}</p>
                          {#if invite.recipientName}
                            <p class="text-sm text-gray-600">{invite.recipientName}</p>
                          {/if}
                        </div>
                        <div class="text-right">
                          <p class="text-sm font-mono font-bold text-gray-900">{invite.code}</p>
                          <p class="text-xs text-gray-500">{invite.invitedRole}</p>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
              
              <!-- Failed Invites -->
              {#if bulkResult.failed.length > 0}
                <div class="mb-6">
                  <h3 class="font-medium text-red-900 mb-3">Failed to Send</h3>
                  <div class="space-y-2">
                    {#each bulkResult.failed as failure}
                      <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p class="font-medium text-red-900">{failure.email}</p>
                        <p class="text-sm text-red-700">{failure.error}</p>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
              
              <!-- Actions -->
              <div class="flex gap-3">
                {#if bulkResult.successful.length > 0}
                  <button
                    onclick={downloadAllInvites}
                    class="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 
                           font-medium rounded-lg hover:bg-gray-50 transition-colors
                           flex items-center justify-center gap-2"
                  >
                    <Icon name="download" class="w-4 h-4" />
                    Download All Invites
                  </button>
                {/if}
                <button
                  onclick={startNewBulk}
                  class="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg
                         hover:bg-blue-700 transition-colors"
                >
                  Create More Invites
                </button>
              </div>
            {/if}
          </div>
        {/if}
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