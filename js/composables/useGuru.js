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
    const { reactive, computed, watch, onUnmounted } = Vue;

    // ===== STATE =====
    const guruForm = reactive({
        id: null,
        username: '',        // Auto-generated Guru ID
        custom_username: '', // Custom username for login
        full_name: '',
        phone: '',           // New: Unified field
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
            guruForm.username = guru.username;               // Primary ID (NIG)
            guruForm.custom_username = guru.custom_username || ''; // Alias
            guruForm.full_name = guru.full_name;
            guruForm.phone = guru.phone || ''; // Unified field
            guruForm.password = '';
            guruForm.role = 'guru';
            modalState.title = 'Edit Guru';
            modalState.isEdit = true;
        } else {
            // Add mode
            guruForm.id = null;
            guruForm.username = generateGuruID(); // Always generate NIG
            guruForm.custom_username = '';        // Admin fills friendly login name here
            guruForm.full_name = '';
            guruForm.phone = '';                  // Reset phone
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
        return window.withSaving(async () => {
            if (!guruForm.full_name) { window.showAlert('Nama wajib diisi', 'Peringatan', 'warning'); return; }
            if (!guruForm.id && !guruForm.password) { window.showAlert('Password wajib diisi untuk guru baru', 'Peringatan', 'warning'); return; }

            try {
                const payload = {
                    full_name: guruForm.full_name,
                    username: guruForm.username,
                    custom_username: guruForm.custom_username.trim(),
                    phone: window.formatWANumber(guruForm.phone), // Unified field
                    role: 'guru'
                };
                if (guruForm.password) payload.password = guruForm.password;

                if (guruForm.id) { await DB.update(guruForm.id, payload); }
                else { await DB.create('user', payload); }

                modalState.isOpen = false;
                if (window.refreshData) window.refreshData();
                window.showAlert('Data berhasil disimpan', 'Sukses', 'info');
            } catch (error) {
                console.error('Error saving guru:', error);
                window.showAlert('Gagal menyimpan data: ' + error.message, 'Error', 'danger');
            }
        });
    };

    /**
     * Delete guru
     * @param {string} id - Guru ID to delete
     */
    const deleteGuru = async (id) => {
        window.showConfirm({
            title: 'Hapus Guru',
            message: 'Hapus data guru ini?',
            confirmText: 'Ya, Hapus',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await DB.delete(id);
                    if (window.refreshData) window.refreshData();
                    window.showAlert('Data berhasil dihapus', 'Sukses', 'info');
                } catch (error) {
                    console.error('Error deleting guru:', error);
                    window.showAlert('Gagal menghapus data: ' + error.message, 'Error', 'danger');
                }
            }
        });
    };

    // --- Back Navigation Logic (v37) ---
    const handlePopState = (e) => {
        if (modalState.isOpen && modalState.view === 'guru') {
            modalState.isOpen = false;
        }
    };

    watch(() => modalState.isOpen, (newVal) => {
        if (newVal && modalState.view === 'guru') {
            window.history.pushState({ modal: 'guru-form' }, '');
            window.addEventListener('popstate', handlePopState);
        } else if (!newVal && modalState.view === 'guru') {
            window.removeEventListener('popstate', handlePopState);
            if (window.history.state && window.history.state.modal === 'guru-form') {
                window.history.back();
            }
        }
    });

    onUnmounted(() => {
        window.removeEventListener('popstate', handlePopState);
    });

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
