// --- 1. CONFIG & DATABASE ---
const APP_CONFIG = {
    appName: "E-Umar",
    version: "v35-vue",
    spreadsheetId: "1XhAgEKyW_fkwIxQcsegqCbC0uUKPcHpv9Q9Sc3Fvj0w"
};

const DB_KEY = 'tahfidz_v34_master';
const INIT_KEY = 'tahfidz_v32_init';
const SYNC_URL_KEY = 'tahfidz_sync_url';

// --- HARDCODED CONFIG ---
const HARDCODED_SYNC_URL = "https://script.google.com/macros/s/AKfycbxq_99g3SnFs9VvbIx7JnWFLVoNPiHs6DP2XAtezwbjFgnRM6G_Wh86gc63_AopBDQllg/exec";
if (HARDCODED_SYNC_URL) {
    localStorage.setItem(SYNC_URL_KEY, HARDCODED_SYNC_URL);
}

// --- Global State ---
window.surahList = [];
let currentUser = null;
let allData = localStorage.getItem(DB_KEY) ? JSON.parse(localStorage.getItem(DB_KEY)) : [];
let dataMap = { santri: {}, guru: {}, mapel: {}, kelas: {} }; // Indexing

// --- API: EQURAN.ID ---
async function initSurahData() {
    const cached = localStorage.getItem('tahfidz_surah_cache');
    if (cached) {
        window.surahList = JSON.parse(cached);
        console.log("Loaded cached Surahs");
    } else {
        try {
            // Updated to use equran.id V2
            // Endpoint: https://equran.id/api/v2/surat
            const res = await fetch('https://equran.id/api/v2/surat');
            const json = await res.json();
            if (json.code === 200) {
                // Map to our structure: { no: 1, latin: "Al-Fatihah", ayat: 7 }
                window.surahList = json.data.map(s => ({
                    no: s.nomor,
                    latin: s.namaLatin,
                    ayat: s.jumlahAyat,
                    arti: s.arti,
                    audio: s.audioFull['01'] // Misyari
                }));
                localStorage.setItem('tahfidz_surah_cache', JSON.stringify(window.surahList));
                console.log("Fetched & Cached Surahs from equran.id");
            }
        } catch (e) {
            console.error("Failed to load Surah data:", e);
            // Fallback (Essential Surahs)
            window.surahList = [
                { no: 1, latin: "Al-Fatihah", ayat: 7 },
                { no: 2, latin: "Al-Baqarah", ayat: 286 },
                // ... user can reload later
            ];
        }
    }
}

// --- 2. CRYPTO & SECURITY ---
async function hashPassword(plainPassword) {
    if (!plainPassword) return "";

    // For E-Umar, we prefer SHA-256 via SubtleCrypto (Secure Contexts)
    if (window.crypto && window.crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(plainPassword);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (e) {
            console.error("Crypto Error", e);
        }
    }

    // Stable Fallback for HTTP / Local Contexts
    // We use a prefix to identify fallback hashes
    console.warn("Secure Crypto API unavailable. Using stable fallback.");
    return "F_" + btoa(plainPassword).split('').reverse().join('');
}

