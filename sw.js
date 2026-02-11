const CACHE_NAME = "e-umar-v4.0";
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
    // FORCE UPDATE STRATEGY (Bridge to v3.2)
    // We explicitly call skipWaiting() here to ensuring users on old versions (without the 'Update' UI)
    // get updated to this version automatically. 
    // FUTURE VERSIONS: Remove this line to enable the manual 'Update' button flow.
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
                if (
                    event.request.method === "GET" &&
                    response.status === 200 &&
                    (
                        event.request.destination === "script" ||
                        event.request.destination === "style" ||
                        event.request.destination === "image" ||
                        event.request.destination === "document"
                    )
                ) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, response.clone());
                    });
                }
                return response;
            });
        })
    );
});
