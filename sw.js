const CACHE_NAME = "V1";
const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./manifest.json",
    "./image/logo_new.png",
    "./image/192pxlogo_new.png",
    "./image/512pxlogo_new.png",

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
    "./js/composables/useRekap.js"
];

// Install Event: Cache all static assets
self.addEventListener("install", (event) => {
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[Service Worker] Caching all: app shell and content");
            return cache.addAll(ASSETS_TO_CACHE);
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

// Fetch Event: Cache First, then Network (Stale-while-revalidate for some, strictly cache for others)
self.addEventListener("fetch", (event) => {
    // 1. (Legacy Google Scripts handler removed)


    // 2. Static Assets -> Cache First, fall back to Network
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((networkResponse) => {
                // Cache new resources dynamically (runtime caching)
                if (event.request.method === 'GET' && networkResponse.status === 200) {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }
                return networkResponse;
            });
        })
    );
});

