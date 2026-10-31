const CACHE_NAME = 'pace-finance-v2'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json?v=2',
  '/favicon.svg?v=2',
  '/pwa-192x192.png?v=2',
  '/pwa-512x512.png?v=2',
  '/apple-touch-icon.png?v=2',
  '/logo_pace_finance.svg',
  '/hero_background.png'
]

// Install event - cache critical static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Some assets failed to precache:', err)
      })
    })
  )
  self.skipWaiting()
})

// Activate event - cleanup stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Clearing old cache:', cache)
            return caches.delete(cache)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - Network-first for APIs, Stale-while-revalidate for static shell
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 1. Bypass non-GET and API requests (pass directly to network)
  if (request.method !== 'GET' || url.pathname.startsWith('/api')) {
    return
  }

  // 2. Stale-while-revalidate strategy for UI pages & static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return networkResponse
        })
        .catch(() => {
          // If offline and requesting navigation, return cached root/index.html
          if (request.mode === 'navigate') {
            return caches.match('/')
          }
        })

      return cachedResponse || fetchPromise
    })
  )
})
