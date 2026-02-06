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

function useKelas(uiData, DB) {
    // Get Vue from global (loaded via CDN)
    const { reactive, computed } = Vue;

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
            // Edit mode
            kelasForm.id = kelas._id;
            kelasForm.name = kelas.name || '';
            kelasModalState.isEdit = true;
            kelasModalState.title = 'Edit Kelas';
        } else {
            // Create mode
            kelasForm.id = null;
            kelasForm.name = '';
            kelasModalState.isEdit = false;
            kelasModalState.title = 'Tambah Kelas';
        }
        kelasModalState.isOpen = true;
    };

    /**
     * Close kelas modal
     */
    const closeKelasModal = () => {
        kelasModalState.isOpen = false;
        kelasForm.id = null;
        kelasForm.name = '';
    };

    /**
     * Save kelas (create or update)
     */
    const saveKelas = async () => {
        // Validation
        if (!kelasForm.name || !kelasForm.name.trim()) {
            return alert("Nama Kelas wajib diisi");
        }

        try {
            if (kelasForm.id) {
                // Update existing
                await DB.update(kelasForm.id, {
                    name: kelasForm.name.trim()
                });
            } else {
                // Create new
                await DB.create('kelas', {
                    name: kelasForm.name.trim()
                });
            }

            // Refresh UI
            if (window.refreshData) {
                window.refreshData();
            }

            // Close modal and show success
            closeKelasModal();
            alert(kelasForm.id ? "Kelas berhasil diupdate!" : "Kelas berhasil ditambahkan!");

        } catch (error) {
            console.error('Error saving kelas:', error);
            alert('Gagal menyimpan kelas: ' + error.message);
        }
    };

    /**
     * Delete kelas
     * @param {string} id - Kelas ID to delete
     */
    const deleteKelas = async (id) => {
        if (!confirm("Hapus kelas ini?")) return;

        try {
            await DB.delete(id);

            // Refresh UI
            if (window.refreshData) {
                window.refreshData();
            }

            alert("Kelas berhasil dihapus!");
        } catch (error) {
            console.error('Error deleting kelas:', error);
            alert('Gagal menghapus kelas: ' + error.message);
        }
    };

    // ===== RETURN =====
    return {
        // State
        kelasForm,
        kelasModalState,

        // Computed
        filteredKelas,

        // Methods
        openKelasModal,
        closeKelasModal,
        saveKelas,
        deleteKelas
    };
}
