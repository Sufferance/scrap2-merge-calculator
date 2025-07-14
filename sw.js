// Service Worker for Scrap Calculator PWA
const CACHE_NAME = 'scrap-calculator-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/src/styles/main.css',
    '/src/js/app.js',
    '/src/js/storage.js',
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

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
            .catch(() => {
                // If both cache and network fail, return offline page
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Background sync for future sync feature
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync-data') {
        event.waitUntil(
            // This will be implemented in Phase 2 for sync codes
            console.log('Background sync triggered')
        );
    }
});

// Push notifications (placeholder for future features)
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Weekly goal reminder',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-32x32.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('Scrap Calculator', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});