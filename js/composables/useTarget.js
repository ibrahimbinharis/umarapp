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

function useTarget(uiData, DB) {
    // Get Vue from global (loaded via CDN)
    const { reactive, computed } = Vue;

    // ===== STATE =====

    /**
     * Target form state
     */
    const targetForm = reactive({
        id: null,
        sabaq: 20,
        manzil: 20,
        pct: 20,
        totalPages: 0,
        full_name: '',
        hafalan_desc: ''
    });

    /**
     * Modal state
     */
    const targetModalState = reactive({
        isOpen: false
    });

    // ===== COMPUTED =====

    /**
     * Santri list with their target values computed
     */
    const santriWithTarget = computed(() => {
        const santriData = uiData.santri || [];

        return santriData.map(s => {
            const defaults = getTargetDefaults(s);
            const sabaq = s.target_sabaq || defaults.sabaq;
            const manzil = s.target_manzil || defaults.manzil;
            const pct = s.target_manzil_pct || 20;

            return {
                ...s,
                computed_sabaq: sabaq,
                computed_manzil: manzil,
                computed_pct: pct,
                computed_total_pages: defaults.totalPages
            };
        }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    });

    // ===== HELPER FUNCTIONS =====

    /**
     * Calculate default targets based on student data
     * @param {Object} santri - Santri object
     */
    const getTargetDefaults = (santri) => {
        // Sabaq Logic: Based on class
        let sabaq = 20; // Default
        const kelasStr = String(santri.kelas || '');

        if (kelasStr.includes('1')) {
            sabaq = 10; // Class 1 gets lower target
        }
        if (kelasStr.toLowerCase().includes('tahfidz')) {
            sabaq = 20; // Tahfidz class gets standard target
        }

        // Manzil Logic: Percentage of total hafalan
        // 1 Juz = 20 Pages
        let totalJuz = 0;
        if (santri.hafalan_manual) {
            const match = santri.hafalan_manual.match(/(\d+)/);
            if (match) {
                totalJuz = parseInt(match[1]);
            }
        }

        const totalPages = totalJuz * 20;
        const pct = santri.target_manzil_pct || 20; // Default 20% or custom
        const manzil = Math.round(totalPages * (pct / 100));

        return { sabaq, manzil, totalPages };
    };

    // ===== METHODS =====

    /**
     * Open target modal for a santri
     * @param {Object} santri - Santri object
     */
    const openTargetModal = (santri) => {
        if (!santri) {
            console.error('Santri is required');
            return;
        }

        const defaults = getTargetDefaults(santri);

        targetForm.id = santri._id;
        targetForm.full_name = santri.full_name;
        targetForm.hafalan_desc = santri.hafalan_manual || '0 Juz';
        targetForm.sabaq = santri.target_sabaq || defaults.sabaq;
        targetForm.manzil = santri.target_manzil || defaults.manzil;
        targetForm.pct = santri.target_manzil_pct || 20;
        targetForm.totalPages = defaults.totalPages;

        targetModalState.isOpen = true;
    };

    /**
     * Close target modal
     */
    const closeTargetModal = () => {
        targetModalState.isOpen = false;
        targetForm.id = null;
        targetForm.full_name = '';
        targetForm.hafalan_desc = '';
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
        if (!targetForm.id) {
            alert('Santri ID tidak ditemukan');
            return;
        }

        try {
            const sabaq = parseInt(targetForm.sabaq) || 0;
            const manzil = parseInt(targetForm.manzil) || 0;
            const pct = parseFloat(targetForm.pct) || 20;

            const payload = {
                target_sabaq: sabaq,
                target_manzil: manzil,
                target_manzil_pct: pct
            };

            await DB.update(targetForm.id, payload);

            // Refresh data
            if (window.refreshData) {
                window.refreshData();
            }

            alert('Target berhasil disimpan!');
            closeTargetModal();

        } catch (error) {
            console.error('Error saving target:', error);
            alert('Gagal menyimpan target: ' + error.message);
        }
    };

    /**
     * Reset target to defaults
     * @param {string} santriId - Santri ID
     */
    const resetTarget = async (santriId) => {
        if (!santriId) {
            alert('Santri ID tidak ditemukan');
            return;
        }

        if (!confirm('Reset target santri ini ke default sistem?')) {
            return;
        }

        try {
            const payload = {
                target_sabaq: null,
                target_manzil: null,
                target_manzil_pct: null
            };

            await DB.update(santriId, payload);

            // Refresh data
            if (window.refreshData) {
                window.refreshData();
            }

            alert('Target berhasil direset ke default!');

        } catch (error) {
            console.error('Error resetting target:', error);
            alert('Gagal mereset target: ' + error.message);
        }
    };

    // ===== RETURN =====
    return {
        // State
        targetForm,
        targetModalState,

        // Computed
        santriWithTarget,

        // Methods
        openTargetModal,
        closeTargetModal,
        saveTarget,
        resetTarget,
        recalcManzil
    };
}
