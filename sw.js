/**
 * Service Worker للفرات فارما (نسخة مُصلَّحة)
 * - مسارات نسبية تشتغل على GitHub Pages حتى لو الموقع تحت /admin/
 * - التثبيت مبيفشلش لو ملف واحد ناقص
 * - بيانات Supabase والـ Auth عمرها ما بتتخزن في الكاش
 * - صفحات HTML (خصوصاً الأدمن) شبكة أولاً ومبتتخزنش
 */

const CACHE_NAME = 'elforat-pharma-v2';
const STATIC_ASSETS = [
    './logo.png',
    './imageUploader.js',
    './notificationManager.js',
    './supabaseClient.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            // allSettled: لو ملف فشل، الباقي يتخزن عادي
            Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url)))
        )
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(
                names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // أي طلب لبرّه موقعنا (Supabase API / Auth / CDN) → المتصفح يتعامل معاه عادي، من غير كاش
    if (url.origin !== self.location.origin) return;

    // صفحات HTML: شبكة أولاً، ومفيش تخزين (عشان بيانات الأدمن ونسخ الصفحات متتعلقش)
    if (req.mode === 'navigate') {
        event.respondWith(fetch(req).catch(() => caches.match(req)));
        return;
    }

    // صور وملفات JS/CSS من نفس الموقع: كاش أولاً + تحديث في الخلفية
    event.respondWith(
        caches.match(req).then((cached) => {
            const network = fetch(req)
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});

self.addEventListener('push', (event) => {
    let data = {};
    if (event.data) {
        try { data = event.data.json(); }
        catch (e) { data = { title: 'الفرات فارما', body: event.data.text() }; }
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'الفرات فارما', {
            body: data.body || 'إشعار جديد',
            icon: './logo.png',
            badge: './logo.png',
            vibrate: [200, 100, 200],
            tag: data.tag || 'default',
            requireInteraction: true,
            actions: [
                { action: 'open', title: 'فتح' },
                { action: 'dismiss', title: 'تجاهل' }
            ],
            data: data.url || './'
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'dismiss') return;

    const target = new URL(event.notification.data || './', self.registration.scope).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const client of list) {
                if (client.url === target && 'focus' in client) return client.focus();
            }
            return clients.openWindow ? clients.openWindow(target) : undefined;
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
