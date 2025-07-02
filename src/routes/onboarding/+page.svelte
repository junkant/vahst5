<!-- src/routes/onboarding/+page.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { useAuth } from '$lib/stores/auth.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  const auth = useAuth();
  
  // Redirect if not authenticated
  $effect(() => {
    if (!auth.isLoading && !auth.user) {
      goto('/');
    }
  });
  
  // Onboarding state
  let currentStep = $state(1);
  const totalSteps = 4;
  
  let onboardingData = $state({
    industry: '',
    teamSize: '',
    services: [],
    modules: [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: 'USD'
  });
  
  // Available options
  const industries = [
    { value: 'hvac', label: 'HVAC', icon: '❄️' },
    { value: 'plumbing', label: 'Plumbing', icon: '🔧' },
    { value: 'electrical', label: 'Electrical', icon: '⚡' },
    { value: 'general', label: 'General Contractor', icon: '🏗️' },
    { value: 'other', label: 'Other', icon: '🛠️' }
  ];
  
  const teamSizes = [
    { value: '1', label: 'Just me' },
    { value: '2-5', label: '2-5 people' },
    { value: '6-10', label: '6-10 people' },
    { value: '11+', label: '11+ people' }
  ];
  
  const services = [
    'Installation',
    'Repair',
    'Maintenance',
    'Emergency Services',
    'Inspections',
    'Consultations'
  ];
  
  const serviceModules = [
    { value: 'hvac', label: 'HVAC Services', icon: '❄️', description: 'Heating, ventilation, and air conditioning' },
    { value: 'plumbing', label: 'Plumbing', icon: '🔧', description: 'Residential and commercial plumbing' },
    { value: 'electrical', label: 'Electrical', icon: '⚡', description: 'Electrical installation and repair' },
    { value: 'appliance', label: 'Appliance Repair', icon: '🔌', description: 'Major appliance service and repair' },
    { value: 'refrigeration', label: 'Refrigeration', icon: '🧊', description: 'Commercial refrigeration systems' },
    { value: 'construction', label: 'General Construction', icon: '🏗️', description: 'General contracting and construction' }
  ];
  
  function toggleModule(module) {
    const index = onboardingData.modules.indexOf(module);
    if (index > -1) {
      onboardingData.modules.splice(index, 1);
    } else {
      onboardingData.modules.push(module);
    }
  }
  
  // Calculate pricing
  let basePrice = 39.99;
  let modulePrice = 12;
  let totalMonthlyPrice = $derived(basePrice + (onboardingData.modules.length * modulePrice));
  
  function nextStep() {
    if (currentStep < totalSteps) {
      currentStep++;
    }
  }
  
  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
    }
  }
  
  function toggleService(service) {
    const index = onboardingData.services.indexOf(service);
    if (index > -1) {
      onboardingData.services.splice(index, 1);
    } else {
      onboardingData.services.push(service);
    }
  }
  
  async function completeOnboarding() {
    // In a real app, you would save this data to the tenant
    console.log('Onboarding complete:', onboardingData);
    
    // For now, just redirect to the app
    goto('/my-day');
  }
  
  // Progress calculation
  let progress = $derived((currentStep / totalSteps) * 100);
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
  <!-- Header -->
  <header class="bg-white shadow-sm">
    <div class="max-w-3xl mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold text-gray-900">Welcome to Vahst</h1>
        <button
          onclick={() => auth.signOut()}
          class="text-sm text-gray-500 hover:text-gray-700"
        >
          Sign Out
        </button>
      </div>
      
      <!-- Progress Bar -->
      <div class="mt-4">
        <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style="width: {progress}%"
          ></div>
        </div>
      </div>
    </div>
  </header>
  
  <!-- Content -->
  <main class="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
    {#if currentStep === 1}
      <!-- Step 1: Industry -->
      <div class="bg-white rounded-lg shadow p-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">What industry are you in?</h2>
        <p class="text-gray-600 mb-8">This helps us customize Vahst for your specific needs.</p>
        
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          {#each industries as industry}
            <button
              onclick={() => onboardingData.industry = industry.value}
              class="p-6 border-2 rounded-lg text-center transition-all
                     {onboardingData.industry === industry.value 
                       ? 'border-blue-600 bg-blue-50' 
                       : 'border-gray-200 hover:border-gray-300'}"
            >
              <div class="text-4xl mb-2">{industry.icon}</div>
              <div class="font-medium text-gray-900">{industry.label}</div>
            </button>
          {/each}
        </div>
      </div>
    {/if}
    
    {#if currentStep === 2}
      <!-- Step 2: Team Size & Services -->
      <div class="bg-white rounded-lg shadow p-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Tell us about your business</h2>
        <p class="text-gray-600 mb-8">We'll use this to set up your account properly.</p>
        
        <!-- Team Size -->
        <div class="mb-8">
          <label class="block text-sm font-medium text-gray-700 mb-3">
            How many people are on your team?
          </label>
          <div class="grid grid-cols-2 gap-3">
            {#each teamSizes as size}
              <button
                onclick={() => onboardingData.teamSize = size.value}
                class="p-3 border rounded-lg text-center transition-all
                       {onboardingData.teamSize === size.value 
                         ? 'border-blue-600 bg-blue-50 text-blue-700' 
                         : 'border-gray-200 hover:border-gray-300'}"
              >
                {size.label}
              </button>
            {/each}
          </div>
        </div>
        
        <!-- Services -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-3">
            What services do you offer? (Select all that apply)
          </label>
          <div class="grid grid-cols-2 gap-3">
            {#each services as service}
              <button
                onclick={() => toggleService(service)}
                class="p-3 border rounded-lg text-left transition-all
                       {onboardingData.services.includes(service) 
                         ? 'border-blue-600 bg-blue-50 text-blue-700' 
                         : 'border-gray-200 hover:border-gray-300'}"
              >
                <div class="flex items-center">
                  <div class="w-5 h-5 mr-3 border-2 rounded flex items-center justify-center
                              {onboardingData.services.includes(service) 
                                ? 'border-blue-600 bg-blue-600' 
                                : 'border-gray-300'}">
                    {#if onboardingData.services.includes(service)}
                      <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                      </svg>
                    {/if}
                  </div>
                  {service}
                </div>
              </button>
            {/each}
          </div>
        </div>
      </div>
    {/if}
    
    {#if currentStep === 3}
      <!-- Step 3: Service Modules -->
      <div class="bg-white rounded-lg shadow p-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Choose Your Service Modules</h2>
        <p class="text-gray-600 mb-8">Add modules for the services you provide. You can change these anytime.</p>
        
        <!-- Base Pricing -->
        <div class="bg-gray-50 rounded-lg p-6 mb-8">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-semibold text-gray-900">Base Platform</h3>
              <p class="text-sm text-gray-600">All core features included</p>
            </div>
            <div class="text-right">
              <span class="text-2xl font-bold text-gray-900">$39.99</span>
              <p class="text-sm text-gray-600">per user/month</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Unlimited clients & jobs
            </div>
            <div class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Voice-powered workflows
            </div>
            <div class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Scheduling & dispatch
            </div>
            <div class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Invoicing & payments
            </div>
          </div>
        </div>
        
        <!-- Service Modules -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-900">Service Modules</h3>
            <div class="text-right">
              <span class="text-lg font-bold text-gray-900">+$12</span>
              <span class="text-sm text-gray-600">per module/month</span>
            </div>
          </div>
          
          <div class="grid gap-3">
            {#each serviceModules as module}
              <button
                onclick={() => toggleModule(module.value)}
                class="p-4 border-2 rounded-lg text-left transition-all flex items-start
                       {onboardingData.modules.includes(module.value) 
                         ? 'border-blue-600 bg-blue-50' 
                         : 'border-gray-200 hover:border-gray-300'}"
              >
                <div class="text-2xl mr-4">{module.icon}</div>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <h4 class="font-medium text-gray-900">{module.label}</h4>
                    <div class="w-5 h-5 border-2 rounded flex items-center justify-center
                                {onboardingData.modules.includes(module.value) 
                                  ? 'border-blue-600 bg-blue-600' 
                                  : 'border-gray-300'}">
                      {#if onboardingData.modules.includes(module.value)}
                        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                        </svg>
                      {/if}
                    </div>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">{module.description}</p>
                </div>
              </button>
            {/each}
          </div>
        </div>
        
        <!-- Total Pricing -->
        <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-gray-900">Monthly Total</h3>
              <p class="text-sm text-gray-600">
                Base platform + {onboardingData.modules.length} module{onboardingData.modules.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div class="text-right">
              <span class="text-3xl font-bold text-gray-900">${totalMonthlyPrice.toFixed(2)}</span>
              <p class="text-sm text-gray-600">per user/month</p>
            </div>
          </div>
        </div>
      </div>
    {/if}
    
    {#if currentStep === 4}
      <!-- Step 4: Payment (Mock) -->
      <div class="bg-white rounded-lg shadow p-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Start your free trial</h2>
        <p class="text-gray-600 mb-8">No payment required for 14 days. We'll remind you before your trial ends.</p>
        
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div class="flex items-center">
            <svg class="w-12 h-12 text-blue-600 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <h3 class="font-semibold text-gray-900">Your trial includes:</h3>
              <ul class="text-sm text-gray-600 mt-1">
                <li>• All {onboardingData.plan} plan features</li>
                <li>• Unlimited clients and jobs</li>
                <li>• Full customer support</li>
                <li>• No credit card required</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="border border-gray-200 rounded-lg p-6">
          <h3 class="font-medium text-gray-900 mb-4">After your trial</h3>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">Selected plan:</span>
              <span class="font-medium text-gray-900">
                Full Access
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Base platform:</span>
              <span class="font-medium text-gray-900">
                $39.99/user/month
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Service modules ({onboardingData.modules.length}):</span>
              <span class="font-medium text-gray-900">
                ${(onboardingData.modules.length * modulePrice).toFixed(2)}/month
              </span>
            </div>
            <hr class="my-3">
            <div class="flex justify-between font-semibold">
              <span class="text-gray-900">Total monthly:</span>
              <span class="text-gray-900">
                ${totalMonthlyPrice.toFixed(2)}/user
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Trial ends:</span>
              <span class="font-medium text-gray-900">
                {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <p class="text-sm text-gray-500 mt-4">
            We'll send you a reminder 3 days before your trial ends. You can cancel anytime.
          </p>
        </div>
      </div>
    {/if}
    
    <!-- Navigation Buttons -->
    <div class="flex justify-between mt-8">
      <button
        onclick={prevStep}
        disabled={currentStep === 1}
        class="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      
      {#if currentStep < totalSteps}
        <button
          onclick={nextStep}
          disabled={
            (currentStep === 1 && !onboardingData.industry) ||
            (currentStep === 2 && (!onboardingData.teamSize || onboardingData.services.length === 0))
          }
          class="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Step
        </button>
      {:else}
        <button
          onclick={completeOnboarding}
          class="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Start Using Vahst
        </button>
      {/if}
    </div>
  </main>
</div>