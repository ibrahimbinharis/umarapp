// --- 1. CONFIG & DATABASE (SUPABASE v36) ---
const APP_CONFIG = {
    appName: "E-Umar",
    version: "v2.0",
    supabaseUrl: "https://fxtmilqvxomuvkxxzjli.supabase.co",
    supabaseKey: "sb_publishable_aXcK3znrtRo0d3gH-Wg1Ew_-0Z3262O"
};

const DB_KEY = 'tahfidz_v36_master';
const QUEUE_KEY = 'tahfidz_v36_queue';

// Init Supabase Client
const { createClient } = supabase;
const sb = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseKey);

// --- Global State ---
window.surahList = [];
let currentUser = null;
let allData = localStorage.getItem(DB_KEY) ? JSON.parse(localStorage.getItem(DB_KEY)) : [];
let dataMap = { santri: {}, guru: {}, mapel: {}, kelas: {} }; // Indexing
buildIndexes(); // Build initial index

// --- API: EQURAN.ID (Keep existing Logic) ---
async function initSurahData() {
    const cached = localStorage.getItem('tahfidz_surah_cache');
    if (cached) {
        window.surahList = JSON.parse(cached);
    } else {
        try {
            const res = await fetch('https://equran.id/api/v2/surat');
            const json = await res.json();
            if (json.code === 200) {
                window.surahList = json.data.map(s => ({
                    no: s.nomor,
                    latin: s.namaLatin,
                    ayat: s.jumlahAyat,
                    arti: s.arti,
                    audio: s.audioFull['01']
                }));
                localStorage.setItem('tahfidz_surah_cache', JSON.stringify(window.surahList));
            }
        } catch (e) {
            console.error("Failed to load Surah data:", e);
            window.surahList = [
                { no: 1, latin: "Al-Fatihah", ayat: 7 },
                { no: 2, latin: "Al-Baqarah", ayat: 286 }
            ];
        }
    }
}

// --- 2. CRYPTO & SECURITY ---
async function hashPassword(plainPassword) {
    if (!plainPassword) return "";
    if (window.crypto && window.crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(plainPassword);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) { console.error("Crypto Error", e); }
    }
    return "F_" + btoa(plainPassword).split('').reverse().join('');
}

