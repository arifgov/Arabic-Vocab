// Service Worker for Madinah Arabic Vocab Trainer
// IMPORTANT: Update APP_VERSION when releasing a new version to force cache refresh
const APP_VERSION = '1.0.0'; // Update this with each release (e.g., '1.0.1', '1.1.0', etc.)
const CACHE_NAME = `arabic-vocab-${APP_VERSION}`;
const STATIC_CACHE = `arabic-vocab-static-${APP_VERSION}`;
const DATA_CACHE = `arabic-vocab-data-${APP_VERSION}`;

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/manifest.json'
];

// Data files to cache
const DATA_FILES = [
  '/data/book1.json',
  '/data/book2.json'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing version', APP_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('Service Worker: Caching static files');
      // Add version query param to bust cache
      const versionedFiles = STATIC_FILES.map(file => {
        const separator = file.includes('?') ? '&' : '?';
        return file + separator + 'v=' + APP_VERSION;
      });
      return cache.addAll(versionedFiles).catch((err) => {
        // If versioned files fail, try original files
        console.warn('Failed to cache versioned files, trying originals:', err);
        return cache.addAll(STATIC_FILES);
      });
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...', APP_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL old caches that don't match current version
          if (!cacheName.includes(APP_VERSION)) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Force all clients to reload to get new version
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATE', version: APP_VERSION });
        });
      });
    })
  );
  return self.clients.claim(); // Take control of all pages
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip Firebase and external requests
  if (url.origin.includes('firebase') || url.origin.includes('googleapis') || url.origin.includes('gstatic')) {
    return; // Let these go to network
  }

  // Skip chrome-extension and other unsupported schemes
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:' || url.protocol === 'safari-extension:') {
    return; // Don't try to cache extension URLs
  }

  // Handle data files (JSON)
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            return response; // Serve from cache
          }
          return fetch(request).then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => {
            // If network fails and no cache, return a basic response
            return new Response(JSON.stringify({ error: 'Offline' }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        });
      })
    );
    return;
  }

  // Handle static files
  event.respondWith(
    caches.match(request).then((response) => {
        return response || fetch(request).then((response) => {
        // Don't cache non-GET requests
        if (request.method !== 'GET') {
          return response;
        }
        // Don't cache chrome-extension URLs or other unsupported schemes
        if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:' || url.protocol === 'safari-extension:') {
          return response;
        }
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone).catch(err => {
              // Silently fail if caching fails (e.g., for extension URLs)
              console.warn('Failed to cache:', request.url, err);
            });
          });
        }
        return response;
      }).catch(() => {
        // If offline and HTML request, return cached index.html
        if (request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Background sync for progress (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncProgress());
  }
});

async function syncProgress() {
  // This will be called when connection is restored
  console.log('Service Worker: Syncing progress...');
  // The main app will handle the actual sync
}

