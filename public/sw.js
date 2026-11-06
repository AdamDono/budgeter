const CACHE_NAME = 'pace-finance-v4'
const STATIC_ASSETS = [
  '/manifest.json?v=2',
  '/favicon.svg?v=2',
  '/pwa-192x192.png?v=2',
  '/pwa-512x512.png?v=2',
  '/apple-touch-icon.png?v=2',
  '/logo_pace_finance.svg'
]

// Install event - cache critical static icons
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

// Fetch event - Network-first for HTML navigation & JS/CSS/MJS bundles so deployments update immediately
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 1. Bypass non-GET, API requests, and PDF worker (.mjs) scripts
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.pathname.endsWith('.mjs')
  ) {
    return
  }

  // 2. Network-first for HTML navigation and JS/CSS bundles
  if (
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return networkResponse
        })
        .catch(() => caches.match(request).then((res) => res || caches.match('/')))
    )
    return
  }

  // 3. Stale-while-revalidate for static images & icons
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
        .catch(() => cachedResponse)

      return cachedResponse || fetchPromise
    })
  )
})
