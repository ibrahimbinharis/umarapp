/**
 * useGuru Composable
 * 
 * Manages guru (teacher) account state and operations
 * - CRUD operations for guru accounts only (admin created directly in DB)
 * - Auto-generated Guru ID (format: 1-Seq-MM-YY)
 * - Password handling (with optional update)
 * - Custom username support for login
 * 
 * Dependencies: DB (from core.js), uiData (from parent)
 */

// Composable function (global, no module export needed)
// Composable function (global, no module export needed)
function useGuru(uiData, DB, modalState) {
    // Get Vue from global (loaded via CDN)
    const { reactive, computed } = Vue;

    // ===== STATE =====
    const guruForm = reactive({
        id: null,
        username: '',        // Auto-generated Guru ID
        custom_username: '', // Custom username for login
        full_name: '',
        password: '',
        role: 'guru'         // Always guru (admin created in DB)
    });

    // ===== COMPUTED =====

    /**
     * Filtered guru list (only role='guru' users)
     */
    const filteredGuru = computed(() => {
        return uiData.guru || [];
    });

    /**
     * Generate Guru ID
     * Format: 1-Seq(2digit)-Month(2digit)-Year(2digit)
     * Example: 1-01-01-26
     */
    const generateGuruID = () => {
        const guruList = uiData.guru || [];
        const seq = (guruList.length + 1).toString().padStart(2, '0');
        const date = new Date();
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const yy = date.getFullYear().toString().slice(-2);
        return `1${seq}${mm}${yy}`;
    };

    // ===== METHODS =====

    /**
     * Open guru form modal
     * @param {object|null} guru - Guru item to edit, null for new
     */
    const openGuruModal = (guru = null) => {
        if (guru) {
            // Edit mode
            guruForm.id = guru._id;
            guruForm.username = guru.username;
            guruForm.custom_username = guru.custom_username || '';
            guruForm.full_name = guru.full_name;
            guruForm.password = ''; // Leave blank to keep existing
            guruForm.role = 'guru';
            modalState.title = 'Edit Guru';
            modalState.isEdit = true;
        } else {
            // Add mode
            guruForm.id = null;
            guruForm.username = generateGuruID();
            guruForm.custom_username = '';
            guruForm.full_name = '';
            guruForm.password = '';
            guruForm.role = 'guru';
            modalState.title = 'Tambah Guru';
            modalState.isEdit = false;
        }
        modalState.view = 'guru';
        modalState.isOpen = true;
    };

    /**
     * Save guru (create or update)
     */
    const saveGuru = async () => {
        // Validation
        if (!guruForm.full_name) {
            alert('Nama wajib diisi');
            return;
        }

        // For new guru, password is required
        if (!guruForm.id && !guruForm.password) {
            alert('Password wajib diisi untuk guru baru');
            return;
        }

        try {
            const payload = {
                full_name: guruForm.full_name,
                username: guruForm.username,
                custom_username: guruForm.custom_username,
                role: 'guru'
            };

            // Only update password if provided
            if (guruForm.password) {
                payload.password = guruForm.password;
            }

            if (guruForm.id) {
                // Update existing
                await DB.update(guruForm.id, payload);
            } else {
                // Create new
                await DB.create('user', payload);
            }

            modalState.isOpen = false; // Close generic modal

            // Refresh data FIRST (before blocking alert)
            if (window.refreshData) {
                window.refreshData();
            }

            alert('Data berhasil disimpan');
        } catch (error) {
            console.error('Error saving guru:', error);
            alert('Gagal menyimpan data: ' + error.message);
        }
    };

    /**
     * Delete guru
     * @param {string} id - Guru ID to delete
     */
    const deleteGuru = async (id) => {
        if (!confirm('Hapus data guru ini?')) {
            return;
        }

        try {
            await DB.delete(id);

            // Refresh data FIRST (before blocking alert)
            if (window.refreshData) {
                window.refreshData();
            }

            alert('Data berhasil dihapus');
        } catch (error) {
            console.error('Error deleting guru:', error);
            alert('Gagal menghapus data: ' + error.message);
        }
    };

    // ===== PUBLIC API =====
    return {
        // State
        guruForm,
        // Removed guruModalState

        // Computed
        filteredGuru,

        // Methods
        openGuruModal,
        // Removed closeGuruModal
        saveGuru,
        deleteGuru,
        generateGuruID
    };
}
