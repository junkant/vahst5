<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	
	let isOnline = $state(false);
	let previousPage = $state('');
	let checkInterval: ReturnType<typeof setInterval> | null = null;
	
	$effect(() => {
		if (browser) {
			// Get where we came from
			previousPage = document.referrer || '/my-day';
			
			// Check connection status without refreshing page
			const checkConnection = () => {
				isOnline = navigator.onLine;
			};
			
			// Initial check
			checkConnection();
			
			// Check every 6 seconds
			checkInterval = setInterval(checkConnection, 6000);
			
			// Listen for connection changes
			window.addEventListener('online', checkConnection);
			window.addEventListener('offline', checkConnection);
			
			// Cleanup
			return () => {
				if (checkInterval) clearInterval(checkInterval);
				window.removeEventListener('online', checkConnection);
				window.removeEventListener('offline', checkConnection);
			};
		}
	});
	
	function goBack() {
		if (browser) {
			// Go to previous page or my-day
			window.location.href = previousPage;
		}
	}
	
	function goToMyDay() {
		if (browser) {
			goto('/my-day');
		}
	}
</script>

<svelte:head>
	<title>Offline - VAHST</title>
	<meta name="description" content="You are currently offline. VAHST will reconnect when your internet connection is restored." />
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
	<div class="max-w-md w-full text-center">
		<!-- Status Icon -->
		<div class="mb-8">
			{#if isOnline}
				<!-- Online Icon -->
				<svg class="w-24 h-24 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
						d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0">
					</path>
				</svg>
			{:else}
				<!-- Offline Icon -->
				<svg class="w-24 h-24 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
						d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414">
					</path>
				</svg>
			{/if}
		</div>
		
		<!-- Title -->
		<h1 class="text-2xl font-bold text-gray-900 mb-4">
			{#if isOnline}
				Connection Restored! 🟢
			{:else}
				You're Offline
			{/if}
		</h1>
		
		<!-- Message -->
		<p class="text-gray-600 mb-8">
			{#if isOnline}
				Your internet connection is back. You can continue where you left off.
			{:else}
				It looks like you've lost your internet connection. Don't worry, your work is saved locally and will sync when you're back online.
				<span class="text-sm block mt-2 text-gray-500">
					Checking connection in the background...
				</span>
			{/if}
		</p>
		
		<!-- Features available offline (only show when offline) -->
		{#if !isOnline}
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Available Offline:</h2>
				<ul class="space-y-3 text-left">
					<li class="flex items-start">
						<svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
						</svg>
						<span class="text-gray-600">View cached client information</span>
					</li>
					<li class="flex items-start">
						<svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
						</svg>
						<span class="text-gray-600">Create and edit jobs</span>
					</li>
					<li class="flex items-start">
						<svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
						</svg>
						<span class="text-gray-600">Take photos and notes</span>
					</li>
				</ul>
			</div>
		{/if}
		
		<!-- Action Buttons -->
		<div class="space-y-3">
			{#if isOnline}
				<button
					onclick={goBack}
					class="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
				>
					Continue Where You Left Off
				</button>
			{/if}
			
			<button
				onclick={goToMyDay}
				class="w-full inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
			>
				Go to My Day
			</button>
		</div>
	</div>
</div>