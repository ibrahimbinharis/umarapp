/**
 * useMapel Composable
 * 
 * Manages Mapel (Subject/Mata Pelajaran) master data
 * - CRUD operations for subject records
 * - Simple entity with only 'name' field
 * - Modal state management
 * 
 * Dependencies: DB (from core.js), uiData (from parent)
 */

function useMapel(uiData, DB, modalState) {
    // Get Vue from global (loaded via CDN)
    const { reactive, computed, watch } = Vue;

    // ===== STATE =====
    const mapelForm = reactive({
        id: null,
        name: '',
        book_name: ''
    });

    const mapelModalState = reactive({
        isOpen: false,
        isEdit: false,
        title: ''
    });

    // ===== COMPUTED =====

    /**
     * Filtered mapel list
     */
    const filteredMapel = computed(() => {
        return uiData.mapel || [];
    });

    // ===== METHODS =====

    /**
     * Open mapel form modal
     * @param {Object|null} mapel - Mapel object for edit, null for create
     */
    const openMapelModal = (mapel = null) => {
        if (mapel) {
            mapelForm.id = mapel._id;
            mapelForm.name = mapel.name || '';
            mapelForm.book_name = mapel.book_name || '';
        } else {
            mapelForm.id = null;
            mapelForm.name = '';
            mapelForm.book_name = '';
        }
        if (modalState) {
            modalState.isOpen = true;
            modalState.view = 'mapel';
            modalState.title = mapel ? 'Edit Mapel' : 'Tambah Mapel';
        }
    };

    /**
     * Close mapel modal
     */
    const closeMapelModal = () => {
        if (modalState) modalState.isOpen = false;
        mapelForm.id = null;
        mapelForm.name = '';
        mapelForm.book_name = '';
    };

    /**
     * Save mapel (create or update)
     */
    const saveMapel = async () => {
        return window.withSaving(async () => {
            if (!mapelForm.name || !mapelForm.name.trim()) { window.showAlert("Nama Mapel wajib diisi", "Peringatan", "warning"); return; }
            try {
                const mapelData = { 
                    name: mapelForm.name.trim(),
                    book_name: mapelForm.book_name.trim()
                };
                if (mapelForm.id) { await DB.update(mapelForm.id, mapelData); }
                else { await DB.create('mapel', mapelData); }
                if (window.refreshData) window.refreshData();
                closeMapelModal();
                window.showAlert(mapelForm.id ? "Mapel berhasil diupdate!" : "Mapel berhasil ditambahkan!", "Sukses", "info");
            } catch (error) {
                window.showAlert('Gagal menyimpan mapel: ' + error.message, "Error", "danger");
            }
        });
    };

    /**
     * Delete mapel
     * @param {string} id - Mapel ID to delete
     */
    const deleteMapel = async (id) => {
        window.showConfirm({
            title: 'Hapus Mapel',
            message: 'Hapus mata pelajaran ini?',
            confirmText: 'Ya, Hapus',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await DB.delete(id);
                    if (window.refreshData) window.refreshData();
                    window.showAlert("Mapel berhasil dihapus!", "Sukses", "info");
                } catch (error) {
                    console.error('Error deleting mapel:', error);
                    window.showAlert('Gagal menghapus mapel: ' + error.message, "Error", "danger");
                }
            }
        });
    };

    // FAB Click State
    const isMapelFabClicked = Vue.ref(false);

    // Reset FAB state when modal closes
    watch(() => modalState?.isOpen, (newVal) => {
        if (!newVal) {
            isMapelFabClicked.value = false;
        }
    });

    const handleMapelFabClick = () => {
        isMapelFabClicked.value = true;
    };

    // ===== RETURN =====
    return {
        // State
        mapelForm,
        mapelModalState,
        isMapelFabClicked, // Renamed

        // Computed
        filteredMapel,

        // Methods
        openMapelModal,
        closeMapelModal,
        saveMapel,
        deleteMapel,
        handleMapelFabClick // Renamed
    };
}
