// vite.config.ts
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
  
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
      $components: path.resolve('./src/lib/components'),
      $stores: path.resolve('./src/lib/stores'),
      $utils: path.resolve('./src/lib/utils'),
      $types: path.resolve('./src/lib/types'),
      $firebase: path.resolve('./src/lib/firebase'),
      $ai: path.resolve('./src/lib/ai'),
      $voice: path.resolve('./src/lib/voice'),
      $constants: path.resolve('./src/lib/constants')
    }
  },
  
  server: {
    // Try to use custom certificates first, otherwise let Vite handle it
    https: getCertificates() || true,
    // Optional: specify port
    port: 5173,
    // Optional: open browser automatically
    open: true,
    // Add warmup for better dev performance
    warmup: {
      clientFiles: [
        './src/app.html',
        './src/routes/+layout.svelte',
        './src/lib/components/layout/BottomNav.svelte',
        './src/lib/components/layout/TopBar.svelte'
      ]
    }
  },
  
  // SSR configuration - FIXES THE MELT-UI ERROR
  ssr: {
    noExternal: [
      '@melt-ui/svelte',
      '@melt-ui/pp',
      '@floating-ui/core',
      '@floating-ui/dom',
      '@floating-ui/utils',
      '@internationalized/date',
      'dequal',
      'focus-trap',
      'nanoid/non-secure'
    ]
  },
  
  build: {
    // Optimize output
    target: 'esnext',
    minify: 'terser',
    
    // Better source maps for production debugging
    sourcemap: true,
    
    // Optimize CSS
    cssCodeSplit: true,
    cssMinify: true,
    
    // Control chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        // Optimize chunk names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/js/${facadeModuleId}-[hash].js`;
        },
        
        manualChunks: (id) => {
          // Firebase chunks
          if (id.includes('firebase/auth')) return 'firebase-auth';
          if (id.includes('firebase/firestore')) return 'firebase-firestore';
          if (id.includes('firebase/messaging')) return 'firebase-messaging';
          if (id.includes('firebase')) return 'firebase-core';
          
          // UI libraries - SKIP MELT-UI TO AVOID CHUNKING ISSUES
          // if (id.includes('@melt-ui/svelte')) return 'melt-ui';
          if (id.includes('lucide-svelte')) return 'lucide-icons';
          
          // Component chunks
          if (id.includes('/components/client/')) return 'client-components';
          if (id.includes('/components/common/')) return 'common-components';
          if (id.includes('/components/auth/')) return 'auth-components';
          
          // Store chunks
          if (id.includes('/stores/')) return 'stores';
          
          // Utilities
          if (id.includes('/utils/')) return 'utils';
          if (id.includes('date-fns')) return 'date-utils';
          
          // Other vendor libraries
          if (id.includes('node_modules') && !id.includes('@melt-ui')) return 'vendor';
        }
      },
      
      // Tree-shaking optimizations
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false
      }
    },
    
    // Terser options for better minification
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/messaging',
      '@melt-ui/svelte',
      '@melt-ui/pp',
      '@floating-ui/core',
      '@floating-ui/dom',
      '@internationalized/date',
      'dequal',
      'focus-trap',
      'nanoid/non-secure'
    ],
    exclude: ['@sveltejs/kit']
  },
  
  // Performance optimizations
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        // Enable strict mode for better tree-shaking
        strict: true,
        // Use newer JS features
        target: 'es2022'
      }
    }
  },
  
  // CSS optimizations
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase'
    }
  },
  
  // Enable caching in development
  cacheDir: '.vite',
  
  // Test configuration (unchanged)
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