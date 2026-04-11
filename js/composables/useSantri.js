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
        phone: '',
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

        // Filter for Wali - only show linked santri
        if (userSession.value?.role === 'wali') {
            items = items.filter(s => s.wali_id === userSession.value._id);
        }

        // Filter for Santri - only show themselves
        if (userSession.value?.role === 'santri') {
            const userId = userSession.value._id;
            const userName = userSession.value.username;
            items = items.filter(s => s._id === userId || s.santri_id === userName || s.nis === userName);
        }

        // Gender segregation for guru users
        if (userSession.value?.role === 'guru' && userSession.value?.gender) {
            items = items.filter(s => s.gender === userSession.value.gender);
        } else if (userSession.value?.role !== 'wali') {
            // Filter by selected tab (L/P) if not forced by Guru role and NOT holding Wali role
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

            // v36: Pull real-time data from linked Wali if exists
            let pName = item.parent_name || '';
            let pPhone = item.phone || '';

            if (item.wali_id) {
                const allData = DB.getAll();
                const wali = allData.find(u => (u.__type === 'user' || u.__type === 'users') && u._id === item.wali_id);
                if (wali) {
                    pName = wali.full_name || pName;
                    pPhone = wali.phone || pPhone;
                }
            }

            santriForm.parent_name = pName;
            santriForm.phone = pPhone;
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
            santriForm.phone = '';
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
        // --- Role Protection (v36) ---
        if (userSession.value?.role !== 'admin' && userSession.value?.role !== 'guru') {
            window.showAlert("Anda tidak memiliki akses untuk melakukan tindakan ini.", "Akses Ditolak", "danger");
            return;
        }

        return window.withSaving(async () => {
            if (!santriForm.full_name) return window.showAlert("Nama Lengkap wajib diisi", "Peringatan", "warning");
            if (!santriForm.class_id) return window.showAlert("Kelas wajib dipilih", "Peringatan", "warning");

            // Format Phone (62xxx)
            let phone = String(santriForm.phone || '').replace(/\D/g, '');
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
                phone: phone,
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
                    if (exist) return window.showAlert("NIS sudah digunakan!", "Duplikat", "warning");

                    // Add default password for new santri if empty
                    if (!payload.password) payload.password = '123';

                    await DB.create('santri', payload);
                }

                modalState.isOpen = false;
                refreshData(); // Call global refresh
                window.showAlert("Data Santri Berhasil Disimpan", "Sukses", "success");
            } catch (e) {
                console.error(e);
                window.showAlert("Gagal menyimpan: " + e.message, "Error", "danger");
            }
        }); // end withSaving
    };

    const deleteSantri = async (item) => {
        // --- Role Protection (v36) ---
        if (userSession.value?.role !== 'admin' && userSession.value?.role !== 'guru') {
            window.showAlert("Anda tidak memiliki akses untuk melakukan tindakan ini.", "Akses Ditolak", "danger");
            return;
        }

        window.showConfirm({
            title: 'Hapus Santri',
            message: `Hapus santri ${item.full_name}? SEMUA data terkait akan dipindahkan ke sampah (Soft Delete).`,
            confirmText: 'Ya, Hapus',
            type: 'danger',
            onConfirm: async () => {
                try {
                    // Cascading Soft Delete
                    const targetId = item._id;
                    const targetNis = item.nis || item.santri_id; // Linking key

                    const allData = DB.getAll();
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

                    // Queue UPDATES for Cloud (Await to prevent IDB race condition)
                    for (const d of itemsToSoftDelete) {
                        if (d.__type) {
                            await DB.addToQueue('update', d.__type, { _id: d._id, _deleted: true });
                        }
                    }

                    await DB.saveAll(allData);
                    DB.triggerAutoSync();

                    refreshData();
                    window.showAlert("Santri dan data terkait berhasil dihapus", "Informasi", "info");
                } catch (e) {
                    console.error(e);
                    window.showAlert("Gagal hapus: " + e.message, "Error", "danger");
                }
            }
        });
    };

    const restoreSantri = async (item) => {
        // --- Role Protection (v36) ---
        if (userSession.value?.role !== 'admin' && userSession.value?.role !== 'guru') {
            window.showAlert("Anda tidak memiliki akses untuk melakukan tindakan ini.", "Akses Ditolak", "danger");
            return;
        }

        window.showConfirm({
            title: 'Kembalikan Santri',
            message: `Kembalikan santri ${item.full_name} beserta seluruh datanya?`,
            confirmText: 'Ya, Balikkan',
            type: 'info',
            onConfirm: async () => {
                try {
                    // Cascading Restore
                    const targetId = item._id;
                    const targetNis = item.nis || item.santri_id;

                    const allData = DB.getAll();
                    const itemsToRestore = [];

                    for (const d of allData) {
                        if (d._deleted !== true && d._deleted !== 'true') continue;

                        let shouldRestore = false;
                        if (d._id === targetId) shouldRestore = true;
                        else if (d.santri_id && (String(d.santri_id) === String(targetNis) || d.santri_id === targetId)) shouldRestore = true;
                        else if (d.user_id && (d.user_id === targetId || String(d.user_id) === String(targetNis))) shouldRestore = true;

                        if (shouldRestore) {
                            d._deleted = false;
                            d.updated_at = new Date().toISOString();
                            itemsToRestore.push(d);
                        }
                    }

                    // Await to prevent IDB race condition
                    for (const d of itemsToRestore) {
                        if (d.__type) {
                            await DB.addToQueue('update', d.__type, { _id: d._id, _deleted: false });
                        }
                    }

                    await DB.saveAll(allData);
                    DB.triggerAutoSync();

                    refreshData();
                    window.showAlert("Santri dan data terkait berhasil dikembalikan", "Informasi", "info");
                } catch (e) {
                    console.error(e);
                    window.showAlert("Gagal restore: " + e.message, "Error", "danger");
                }
            }
        });
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
