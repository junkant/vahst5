import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		
		// Enable service worker
		serviceWorker: {
			register: true,
		},
		
		// Prerender configuration
		prerender: {
			// Prerender the landing page and other static pages
			entries: [
				'/',
				'/offline',
				'/robots.txt',
				'/sitemap.xml'
			],
			handleHttpError: ({ path, referrer, message }) => {
				// Ignore 404s for dynamic routes
				if (path.startsWith('/app') || path.includes('/(app)')) {
					return;
				}
				throw new Error(message);
			}
		},
		
		// CSP headers for security
		csp: {
			directives: {
				'script-src': ['self', 'https://apis.google.com', 'https://www.gstatic.com'],
				'frame-src': ['self', 'https://vahst.firebaseapp.com'],
				'img-src': ['self', 'data:', 'https:'],
				'connect-src': ['self', 'https://*.googleapis.com', 'https://*.firebaseio.com', 'https://*.firebaseapp.com']
			}
		},
		
		// Alias configuration
		alias: {
			$components: 'src/lib/components',
			$stores: 'src/lib/stores',
			$utils: 'src/lib/utils',
			$firebase: 'src/lib/firebase'
		}
	}
};

export default config;