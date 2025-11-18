// VendPlug Service Worker - consolidated and hardened
const CACHE_NAME = 'vendplug-app-shell-v8.9';
const APP_SHELL = [
  '/',
  '/public-buyer-home.html',
  '/offline.html',
  '/CSS/ads.css',
  '/js/auth-utils.js',
  '/js/cart-badge.js',
  '/js/adManager.js',
  '/js/config.js',
  '/manifest.webmanifest',
  '/logo.png',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(APP_SHELL);
      } catch (_) {
        // Best-effort during development; ignore failures
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)));
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: 'PRECACHE_READY' }));
  })());
  self.clients.claim();
});

function safePut(cache, request, response) {
  try {
    if (!response) return;
    const method = (request.method || 'GET').toUpperCase();
    if (method !== 'GET') return;
    if (response.ok || response.type === 'opaque') {
      cache.put(request, response.clone()).catch(() => {});
    }
  } catch (_) {
    // ignore
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  // Explicitly bypass auth refresh endpoint
  if (url.pathname.startsWith('/api/auth/refresh')) {
    event.respondWith(fetch(req));
    return;
  }

  const isSameOrigin = url.origin === location.origin;
  const isAPI = isSameOrigin && url.pathname.startsWith('/api/');
  const isHTML = req.headers.get('accept')?.includes('text/html') || req.destination === 'document';

  // HTML: network-first
  if (isHTML) {
    event.respondWith(
      fetch(req).then((res) => {
        caches.open(CACHE_NAME).then((c) => safePut(c, req, res));
        return res;
      }).catch(async () => {
        const cached = await caches.match(req);
        return cached || (await caches.match('/offline.html')) || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      })
    );
    return;
  }

  // Scripts/Styles: network-first
  if (req.destination === 'script' || req.destination === 'style') {
    event.respondWith(
      fetch(req).then((res) => {
        caches.open(CACHE_NAME).then((c) => safePut(c, req, res));
        return res;
      }).catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.url.endsWith('/js/pwa-register.js')) {
          const offlineResponse = await caches.match('/offline.html');
          if (offlineResponse) return offlineResponse;
          return new Response('/* PWA registration script not available */', {
            status: 503,
            headers: { 'Content-Type': 'application/javascript' }
          });
        }
        return new Response('/* script fetch failed */', { status: 503, headers: { 'Content-Type': 'application/javascript' } });
      })
    );
    return;
  }

  // Images/Fonts: cache-first (same-origin only)
  if (req.destination === 'image' || req.destination === 'font') {
    if (!isSameOrigin) return; // let browser handle cross-origin (e.g., CDN)
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        caches.open(CACHE_NAME).then((c) => safePut(c, req, res));
        return res;
      }).catch(() => cached || caches.match('/offline.html')))
    );
    return;
  }

  // API non-GET is ignored here (we only handle GET at top)
  // API GET: network-only to avoid stale authenticated state
  if (isAPI && req.method === 'GET') {
    event.respondWith(fetch(req).catch(() => {
      return new Response(JSON.stringify({ error: 'Network error' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }));
    return;
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(_){ }
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