// --- 3. DATABASE ENGINE (Supabase Adapter) ---
const DB = {
    getAll: () => {
        // Return Synchronous Cache for UI Speed
        return allData;
    },
    saveAll: (data) => {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
        allData = data;
        buildIndexes();
    },

    // --- MUTATION QUEUE (Offline Support) ---
    getQueue: () => {
        const q = localStorage.getItem(QUEUE_KEY);
        return q ? JSON.parse(q) : [];
    },
    addToQueue: (action, collection, payload) => {
        const q = DB.getQueue();
        q.push({ action, collection, payload, timestamp: Date.now() });
        localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    },
    removeFromQueue: (timestamp) => {
        let q = DB.getQueue();
        q = q.filter(item => item.timestamp !== timestamp);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    },

    triggerAutoSync: () => {
        if (DB._syncTimer) clearTimeout(DB._syncTimer);
        DB._syncTimer = setTimeout(() => {
            DB.syncToCloud(); // Push changes
        }, 1000);
    },

    // --- CRUD ---
    create: async (collection, item) => {
        item._id = generateId(collection);
        item.__type = collection; // Internal type tracking
        const now = new Date().toISOString();
        item.created_at = now;
        item.updated_at = now;

        if ((collection === 'users' || collection === 'santri') && item.password) {
            item.password = await hashPassword(item.password);
        }

        // 1. Optimistic UI Update
        allData.unshift(item);
        DB.saveAll(allData);

        // 2. Queue for Cloud
        DB.addToQueue('create', collection, item);
        DB.triggerAutoSync();

        return item;
    },
    update: async (id, updates) => {
        const idx = allData.findIndex(d => d._id === id);
        if (idx === -1) throw new Error("Data not found");

        const collection = allData[idx].__type || 'unknown'; // Fallback

        if (updates.password) {
            updates.password = await hashPassword(updates.password);
        }
        updates.updated_at = new Date().toISOString();

        // 1. Optimistic Update
        allData[idx] = { ...allData[idx], ...updates };
        DB.saveAll(allData);

        // 2. Queue for Cloud (Only send updates id)
        DB.addToQueue('update', collection, { _id: id, ...updates });
        DB.triggerAutoSync();

        return allData[idx];
    },
    delete: async (id) => {
        const idx = allData.findIndex(d => d._id === id);
        if (idx !== -1) {
            const collection = allData[idx].__type;

            // 1. Optimistic Update
            allData.splice(idx, 1);
            DB.saveAll(allData);

            // 2. Queue
            DB.addToQueue('delete', collection, { _id: id });
            DB.triggerAutoSync();
        }
    },

    // --- SUPABASE SYNC ---
    _syncTimer: null,

    // Pull from Supabase
    syncFromCloud: async (silent = false) => {
        if (!navigator.onLine) return { success: false, message: "Offline" };

        // Only show full loader if explicit (not silent bg sync)
        if (!silent) showLoading(true, 'Sinkronisasi Cloud...');

        try {
            const tables = ['users', 'santri', 'kelas', 'mapel', 'jadwal', 'setoran', 'pelanggaran', 'pelanggaran_type', 'absensi', 'ujian'];
            let cloudData = [];

            // Parallel Fetch
            const promises = tables.map(table => sb.from(table).select('*').then(res => {
                if (res.error) throw res.error;
                // Add internal type so we know what table it belongs to
                // Fix: Frontend expects 'user' (singular), but table is 'users'
                const type = table === 'users' ? 'user' : table;
                return res.data.map(d => {
                    // Normalize boolean fields (fixes 'false' string issue)
                    if (d._deleted === 'false') d._deleted = false;
                    if (d._deleted === 'true') d._deleted = true;
                    return { ...d, __type: type };
                });
            }));

            const results = await Promise.all(promises);
            results.forEach(arr => cloudData = cloudData.concat(arr));

            // Merge: Server Wins but Local Queue (unsynced) re-applied?
            // Simple approach: Replace local cache with Server Data
            // The Queue will re-apply local changes when processed.
            DB.saveAll(cloudData);

            // Trigger Vue Reactivity (if available globally)
            if (window.loadData && typeof window.loadData === 'function') {
                window.loadData(); // Soft refresh Vue state
            }

            if (!silent) updateSyncUI('success', 'Tersinkronisasi');
            return { success: true };
        } catch (e) {
            console.error("Sync Error:", e);
            if (!silent) updateSyncUI('error', 'Gagal Sync');
            return { success: false, message: e.message };
        } finally {
            if (!silent) showLoading(false);
        }
    },

    // --- AUTHENTICATION & LOGIN (v36: Plain Text Support for Legacy Data) ---
    // --- AUTHENTICATION & LOGIN (v36: Plain Text Support for Legacy Data) ---
    login: async (username, password) => {
        try {
            // 1. Hash SHA-256 (Standard)
            let hash = await hashPassword(password);
            let queryFilter = `username.eq.${username},custom_username.eq.${username}`;

            let { data, error } = await sb.from('users').select('*').or(queryFilter).eq('password', hash).maybeSingle();

            if (!data) return { success: false, message: "Username atau Password salah" };
            return { success: true, user: data };
        } catch (e) {
            console.error("Auth Error", e);
            return { success: false, message: "Gagal menghubungkan ke server" };
        }
    },

    // Push to Supabase (Process Queue)
    syncToCloud: async () => {
        if (!navigator.onLine) return;
        const queue = DB.getQueue();
        if (queue.length === 0) return;

        if (window.updateSyncUI) window.updateSyncUI('uploading', 'Menyimpan...');

        // Process sequentially to maintain order
        for (const item of queue) {
            try {
                let { action, collection, payload, timestamp } = item;
                // Fix collection name mapping just in case
                if (collection === 'user') collection = 'users';

                let res;
                // Remove internal fields before sending
                const { __type, ...cleanPayload } = payload;

                if (action === 'create') {
                    res = await sb.from(collection).insert(cleanPayload);
                } else if (action === 'update') {
                    const { _id, ...fields } = cleanPayload;
                    res = await sb.from(collection).update(fields).eq('_id', _id);
                } else if (action === 'delete') {
                    res = await sb.from(collection).delete().eq('_id', cleanPayload._id);
                }

                if (res.error) {
                    // Handle Duplicate Key (Data already exists on server)
                    // Catch both 23505 code and 409 status (Conflict)
                    if (res.error.code === '23505' || res.status === 409 || (res.error.message && res.error.message.includes('duplicate key'))) {
                        console.warn("Duplicate data detected (already synced). Removing from queue.", cleanPayload);
                        DB.removeFromQueue(timestamp);
                    } else {
                        console.error("Push Error", res.error);
                    }
                } else {
                    DB.removeFromQueue(timestamp);
                }
            } catch (e) {
                console.error("Mutation Error", e);
            }
        }

        if (window.updateSyncUI) window.updateSyncUI('saved', 'Tersimpan');
    }
};

// --- REALTIME SUBSCRIPTION ---
function initRealtime() {
    const channel = sb.channel('db-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => {
                // Trigger auto-pull logic or selectively update
                // For safety V1, trigger full pull (debounce)
                if (DB._realtimeTimer) clearTimeout(DB._realtimeTimer);
                DB._realtimeTimer = setTimeout(() => {
                    DB.syncFromCloud(true); // Silent sync
                }, 2000);
            }
        )
        .subscribe();
}

// Call Realtime Init
initRealtime();


