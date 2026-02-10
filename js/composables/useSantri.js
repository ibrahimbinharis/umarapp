/**
 * useSantri Composable (Refactored to match v34 app_vue.js)
 * 
 * Manages santri (student) state and operations
 * Matches legacy field names (nis, class_id) to ensure HTML compatibility.
 */

function useSantri(uiData, DB, userSession, modalState, refreshData, searchText) {
    const { reactive, computed, ref } = Vue;

    // ===== STATE (Matched to app_vue.js) =====
    const santriGenderFilter = ref('L'); // L = Putra, P = Putri
    const activeDropdown = ref(null); // Track open dropdown ID

    const toggleDropdown = (id) => {
        activeDropdown.value = activeDropdown.value === id ? null : id;
    };

    const showTrash = ref(false); // Toggle Trash View
    const toggleTrash = () => {
        showTrash.value = !showTrash.value;
    };

    const santriForm = reactive({
        id: null, // For edit
        nis: '',
        username: '', // Login alternate
        full_name: '',
        nick_name: '',
        gender: 'L',
        class_id: '',
        parent_name: '',
        parent_phone: '',
        password: '',
        target_sabaq: 20,
        target_manzil_pct: 20
    });

    // ===== HELPER: GENERATE NIS =====
    // ===== HELPER: GENERATE NIS =====
    const generateSantriNIS = () => {
        // 1. Get ALL data (including soft deleted) to ensure absolute uniqueness
        const allData = DB.getAll();
        const allSantri = allData.filter(d => d.__type === 'santri'); // Include _deleted

        // 2. Determine Prefix Components
        const date = new Date();
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const yy = date.getFullYear().toString().slice(-2);

        // Requested Format: 2 + MM + YY + Seq (e.g., 2022601)
        const prefix = `2${mm}${yy}`;

        // 3. Find Max Sequence for this Month/Year
        let maxSeq = 0;

        for (const s of allSantri) {
            const nis = String(s.nis || s.santri_id || '');
            // Check if NIS matches pattern: Starts with '2MMYY', Total length 7
            if (nis.length === 7 && nis.startsWith(prefix)) {
                // Extract sequence (last 2 chars)
                const seqStr = nis.substring(5, 7);
                const seqNum = parseInt(seqStr, 10);
                if (!isNaN(seqNum) && seqNum > maxSeq) {
                    maxSeq = seqNum;
                }
            }
        }

        // 4. Generate New Sequence
        const newSeq = (maxSeq + 1).toString().padStart(2, '0');
        return `${prefix}${newSeq}`;
    };

    // ===== COMPUTED =====
    const filteredSantri = computed(() => {
        let items = [];

        // Dependency injection to force reactivity when data changes
        // uiData.santri is updated by loadData(), so using it here triggers re-calc
        const _trigger = uiData.santri ? uiData.santri.length : 0;

        // TRASH MODE: Fetch from DB.getAll() to find _deleted=true
        if (showTrash.value) {
            const all = DB.getAll(); // Not reactive by itself
            items = all.filter(d => d.__type === 'santri' && (d._deleted === true || d._deleted === 'true'));
        } else {
            // NORMAL MODE: Use uiData (already filtered active)
            items = uiData.santri || [];
        }

        if (searchText && searchText.value) {
            const q = searchText.value.toLowerCase();
            items = items.filter(s =>
                (s.full_name || '').toLowerCase().includes(q) ||
                String(s.nis || '').toLowerCase().includes(q)
            );
        }

        // Gender segregation for guru users
        if (userSession.value?.role === 'guru' && userSession.value?.gender) {
            items = items.filter(s => s.gender === userSession.value.gender);
        } else {
            // Filter by selected tab (L/P) if not forced by Guru role
            if (santriGenderFilter.value) {
                items = items.filter(s => s.gender === santriGenderFilter.value);
            }
        }

        return items.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    });

    // ===== ACTIONS =====

    const openSantriModal = (item = null) => {
        if (item) {
            // Edit Mode
            santriForm.id = item._id;
            santriForm.nis = item.nis || item.santri_id;
            santriForm.username = item.username || '';
            santriForm.full_name = item.full_name;
            santriForm.nick_name = item.nick_name || '';
            santriForm.gender = item.gender;
            santriForm.class_id = item.class_id || item.kelas;
            santriForm.parent_name = item.parent_name || '';
            santriForm.parent_phone = item.parent_phone || item.no_hp || '';
            santriForm.password = ''; // Don't show existing password
            santriForm.target_sabaq = item.target_sabaq || 20;
            santriForm.target_manzil_pct = item.target_manzil_pct || 20;

            modalState.title = "Edit Data Santri";
            modalState.isEdit = true;
        } else {
            // New Mode
            santriForm.id = null;
            santriForm.nis = generateSantriNIS();
            santriForm.username = '';
            santriForm.full_name = '';
            santriForm.nick_name = '';
            santriForm.gender = 'L';
            santriForm.class_id = '';
            santriForm.parent_name = '';
            santriForm.parent_phone = '';
            santriForm.password = '';
            santriForm.target_sabaq = 20;
            santriForm.target_manzil_pct = 20;

            modalState.title = "Tambah Santri Baru";
            modalState.isEdit = false;
        }

        modalState.view = 'santri-form';
        modalState.isOpen = true;
    };

    const saveSantri = async () => {
        if (!santriForm.full_name) return alert("Nama Lengkap wajib diisi");
        if (!santriForm.class_id) return alert("Kelas wajib dipilih");

        // Format Phone (62xxx)
        let phone = String(santriForm.parent_phone || '').replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '62' + phone.slice(1);

        const payload = {
            nis: santriForm.nis,
            santri_id: santriForm.nis, // Sync both for compatibility
            full_name: santriForm.full_name,
            nick_name: santriForm.nick_name,
            gender: santriForm.gender,
            class_id: santriForm.class_id,
            kelas: santriForm.class_id, // Sync both
            parent_name: santriForm.parent_name,
            parent_phone: phone,
            no_hp: phone, // Sync both
            target_sabaq: parseInt(santriForm.target_sabaq),
            target_manzil_pct: parseInt(santriForm.target_manzil_pct)
        };

        if (santriForm.username) payload.username = santriForm.username;

        if (santriForm.password) {
            payload.password = santriForm.password;
        }

        try {
            if (santriForm.id) {
                await DB.update(santriForm.id, payload);
            } else {
                // Check Duplicate NIS
                const exist = uiData.santri.find(s => s.nis === santriForm.nis);
                if (exist) return alert("NIS sudah digunakan!");

                // Add default password for new santri if empty
                if (!payload.password) payload.password = '123';

                await DB.create('santri', payload);
            }

            modalState.isOpen = false;
            refreshData(); // Call global refresh
            alert("Data Santri Berhasil Disimpan");
        } catch (e) {
            console.error(e);
            alert("Gagal menyimpan: " + e.message);
        }
    };

    const deleteSantri = async (item) => {
        if (!confirm(`Hapus santri ${item.full_name}? SEMUA data terkait akan dipindahkan ke sampah (Soft Delete).`)) return;

        try {
            // Cascading Soft Delete
            const targetId = item._id;
            const targetNis = item.nis || item.santri_id; // Linking key

            const allData = DB.getAll();

            // We don't remove from array anymore, we update _deleted = true
            // But for UI reactivity, we might need to trigger reactivity or filter it out.
            // Since loadData() filters _deleted, we just need to mark them and call refreshData().

            const itemsToSoftDelete = [];

            // Identify items to soft delete
            for (const d of allData) {
                let shouldDelete = false;

                // 1. The Santri itself
                if (d._id === targetId) shouldDelete = true;

                // 2. Related Data (Setoran, Ujian, Absensi, Pelanggaran, etc)
                else if (d.santri_id && (String(d.santri_id) === String(targetNis) || d.santri_id === targetId)) shouldDelete = true;
                else if (d.user_id && (d.user_id === targetId || String(d.user_id) === String(targetNis))) shouldDelete = true;

                if (shouldDelete) {
                    d._deleted = true; // Mark local data
                    d.updated_at = new Date().toISOString();
                    itemsToSoftDelete.push(d);
                }
            }

            // Queue UPDATES for Cloud (Action: Update, Payload: { _id, _deleted: true })
            for (const d of itemsToSoftDelete) {
                if (d.__type) {
                    DB.addToQueue('update', d.__type, { _id: d._id, _deleted: true });
                }
            }

            DB.saveAll(allData); // Save the modifications (filtering happens in loadData)
            DB.triggerAutoSync();

            refreshData(); // Re-runs loadData which filters out _deleted
            alert("Santri dan data terkait berhasil dihapus (Soft Delete)");
        } catch (e) {
            console.error(e);
            alert("Gagal hapus: " + e.message);
        }
    };

    const restoreSantri = async (item) => {
        if (!confirm(`Kembalikan santri ${item.full_name} beserta seluruh datanya?`)) return;

        try {
            // Cascading Restore
            const targetId = item._id;
            const targetNis = item.nis || item.santri_id;

            const allData = DB.getAll(); // Contains _deleted items
            const itemsToRestore = [];

            // Identify items to restore (Must be currently deleted)
            for (const d of allData) {
                if (d._deleted !== true && d._deleted !== 'true') continue;

                let shouldRestore = false;

                // 1. The Santri itself
                if (d._id === targetId) shouldRestore = true;

                // 2. Related Data
                else if (d.santri_id && (String(d.santri_id) === String(targetNis) || d.santri_id === targetId)) shouldRestore = true;
                else if (d.user_id && (d.user_id === targetId || String(d.user_id) === String(targetNis))) shouldRestore = true;

                if (shouldRestore) {
                    d._deleted = false; // RESTORE
                    d.updated_at = new Date().toISOString();
                    itemsToRestore.push(d);
                }
            }

            // Queue UPDATES for Cloud (Action: Update, Payload: { _id, _deleted: false })
            for (const d of itemsToRestore) {
                if (d.__type) {
                    DB.addToQueue('update', d.__type, { _id: d._id, _deleted: false });
                }
            }

            DB.saveAll(allData);
            DB.triggerAutoSync();

            refreshData();
            alert("Santri dan data terkait berhasil dikembalikan (Restore)");
        } catch (e) {
            console.error(e);
            alert("Gagal restore: " + e.message);
        }
    };

    return {
        santriForm,
        // Alias for backward compatibility with template if it uses santriModalState
        santriModalState: modalState,
        filteredSantri,

        openSantriModal,
        saveSantri,
        deleteSantri,
        restoreSantri, // New

        generateSantriNIS,
        santriGenderFilter,
        activeDropdown,
        toggleDropdown,

        showTrash, // New
        toggleTrash // New
    };
}
