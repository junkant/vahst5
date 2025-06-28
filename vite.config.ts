import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// Function to check if certificates exist
function getCertificates() {
  const certPath = path.resolve('./.cert/localhost.pem');
  const keyPath = path.resolve('./.cert/localhost-key.pem');
  
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    };
  }
  
  return null;
}

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		// Try to use custom certificates first, otherwise let Vite handle it
		https: getCertificates() || true,
		// Optional: specify port
		port: 5173,
		// Optional: open browser automatically
		open: true
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					// Split Firebase into separate chunks for better caching
					'firebase-auth': ['firebase/auth'],
					'firebase-firestore': ['firebase/firestore'],
					'firebase-messaging': ['firebase/messaging'],
					// Group UI components
					'ui-vendor': ['@melt-ui/svelte', 'lucide-svelte'],
					// Other large dependencies
					'vendor': ['date-fns']
				}
			}
		}
	},
	test: {
		projects: [
			{
				extends: './vite.config.js',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.js',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});