const CACHE_NAME = "v3.38";
const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./manifest.json",
    "./image/logo_new.png",
    "./image/192pxlogo_new.png",
    "./image/512pxlogo_new.png",

    // External Libs
    "https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js",

    // Core Logic
    "./js/core.js",
    "./js/app_vue.js",
    "./js/utils_date.js",
    "./js/utils_password.js",

    // Composables
    "./js/composables/useAuth.js",
    "./js/composables/useDashboard.js",
    "./js/composables/useGuru.js",
    "./js/composables/useSantri.js",
    "./js/composables/useKelas.js",
    "./js/composables/useMapel.js",
    "./js/composables/useJadwal.js",
    "./js/composables/useAbsensi.js",
    "./js/composables/useTarget.js",
    "./js/composables/useSetoran.js",
    "./js/composables/useUjian.js",
    "./js/composables/useQuran.js",
    "./js/composables/useRiwayat.js",
    "./js/composables/usePelanggaran.js",
    "./js/composables/useProfile.js",
    "./js/composables/useRekap.js",
    "./js/composables/usePengumuman.js",
    "./js/composables/useNotifications.js",

    // Components
    "./js/components/LoginView.js",
    "./js/components/DashboardView.js",
    "./js/components/SantriView.js",
    "./js/components/RiwayatView.js",
    "./js/components/RekapView.js",
    "./js/components/ProfileView.js",
    "./js/components/PengumumanView.js",
    "./js/components/NotificationView.js",
    "./js/components/SetoranView.js",
    "./js/components/UjianView.js",
    "./js/components/QuranView.js",
    "./js/components/InstallView.js",
    "./js/components/AbsensiView.js",
    "./js/components/ExamCounter.js",
    "./js/components/GuruView.js",
    "./js/components/JadwalView.js",
    "./js/components/PelanggaranView.js",
    "./js/components/TargetView.js",
    "./js/components/HafalanView.js",

    // Services
    "./js/services/NotificationService.js",
    "./js/services/PushService.js"
];

// Install Event: Cache all static assets
self.addEventListener("install", (event) => {
    // FORCE UPDATE STRATEGY (Bridge to v3.2)
    // We explicitly call skipWaiting() here to ensuring users on old versions (without the 'Update' UI)
    // get updated to this version automatically. 
    // FUTURE VERSIONS: Remove this line to enable the manual 'Update' button flow.
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log("[Service Worker] Caching all: app shell and content");
            // Bust browser HTTP cache so we don't accidentally re-cache the broken core.js
            for (const url of ASSETS_TO_CACHE) {
                try {
                    const req = new Request(url, { cache: 'no-cache' });
                    const res = await fetch(req);
                    if (res.ok) {
                        await cache.put(url, res);
                    } else {
                        console.warn('[Service Worker] Failed to cache', url, res.status);
                    }
                } catch (err) {
                    console.warn('[Service Worker] Network error while caching', url, err);
                }
            }
        })
    );
});

// Activate Event: Clean up old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log("[Service Worker] Removing old cache", key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => {
            // Force the active service worker to take control of the page immediately
            return self.clients.claim();
        })
    );
});

// Message Event: Listen for 'SKIP_WAITING' signal from UI
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Fetch Event: Cache First, then Network (Stale-while-revalidate for some, strictly cache for others)
self.addEventListener("fetch", (event) => {

    // 🚫 Supabase API = Network Only
    if (event.request.url.includes("supabase.co")) {
        event.respondWith(fetch(event.request));
        return;
    }

    // ✅ Static assets = Cache First
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request).then((response) => {
                // Check if we received a valid response
                if (
                    !response ||
                    response.status !== 200 ||
                    response.type !== 'basic'
                ) {
                    return response;
                }

                // IMPORTANT: Clone the response. A response is a stream
                // and because we want the browser to consume the response
                // as well as the cache consuming the response, we need
                // to clone it so we have two streams.
                if (
                    event.request.method === "GET" &&
                    (
                        event.request.destination === "script" ||
                        event.request.destination === "style" ||
                        event.request.destination === "image" ||
                        event.request.destination === "document"
                    )
                ) {
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }

                return response;
            });
        })
    );
});
// --- PUSH NOTIFICATION EVENT ---
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push Received.');

    let data = { title: 'Pesan Baru', body: 'Ada aktivitas baru di E-Umar', icon: 'image/192pxlogo_new.png' };
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || 'image/192pxlogo_new.png',
        badge: 'image/192pxlogo_new.png', // Transparent small icon for notification bar
        vibrate: [100, 50, 100],
        data: {
            url: data.url || './index.html'
        },
        actions: [
            { action: 'open', title: 'Buka Aplikasi' }
        ]
    };

    // Update App Badge (if supported)
    if (navigator.setAppBadge) {
        navigator.setAppBadge(); // Increment badge by 1 (default)
    }

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// --- NOTIFICATION CLICK EVENT ---
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close();

    // Clear Badge when opened
    if (navigator.clearAppBadge) {
        navigator.clearAppBadge();
    }

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            // If already open, focus it
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not open, open new window
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url || './');
            }
        })
    );
});
