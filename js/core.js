const APP_CONFIG = {
    appName: "E-Umar",
    version: "v3.19",
    supabaseUrl: "https://fxtmilqvxomuvkxxzjli.supabase.co",
    supabaseKey: "sb_publishable_aXcK3znrtRo0d3gH-Wg1Ew_-0Z3262O"
};

const DB_KEY = 'tahfidz_v37_master';
const QUEUE_KEY = 'tahfidz_v37_queue';

// Init Supabase Client
const { createClient } = supabase;
const sb = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseKey);

// --- Global State ---
window.surahList = [];
let currentUser = null;
let allData = []; // Will be populated by DB.init()
let dataMap = { santri: {}, guru: {}, mapel: {}, kelas: {} }; // Indexing
// buildIndexes() moved to DB.init()

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
    return window.surahList;
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
    // Fix: Fallback Base64-reversed sebelumnya tidak aman (mudah di-decode).
    // Jika WebCrypto tidak tersedia, kembalikan string kosong dan log warning
    // agar password lama (plaintext/legacy) di DB tidak tertimpa dengan 'hash' palsu.
    console.error('[Security] WebCrypto API tidak tersedia. Password tidak di-hash!');
    return "";
}

// --- 3. DATABASE ENGINE (Supabase Adapter) ---
const DB = {
    init: async () => {
        const idb = window.idbKeyval;
        if (!idb) {
            console.error("idb-keyval not loaded!");
            return;
        }

        try {
            const data = await idb.get(DB_KEY);
            if (data && Array.isArray(data)) {
                allData = data;
                console.log("[DB] Loaded from IndexedDB:", allData.length, "rows");
            } else {
                console.log("[DB] IndexedDB empty, checking localStorage migration...");
                const oldData = localStorage.getItem(DB_KEY);
                if (oldData) {
                    allData = JSON.parse(oldData);
                    await idb.set(DB_KEY, allData);
                    console.log("[DB] Migrated data from localStorage to IndexedDB");
                    // DO NOT clear localStorage manually to avoid data loss if browser fails
                } else {
                    allData = [];
                }
            }
        } catch (e) {
            console.error("[DB Init] Error:", e);
            allData = [];
        }
        buildIndexes();
    },
    getAll: () => {
        // Return Synchronous Cache for UI Speed
        return allData;
    },
    saveAll: async (data) => {
        allData = data;
        buildIndexes();
        if (window.idbKeyval) {
            // v37: Ensure data is not a Proxy or contains non-clonable bits
            const cleanData = DB._serialize(data);
            await window.idbKeyval.set(DB_KEY, cleanData);
        }
    },

    /**
     * Helper to strip Vue Proxies or non-serializable properties 
     * before saving to IndexedDB (Structured Clone Fix)
     */
    _serialize: (obj) => {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            console.warn("[DB] Serialization warning:", e);
            return obj;
        }
    },

    // --- MUTATION QUEUE (Offline Support) ---
    getQueue: async () => {
        if (!window.idbKeyval) return [];
        const q = await window.idbKeyval.get(QUEUE_KEY);
        let parsed = q || [];

        // Also check localStorage for queue migration
        if (parsed.length === 0) {
            const oldQ = localStorage.getItem(QUEUE_KEY);
            if (oldQ) {
                parsed = JSON.parse(oldQ);
                await window.idbKeyval.set(QUEUE_KEY, parsed);
                localStorage.removeItem(QUEUE_KEY);
            }
        }

        // Auto-fix: Filter out legacy 'riwayat_hafalan' items that cause 404 loops
        const valid = parsed.filter(item => item.collection !== 'riwayat_hafalan');

        // Update local storage if we filtered anything (Self-healing)
        if (valid.length !== parsed.length) {
            console.warn("Cleaned up legacy queue items:", parsed.length - valid.length);
            await window.idbKeyval.set(QUEUE_KEY, valid);
        }

        return valid;
    },
    addToQueue: async (action, collection, payload) => {
        if (!window.idbKeyval) return;
        const q = await DB.getQueue();
        // v37: Serialize payload to avoid Proxy issues
        const cleanPayload = DB._serialize(payload);
        q.push({ action, collection, payload: cleanPayload, timestamp: Date.now() });
        await window.idbKeyval.set(QUEUE_KEY, q);
    },
    removeFromQueue: async (timestamp) => {
        if (!window.idbKeyval) return;
        let q = await DB.getQueue();
        q = q.filter(item => item.timestamp !== timestamp);
        await window.idbKeyval.set(QUEUE_KEY, q);
    },

    triggerAutoSync: () => {
        if (DB._syncTimer) clearTimeout(DB._syncTimer);
        DB._syncTimer = setTimeout(() => {
            DB.syncToCloud(); // Push changes
        }, 1000);
    },

    // --- CRUD ---
    create: async (collection, item) => {
        if (!item._id) item._id = generateId(collection);
        item.__type = collection; // Internal type tracking
        const now = new Date().toISOString();
        item.created_at = now;
        item.updated_at = now;

        if ((collection === 'user' || collection === 'users' || collection === 'santri') && item.password) {
            item.password = await hashPassword(item.password);
        }

        // 1. Optimistic UI Update
        allData.unshift(item);
        await DB.saveAll(allData);

        // 2. Queue for Cloud
        await DB.addToQueue('create', collection, item);
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
        await DB.saveAll(allData);

        // 2. Queue for Cloud (Only send updates id)
        console.log(`[DB] Queuing update for ${collection} ID: ${id}`);
        await DB.addToQueue('update', collection, { _id: id, ...updates });
        DB.triggerAutoSync();

        return allData[idx];
    },
    delete: async (id) => {
        const idx = allData.findIndex(d => d._id === id);
        if (idx !== -1) {
            const item = allData[idx];
            const collection = item.__type;

            // 1. Optimistic Update (Soft Delete)
            item._deleted = true;
            item.updated_at = new Date().toISOString();

            // We keep it in allData (as a tombstone) but UI filters it out via loadData()
            allData[idx] = item;
            await DB.saveAll(allData);

            // 2. Queue as UPDATE (to set _deleted=true on server)
            // We use 'update' action instead of 'delete' action to avoid FK constraints
            await DB.addToQueue('update', collection, { _id: id, _deleted: true });
            DB.triggerAutoSync();
        }
    },
    updateOrInsert: async (payload, collection) => {
        const id = payload._id;
        const exists = allData.some(d => d._id === id);
        if (exists) {
            return await DB.update(id, payload);
        } else {
            return await DB.create(collection, payload);
        }
    },

    // --- SUPABASE SYNC ---
    _syncTimer: null,

    // Pull from Supabase
    isSyncing: false, // Mutex Lock

    syncFromCloud: async (silent = false) => {
        if (!navigator.onLine) return { success: false, message: "Offline" };
        if (DB.isSyncing) {
            console.log("Sync skipped: Already in progress");
            return { success: true, skipped: true };
        }

        DB.isSyncing = true;

        // Only show full loader if explicit (not silent bg sync)
        if (!silent) showLoading(true, 'Sinkronisasi Cloud...');

        try {
            // --- TIERED FETCH STRATEGY ---
            // Static/small tables: fetch all (jumlah tidak tumbuh cepat)
            const staticTables = ['users', 'santri', 'kelas', 'mapel', 'jadwal', 'pelanggaran_type', 'settings'];
            // Growing tables: fetch only last 3 months to avoid memory bloat
            const growingTables = ['setoran', 'absensi', 'pelanggaran', 'ujian', 'uang_saku'];

            // 1 year ago cutoff (Updated from 3 months since we use IndexedDB now)
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const cutoffDate = oneYearAgo.toISOString();

            let cloudData = [];

            const normalizeRecord = (d, type) => {
                if (d._deleted === 'false') d._deleted = false;
                if (d._deleted === 'true') d._deleted = true;
                return { ...d, __type: type };
            };

            // Fetch static tables (all rows, no limit concern)
            const staticPromises = staticTables.map(table =>
                sb.from(table).select('*').then(res => {
                    if (res.error) throw res.error;
                    const type = table === 'users' ? 'user' : table;
                    return res.data.map(d => normalizeRecord(d, type));
                })
            );

            // Fetch growing tables (last 1 year, max 20000 rows each)
            const growingPromises = growingTables.map(table =>
                sb.from(table)
                    .select('*')
                    .gte('created_at', cutoffDate)
                    .order('created_at', { ascending: false })
                    .limit(20000)
                    .then(res => {
                        if (res.error) throw res.error;
                        console.log(`[Sync] ${table}: fetched ${res.data.length} rows (last 1 year)`);
                        return res.data.map(d => normalizeRecord(d, table));
                    })
            );

            // --- NOTIFICATIONS: Hanya fetch milik user yang sedang login ---
            // Ini mencegah notifikasi user lain masuk ke localStorage
            // dan mencegah status is_read di-reset saat sync
            const currentUserId = currentUser ? currentUser._id : null;
            const allPromises = [...staticPromises, ...growingPromises];

            if (currentUserId) {
                const notifPromise = sb.from('notifications')
                    .select('*')
                    .eq('user_id', currentUserId)
                    .eq('_deleted', false)
                    .order('created_at', { ascending: false })
                    .limit(100)
                    .then(res => {
                        if (res.error) {
                            console.warn('[Sync] Notifications fetch error:', res.error);
                            return [];
                        }
                        return res.data.map(d => ({ ...d, __type: 'notifications' }));
                    });
                allPromises.push(notifPromise);
            }

            const results = await Promise.all(allPromises);
            results.forEach(arr => cloudData = cloudData.concat(arr));

            // Merge Strategy: Server Wins but Local Queue Re-applied
            let mergedData = [...cloudData];
            const queue = await DB.getQueue();

            // --- DEFENSIVE MERGE: Anti-Blink Protection ---
            // If we just uploaded an item, it might be removed from queue but NOT YET visible in the query result (race condition).
            // We must KEEP local items that are:
            // 1. Not in Cloud Result
            // 2. Not in Queue (because already uploaded or just created)
            // 3. Recently created (< 2 minutes ago)
            const cloudIds = new Set(mergedData.map(c => c._id));
            const queueIds = new Set(queue.map(q => q.payload._id));

            const recentLocalItems = allData.filter(local => {
                // If present in cloud, server version wins (handled by mergedData init)
                if (cloudIds.has(local._id)) return false;

                // If present in queue, queue logic below handles it
                if (queueIds.has(local._id)) return false;

                // If explicitly deleted locally, let it die
                if (local._deleted) return false;

                // Check age
                if (!local.created_at) return false;
                const age = Date.now() - new Date(local.created_at).getTime();
                // Keep items created in last 5 mins to survive the "Consistency Delay"
                return age < (5 * 60 * 1000);
            });

            if (recentLocalItems.length > 0) {
                console.log(`[Defensive Sync] Keeping ${recentLocalItems.length} recent items not yet in cloud.`);
                mergedData = [...mergedData, ...recentLocalItems];
            }

            if (queue.length > 0) {
                // 1. Identification Ops
                const deleteIds = new Set(queue.filter(q => q.action === 'delete').map(q => q.payload._id));
                const updateMap = new Map();
                queue.filter(q => q.action === 'update').forEach(q => {
                    updateMap.set(q.payload._id, q.payload);
                });

                // 2. Remove items pending delete
                mergedData = mergedData.filter(item => !deleteIds.has(item._id));

                // 3. Apply updates
                mergedData = mergedData.map(item => {
                    if (updateMap.has(item._id)) {
                        return { ...item, ...updateMap.get(item._id) };
                    }
                    return item;
                });

                // 4. Append local Creates (that are not yet in cloud)
                const cloudIds = new Set(mergedData.map(c => c._id));
                const localCreates = allData.filter(item => {
                    // It's a Create if it's in the queue as 'create' OR just missing from cloud but exists locally?
                    // Better: Check if any queue item is 'create' for this ID
                    const isQueuedCreate = queue.some(q => q.action === 'create' && q.payload._id === item._id);
                    return isQueuedCreate && !cloudIds.has(item._id);
                });

                mergedData = [...mergedData, ...localCreates];
            }

            await DB.saveAll(mergedData);

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
            DB.isSyncing = false;
        }
    },

    // --- AUTHENTICATION & LOGIN (v36: Plain Text Support for Legacy Data) ---
    // --- AUTHENTICATION & LOGIN (v36: Supabase Auth) ---
    login: async (username, password) => {
        try {
            const inputUsername = username.trim();
            const inputPassword = password;

            // Supabase minimal 6 karakter. Jika kurang, kita tambah akhiran rahasia secara internal.
            const authPassword = (inputPassword.length > 0 && inputPassword.length < 6) ? inputPassword + "_legacy" : inputPassword;

            // 0. Resolve Username (Bisa login pakai NIG atau Username Custom)
            const { data: profileLookup, error: lookupErr } = await sb.from('users')
                .select('username, custom_username, password, full_name, role')
                .or(`username.eq."${inputUsername}",custom_username.eq."${inputUsername}"`)
                .maybeSingle();

            if (lookupErr) console.warn("Profile lookup warning:", lookupErr);

            // --- SANTRI AUTO-ACTIVATION LOGIC ---
            let santriProfile = null;
            if (!profileLookup) {
                // Jika tidak ketemu di users, cek di tabel santri (NIS)
                const { data: sData, error: sErr } = await sb.from('santri')
                    .select('*')
                    .or(`santri_id.eq."${inputUsername}",nis.eq."${inputUsername}"`)
                    .maybeSingle();

                if (sData) {
                    santriProfile = sData;
                    console.log("Santri found in database. Checking for auto-activation...");
                }
            }

            // Tentukan Email Login: 
            const authUsername = profileLookup ? profileLookup.username : inputUsername;
            const email = authUsername.includes('@') ? authUsername : `${authUsername}@tahfidz.app`;

            console.log(`[Login] Menghubungi server untuk: ${email}`);

            // 1. Coba Login via Supabase Auth
            let { data, error } = await sb.auth.signInWithPassword({
                email: email,
                password: authPassword
            });

            // 2. Jika Gagal Login & Ada Santri Profile (Auto-Activation)
            if (error && santriProfile && inputPassword === inputUsername) {
                console.log("[Login] Akun belum aktif. Memulai aktivasi otomatis untuk Santri...");

                // Cek apakah email/username sudah terpakai di Auth/Users (Tabrakan Wali-Santri)
                const { data: userExist } = await sb.from('users').select('full_name, role').eq('username', inputUsername).maybeSingle();
                if (userExist) {
                    return {
                        success: false,
                        message: `NIS ini sudah terdaftar sebagai akun ${userExist.role} (${userExist.full_name}). Silakan hubungi admin untuk memperbaiki data.`
                    };
                }

                // Buat akun Auth
                const { data: newData, error: regError } = await sb.auth.signUp({
                    email: email,
                    password: authPassword,
                    options: {
                        data: {
                            username: inputUsername,
                            role: 'santri',
                            full_name: santriProfile.full_name
                        }
                    }
                });

                if (regError) {
                    console.error("[Login] Gagal SignUp:", regError.message);
                    return { success: false, message: "Gagal aktivasi: " + regError.message };
                } else if (newData.user) {
                    console.log("[Login] Akun Auth berhasil dibuat. Membuat profil database...");
                    // Buat Profile di database
                    const { error: profError } = await sb.from('users').upsert({
                        _id: newData.user.id,
                        username: inputUsername,
                        full_name: santriProfile.full_name,
                        role: 'santri',
                        gender: santriProfile.gender || '',
                        created_at: new Date().toISOString()
                    });

                    if (profError) {
                        console.error("[Login] Gagal Upsert Profile:", profError.message);
                        return { success: false, message: "Gagal membuat profil: " + profError.message };
                    }

                    // Coba login ulang
                    const retry = await sb.auth.signInWithPassword({
                        email: email,
                        password: authPassword
                    });
                    data = retry.data;
                    error = retry.error;
                }
            }
            // 3. Jika Gagal Login & Ada legacy password (Migration)
            else if (error && profileLookup && profileLookup.password) {
                console.log("[Login] Auth gagal, mencoba verifikasi password lama (Legacy)...");

                const hashedInput = await hashPassword(inputPassword);
                if (hashedInput === profileLookup.password) {
                    console.log("[Login] Password lama cocok! Melakukan migrasi akun...");

                    // Buat akun Auth (Selalu gunakan 'username' dari DB agar konsisten)
                    const { data: newData, error: regError } = await sb.auth.signUp({
                        email: email,
                        password: authPassword,
                        options: {
                            data: {
                                username: authUsername,
                                role: profileLookup.role,
                                full_name: profileLookup.full_name
                            }
                        }
                    });

                    if (!regError) {
                        // Hubungkan ID Auth baru ke profil database
                        await sb.from('users')
                            .update({ _id: newData.user.id })
                            .eq('username', profileLookup.username);

                        // Coba login ulang
                        const retry = await sb.auth.signInWithPassword({
                            email: email,
                            password: authPassword
                        });
                        data = retry.data;
                        error = retry.error;
                    }
                }
            }

            if (error) {
                console.error("Final login error:", error);
                return { success: false, message: "Username atau Password salah" };
            }

            // 4. Ambil Profil Final
            const { data: finalProfile } = await sb.from('users')
                .select('*')
                .eq('_id', data.user.id)
                .maybeSingle();

            const meta = data.user.user_metadata || {};

            // 5. Ensure local record exists
            if (finalProfile) {
                const existingIdx = allData.findIndex(u => u._id === finalProfile._id);
                if (existingIdx === -1) {
                    allData.unshift({ ...finalProfile, __type: 'user' });
                } else {
                    allData[existingIdx] = { ...allData[existingIdx], ...finalProfile, __type: 'user' };
                }
                DB.saveAll(allData);
            }

            return {
                success: true,
                user: finalProfile || {
                    _id: data.user.id,
                    full_name: meta.full_name || inputUsername,
                    role: meta.role || 'wali',
                    username: authUsername
                },
                session: data.session
            };

        } catch (e) {
            console.error("Auth Exception", e);
            return { success: false, message: "Terjadi kesalahan sistem: " + e.message };
        }
    },

    // Push to Supabase (Process Queue)
    syncToCloud: async () => {
        if (!navigator.onLine) return;
        const queue = await DB.getQueue();
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
                    console.log(`[CloudSync] Creating ${collection}...`);
                    res = await sb.from(collection).insert(cleanPayload);
                } else if (action === 'update') {
                    const { _id, ...fields } = cleanPayload;

                    // v36 Fix: Sanitize date fields for settings table to prevent 'invalid input syntax for type date: ""'
                    if (collection === 'settings') {
                        if (fields.holiday_start === "") fields.holiday_start = null;
                        if (fields.holiday_end === "") fields.holiday_end = null;
                    }

                    console.log(`[CloudSync] Updating ${collection} ID: ${_id}...`);
                    res = await sb.from(collection).update(fields).eq('_id', _id);
                } else if (action === 'delete') {
                    console.log(`[CloudSync] Deleting ${collection} ID: ${cleanPayload._id}...`);
                    res = await sb.from(collection).delete().eq('_id', cleanPayload._id);
                }

                if (res.error) {
                    // Handle Duplicate Key or Missing Column (Schema Mismatch/Contamination)
                    const isUnrecoverable =
                        res.error.code === '23505' ||
                        res.error.code === 'PGRST204' ||
                        res.error.code === '22007' || // Invalid date syntax
                        res.status === 409 ||
                        (res.error.message && res.error.message.includes('duplicate key'));

                    if (isUnrecoverable) {
                        console.warn(`[CloudSync] Unrecoverable sync error (${res.error.code}). Removing from queue.`, res.error.message);
                        await DB.removeFromQueue(timestamp);
                    } else {
                        console.error(`[CloudSync] Push Error for ${collection}:`, res.error);
                        // v37 Extra Debug info
                        if (res.error.details) console.error("Error Details:", res.error.details);
                        if (res.error.hint) console.error("Error Hint:", res.error.hint);
                    }
                } else {
                    await DB.removeFromQueue(timestamp);
                }
            } catch (e) {
                console.error("Mutation Error", e);
            }
        }

        if (window.updateSyncUI) window.updateSyncUI('saved', 'Tersimpan');
    },

    // --- STORAGE (Supabase Storage) ---
    uploadFile: async (file, path) => {
        if (!navigator.onLine) throw new Error("Offline. Gagal mengunggah.");

        try {
            // 1. Upload file
            const { data, error } = await sb.storage
                .from('assets')
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) throw error;

            // 2. Get Public URL
            const { data: { publicUrl } } = sb.storage
                .from('assets')
                .getPublicUrl(path);

            return publicUrl;
        } catch (e) {
            console.error("Upload Error:", e);
            throw e;
        }
    }
};

