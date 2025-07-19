// Service Worker for Scrap Calculator PWA
const CACHE_NAME = 'scrap-calculator-v3';
const urlsToCache = [
    '/',
    '/index.html',
    '/src/styles/main.css',
    '/src/js/services/CalculationService.js',
    '/src/js/services/DisplayManager.js',
    '/src/js/services/DataManager.js',
    '/src/js/AppController.js',
    '/src/js/app.js',
    '/src/js/storage.js',
    '/src/js/charts.js',
    '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Cache opened');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: All resources cached');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - network first, fallback to cache (better for development)
self.addEventListener('fetch', (event) => {
    // Skip caching for unsupported schemes
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // If network succeeds, update cache and return response
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                }
                return response;
            })
            .catch(() => {
                // If network fails, try cache
                return caches.match(event.request)
                    .then((response) => {
                        if (response) {
                            return response;
                        }
                        // If both fail and it's a document request, return offline page
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// TODO: Background sync will be implemented in Phase 2 for sync codes
// TODO: Push notifications will be implemented for weekly goal reminders
// TODO: Notification click handler will be added with push notifications