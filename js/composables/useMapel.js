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

function useMapel(uiData, DB) {
    // Get Vue from global (loaded via CDN)
    const { reactive, computed } = Vue;

    // ===== STATE =====
    const mapelForm = reactive({
        id: null,
        name: ''
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
            // Edit mode
            mapelForm.id = mapel._id;
            mapelForm.name = mapel.name || '';
            mapelModalState.isEdit = true;
            mapelModalState.title = 'Edit Mapel';
        } else {
            // Create mode
            mapelForm.id = null;
            mapelForm.name = '';
            mapelModalState.isEdit = false;
            mapelModalState.title = 'Tambah Mapel';
        }
        mapelModalState.isOpen = true;
    };

    /**
     * Close mapel modal
     */
    const closeMapelModal = () => {
        mapelModalState.isOpen = false;
        mapelForm.id = null;
        mapelForm.name = '';
    };

    /**
     * Save mapel (create or update)
     */
    const saveMapel = async () => {
        // Validation
        if (!mapelForm.name || !mapelForm.name.trim()) {
            return alert("Nama Mapel wajib diisi");
        }

        try {
            if (mapelForm.id) {
                // Update existing
                await DB.update(mapelForm.id, {
                    name: mapelForm.name.trim()
                });
            } else {
                // Create new
                await DB.create('mapel', {
                    name: mapelForm.name.trim()
                });
            }

            // Refresh UI
            if (window.refreshData) {
                window.refreshData();
            }

            // Close modal and show success
            closeMapelModal();
            alert(mapelForm.id ? "Mapel berhasil diupdate!" : "Mapel berhasil ditambahkan!");

        } catch (error) {
            console.error('Error saving mapel:', error);
            alert('Gagal menyimpan mapel: ' + error.message);
        }
    };

    /**
     * Delete mapel
     * @param {string} id - Mapel ID to delete
     */
    const deleteMapel = async (id) => {
        if (!confirm("Hapus mata pelajaran ini?")) return;

        try {
            await DB.delete(id);

            // Refresh UI
            if (window.refreshData) {
                window.refreshData();
            }

            alert("Mapel berhasil dihapus!");
        } catch (error) {
            console.error('Error deleting mapel:', error);
            alert('Gagal menghapus mapel: ' + error.message);
        }
    };

    // ===== RETURN =====
    return {
        // State
        mapelForm,
        mapelModalState,

        // Computed
        filteredMapel,

        // Methods
        openMapelModal,
        closeMapelModal,
        saveMapel,
        deleteMapel
    };
}
