// --- 1. CONFIG & DATABASE ---
const APP_CONFIG = {
    appName: "E-Ma'had",
    version: "v32",
    spreadsheetId: "1JsUAEHr2Zl5mYEnt2GQHb30QFzqblbEu8drfHygpX1k"
};

const DB_KEY = 'tahfidz_v32_master';
const INIT_KEY = 'tahfidz_v32_init';
const SYNC_URL_KEY = 'tahfidz_sync_url';

// --- Global State ---
let surahList = [];
let currentUser = null;
let allData = [];
let dataMap = { santri: {}, guru: {}, mapel: {}, kelas: {} }; // Indexing

// --- 2. CRYPTO & SECURITY ---
async function hashPassword(plainPassword) {
    if (!plainPassword) return "";
    const encoder = new TextEncoder();
    const data = encoder.encode(plainPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// --- 3. DATABASE ENGINE ---
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
    triggerAutoSync: () => {
        if (DB._syncTimer) clearTimeout(DB._syncTimer);
        DB._syncTimer = setTimeout(() => {
            DB.syncToCloud().then(r => console.log("Auto-save:", r.message)).catch(e => console.warn("Auto-save failed:", e));
        }, 2000); // Debounce 2s
    },
    create: async (collection, item) => {
        item._id = generateId(collection);
        item.__type = collection;
        item.created_at = new Date().toISOString();
        item.updated_at = new Date().toISOString();

        // Hash password if user
        if (collection === 'user' && item.password) {
            item.password = await hashPassword(item.password);
        }
        // Hash password for santri (wali login)
        if (collection === 'santri' && item.password) {
            item.password = await hashPassword(item.password);
        }

        allData.unshift(item); // Add to top
        DB.saveAll(allData);
        DB.triggerAutoSync();

        return item;
    },
    update: async (id, updates) => {
        const idx = allData.findIndex(d => d._id === id);
        if (idx === -1) throw new Error("Data not found");

        // Hash password if being updated
        if (updates.password) {
            updates.password = await hashPassword(updates.password);
        }

        updates.updated_at = new Date().toISOString();
        allData[idx] = { ...allData[idx], ...updates };
        DB.saveAll(allData);
        DB.triggerAutoSync();

        return allData[idx];
    },
    delete: async (id) => {
        allData = allData.filter(d => d._id !== id);
        DB.saveAll(allData);
        DB.triggerAutoSync();
    },

    // --- SYNC ---
    _syncTimer: null,
    syncFromCloud: async () => {
        const url = localStorage.getItem(SYNC_URL_KEY);
        if (!url) return { success: false, message: "No Sync URL" };

        showLoading(true, 'Updating...');
        try {
            const res = await fetch(url);
            const cloudData = await res.json();
            DB.saveAll(cloudData);
            updateSyncUI('success', 'Synced');
            return { success: true };
        } catch (e) {
            updateSyncUI('error', 'Offline');
            throw e;
        } finally {
            showLoading(false);
        }
    },

    syncToCloud: async () => {
        const url = localStorage.getItem(SYNC_URL_KEY);
        if (!url) return { success: false, message: "No Sync URL" };

        try {
            const payload = { action: 'save', data: DB.getAll() };
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) return { success: true, message: "Berhasil disimpan ke Cloud" };
            else throw new Error(json.error);
        } catch (e) {
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
    const html = `<div id="loader-overlay" class="fixed inset-0 z-[200] bg-white/80 backdrop-blur flex flex-col items-center justify-center"><div class="size-10 border-4 border-blue-200 border-t-primary rounded-full animate-spin mb-4"></div><p class="font-bold text-slate-600 animate-pulse">${msg}</p></div>`;
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

