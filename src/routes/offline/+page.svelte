<script lang="ts">
	import { browser } from '$app/environment';
	
	let isOnline = $state(false);
	
	$effect(() => {
		if (browser) {
			isOnline = navigator.onLine;
			
			const handleOnline = () => isOnline = true;
			const handleOffline = () => isOnline = false;
			
			window.addEventListener('online', handleOnline);
			window.addEventListener('offline', handleOffline);
			
			return () => {
				window.removeEventListener('online', handleOnline);
				window.removeEventListener('offline', handleOffline);
			};
		}
	});
	
	function retry() {
		if (browser) {
			window.location.reload();
		}
	}
</script>

<svelte:head>
	<title>Offline - VAHST</title>
	<meta name="description" content="You are currently offline. VAHST will reconnect when your internet connection is restored." />
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
	<div class="max-w-md w-full text-center">
		<!-- Offline Icon -->
		<div class="mb-8">
			<svg class="w-24 h-24 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
					d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414">
				</path>
			</svg>
		</div>
		
		<!-- Message -->
		<h1 class="text-2xl font-bold text-gray-900 mb-4">
			You're Offline
		</h1>
		
		<p class="text-gray-600 mb-8">
			It looks like you've lost your internet connection. 
			{#if isOnline}
				<span class="text-green-600 font-medium">Connection restored! Refreshing...</span>
			{:else}
				Don't worry, your work is saved locally and will sync when you're back online.
			{/if}
		</p>
		
		<!-- Features available offline -->
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
		
		<!-- Retry Button -->
		<button
			onclick={retry}
			class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
			disabled={isOnline}
		>
			{#if isOnline}
				Refreshing...
			{:else}
				Try Again
			{/if}
		</button>
		
		<!-- Auto-refresh when back online -->
		{#if isOnline}
			{@const _ = setTimeout(() => window.location.reload(), 1000)}
		{/if}
	</div>
</div>