/**
 * Elforat Pharma Admin Service Worker
 * Offline shell + cached Supabase GET responses + CDN fonts/icons.
 * Never caches POST/PATCH/DELETE requests.
 */
const CACHE_NAME = 'elforat-pharma-v13';
const STATIC_ASSETS = [
  './admin.html',
  './inventory.html',
  './orders.html',
  './connection-monitor.html',
  './tailwind.css',
  './admin-responsive.css',
  './shimmer-loading.css?v=1',
  './shimmer-loading.js?v=1',
  './uiverse-ui.css',
  './layout.js',
  './supabaseClient.js',
  './imageUploader.js',
  './notificationManager.js',
  './logo.png',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;900&family=Tajawal:wght@400;500;700;800;900&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('elforat-pharma-') && k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function cacheResponse(request, response) {
  if (!response || (!response.ok && response.type !== 'opaque')) return;
  const copy = response.clone();
  return caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
}

function isCacheableImageRequest(request, url) {
  if (request.destination !== 'image') return false;
  if (url.hostname === 'www.facebook.com' || url.hostname.endsWith('.facebook.com') || url.hostname === 'connect.facebook.net') return false;
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/functions/v1/')) return false;
  // Never cache signed/tokenized image URLs that may be private or user-specific.
  for (const key of url.searchParams.keys()) {
    if (/^(token|access_token|signature|sig|expires|authorization)$/i.test(key)) return false;
  }
  return true;
}

function isSupabaseGet(url) {
  return url.hostname.endsWith('.supabase.co') &&
    (url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/storage/v1/'));
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cache product thumbnails and public product images (including Supabase Storage).
  // Cache-first avoids re-downloading the same images on every inventory visit.
  if (isCacheableImageRequest(req, url)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const response = await fetch(req);
        if (response && (response.type === 'opaque' || (response.ok && response.status === 200))) {
          await cacheResponse(req, response);
        }
        return response;
      } catch (_) {
        return Response.error();
      }
    })());
    return;
  }

  // Dashboard navigation: network first, cached page when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        cacheResponse(req, res);
        return res;
      }).catch(async () => {
        return (await caches.match(req)) || (await caches.match(new URL('./admin.html', self.location.href).href));
      })
    );
    return;
  }

  // Supabase GET: network first and save the exact response for offline reads.
  if (isSupabaseGet(url)) {
    event.respondWith(
      fetch(req).then(res => {
        cacheResponse(req, res);
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const cdn = url.hostname === 'fonts.googleapis.com' ||
              url.hostname === 'fonts.gstatic.com' ||
              url.hostname === 'cdn.jsdelivr.net';

  if (sameOrigin || cdn) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          cacheResponse(req, res);
          return res;
        });
      })
    );
    return;
  }

  // Other GET resources: network first, cached fallback.
  event.respondWith(
    fetch(req).then(res => {
      cacheResponse(req, res);
      return res;
    }).catch(() => caches.match(req))
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