function buildIndexes() {
    dataMap = { santri: {}, guru: {}, mapel: {}, kelas: {} };
    for (const item of allData) {
        if (item.__type === 'santri') dataMap.santri[item.santri_id] = item;
        if (item.__type === 'users' && item.role === 'guru') dataMap.guru[item._id] = item; // 'users' not 'user'
        if (!dataMap[item._id]) dataMap[item._id] = item;
    }
}

function generateId(type) {
    // Map internal type to prefix
    let prefix = 'X';
    if (type === 'santri') prefix = 'S';
    else if (type === 'users' || type === 'user') prefix = 'U';
    else if (type === 'mapel') prefix = 'M';
    else if (type === 'kelas') prefix = 'K';
    else if (type === 'setoran') prefix = 'TR';

    // Timestamp + Random
    const timestamp = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// --- UTILS (Keep Existing) ---
function getStudentStats(santriId) {
    const santri = allData.find(s => s.santri_id === santriId);
    if (!santri) return null;
    const history = allData.filter(d => d.__type === 'setoran' && d.santri_id === santriId && d.counted !== false);

    const totalHafalan = history.filter(s => s.setoran_type === 'Sabaq').reduce((sum, s) => sum + s.pages, 0);
    const now = new Date();
    const monthly = history.filter(s => new Date(s.tgl).getMonth() === now.getMonth()); // Use 'tgl' not 'setoran_date'
    const sabaqCurrent = monthly.filter(s => s.setoran_type === 'Sabaq').reduce((sum, s) => sum + s.pages, 0);
    const manzilCurrent = monthly.filter(s => s.setoran_type === 'Manzil').reduce((sum, s) => sum + s.pages, 0);

    return {
        totalHafalan,
        sabaq: { current: sabaqCurrent, target: santri.target_sabaq || 20, percent: Math.min(100, (sabaqCurrent / (santri.target_sabaq || 20)) * 100) },
        manzil: { current: manzilCurrent, target: Math.round(totalHafalan * ((santri.target_manzil_pct || 20) / 100)), percent: Math.min(100, (manzilCurrent / Math.max(1, Math.round(totalHafalan * ((santri.target_manzil_pct || 20) / 100)))) * 100) }
    };
}

function calculateGrade(pages, errors) {
    if (pages <= 0) return { score: 0, grade: 'C', counted: false };
    let score = Math.max(0, Math.min(100, ((pages * 10 - errors) / (pages * 10)) * 100));
    let grade = score >= 95 ? 'A+' : score >= 85 ? 'A' : score >= 75 ? 'B+' : score >= 65 ? 'B' : score >= 60 ? 'B-' : 'C';
    return { score, grade, counted: score >= 60 };
}

function getAutoPages(santriId, type) {
    const history = allData.filter(d => d.__type === 'setoran' && d.santri_id === santriId && d.counted !== false).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const target = type === 'Sabqi' ? 'Sabaq' : 'Sabqi';
    const taken = history.filter(d => d.setoran_type === target).slice(0, 2);
    return { pages: taken.reduce((s, i) => s + i.pages, 0), info: taken.length ? `Otomatis: ${taken.length} x ${target}` : `Belum ada data ${target}` };
}

function showLoading(show, msg = '') {
    if (!show) {
        const el = document.getElementById('loader-overlay');
        if (el) el.remove();
        return;
    }
    const html = `<div id="loader-overlay" class="fixed inset-0 z-[200] bg-white/80 backdrop-blur flex flex-col gap-3 items-center justify-center">
        <div class="size-10 border-4 border-blue-200 border-t-primary rounded-full animate-spin"></div>
        <p class="text-sm font-bold text-slate-600 animate-pulse">${msg}</p>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function updateSyncUI(status, msg) {
    if (status === 'error') console.warn(msg);
}

async function deleteData(id, pageToReload) {
    if (!confirm("Yakin hapus data ini?")) return;
    await DB.delete(id);
    if (window.navigate) window.navigate(pageToReload);
    else console.warn("Navigate not found");
}

function formatDateLong(isoString, timeOverride = null) {
    // Keep exact format logic from old core.js
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const datePart = new Intl.DateTimeFormat('id-ID', optionsDate).format(d);

    let timePart;
    if (timeOverride) {
        if (timeOverride.includes('T') || timeOverride.length > 8) {
            const dt = new Date(timeOverride);
            if (!isNaN(dt.getTime())) {
                const th = String(dt.getHours()).padStart(2, '0');
                const tm = String(dt.getMinutes()).padStart(2, '0');
                timePart = `${th}:${tm}`;
            } else {
                timePart = timeOverride;
            }
        } else {
            timePart = timeOverride;
        }
    } else {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        timePart = `${hours}:${minutes}`;
    }

    return `${datePart}<br><span class="text-xs text-slate-400 font-normal">${timePart}</span>`;
}

