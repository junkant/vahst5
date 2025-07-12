<script lang="ts">
  import { calendarSettings } from '$lib/stores/calendar.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import { fade, slide } from 'svelte/transition';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
  
  // Tab state
  let activeTab = $state<'general' | 'calendar' | 'services' | 'team' | 'billing'>('general');
  
  const tenant = useTenant();
  const auth = useAuth();
  const toast = useToast();
  
  // Calendar settings
  const days = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ] as const;
  
  // Service types with default durations
  let serviceTypes = $state([
    { name: 'General', defaultDuration: 60, color: 'blue' },
    { name: 'HVAC', defaultDuration: 120, color: 'red' },
    { name: 'Plumbing', defaultDuration: 90, color: 'green' },
    { name: 'Electrical', defaultDuration: 90, color: 'yellow' },
    { name: 'Maintenance', defaultDuration: 60, color: 'purple' },
    { name: 'Inspection', defaultDuration: 45, color: 'pink' },
    { name: 'Installation', defaultDuration: 180, color: 'indigo' },
    { name: 'Repair', defaultDuration: 120, color: 'orange' },
    { name: 'Emergency', defaultDuration: 60, color: 'red' }
  ]);
  
  // Recurring task templates
  let taskTemplates = $state([
    { 
      name: 'Monthly HVAC Maintenance',
      serviceType: 'HVAC',
      duration: 60,
      description: 'Regular HVAC system check and filter replacement',
      recurrence: 'monthly'
    },
    {
      name: 'Quarterly Inspection',
      serviceType: 'Inspection',
      duration: 45,
      description: 'Comprehensive quarterly system inspection',
      recurrence: 'quarterly'
    }
  ]);
  
  function handleSave() {
    // Settings are automatically persisted by the store
    toast.success('Settings saved successfully');
  }
  
  function formatDayName(day: string): string {
    return day.charAt(0).toUpperCase() + day.slice(1);
  }
  
  function addServiceType() {
    serviceTypes = [...serviceTypes, { 
      name: '', 
      defaultDuration: 60, 
      color: 'gray' 
    }];
  }
  
  function removeServiceType(index: number) {
    serviceTypes = serviceTypes.filter((_, i) => i !== index);
  }
  
  function addTaskTemplate() {
    taskTemplates = [...taskTemplates, {
      name: '',
      serviceType: 'General',
      duration: 60,
      description: '',
      recurrence: 'weekly'
    }];
  }
  
  function removeTaskTemplate(index: number) {
    taskTemplates = taskTemplates.filter((_, i) => i !== index);
  }
</script>

