/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version, prerendered } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;
const sw = self;
const CACHE_NAME = `vahst-cache-${version}`;

// Different cache strategies for different resource types
const CACHE_STRATEGIES = {
  // Static assets (JS, CSS, images) - cache first
  static: {
    cacheName: `static-${version}`,
    pattern: /\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/,
    strategy: 'cache-first',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  // API calls for client data - network first with cache fallback
  clients: {
    cacheName: `clients-${version}`,
    pattern: /\/api\/clients/,
    strategy: 'network-first',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  // Job data - stale while revalidate
  jobs: {
    cacheName: `jobs-${version}`,
    pattern: /\/api\/jobs/,
    strategy: 'stale-while-revalidate',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  },
  // HTML pages - network first
  pages: {
    cacheName: `pages-${version}`,
    pattern: /\.html$|\/$/,
    strategy: 'network-first',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
};

// Assets to cache immediately on install
const STATIC_ASSETS = [
  ...build,
  ...files,
  ...prerendered,
  '/offline' // Add offline page to static assets
];

// Install event - cache static assets
sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STRATEGIES.static.cacheName)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => sw.skipWaiting())
  );
});

// Activate event - clean up old caches
sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      // Delete old caches
      for (const key of keys) {
        if (!Object.values(CACHE_STRATEGIES).some(s => s.cacheName === key)) {
          await caches.delete(key);
        }
      }
    }).then(() => sw.clients.claim())
  );
});

// Fetch event - implement caching strategies
sw.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http protocols
  if (!url.protocol.startsWith('http')) return;

  // Find matching cache strategy
  let strategy = null;
  let cacheName = null;

  for (const [key, config] of Object.entries(CACHE_STRATEGIES)) {
    if (config.pattern.test(url.pathname)) {
      strategy = config.strategy;
      cacheName = config.cacheName;
      break;
    }
  }

  // Default to network-first for unmatched requests
  if (!strategy) {
    strategy = 'network-first';
    cacheName = CACHE_STRATEGIES.pages.cacheName;
  }

  event.respondWith(handleRequest(request, strategy, cacheName));
});

// Request handling based on strategy
async function handleRequest(request: Request, strategy: string, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);

  switch (strategy) {
    case 'cache-first':
      return cacheFirst(cache, request);
    case 'network-first':
      return networkFirst(cache, request);
    case 'stale-while-revalidate':
      return staleWhileRevalidate(cache, request);
    default:
      return fetch(request);
  }
}

// Cache-first strategy - good for static assets
async function cacheFirst(cache: Cache, request: Request): Promise<Response> {
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline response for static assets
    return new Response('Offline - resource not available', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network-first strategy - good for HTML and API calls
async function networkFirst(cache: Cache, request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Try cache first
    const cached = await cache.match(request);
    if (cached) return cached;
    
    // For navigation requests, return the offline page
    if (request.destination === 'document' || request.mode === 'navigate') {
      // Try to get the offline page from any cache
      for (const cacheName of await caches.keys()) {
        const cache = await caches.open(cacheName);
        const offlinePage = await cache.match('/offline');
        if (offlinePage) {
          return offlinePage;
        }
      }
      
      // If offline page not found, return a basic offline response
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Offline - VAHST</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: sans-serif; text-align: center; padding: 50px; }
              h1 { color: #333; }
              button { padding: 10px 20px; margin-top: 20px; cursor: pointer; }
            </style>
          </head>
          <body>
            <h1>You're Offline</h1>
            <p>Please check your internet connection.</p>
            <button onclick="location.reload()">Try Again</button>
          </body>
        </html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }
    
    // Return generic offline response for other requests
    return new Response('Offline - resource not available', { 
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

// Stale-while-revalidate - return cache immediately, update in background
async function staleWhileRevalidate(cache: Cache, request: Request): Promise<Response> {
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || fetchPromise;
}

// Handle background sync for offline operations
sw.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-operations') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Handle background sync with proper error handling and retries
async function handleBackgroundSync(): Promise<void> {
  console.log('Background sync triggered');
  
  try {
    // Get all clients
    const clients = await sw.clients.matchAll({ type: 'window' });
    
    if (clients.length === 0) {
      // No active clients, try to process queue directly
      // This would require implementing queue processing in the service worker
      // For now, we'll wait for a client to be available
      console.log('No active clients for background sync');
      return;
    }
    
    // Notify all clients to start syncing
    const syncPromises = clients.map(client => {
      return new Promise<void>((resolve) => {
        // Set up one-time message listener for sync completion
        const messageHandler = (event: MessageEvent) => {
          if (event.data?.type === 'SYNC_COMPLETE' || event.data?.type === 'SYNC_FAILED') {
            resolve();
          }
        };
        
        // Listen for response
        const channel = new MessageChannel();
        channel.port1.onmessage = messageHandler;
        
        // Send sync message with port for response
        client.postMessage({
          type: 'SYNC_START',
          message: 'Starting background sync...'
        }, [channel.port2]);
        
        // Timeout after 30 seconds
        setTimeout(() => resolve(), 30000);
      });
    });
    
    // Wait for at least one client to complete sync
    await Promise.race(syncPromises);
    console.log('Background sync completed');
    
  } catch (error) {
    console.error('Background sync failed:', error);
    // Re-register sync to try again later
    const registration = sw.registration;
    if ('sync' in registration) {
      await registration.sync.register('sync-offline-operations');
    }
  }
}

// Listen for sync status updates from clients
sw.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_STATUS') {
    // Broadcast sync status to all clients
    sw.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        if (client.id !== event.source?.id) {
          client.postMessage(event.data);
        }
      });
    });
  }
});

// Handle push notifications
sw.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options: NotificationOptions = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-96.png',
      vibrate: [200, 100, 200],
      data: data.data,
      actions: data.actions || [],
      tag: data.tag || 'vahst-notification',
      requireInteraction: data.requireInteraction || false
    };
    
    event.waitUntil(
      sw.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Handle action clicks
  if (event.action === 'view' && event.notification.data?.url) {
    event.waitUntil(
      sw.clients.openWindow(event.notification.data.url)
    );
  } else {
    // Default action - focus or open the app
    event.waitUntil(
      sw.clients.matchAll({ type: 'window' }).then(windowClients => {
        // Check if there is already a window/tab open
        for (const client of windowClients) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (sw.clients.openWindow) {
          return sw.clients.openWindow('/');
        }
      })
    );
  }
});

// Listen for skip waiting message from client
sw.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    sw.skipWaiting();
  }
});