// --- REALTIME SUBSCRIPTION (Surgical Sync v2) ---
// Instead of re-fetching ALL data on every change, we patch ONLY the changed record.
// This is O(1) per event instead of O(N*11 tables).
const _realtimeThrottle = { lastFullSync: 0 };

function initRealtime() {
    const channel = sb.channel('db-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => {
                const { eventType, table, new: newRecord, old: oldRecord } = payload;

                // Skip notifications table — handled by useNotifications.js per-user channel
                if (table === 'notifications') return;

                // --- SURGICAL PATCH: Update only the affected record in memory ---
                const internalType = table === 'users' ? 'user' : table;

                if (eventType === 'INSERT' && newRecord?._id) {
                    const exists = allData.some(d => d._id === newRecord._id);
                    if (!exists) {
                        allData.unshift({ ...newRecord, __type: internalType });
                        console.log(`[Realtime] INSERT ${table}: ${newRecord._id}`);
                    }
                } else if (eventType === 'UPDATE' && newRecord?._id) {
                    const idx = allData.findIndex(d => d._id === newRecord._id);
                    if (idx !== -1) {
                        allData[idx] = { ...allData[idx], ...newRecord, __type: internalType };
                        console.log(`[Realtime] UPDATE ${table}: ${newRecord._id}`);
                    } else {
                        // Record doesn't exist locally yet — add it
                        allData.unshift({ ...newRecord, __type: internalType });
                    }
                } else if (eventType === 'DELETE' && oldRecord?._id) {
                    const idx = allData.findIndex(d => d._id === oldRecord._id);
                    if (idx !== -1) {
                        allData[idx]._deleted = true;
                        console.log(`[Realtime] DELETE ${table}: ${oldRecord._id}`);
                    }
                }

                // Save patched data to localStorage
                // Intentionally not awaited to not block realtime flow
                DB.saveAll(allData);

                // Debounce: re-compute Vue reactive state (lightweight, no network)
                if (DB._realtimeTimer) clearTimeout(DB._realtimeTimer);
                DB._realtimeTimer = setTimeout(() => {
                    if (window.loadData) window.loadData();
                }, 300);

                // Throttled full sync as safety net (max once per 60 seconds)
                // Catches edge cases like schema changes or missed events
                const now = Date.now();
                if (now - _realtimeThrottle.lastFullSync > 60000) {
                    _realtimeThrottle.lastFullSync = now;
                    setTimeout(() => DB.syncFromCloud(true), 5000);
                }
            }
        )
        .subscribe();
}

