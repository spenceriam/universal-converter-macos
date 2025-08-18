// Service Worker for Universal Converter
// Provides offline functionality and caching

const CACHE_NAME = 'universal-converter-v1'
const STATIC_CACHE_NAME = 'universal-converter-static-v1'
const DYNAMIC_CACHE_NAME = 'universal-converter-dynamic-v1'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/vite.svg',
  // Add other critical assets
]

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^https:\/\/api\.frankfurter\.app\//,
  /^https:\/\/worldtimeapi\.org\//
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('Service Worker: Static assets cached')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker: Activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request))
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request))
  } else {
    event.respondWith(handleDynamicRequest(request))
  }
})

// Check if request is for a static asset
function isStaticAsset(request) {
  const url = new URL(request.url)
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/) ||
         url.pathname === '/' ||
         url.pathname === '/index.html'
}

// Check if request is for an API
function isAPIRequest(request) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))
}

// Handle static assets - cache first strategy
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('Service Worker: Failed to handle static asset', error)
    
    // Return offline fallback for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      const cache = await caches.open(STATIC_CACHE_NAME)
      return cache.match('/index.html') || new Response('Offline', { status: 503 })
    }
    
    return new Response('Network Error', { status: 503 })
  }
}

// Handle API requests - network first with cache fallback
async function handleAPIRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME)
    
    // Try network first
    try {
      const networkResponse = await fetch(request)
      
      if (networkResponse.ok) {
        // Cache successful responses
        cache.put(request, networkResponse.clone())
        return networkResponse
      }
    } catch (networkError) {
      console.log('Service Worker: Network failed, trying cache')
    }
    
    // Fall back to cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      // Add header to indicate stale data
      const response = cachedResponse.clone()
      response.headers.set('X-Served-From-Cache', 'true')
      return response
    }
    
    // No cache available
    return new Response(JSON.stringify({
      error: 'Network unavailable and no cached data',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Service Worker: Failed to handle API request', error)
    return new Response('Service Worker Error', { status: 500 })
  }
}

// Handle dynamic requests - network first
async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    return new Response('Offline', { status: 503 })
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  console.log('Service Worker: Performing background sync')
  // Implement background sync logic here
  // For example, retry failed API requests
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    
    const options = {
      body: data.body,
      icon: '/vite.svg',
      badge: '/vite.svg',
      data: data.data
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow('/')
  )
})