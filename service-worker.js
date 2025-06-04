// Define the cache name for this specific test
const CACHE_NAME = 'offline-test-v3'; // Incremented cache version

// Define the path for your GitHub Pages repository
const REPO_PATH = '/offlinetesttool/'; // UPDATED for your new repo name

// List of URLs to cache during installation
const urlsToCache = [
    REPO_PATH, // Caches the root of your GitHub Pages project (e.g., /offlinetesttool/)
    REPO_PATH + 'index.html',
    REPO_PATH + 'manifest.json'
];

// Install event: Fired when the service worker is installed
self.addEventListener('install', (event) => {
    console.log('Service Worker: Install event triggered. Caching:', urlsToCache);
    self.skipWaiting(); // Activate the new service worker immediately

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching app shell for offline test.');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Failed to cache URLs during install:', error);
            })
    );
});

// Activate event: Fired when the service worker is activated
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activate event triggered. Claiming clients.');
    self.clients.claim(); // Take control of all clients immediately

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old caches that are not the current one
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event: Intercept network requests
self.addEventListener('fetch', (event) => {
    console.log('Service Worker: Fetching', event.request.url);
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // If asset is in cache, return it
                if (response) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return response;
                }
                // Otherwise, fetch from network
                console.log('Service Worker: Fetching from network', event.request.url);
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Cache new requests if they are valid
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        return networkResponse;
                    })
                    .catch(() => {
                        // Fallback for network failures (e.g., offline)
                        console.log('Service Worker: Network request failed for', event.request.url);
                        if (event.request.mode === 'navigate') {
                            // If it's a navigation request (e.g., user typed URL or clicked link)
                            // and we are offline, return a specific offline HTML page.
                            return new Response('<h1>You are offline!</h1><p>This page could not be served from cache.</p>', {
                                headers: { 'Content-Type': 'text/html' }
                            });
                        }
                        // For other types of requests (e.g., images, scripts) that fail,
                        // just return an empty response to prevent a full page crash.
                        return new Response('');
                    });
            })
    );
});