// Call Realtime Init
initRealtime();

// --- GLOBAL SAVE GUARD ---
// Prevents duplicate form submissions when user clicks save multiple times.
// Usage in composables: await window.withSaving(async () => { ... your save logic ... });
// Usage in template for button state: :disabled="isSavingGlobal"
window.isSavingGlobal = false;

window.withSaving = async (fn) => {
    if (window.isSavingGlobal) {
        console.warn('[SaveGuard] Blocked duplicate save attempt.');
        return;
    }
    window.isSavingGlobal = true;

    // Dispatch event so Vue can react to this change reactively if needed
    window.dispatchEvent(new CustomEvent('saving-state-change', { detail: true }));

    try {
        return await fn();
    } finally {
        window.isSavingGlobal = false;
        window.dispatchEvent(new CustomEvent('saving-state-change', { detail: false }));
    }
};


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
    else if (type === 'users' || type === 'user') {
        // v37: Use UUID for user accounts to ensure compatibility with Supabase Auth schema (UUID _id)
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        // Fallback for older browsers (Local UUIDv4 generator)
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
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

// --- UI SAFETY STUBS ---
// Dipasang di sini (core.js) agar tersedia SEBELUM Vue app mount.
// Saat app_vue.js sudah siap, window.showConfirm/showAlert/showToast
// akan di-overwrite dengan implementasi premium yang sesungguhnya.
// Ini mencegah error "window.showConfirm is not a function" jika
// composable dipanggil terlalu awal (race condition saat init).
window.showConfirm = window.showConfirm || function (options) {
    console.warn('[UI Stub] showConfirm belum siap, menggunakan fallback.');
    if (options && typeof options.onConfirm === 'function') {
        if (confirm(options.message || 'Apakah Anda yakin?')) {
            options.onConfirm();
        } else if (typeof options.onCancel === 'function') {
            options.onCancel();
        }
    }
};

window.showAlert = window.showAlert || function (message, title, type) {
    console.warn('[UI Stub] showAlert belum siap, menggunakan fallback.');
    alert((title ? title + ': ' : '') + message);
};

window.showToast = window.showToast || function (message, type, duration) {
    console.warn('[UI Stub] showToast belum siap, menggunakan fallback.');
    console.log('[Toast]', type, message);
};

function updateSyncUI(status, msg) {
    if (status === 'error') console.warn(msg);
}

async function deleteData(id, pageToReload) {
    if (window.showConfirm) {
        window.showConfirm({
            title: 'Hapus Data',
            message: 'Yakin hapus data ini?',
            confirmText: 'Ya, Hapus',
            type: 'danger',
            onConfirm: async () => {
                await DB.delete(id);
                if (window.refreshData) window.refreshData();
                else window.location.reload();
            }
        });
    } else {
        // Fallback removed to enforce premium UI
        console.warn("window.showConfirm not ready.");
    }
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

// --- PWA INSTALLATION LOGIC ---
window.deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    window.deferredPrompt = e;
    // Notify the app that installation is available
    window.dispatchEvent(new Event('pwa-install-available'));
    console.log('PWA Install Prompt Available');
});

window.installPWA = async () => {
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) {
        console.warn("No install prompt available");
        return;
    }
    // Show the install prompt
    promptEvent.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    window.deferredPrompt = null;
};

// Check if app is already installed
window.addEventListener('appinstalled', (evt) => {
    console.log('E-Umar was installed');
    window.deferredPrompt = null;
});
