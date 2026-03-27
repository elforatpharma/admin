/**
 * Service Worker للفرات فارما
 * يدعم Push Notifications و Caching للأداء السريع
 */

const CACHE_NAME = 'elforat-pharma-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/admin.html',
    '/logo.png',
    '/imageUploader.js',
    '/notificationManager.js',
    '/supabaseClient.js'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('[SW] Cache failed:', error);
            })
    );
    self.skipWaiting();
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Service Worker activated');
            return self.clients.claim();
        })
    );
});

// اعتراض الطلبات وتقديم المحتوى من الكاش
self.addEventListener('fetch', (event) => {
    // استراتيجيات مختلفة لأنواع مختلفة من الطلبات
    
    // طلبات API - شبكة أولاً
    if (event.request.url.includes('/rest/v1/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // صور - كاش أولاً ثم شبكة
    if (event.request.destination === 'image') {
        event.respondWith(
            caches.match(event.request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        // إرجاع من الكاش مع تحديث في الخلفية
                        fetch(event.request).then((response) => {
                            if (response.ok) {
                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(event.request, response);
                                });
                            }
                        });
                        return cachedResponse;
                    }
                    return fetch(event.request);
                })
                .catch(() => {
                    // صورة افتراضية في حالة الفشل
                    return caches.match('/logo.png');
                })
        );
        return;
    }
    
    // صفحات HTML - شبكة أولاً مع fallback للكاش
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // باقي الموارد - كاش أولاً
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request);
            })
            .catch(() => {
                // صفحة offline مخصصة
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            })
    );
});

// التعامل مع إشعارات Push
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);
    
    let data = {};
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'الفرات فارما', body: event.data.text() };
        }
    }
    
    const title = data.title || 'الفرات فارما';
    const options = {
        body: data.body || 'إشعار جديد',
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'default',
        requireInteraction: true,
        actions: [
            { action: 'open', title: 'فتح' },
            { action: 'dismiss', title: 'تجاهل' }
        ],
        data: data.url || '/'
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// التعامل مع النقر على الإشعارات
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'dismiss') {
        return;
    }
    
    // فتح التطبيق عند النقر
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // إذا كان هناك نافذة مفتوحة، ركز عليها
                for (const client of clientList) {
                    if (client.url === event.notification.data && 'focus' in client) {
                        return client.focus();
                    }
                }
                // وإلا افتح نافذة جديدة
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data);
                }
            })
    );
});

// رسائل من الصفحة الرئيسية
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('[SW] Service Worker loaded');
