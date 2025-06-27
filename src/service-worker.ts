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
    const cached = await cache.match(request);
    if (cached) return cached;
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      // Try to get the offline page from any cache
      const offlinePage = await caches.match('/offline');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    // Return generic offline response
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
    event.waitUntil(syncOfflineOperations());
  }
});

// Sync offline operations when back online
async function syncOfflineOperations(): Promise<void> {
  // Notify all clients that sync is starting
  const clients = await sw.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_START',
      message: 'Syncing offline operations...'
    });
  });
  
  // The actual sync logic will be handled by the offline store
  // when it receives this message
}

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