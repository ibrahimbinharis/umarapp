/**
 * useTarget Composable
 * 
 * Manages Target (Monthly Quran Goals) for students
 * - Sabaq: New memorization target (pages/month)
 * - Manzil: Review target (pages/month)  
 * - Auto-calculation based on total hafalan
 * - Class-based defaults
 * 
 * Dependencies: DB (from core.js), uiData (from parent)
 */

function useTarget(uiData, DB, modalState) {
    // Get Vue from global (loaded via CDN)
    const { reactive, computed, ref, watch, nextTick, onUnmounted } = Vue;

    // ===== STATE =====

    const targetForm = reactive({
        id: null,
        sabaq: 20,
        manzil: 20,
        tilawah: 600,
        pct: 20,
        totalPages: 0,
        full_name: '',
        hafalan_desc: '',
        isKhatam: false
    });

    /**
     * Modal state
     */
    const targetModalState = reactive({
        isOpen: false,
        isBulkOpen: false,
        selectionMode: false
    });

    const selectedSantriIds = ref([]);

    const bulkTargetForm = reactive({
        updateSabaq: false,
        updateManzil: false,
        updateTilawah: false,
        sabaq: 20,
        manzil: 20,
        tilawah: 600
    });

    // ===== COMPUTED =====

    /**
     * Santri list with their target values AND current month achievements computed
     */
    const santriWithTarget = computed(() => {
        const santriData = uiData.santri || [];
        const setoranData = uiData.setoran || [];
        
        // Get start and end of current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        return santriData.map(s => {
            const defaults = getTargetDefaults(s);
            const sabaq = defaults.isKhatam ? 0 : (s.target_sabaq || defaults.sabaq);
            const manzil = s.target_manzil || defaults.manzil;
            const tilawah = s.target_tilawah || 600;
            const pct = s.target_manzil_pct || 20;

            // Calculate current month's achievement (v37)
            const sMonthRecords = setoranData.filter(r => {
                const rDate = new Date(r.setoran_date);
                return (String(r.santri_id) === String(s._id) || String(r.santri_id) === String(s.nis)) &&
                       rDate >= startOfMonth && rDate <= now && r._deleted !== true;
            });

            const currentSabaq = sMonthRecords.filter(r => r.setoran_type === 'Sabaq').reduce((sum, r) => sum + (parseFloat(r.pages) || 0), 0);
            const currentManzil = sMonthRecords.filter(r => r.setoran_type === 'Manzil' || r.setoran_type === 'Sabqi').reduce((sum, r) => sum + (parseFloat(r.pages) || 0), 0);
            const currentTilawah = sMonthRecords.filter(r => r.setoran_type === 'Tilawah' || r.setoran_type === 'Binadzor').reduce((sum, r) => sum + (parseFloat(r.pages) || 0), 0);

            return {
                ...s,
                view_sabaq: sabaq,
                view_manzil: manzil,
                view_tilawah: tilawah,
                view_pct: pct,
                view_total_pages: defaults.totalPages,
                isKhatam: defaults.isKhatam,
                // Achievements
                ach_sabaq: Math.round(currentSabaq * 10) / 10,
                ach_manzil: Math.round(currentManzil * 10) / 10,
                ach_tilawah: Math.round(currentTilawah * 10) / 10,
                // Progress Percent (capped at 100)
                // If sabaq is 0 (khatam), progress is automatically 100%
                prog_sabaq: sabaq === 0 ? 100 : Math.min(100, (currentSabaq / (sabaq || 1)) * 100),
                prog_manzil: Math.min(100, (currentManzil / (manzil || 1)) * 100),
                prog_overall: Math.min(100, ((currentSabaq + currentManzil) / ((sabaq + manzil) || 1)) * 100)
            };
        }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    });

    // ===== HELPER FUNCTIONS =====

    /**
     * Calculate default targets based on student data
     * @param {Object} santri - Santri object
     */
    const getTargetDefaults = (santri) => {
        // 1 Juz = 20 Pages
        let totalJuz = 0;
        if (santri.hafalan_manual) {
            const match = santri.hafalan_manual.match(/(\d+)/);
            if (match) {
                totalJuz = parseInt(match[1]);
            }
        }

        const totalPages = totalJuz * 20;

        // Sabaq Logic: Based on class AND Completion Status
        let sabaq = 20; // Default
        const kelasStr = String(santri.kelas || '');

        if (totalJuz >= 30) {
            sabaq = 0; // Khatam = No more sabaq required
        } else if (kelasStr.includes('1')) {
            sabaq = 10; // Class 1 gets lower target
        }

        const pct = santri.target_manzil_pct || 20; // Default 20% or custom
        const manzil = Math.round(totalPages * (pct / 100));

        return { sabaq, manzil, totalPages, isKhatam: totalJuz >= 30 };
    };

    // ===== METHODS =====

    /**
     * Open target modal for a santri
     * @param {Object} santri - Santri object
     */
    const openTargetModal = (santri) => {
        if (!santri) return;
        const defaults = getTargetDefaults(santri);
        targetForm.id = santri._id;
        targetForm.full_name = santri.full_name;
        targetForm.hafalan_desc = santri.hafalan_manual || '0 Juz';
        targetForm.isKhatam = defaults.isKhatam;
        
        // v37: Strictly override to 0 if khatam
        targetForm.sabaq = defaults.isKhatam ? 0 : (santri.target_sabaq || defaults.sabaq);
        targetForm.manzil = santri.target_manzil || defaults.manzil;
        targetForm.tilawah = santri.target_tilawah || 600;
        targetForm.pct = santri.target_manzil_pct || 20;
        targetForm.totalPages = defaults.totalPages;
        
        if (modalState) {
            modalState.isOpen = true;
            modalState.view = 'target-form';
            modalState.title = 'Atur Target Bulanan';
        }
    };

    const closeTargetModal = () => {
        if (modalState) modalState.isOpen = false;
        targetForm.id = null;
    };

    /**
     * Bulk Selection Methods
     */
    const toggleSelectionMode = () => {
        targetModalState.selectionMode = !targetModalState.selectionMode;
        if (!targetModalState.selectionMode) {
            selectedSantriIds.value = [];
        }
    };

    const toggleSantriSelection = (id) => {
        const index = selectedSantriIds.value.indexOf(id);
        if (index > -1) {
            selectedSantriIds.value.splice(index, 1);
        } else {
            selectedSantriIds.value.push(id);
        }
    };

    const selectAllSantri = (ids) => {
        if (selectedSantriIds.value.length === ids.length) {
            selectedSantriIds.value = [];
        } else {
            selectedSantriIds.value = [...ids];
        }
    };

    const openBulkTargetModal = () => {
        if (selectedSantriIds.value.length === 0) {
            window.showAlert('Pilih minimal satu santri', 'Peringatan', 'warning');
            return;
        }
        if (modalState) {
            modalState.isOpen = true;
            modalState.view = 'bulk-target';
            modalState.title = 'Set Target Massal';
        }
    };

    const closeBulkTargetModal = () => {
        if (modalState) modalState.isOpen = false;
    };

    const applyBulkTarget = async () => {
        if (selectedSantriIds.value.length === 0) return;

        const payload = {};
        if (bulkTargetForm.updateSabaq) payload.target_sabaq = parseInt(bulkTargetForm.sabaq) || 0;
        if (bulkTargetForm.updateManzil) payload.target_manzil = parseInt(bulkTargetForm.manzil) || 0;
        if (bulkTargetForm.updateTilawah) payload.target_tilawah = parseInt(bulkTargetForm.tilawah) || 0;

        if (Object.keys(payload).length === 0) {
            window.showAlert('Pilih minimal satu kriteria target untuk diupdate', 'Peringatan', 'warning');
            return;
        }

        try {
            showLoading(true, `Mengupdate ${selectedSantriIds.value.length} santri...`);

            // Sequential update for safety with current architecture
            for (const id of selectedSantriIds.value) {
                await DB.update(id, {
                    ...payload,
                    updated_at: new Date().toISOString()
                });
            }

            if (window.refreshData) window.refreshData();

            window.showAlert('Target massal berhasil diterapkan!', 'Sukses', 'info');
            closeBulkTargetModal();
            toggleSelectionMode(); // Exit selection mode
        } catch (error) {
            console.error('Bulk update error:', error);
            window.showAlert('Gagal update massal: ' + error.message, 'Error', 'danger');
        } finally {
            showLoading(false);
        }
    };

    /**
     * Recalculate manzil based on percentage change
     * @param {number} pct - New percentage value
     */
    const recalcManzil = (pct) => {
        const p = parseFloat(pct) || 0;
        const totalPages = targetForm.totalPages || 0;
        targetForm.manzil = Math.round(totalPages * (p / 100));
    };

    /**
     * Save target for santri
     */
    const saveTarget = async () => {
        return window.withSaving(async () => {
            if (!targetForm.id) { window.showAlert('Santri ID tidak ditemukan', 'Error', 'danger'); return; }
            try {
                const payload = {
                    target_sabaq: parseInt(targetForm.sabaq) || 0,
                    target_manzil: parseInt(targetForm.manzil) || 0,
                    target_tilawah: parseInt(targetForm.tilawah) || 600,
                    target_manzil_pct: parseFloat(targetForm.pct) || 20
                };
                await DB.update(targetForm.id, payload);
                if (window.refreshData) window.refreshData();
                window.showAlert('Target berhasil disimpan!', 'Sukses', 'info');
                closeTargetModal();
            } catch (error) {
                window.showAlert('Gagal menyimpan target: ' + error.message, 'Error', 'danger');
            }
        });
    };

    /**
     * Reset target to defaults
     * @param {string} santriId - Santri ID
     */
    const resetTarget = async (santriId) => {
        if (!santriId) {
            window.showAlert('Santri ID tidak ditemukan', 'Error', 'danger');
            return;
        }

        window.showConfirm({
            title: 'Reset Target',
            message: 'Reset target santri ini ke default sistem?',
            confirmText: 'Ya, Reset',
            type: 'warning',
            onConfirm: async () => {
                try {
                    const payload = {
                        target_sabaq: null,
                        target_manzil: null,
                        target_tilawah: null,
                        target_manzil_pct: null
                    };
                    await DB.update(santriId, payload);
                    if (window.refreshData) window.refreshData();
                    window.showAlert('Target berhasil direset ke default!', 'Sukses', 'info');
                } catch (error) {
                    console.error('Error resetting target:', error);
                    window.showAlert('Gagal mereset target: ' + error.message, 'Error', 'danger');
                }
            }
        });
    };

    // --- Back Navigation Logic (v37) ---
    const handlePopState = (e) => {
        if (modalState.isOpen && (modalState.view === 'target-form' || modalState.view === 'bulk-target')) {
            modalState.isOpen = false;
        }
    };

    watch(() => modalState.isOpen, (newVal) => {
        const views = ['target-form', 'bulk-target'];
        if (newVal && views.includes(modalState.view)) {
            window.history.pushState({ modal: 'target' }, '');
            window.addEventListener('popstate', handlePopState);
        } else if (!newVal && views.includes(modalState.view)) {
            window.removeEventListener('popstate', handlePopState);
            if (window.history.state && window.history.state.modal === 'target') {
                window.history.back();
            }
        }
    });

    onUnmounted(() => {
        window.removeEventListener('popstate', handlePopState);
    });

    // ===== RETURN =====
    return {
        // State
        targetForm,
        targetModalState,
        selectedSantriIds,
        bulkTargetForm,

        // Computed
        santriWithTarget,

        // Methods
        openTargetModal,
        closeTargetModal,
        saveTarget,
        resetTarget,
        recalcManzil,
        toggleSelectionMode,
        toggleSantriSelection,
        selectAllSantri,
        openBulkTargetModal,
        closeBulkTargetModal,
        applyBulkTarget
    };
}