// --- 3. DATABASE ENGINE ---
// --- 3. DATABASE ENGINE (Transactional V2) ---
const DB = {
    getAll: () => {
        const raw = localStorage.getItem(DB_KEY);
        return raw ? JSON.parse(raw) : [];
    },
    saveAll: (data) => {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
        allData = data;
        buildIndexes(); // Rebuild index on save
    },

    // --- MUTATION QUEUE ---
    getQueue: () => {
        const q = localStorage.getItem('tahfidz_mutation_queue');
        return q ? JSON.parse(q) : [];
    },
    addToQueue: (action, collection, payload) => {
        const q = DB.getQueue();
        q.push({
            action,
            collection,
            payload,
            timestamp: Date.now()
        });
        localStorage.setItem('tahfidz_mutation_queue', JSON.stringify(q));
    },
    clearQueue: () => {
        localStorage.setItem('tahfidz_mutation_queue', JSON.stringify([]));
    },

    triggerAutoSync: () => {
        if (DB._syncTimer) clearTimeout(DB._syncTimer);
        DB._syncTimer = setTimeout(() => {
            DB.syncToCloud().then(r => console.log("Auto-sync:", r.message)).catch(e => console.warn("Auto-sync failed:", e));
        }, 3000); // Debounce 3s (agak lama dikit biar batching)
    },

    create: async (collection, item) => {
        item._id = generateId(collection);
        item.__type = collection;
        item.created_at = new Date().toISOString();
        item.updated_at = new Date().toISOString();

        // Hash password if user/santri
        if ((collection === 'user' || collection === 'santri') && item.password) {
            item.password = await hashPassword(item.password);
        }

        // 1. Optimistic UI Update
        allData.unshift(item);
        DB.saveAll(allData);

        // 2. Queue Action
        DB.addToQueue('create', collection, item);
        DB.triggerAutoSync();

        return item;
    },
    update: async (id, updates) => {
        const idx = allData.findIndex(d => d._id === id);
        if (idx === -1) throw new Error("Data not found");

        const collection = allData[idx].__type;

        // Hash password if being updated
        if (updates.password) {
            updates.password = await hashPassword(updates.password);
        }

        updates.updated_at = new Date().toISOString();

        // 1. Optimistic UI Update
        allData[idx] = { ...allData[idx], ...updates };
        DB.saveAll(allData);

        // 2. Queue Action
        // Kita kirim ID dan field yang berubah saja
        DB.addToQueue('update', collection, { id, ...updates });
        DB.triggerAutoSync();

        return allData[idx];
    },
    delete: async (id) => {
        const idx = allData.findIndex(d => d._id === id);
        if (idx !== -1) {
            const collection = allData[idx].__type;

            // 1. Optimistic UI Update
            allData.splice(idx, 1);
            DB.saveAll(allData);

            // 2. Queue Action
            DB.addToQueue('delete', collection, { id });
            DB.triggerAutoSync();
        }
    },

    // --- SYNC ENGINE V2 (Transactional) ---
    _syncTimer: null,

    // Download Changes from Cloud (Pull)
    syncFromCloud: async () => {
        const url = localStorage.getItem(SYNC_URL_KEY);
        if (!url) return { success: false, message: "No Sync URL" };

        showLoading(true, 'Sinkronisasi Data...');
        try {
            const res = await fetch(url);
            const cloudData = await res.json(); // Array of ALL data from server

            // Merge Strategy: Server Wins for concurrency safety
            // Tapi kita pertahankan 'pending mutations' lokal kita jika belum terkirim

            // 1. Load Cloud Data
            if (Array.isArray(cloudData)) {
                // Sederhananya, kita percaya server adalah 'Single Source of Truth' terakhir
                // Tapi ini akan menimpa 'Unsynced Local Changes' jika kita tidak hati-hati.
                // Idealnya: Apply Cloud Data, lalu Re-apply pending mutations lokal.

                const queue = DB.getQueue();
                let mergedData = cloudData;

                // Re-apply local pending mutations on top of fresh cloud data (Optimistic UI preservation)
                // Ini agak kompleks, untuk V1 ini kita pakai "Server Wins" tapi kita coba syncToCloud dulu sebelum pull
                // agar perubahan kita naik dulu.
            }

            // Simpan data server sebagai basis data kita
            DB.saveAll(cloudData);

            updateSyncUI('success', 'Tersinkronisasi');
            return { success: true };
        } catch (e) {
            updateSyncUI('error', 'Offline');
            throw e;
        } finally {
            showLoading(false);
        }
    },

    // Upload Changes to Cloud (Push)
    syncToCloud: async () => {
        const url = localStorage.getItem(SYNC_URL_KEY);
        if (!url) return { success: false, message: "No Sync URL" };

        const queue = DB.getQueue();
        if (queue.length === 0) return { success: true, message: "Nothing to sync" };

        if (window.updateSyncUI) window.updateSyncUI('uploading', 'Menyimpan...');

        try {
            // Payload: Batch of Mutations
            const payload = {
                action: 'sync_mutations', // ACTION BARU DI SERVER
                mutations: queue
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            const json = await res.json();

            if (json.success) {
                // Sukses! Hapus queue karena sudah diproses server
                DB.clearQueue();
                if (window.updateSyncUI) window.updateSyncUI('saved', 'Tersimpan');

                // Opsional: Jika server mengembalikan data terbaru, update lokal
                if (json.latestData) {
                    DB.saveAll(json.latestData);
                }

                return { success: true, message: "Berhasil disimpan" };
            } else {
                throw new Error(json.error || "Server error");
            }
        } catch (e) {
            if (window.updateSyncUI) window.updateSyncUI('error', 'Gagal Simpan');
            return { success: false, message: e.message };
        }
    }
};

function buildIndexes() {
    dataMap = { santri: {}, guru: {}, mapel: {}, kelas: {} };
    for (const item of allData) {
        if (item.__type === 'santri') dataMap.santri[item.santri_id] = item;
        if (item.__type === 'user' && item.role === 'guru') dataMap.guru[item._id] = item;
        if (!dataMap[item._id]) dataMap[item._id] = item;
    }
}

function generateId(type) {
    const timestamp = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    let prefix = 'X';
    if (type === 'santri') prefix = 'S';
    else if (type === 'user') prefix = 'U';
    else if (type === 'mapel') prefix = 'M';
    else if (type === 'kelas') prefix = 'K';
    else if (type === 'setoran') prefix = 'TR';
    return `${prefix}-${timestamp}-${random}`;
}

// --- UTILS (v32 Helpers) ---
function getStudentStats(santriId) {
    const santri = allData.find(s => s.santri_id === santriId);
    if (!santri) return null;
    const history = allData.filter(d => d.__type === 'setoran' && d.santri_id === santriId && d.counted !== false);

    const totalHafalan = history.filter(s => s.setoran_type === 'Sabaq').reduce((sum, s) => sum + s.pages, 0);
    const now = new Date();
    const monthly = history.filter(s => new Date(s.setoran_date).getMonth() === now.getMonth());
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
    const html = `<div id="loader-overlay" class="fixed inset-0 z-[200] bg-white/80 backdrop-blur flex items-center justify-center"><div class="size-10 border-4 border-blue-200 border-t-primary rounded-full animate-spin"></div></div>`;
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
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const datePart = new Intl.DateTimeFormat('id-ID', optionsDate).format(d);

    let timePart;
    if (timeOverride) {
        // Check if timeOverride is a full ISO string (e.g. 1899-12-29T17:59:48.000Z)
        // or just HH:mm
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
        // Manual time formatting to ensure HH:mm 24h format
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        timePart = `${hours}:${minutes}`;
    }

    return `${datePart}<br><span class="text-xs text-slate-400 font-normal">${timePart}</span>`;
}

