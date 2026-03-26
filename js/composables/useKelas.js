/**
 * useKelas Composable
 * 
 * Manages Kelas (Class/Ruangan) master data
 * - CRUD operations for class records  
 * - Simple entity with only 'name' field
 * - Modal state management
 * 
 * Dependencies: DB (from core.js), uiData (from parent)
 */

function useKelas(uiData, DB, modalState) {
    // Get Vue from global (loaded via CDN)
    const { reactive, computed, watch } = Vue;

    // ===== STATE =====
    const kelasForm = reactive({
        id: null,
        name: ''
    });

    const kelasModalState = reactive({
        isOpen: false,
        isEdit: false,
        title: ''
    });

    // ===== COMPUTED =====

    /**
     * Filtered kelas list
     */
    const filteredKelas = computed(() => {
        return uiData.kelas || [];
    });

    // ===== METHODS =====

    /**
     * Open kelas form modal
     * @param {Object|null} kelas - Kelas object for edit, null for create
     */
    const openKelasModal = (kelas = null) => {
        if (kelas) {
            kelasForm.id = kelas._id;
            kelasForm.name = kelas.name || '';
        }
        if (modalState) {
            modalState.isOpen = true;
            modalState.view = 'kelas';
            modalState.title = kelas ? 'Edit Kelas' : 'Tambah Kelas';
        }
    };

    /**
     * Close kelas modal
     */
    const closeKelasModal = () => {
        if (modalState) modalState.isOpen = false;
        kelasForm.id = null;
        kelasForm.name = '';
    };

    /**
     * Save kelas (create or update)
     */
    const saveKelas = async () => {
        return window.withSaving(async () => {
            if (!kelasForm.name || !kelasForm.name.trim()) { window.showAlert("Nama Kelas wajib diisi", "Peringatan", "warning"); return; }
            try {
                if (kelasForm.id) { await DB.update(kelasForm.id, { name: kelasForm.name.trim() }); }
                else { await DB.create('kelas', { name: kelasForm.name.trim() }); }
                if (window.refreshData) window.refreshData();
                closeKelasModal();
                window.showAlert(kelasForm.id ? "Kelas berhasil diupdate!" : "Kelas berhasil ditambahkan!", "Sukses", "info");
            } catch (error) {
                window.showAlert('Gagal menyimpan kelas: ' + error.message, "Error", "danger");
            }
        });
    };

    /**
     * Delete kelas
     * @param {string} id - Kelas ID to delete
     */
    const deleteKelas = async (id) => {
        window.showConfirm({
            title: 'Hapus Kelas',
            message: 'Hapus kelas ini?',
            confirmText: 'Ya, Hapus',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await DB.delete(id);
                    if (window.refreshData) window.refreshData();
                    window.showAlert("Kelas berhasil dihapus!", "Sukses", "info");
                } catch (error) {
                    console.error('Error deleting kelas:', error);
                    window.showAlert('Gagal menghapus kelas: ' + error.message, "Error", "danger");
                }
            }
        });
    };

    // FAB Click State
    const isKelasFabClicked = Vue.ref(false);

    // Reset FAB state when modal closes
    watch(() => modalState?.isOpen, (newVal) => {
        if (!newVal) {
            isKelasFabClicked.value = false;
        }
    });

    const handleKelasFabClick = () => {
        isKelasFabClicked.value = true;
    };

    // ===== RETURN =====
    return {
        // State
        kelasForm,
        kelasModalState,
        isKelasFabClicked, // Renamed

        // Computed
        filteredKelas,

        // Methods
        openKelasModal,
        closeKelasModal,
        saveKelas,
        deleteKelas,
        handleKelasFabClick // Renamed
    };
}
