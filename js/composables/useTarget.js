/**
 * useTarget Composable
 * 
 * Manages Target (Monthly Quran Goals) for students
 * Unified UI: Uses Bottom Sheet for both Single and Bulk edits
 */

function useTarget(uiData, DB, modalState, refreshUI) {
    const { reactive, computed, ref, onUnmounted } = Vue;

    // ===== STATE =====
    const selectedSantriIds = ref([]);
    const isBulkSaving = ref(false);
    const selectionMode = ref(false);

    const bulkTargetForm = reactive({
        sabaq: 20,
        manzil: 20,
        tilawah: 600,
        pct: 20
    });

    const targetFilterGender = ref('all');
    const targetFilterKelas = ref('all');

    // ===== COMPUTED =====

    const santriWithTarget = computed(() => {
        let santriData = uiData.santri || [];
        const setoranData = uiData.setoran || [];

        if (targetFilterGender.value !== 'all') {
            santriData = santriData.filter(s => s.gender === targetFilterGender.value);
        }
        if (targetFilterKelas.value !== 'all') {
            santriData = santriData.filter(s => s.kelas === targetFilterKelas.value);
        }
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        return santriData.map(s => {
            const defaults = getTargetDefaults(s);
            const sabaq = defaults.isKhatam ? 0 : (s.target_sabaq != null ? s.target_sabaq : defaults.sabaq);
            let manzil = s.target_manzil != null ? s.target_manzil : defaults.manzil;
            
            // v37 Unified Rule: Enforce minimal 20 pages globally
            if (manzil < 20) manzil = 20;

            const tilawah = s.target_tilawah != null ? s.target_tilawah : 600;
            const pct = s.target_manzil_pct != null ? s.target_manzil_pct : 20;

            const sMonthRecords = setoranData.filter(r => {
                const rDate = new Date(r.setoran_date);
                return (String(r.santri_id) === String(s._id) || String(r.santri_id) === String(s.nis)) &&
                       rDate >= startOfMonth && rDate <= now && r._deleted !== true;
            });

            // v37: Use counted (0 if grade C). Fallback to pages for legacy records.
            const currentSabaq = sMonthRecords.filter(r => r.setoran_type === 'Sabaq').reduce((sum, r) => sum + (parseFloat(r.counted ?? r.pages) || 0), 0);
            const currentManzil = sMonthRecords.filter(r => r.setoran_type === 'Manzil' || r.setoran_type === 'Sabqi').reduce((sum, r) => sum + (parseFloat(r.counted ?? r.pages) || 0), 0);
            const currentTilawah = sMonthRecords.filter(r => r.setoran_type === 'Tilawah' || r.setoran_type === 'Binadzor').reduce((sum, r) => sum + (parseFloat(r.pages) || 0), 0);

            return {
                ...s,
                view_sabaq: sabaq,
                view_manzil: manzil,
                view_tilawah: tilawah,
                view_pct: pct,
                view_total_pages: defaults.totalPages,
                isKhatam: defaults.isKhatam,
                ach_sabaq: Math.round(currentSabaq * 10) / 10,
                ach_manzil: Math.round(currentManzil * 10) / 10,
                ach_tilawah: Math.round(currentTilawah * 10) / 10,
                prog_sabaq: sabaq === 0 ? 100 : Math.min(100, (currentSabaq / (sabaq || 1)) * 100),
                prog_manzil: Math.min(100, (currentManzil / (manzil || 1)) * 100),
                prog_overall: Math.min(100, ((currentSabaq + currentManzil) / ((sabaq + manzil) || 1)) * 100)
            };
        }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    });

    // ===== HELPER FUNCTIONS =====

    const getTargetDefaults = (santri) => {
        let totalJuz = 0;
        if (santri.hafalan_manual) {
            const match = santri.hafalan_manual.match(/(\d+)/);
            if (match) totalJuz = parseInt(match[1]);
        }
        const totalPages = totalJuz * 20;

        let sabaq = 20;
        const kelasStr = String(santri.kelas || '');
        if (totalJuz >= 30) {
            sabaq = 0;
        } else if (kelasStr.includes('1')) {
            sabaq = 10;
        }

        const pct = santri.target_manzil_pct || 20;
        let manzil = Math.round(totalPages * (pct / 100));
        
        // v37 Unified Rule: Minimal Manzil target is 20 pages
        if (manzil < 20) manzil = 20;

        return { sabaq, manzil, totalPages, isKhatam: totalJuz >= 30 };
    };

    // ===== METHODS =====

    /**
     * Unified Target Editor: Handles both Single and Bulk
     */
    const openTargetModal = (santri) => {
        if (!santri) return;
        
        // Populate form with current values
        bulkTargetForm.sabaq = santri.view_sabaq;
        bulkTargetForm.manzil = santri.view_manzil;
        bulkTargetForm.tilawah = santri.view_tilawah;
        bulkTargetForm.pct = santri.view_pct;

        // Set selection
        selectedSantriIds.value = [santri._id];
        
        // v37: Close dropdown if active
        if (window.activeDropdown) window.activeDropdown = null;
    };

    const toggleSelectionMode = () => {
        selectionMode.value = !selectionMode.value;
        selectedSantriIds.value = [];
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

    const applyBulkTarget = async () => {
        if (!selectedSantriIds.value.length) return;
        isBulkSaving.value = true;
        
        try {
            let count = 0;
            for (const id of selectedSantriIds.value) {
                const updateData = {
                    target_sabaq: parseInt(bulkTargetForm.sabaq) || 0,
                    target_manzil: parseInt(bulkTargetForm.manzil) || 0,
                    target_tilawah: parseInt(bulkTargetForm.tilawah) || 600,
                    target_manzil_pct: parseFloat(bulkTargetForm.pct) || 20
                };
                await DB.update(id, updateData);
                count++;
            }
            
            if (refreshUI) await refreshUI();
            window.showToast(count > 1 ? `${count} target santri diperbarui` : 'Target santri diperbarui', 'success');
            
            // Clean up
            selectionMode.value = false;
            selectedSantriIds.value = [];

        } catch (error) {
            console.error('Save target error:', error);
            window.showAlert('Gagal menyimpan: ' + error.message, 'Error', 'danger');
        } finally {
            isBulkSaving.value = false;
        }
    };

    const resetTarget = async (santriId) => {
        if (!santriId) return;
        window.showConfirm({
            title: 'Reset Target',
            message: 'Reset target ke default sistem?',
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
                    if (refreshUI) await refreshUI();
                    window.showToast('Target berhasil direset', 'success');
                } catch (error) {
                    window.showAlert('Gagal mereset: ' + error.message, 'Error', 'danger');
                }
            }
        });
    };

    return {
        selectedSantriIds,
        bulkTargetForm,
        isBulkSaving,
        selectionMode,
        targetFilterGender,
        targetFilterKelas,
        santriWithTarget,
        openTargetModal,
        saveTarget: applyBulkTarget, // alias for consistency
        resetTarget,
        toggleSelectionMode,
        toggleSantriSelection,
        selectAllSantri,
        applyBulkTarget
    };
}
