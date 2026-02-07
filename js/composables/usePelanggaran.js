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
function usePelanggaran(uiData, DB, refreshData) {
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
    const editingId = Vue.ref(null);

    /**
     * Submit new pelanggaran record
     * Validates required fields and saves to DB
     */
    const submitPelanggaran = async () => {
        // Validation
        if (!pelanggaranForm.santri_id) {
            alert('Pilih santri terlebih dahulu');
            return;
        }

        if (!pelanggaranForm.description) {
            alert('Pilih jenis pelanggaran');
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

            if (editingId.value) {
                await DB.update(editingId.value, payload);
                alert('Pelanggaran berhasil diupdate');
                editingId.value = null; // Reset
            } else {
                await DB.create('pelanggaran', payload);
                alert('Pelanggaran berhasil disimpan');
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
            alert('Gagal menyimpan pelanggaran: ' + error.message);
        }
    };

    const editPelanggaran = (item) => {
        if (!item) return;
        editingId.value = item._id;
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

    const cancelEditPelanggaran = () => {
        editingId.value = null;
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
        if (!confirm('Hapus data pelanggaran ini?')) {
            return;
        }

        try {
            await DB.delete(id);
            alert('Data berhasil dihapus');

            // Trigger refresh if available
            if (refreshData) {
                refreshData();
            }
        } catch (error) {
            console.error('Error deleting pelanggaran:', error);
            alert('Gagal menghapus data: ' + error.message);
        }
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
        if (!masterPelanggaranForm.name) {
            alert('Nama pelanggaran wajib diisi');
            return;
        }

        if (!masterPelanggaranForm.points || masterPelanggaranForm.points < 0) {
            alert('Poin harus diisi dengan angka positif');
            return;
        }

        try {
            const payload = {
                name: masterPelanggaranForm.name,
                points: parseInt(masterPelanggaranForm.points)
            };

            if (masterPelanggaranForm.id) {
                // Update existing
                await DB.update(masterPelanggaranForm.id, payload);
            } else {
                // Create new - set explicit type for master data
                await DB.create('pelanggaran_type', payload);
            }

            // Reset form
            masterPelanggaranForm.id = null;
            masterPelanggaranForm.name = '';
            masterPelanggaranForm.points = 10;

            alert('Data berhasil disimpan');

            // Trigger refresh if available
            if (window.refreshData) {
                window.refreshData();
            }

            return { success: true };
        } catch (error) {
            console.error('Error saving master pelanggaran:', error);
            alert('Gagal menyimpan data: ' + error.message);
            return { success: false, error };
        }
    };

    /**
     * Delete master pelanggaran type
     * @param {string} id - Master type ID to delete
     */
    const deleteMasterPelanggaran = async (id) => {
        if (!confirm('Hapus jenis pelanggaran ini?')) {
            return;
        }

        try {
            await DB.delete(id);
            alert('Jenis pelanggaran berhasil dihapus');

            // Trigger refresh if available
            if (window.refreshData) {
                window.refreshData();
            }
        } catch (error) {
            console.error('Error deleting master pelanggaran:', error);
            alert('Gagal menghapus data: ' + error.message);
        }
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
        editingId,
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
        cancelEditPelanggaran,
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
