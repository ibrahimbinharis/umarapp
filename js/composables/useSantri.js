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
    const generateSantriNIS = () => {
        const santriList = uiData.santri || [];
        const seq = (santriList.length + 1).toString().padStart(2, '0');
        const date = new Date();
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const yy = date.getFullYear().toString().slice(-2);
        return `2${seq}${mm}${yy}`; // Format: 2 + Seq + Month + Year
    };

    // ===== COMPUTED =====
    const filteredSantri = computed(() => {
        let items = uiData.santri || [];

        // Filter by Search Text
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
        if (!confirm(`Hapus santri ${item.full_name}? SEMUA data terkait (Hafalan, Ujian, Absensi) akan ikut TERHAPUS permanen.`)) return;

        try {
            // Cascading Hard Delete
            const targetId = item._id;
            const targetNis = item.nis || item.santri_id; // Linking key

            const allData = DB.getAll();
            const newData = allData.filter(d => {
                // Remove the santri itself
                if (d._id === targetId) return false;

                // Remove related data (Setoran, Ujian, Absensi, Pelanggaran, etc)
                // 1. Check by NIS (santri_id) - Common for legacy tables
                if (d.santri_id && (String(d.santri_id) === String(targetNis) || d.santri_id === targetId)) return false;

                // 2. Check by UUID (user_id) - Common for Absensi / Logs
                if (d.user_id && (d.user_id === targetId || String(d.user_id) === String(targetNis))) return false;

                return true;
            });

            DB.saveAll(newData);
            DB.triggerAutoSync();

            refreshData();
            alert("Santri dan data terkait berhasil dihapus permanen");
        } catch (e) {
            console.error(e);
            alert("Gagal hapus: " + e.message);
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
        generateSantriNIS,
        santriGenderFilter,
        activeDropdown,
        toggleDropdown
    };
}