<div class="max-w-6xl mx-auto p-6">
  <h1 class="text-2xl font-bold mb-6">Business Settings</h1>
  
  <!-- Tabs -->
  <div class="border-b border-gray-200 mb-6">
    <nav class="-mb-px flex space-x-8">
      <button
        onclick={() => activeTab = 'general'}
        class="py-2 px-1 border-b-2 font-medium text-sm transition-colors
          {activeTab === 'general' 
            ? 'border-blue-500 text-blue-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
      >
        General
      </button>
      <button
        onclick={() => activeTab = 'calendar'}
        class="py-2 px-1 border-b-2 font-medium text-sm transition-colors
          {activeTab === 'calendar' 
            ? 'border-blue-500 text-blue-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
      >
        Calendar & Scheduling
      </button>
      <button
        onclick={() => activeTab = 'services'}
        class="py-2 px-1 border-b-2 font-medium text-sm transition-colors
          {activeTab === 'services' 
            ? 'border-blue-500 text-blue-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
      >
        Services
      </button>
      <button
        onclick={() => activeTab = 'team'}
        class="py-2 px-1 border-b-2 font-medium text-sm transition-colors
          {activeTab === 'team' 
            ? 'border-blue-500 text-blue-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
      >
        Team
      </button>
      <button
        onclick={() => activeTab = 'billing'}
        class="py-2 px-1 border-b-2 font-medium text-sm transition-colors
          {activeTab === 'billing' 
            ? 'border-blue-500 text-blue-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
      >
        Billing
      </button>
    </nav>
  </div>
  
  <!-- Tab Content -->
  <div class="bg-white rounded-lg shadow">
    {#if activeTab === 'general'}
      <div class="p-6" transition:fade={{ duration: 200 }}>
        <h2 class="text-lg font-semibold mb-6">General Business Information</h2>
        
        <div class="space-y-4 max-w-2xl">
          <div>
            <label for="business-name" class="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <input
              id="business-name"
              type="text"
              value={tenant.current?.name || ''}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label for="business-type" class="block text-sm font-medium text-gray-700 mb-2">
              Business Type
            </label>
            <select
              id="business-type"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>HVAC Services</option>
              <option>Plumbing Services</option>
              <option>Electrical Services</option>
              <option>General Contractor</option>
              <option>Multi-Service Provider</option>
            </select>
          </div>
          
          <div>
            <label for="business-phone" class="block text-sm font-medium text-gray-700 mb-2">
              Business Phone
            </label>
            <input
              id="business-phone"
              type="tel"
              placeholder="(555) 123-4567"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label for="business-email" class="block text-sm font-medium text-gray-700 mb-2">
              Business Email
            </label>
            <input
              id="business-email"
              type="email"
              placeholder="contact@business.com"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label for="business-address" class="block text-sm font-medium text-gray-700 mb-2">
              Business Address
            </label>
            <input
              id="business-address"
              type="text"
              placeholder="123 Main St"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <div class="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="City"
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="State"
                maxlength="2"
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="ZIP"
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
      
    {:else if activeTab === 'calendar'}
      <div class="p-6" transition:fade={{ duration: 200 }}>
        <h2 class="text-lg font-semibold mb-6">Calendar & Scheduling Settings</h2>
        
        <!-- Time Slot Settings -->
        <div class="mb-8">
          <h3 class="text-md font-medium mb-4">Appointment Settings</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="time-slot-duration" class="block text-sm font-medium text-gray-700 mb-2">
                Time Slot Duration
              </label>
              <select
                id="time-slot-duration"
                bind:value={$calendarSettings.timeSlotDuration}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
            
            <div>
              <label for="default-appointment-duration" class="block text-sm font-medium text-gray-700 mb-2">
                Default Appointment Duration
              </label>
              <select
                id="default-appointment-duration"
                bind:value={$calendarSettings.defaultAppointmentDuration}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
                <option value={240}>4 hours</option>
              </select>
            </div>
            
            <div>
              <label for="buffer-time" class="block text-sm font-medium text-gray-700 mb-2">
                Buffer Between Appointments
              </label>
              <select
                id="buffer-time"
                bind:value={$calendarSettings.bufferTime}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>No buffer</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- Business Hours -->
        <div class="mb-8">
          <h3 class="text-md font-medium mb-4">Business Hours</h3>
          
          <div class="space-y-3">
            {#each days as day}
              <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
                <label class="flex items-center gap-2 min-w-[120px]">
                  <input
                    type="checkbox"
                    bind:checked={$calendarSettings.businessHours[day].enabled}
                    class="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span class="font-medium">{formatDayName(day)}</span>
                </label>
                
                {#if $calendarSettings.businessHours[day].enabled}
                  <div class="flex items-center gap-2 flex-1" transition:slide={{ duration: 200 }}>
                    <input
                      type="time"
                      bind:value={$calendarSettings.businessHours[day].start}
                      class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span class="text-gray-500">to</span>
                    <input
                      type="time"
                      bind:value={$calendarSettings.businessHours[day].end}
                      class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                {:else}
                  <div class="text-gray-400 italic">Closed</div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
        
        <!-- Recurring Task Templates -->
        <div>
          <h3 class="text-md font-medium mb-4">Recurring Task Templates</h3>
          
          <div class="space-y-3 mb-4">
            {#each taskTemplates as template, index}
              <div class="flex gap-4 items-start p-4 border border-gray-200 rounded-lg">
                <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    bind:value={template.name}
                    placeholder="Template name"
                    class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    bind:value={template.serviceType}
                    class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {#each serviceTypes as service}
                      <option value={service.name}>{service.name}</option>
                    {/each}
                  </select>
                  <select
                    bind:value={template.recurrence}
                    class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                  <select
                    bind:value={template.duration}
                    class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                  <textarea
                    bind:value={template.description}
                    placeholder="Template description"
                    class="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  ></textarea>
                </div>
                <button
                  onclick={() => removeTaskTemplate(index)}
                  class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Icon name="trash" size={20} />
                </button>
              </div>
            {/each}
          </div>
          
          <button
            onclick={addTaskTemplate}
            class="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Icon name="plus" size={20} />
            Add Template
          </button>
        </div>
      </div>
      
    {:else if activeTab === 'services'}
      <div class="p-6" transition:fade={{ duration: 200 }}>
        <h2 class="text-lg font-semibold mb-6">Service Types & Durations</h2>
        
        <div class="space-y-3 mb-4">
          {#each serviceTypes as service, index}
            <div class="flex gap-4 items-center">
              <input
                type="text"
                bind:value={service.name}
                placeholder="Service name"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                bind:value={service.defaultDuration}
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={30}>30 min default</option>
                <option value={45}>45 min default</option>
                <option value={60}>1 hour default</option>
                <option value={90}>1.5 hour default</option>
                <option value={120}>2 hour default</option>
                <option value={180}>3 hour default</option>
                <option value={240}>4 hour default</option>
              </select>
              <select
                bind:value={service.color}
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gray">Gray</option>
                <option value="red">Red</option>
                <option value="orange">Orange</option>
                <option value="yellow">Yellow</option>
                <option value="green">Green</option>
                <option value="blue">Blue</option>
                <option value="indigo">Indigo</option>
                <option value="purple">Purple</option>
                <option value="pink">Pink</option>
              </select>
              {#if serviceTypes.length > 1}
                <button
                  onclick={() => removeServiceType(index)}
                  class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Icon name="trash" size={20} />
                </button>
              {/if}
            </div>
          {/each}
        </div>
        
        <button
          onclick={addServiceType}
          class="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Icon name="plus" size={20} />
          Add Service Type
        </button>
      </div>
      
    {:else if activeTab === 'team'}
      <div class="p-6" transition:fade={{ duration: 200 }}>
        <h2 class="text-lg font-semibold mb-6">Team Settings</h2>
        
        <div class="space-y-6">
          <div>
            <h3 class="text-md font-medium mb-4">Team Calendar View</h3>
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                class="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span>Enable team calendar view</span>
            </label>
          </div>
          
          <div>
            <h3 class="text-md font-medium mb-4">Default Team Assignment</h3>
            <select
              class="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Auto-assign based on availability</option>
              <option>Manual assignment required</option>
              <option>Round-robin assignment</option>
            </select>
          </div>
          
          <div>
            <h3 class="text-md font-medium mb-4">Technician Availability</h3>
            <p class="text-sm text-gray-600 mb-4">
              Configure individual technician schedules in the Team section.
            </p>
            <a
              href="/settings/team"
              class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              Go to Team Settings
              <Icon name="arrowRight" size={16} />
            </a>
          </div>
        </div>
      </div>
      
    {:else if activeTab === 'billing'}
      <div class="p-6" transition:fade={{ duration: 200 }}>
        <h2 class="text-lg font-semibold mb-6">Billing & Invoicing</h2>
        
        <div class="space-y-6">
          <div>
            <label for="payment-terms" class="block text-sm font-medium text-gray-700 mb-2">
              Default Payment Terms
            </label>
            <select
              id="payment-terms"
              class="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Due on receipt</option>
              <option>Net 15</option>
              <option>Net 30</option>
              <option>Net 45</option>
              <option>Net 60</option>
            </select>
          </div>
          
          <div>
            <label for="invoice-prefix" class="block text-sm font-medium text-gray-700 mb-2">
              Invoice Prefix
            </label>
            <input
              id="invoice-prefix"
              type="text"
              placeholder="INV-"
              class="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label for="tax-rate" class="block text-sm font-medium text-gray-700 mb-2">
              Tax Rate (%)
            </label>
            <input
              id="tax-rate"
              type="number"
              step="0.01"
              placeholder="8.5"
              class="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <h3 class="text-md font-medium mb-4">Payment Methods</h3>
            <div class="space-y-2">
              <label class="flex items-center gap-2">
                <input type="checkbox" checked class="w-4 h-4 text-blue-600 rounded" />
                <span>Cash</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" checked class="w-4 h-4 text-blue-600 rounded" />
                <span>Check</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" checked class="w-4 h-4 text-blue-600 rounded" />
                <span>Credit Card</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" class="w-4 h-4 text-blue-600 rounded" />
                <span>ACH/Bank Transfer</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    {/if}
    
    <!-- Save Button -->
    <div class="px-6 py-4 bg-gray-50 border-t">
      <button
        onclick={handleSave}
        class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Save Settings
      </button>
    </div>
  </div>
</div>
