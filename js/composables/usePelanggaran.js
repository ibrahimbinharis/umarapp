/**
 * usePelanggaran Composable
 * 
 * Manages pelanggaran (violation) state and operations
 * - Input pelanggaran records
 * - Master data pelanggaran types (CRUD)
 * - Recent violations history
 * 
 * Dependencies: DB (from core.js), uiData (from parent)
 */

// Composable function (global, no module export needed)
function usePelanggaran(uiData, DB, refreshData, userSession) {
    // Get Vue from global (loaded via CDN)
    const { reactive, computed } = Vue;

    // ===== STATE =====
    const pelanggaranForm = reactive({
        tab: 'input', // 'input' | 'jenis'
        santri_id: '',
        date: window.DateUtils.getTodayDateString(),
        description: '',
        points: 10
    });

    const masterPelanggaranForm = reactive({
        name: '',
        points: 10
    });

    // State for managing dropdown menus (object-based for reactivity)
    const menuStates = Vue.ref({}); // Tracks menu state for each pelanggaran record
    const masterMenuStates = Vue.ref({}); // Tracks menu state for each master data

    // Search State for Santri Dropdown
    // Search State for Santri Dropdown
    const pelanggaranSantriSearch = Vue.ref('');
    const isPelanggaranSantriDropdownOpen = Vue.ref(false);

    // ===== COMPUTED =====

    /**
     * Filter recent pelanggaran records
     * Shows last 10 records sorted by date (newest first)
     */
    const filteredPelanggaran = computed(() => {
        const records = uiData.pelanggaran || [];
        return records
            // Filter out orphan data (Santri deleted)
            .filter(p => {
                if (!p.santri_id) return false;
                return uiData.santri.some(s => s.santri_id === p.santri_id || s._id === p.santri_id);
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10);
    });

    const pelanggaranFilteredSantriOptions = computed(() => {
        let items = uiData.santri || [];
        if (pelanggaranSantriSearch.value) {
            const q = pelanggaranSantriSearch.value.toLowerCase();
            items = items.filter(s =>
                (s.full_name || '').toLowerCase().includes(q) ||
                String(s.santri_id || '').toLowerCase().includes(q)
            );
        }
        return items.slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    });

    /**
     * Get selected santri name
     */
    const pelanggaranSelectedSantriName = computed(() => {
        if (!pelanggaranForm.santri_id) return '';
        const s = (uiData.santri || []).find(x => String(x.santri_id) === String(pelanggaranForm.santri_id));
        return s ? s.full_name : '';
    });

    // ===== METHODS =====

    /**
     * Auto-fill points when pelanggaran type is selected
     * Triggered by @change event on jenis dropdown
     */
    const updatePelanggaranPoints = () => {
        const selectedType = uiData.master_pelanggaran.find(
            m => m.name === pelanggaranForm.description
        );

        if (selectedType) {
            pelanggaranForm.points = selectedType.points;
        }
    };

    /**
     * Select santri from dropdown
     */
    const selectPelanggaranSantri = (santri) => {
        pelanggaranForm.santri_id = santri.santri_id;
        pelanggaranSantriSearch.value = '';
        isPelanggaranSantriDropdownOpen.value = false;
    };

    /**
     * Submit new pelanggaran record
     * Validates required fields and saves to DB
     */
    const pelanggaranEditingId = Vue.ref(null);

    /**
     * Submit new pelanggaran record
     * Validates required fields and saves to DB
     */
    const submitPelanggaran = async () => {
        // --- Role Protection (v36) ---
        if (userSession.value?.role !== 'admin' && userSession.value?.role !== 'guru') {
            window.showAlert("Anda tidak memiliki akses untuk tindakan ini.", "Ditolak", "danger");
            return;
        }

        // Validation
        if (!pelanggaranForm.santri_id) {
            window.showAlert('Pilih santri terlebih dahulu', 'Peringatan', 'warning');
            return;
        }

        if (!pelanggaranForm.description) {
            window.showAlert('Pilih jenis pelanggaran', 'Peringatan', 'warning');
            return;
        }

        try {
            console.log('Submitting Pelanggaran:', pelanggaranForm);
            const payload = {
                santri_id: pelanggaranForm.santri_id,
                description: pelanggaranForm.description,
                points: parseInt(pelanggaranForm.points) || 0,
                date: pelanggaranForm.date,
                time: window.DateUtils.getCurrentTimeString(),
                __type: 'pelanggaran'
            };

            if (pelanggaranEditingId.value) {
                await DB.update(pelanggaranEditingId.value, payload);
                window.showAlert('Pelanggaran berhasil diupdate', 'Sukses', 'info');

                // --- NOTIFICATION UPDATE (v36) ---
                const santri = uiData.santri.find(s => s._id === payload.santri_id || s.santri_id === payload.santri_id);
                if (santri && window.NotificationService) {
                    window.NotificationService.notifyPelanggaran(santri, payload.description, payload.points, pelanggaranEditingId.value);
                }

                pelanggaranEditingId.value = null; // Reset
            } else {
                const res = await DB.create('pelanggaran', payload);
                window.showAlert('Pelanggaran berhasil disimpan', 'Sukses', 'success');

                // --- NOTIFICATION TRIGGER (v36) ---
                const santri = uiData.santri.find(s => s._id === payload.santri_id || s.santri_id === payload.santri_id);
                if (santri && window.NotificationService) {
                    window.NotificationService.notifyPelanggaran(santri, payload.description, payload.points, res._id);
                }
            }

            // Reset form
            pelanggaranForm.santri_id = '';
            pelanggaranForm.description = '';
            pelanggaranForm.points = 10;

            // Trigger refresh if available
            if (refreshData) {
                refreshData();
            }
        } catch (error) {
            console.error('Error submitting pelanggaran:', error);
            window.showAlert('Gagal menyimpan pelanggaran: ' + error.message, 'Error', 'danger');
        }
    };

    const editPelanggaran = (item) => {
        // --- Role Protection (v36) ---
        if (userSession.value?.role !== 'admin' && userSession.value?.role !== 'guru') return;

        if (!item) return;

        // Toggle Off if clicking SAME item
        if (pelanggaranEditingId.value === item._id) {
            cancelPelanggaranEdit();
            return;
        }

        pelanggaranEditingId.value = item._id;
        pelanggaranForm.santri_id = item.santri_id;
        pelanggaranForm.description = item.description;
        pelanggaranForm.points = item.points;
        pelanggaranForm.date = item.date;

        // Scroll to form
        setTimeout(() => {
            const pelanggaranView = document.querySelector('[v-if="currentView === \'pelanggaran\'"]');
            if (pelanggaranView) {
                pelanggaranView.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

    const cancelPelanggaranEdit = () => {
        pelanggaranEditingId.value = null;
        pelanggaranForm.santri_id = '';
        pelanggaranForm.description = '';
        pelanggaranForm.points = 10;
    };

    // ... (rest of methods)

    /**
     * Delete pelanggaran record
     * @param {string} id - Record ID to delete
     */
    const deletePelanggaran = async (id) => {
        // --- Role Protection (v36) ---
        if (userSession.value?.role !== 'admin' && userSession.value?.role !== 'guru') {
            window.showAlert("Anda tidak memiliki akses untuk tindakan ini.", "Ditolak", "danger");
            return;
        }

        window.showConfirm({
            title: 'Hapus Pelanggaran',
            message: 'Hapus data pelanggaran ini?',
            confirmText: 'Ya, Hapus',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await DB.delete(id);
                    if (window.NotificationService) {
                        window.NotificationService.removeBySource(id);
                    }
                    window.showAlert('Data berhasil dihapus', 'Sukses', 'info');
                    if (refreshData) refreshData();
                } catch (error) {
                    console.error('Error deleting pelanggaran:', error);
                    window.showAlert('Gagal menghapus data: ' + error.message, 'Error', 'danger');
                }
            }
        });
    };

    /**
     * Open modal untuk tambah/edit master pelanggaran
     * @param {object|null} item - Item to edit, null for new
     */
    const openMasterPelanggaranModal = (item = null) => {
        if (item) {
            masterPelanggaranForm.id = item._id;
            masterPelanggaranForm.name = item.name;
            masterPelanggaranForm.points = item.points;
        } else {
            masterPelanggaranForm.id = null;
            masterPelanggaranForm.name = '';
            masterPelanggaranForm.points = 10;
        }

        // Open modal (assuming modal management is handled by parent)
        return {
            isEdit: !!item,
            title: item ? 'Edit Jenis Pelanggaran' : 'Tambah Jenis Pelanggaran'
        };
    };

    /**
     * Save master pelanggaran type (CRUD)
     */
    const saveMasterPelanggaran = async () => {
        // --- Role Protection (v36) ---
        if (userSession.value?.role !== 'admin' && userSession.value?.role !== 'guru') {
            window.showAlert("Hanya Admin/Guru yang dapat mengelola jenis pelanggaran.", "Ditolak", "danger");
            return { success: false };
        }

        return window.withSaving(async () => {
            if (!masterPelanggaranForm.name) { window.showAlert('Nama pelanggaran wajib diisi', 'Peringatan', 'warning'); return; }
            if (!masterPelanggaranForm.points || masterPelanggaranForm.points < 0) { window.showAlert('Poin harus diisi dengan angka positif', 'Peringatan', 'warning'); return; }
            try {
                const payload = { name: masterPelanggaranForm.name, points: parseInt(masterPelanggaranForm.points) };
                if (masterPelanggaranForm.id) { await DB.update(masterPelanggaranForm.id, payload); }
                else { await DB.create('pelanggaran_type', payload); }
                masterPelanggaranForm.id = null;
                masterPelanggaranForm.name = '';
                masterPelanggaranForm.points = 10;
                window.showAlert('Data berhasil disimpan', 'Sukses', 'info');
                if (window.refreshData) window.refreshData();
                return { success: true };
            } catch (error) {
                window.showAlert('Gagal menyimpan data: ' + error.message, 'Error', 'danger');
                return { success: false, error };
            }
        });
    };

    /**
     * Delete master pelanggaran type
     * @param {string} id - Master type ID to delete
     */
    const deleteMasterPelanggaran = async (id) => {
        // --- Role Protection (v36) ---
        if (userSession.value?.role !== 'admin' && userSession.value?.role !== 'guru') {
             window.showAlert("Hanya Admin/Guru yang dapat mengelola jenis pelanggaran.", "Ditolak", "danger");
             return;
        }

        window.showConfirm({
            title: 'Hapus Jenis',
            message: 'Hapus jenis pelanggaran ini?',
            confirmText: 'Ya, Hapus',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await DB.delete(id);
                    window.showAlert('Jenis pelanggaran berhasil dihapus', 'Sukses', 'info');
                    if (window.refreshData) window.refreshData();
                } catch (error) {
                    console.error('Error deleting master pelanggaran:', error);
                    window.showAlert('Gagal menghapus data: ' + error.message, 'Error', 'danger');
                }
            }
        });
    };

    /**
     * Toggle 3-dot menu for pelanggaran records
     */
    const toggleMenu = (id) => {
        // Close all other menus first
        Object.keys(menuStates.value).forEach(key => {
            if (key !== id) {
                menuStates.value[key] = false;
            }
        });
        // Toggle current menu
        menuStates.value[id] = !menuStates.value[id];
    };

    /**
     * Check if menu is open for pelanggaran records
     */
    const isMenuOpen = (id) => {
        return menuStates.value[id] || false;
    };

    /**
     * Toggle 3-dot menu for master pelanggaran
     */
    const toggleMasterMenu = (id) => {
        // Close all other menus first
        Object.keys(masterMenuStates.value).forEach(key => {
            if (key !== id) {
                masterMenuStates.value[key] = false;
            }
        });
        // Toggle current menu
        masterMenuStates.value[id] = !masterMenuStates.value[id];
    };

    /**
     * Check if master menu is open
     */
    const isMasterMenuOpen = (id) => {
        return masterMenuStates.value[id] || false;
    };

    /**
     * Close all dropdown menus
     */
    const closeAllMenus = () => {
        menuStates.value = {};
        masterMenuStates.value = {};
    };

    // ===== PUBLIC API =====
    return {
        // State
        pelanggaranForm,
        masterPelanggaranForm,
        pelanggaranEditingId,
        menuStates,
        masterMenuStates,
        pelanggaranSantriSearch,
        isPelanggaranSantriDropdownOpen,

        // Computed
        filteredPelanggaran,
        pelanggaranFilteredSantriOptions,
        pelanggaranSelectedSantriName,

        // Methods
        updatePelanggaranPoints,
        submitPelanggaran,
        deletePelanggaran,
        editPelanggaran,
        cancelPelanggaranEdit,
        selectPelanggaranSantri,
        openMasterPelanggaranModal,
        saveMasterPelanggaran,
        deleteMasterPelanggaran,
        toggleMenu,
        toggleMasterMenu,
        closeAllMenus,
        isMenuOpen,
        isMasterMenuOpen
    };
}
