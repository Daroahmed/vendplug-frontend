// Basic VendPlug Service Worker
const CACHE_NAME = 'vendplug-app-shell-v1';
const APP_SHELL = [
  '/',
  '/public-buyer-home.html',
  '/css/ads.css',
  '/js/auth-utils.js',
  '/js/cart-badge.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k))))
  );
  self.clients.claim();
});

// Network falling back to cache for HTML; cache-first for static assets; SWR for JSON GET
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== location.origin) return;

  // Avoid caching sensitive operations
  const isAPI = url.pathname.startsWith('/api/');
  const isGET = req.method === 'GET';
  const isHTML = req.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('/public-buyer-home.html')))
    );
    return;
  }

  // Static assets: cache-first
  if (req.destination === 'style' || req.destination === 'script' || req.destination === 'image' || req.destination === 'font') {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // API GET: Stale-While-Revalidate
  if (isAPI && isGET) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(_){}
  const title = data.title || 'VendPlug';
  const options = {
    body: data.message || '',
    icon: '/favicon.png',
    data: data.url || '/public-buyer-home.html',
    timestamp: Date.now()
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/public-buyer-home.html';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      if (client.url.includes(url) && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});


