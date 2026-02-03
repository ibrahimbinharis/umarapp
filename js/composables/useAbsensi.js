/**
 * useAbsensi Composable
 * 
 * Manages Absensi (Attendance) data and operations
 * - Date navigation (prev/next/today)
 * - Daily jadwal list filtered by day name
 * - Per-jadwal attendance tracking
 * - Bulk operations (set all to H/S/I/A)
 * - Per-santri status management
 * 
 * Dependencies: DB (from core.js), uiData (from parent)
 */

function useAbsensi(uiData, DB) {
    // Get Vue from global (loaded via CDN)
    const { reactive, computed, ref } = Vue;

    // ===== STATE =====

    /**
     * Gender Filter (L/P)
     */
    const genderFilter = ref('L');

    /**
     * Absensi state
     */
    const absensiState = reactive({
        dateFilter: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        activeJadwal: null,  // Current jadwal being recorded
        santriList: []       // Filtered santri for current jadwal
    });

    /**
     * Temporary state for form (reset on open)
     */
    const formState = ref({});

    // ===== COMPUTED =====

    /**
     * Get day name from current date filter
     */
    const absensiDayName = computed(() => {
        const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const date = new Date(absensiState.dateFilter);
        return days[date.getDay()];
    });

    /**
     * Jadwal list for the current date's day
     * Filtered by Gender
     */
    const dailyJadwal = computed(() => {
        const jadwalData = uiData.jadwal || [];
        return jadwalData
            .filter(j => j.day === absensiDayName.value)
            .filter(j => (j.gender || 'L') === genderFilter.value) // Filter by gender
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    });

    /**
     * Get absensi data for a specific jadwal on current date
     * @param {string} jadwalId - Jadwal ID
     */
    const getAbsensiForJadwal = (jadwalId) => {
        const absensiData = uiData.absensi || [];
        return absensiData.find(a =>
            a.date === absensiState.dateFilter &&
            a.jadwal_id === jadwalId
        );
    };

    /**
     * Get summary counts (H/S/I/A) for absensi details
     * @param {Array} details - Absensi details array
     */
    const getAbsensiSummary = (details) => {
        const summary = { H: 0, S: 0, I: 0, A: 0 };
        if (!details || !Array.isArray(details)) return summary;

        details.forEach(d => {
            if (summary[d.status] !== undefined) {
                summary[d.status]++;
            }
        });

        return summary;
    };

    // ===== METHODS =====

    /**
     * Change date by adding/subtracting days
     * @param {number} days - Number of days to add (positive) or subtract (negative)
     */
    const changeAbsensiDate = (days) => {
        const current = new Date(absensiState.dateFilter);
        current.setDate(current.getDate() + days);
        absensiState.dateFilter = current.toISOString().split('T')[0];
    };

    /**
     * Open absensi form for a specific jadwal
     * @param {Object} jadwal - Jadwal object
     */
    const openAbsensiPage = (jadwal) => {
        if (!jadwal) {
            console.error('Jadwal is required');
            return;
        }

        absensiState.activeJadwal = jadwal;

        // Get existing absensi record if any
        const existing = getAbsensiForJadwal(jadwal._id);

        // Filter santri list by kelas AND GENDER
        let santriData = (uiData.santri || []).slice().sort((a, b) =>
            (a.full_name || '').localeCompare(b.full_name || '')
        );

        // Filter by Kelas
        if (jadwal.class_name) {
            santriData = santriData.filter(s => s.kelas === jadwal.class_name);
        }

        // Filter by Gender (Enforce strict gender separation based on schedule)
        const targetGender = jadwal.gender || genderFilter.value || 'L';
        santriData = santriData.filter(s => (s.gender || 'L') === targetGender);

        // Initialize form state for each santri
        const initialState = {};
        santriData.forEach(s => {
            // Try to get existing status, default to 'H' (Hadir)
            const existingDetail = existing?.details?.find(d => d.santri_id === s._id);
            initialState[s._id] = existingDetail?.status || 'H';
        });

        formState.value = initialState;
        absensiState.santriList = santriData;

        // Mark modal as open (parent will handle modal visibility)
        // Trigger modal opening via event or direct state change in parent
        return {
            santriList: santriData,
            formState: formState.value,
            existing: existing
        };
    };

    /**
     * Set all santri attendance to a specific status
     * @param {string} status - Status code ('H', 'S', 'I', 'A')
     */
    const setAllAbsensi = (status) => {
        if (!['H', 'S', 'I', 'A'].includes(status)) {
            console.error('Invalid status:', status);
            return;
        }

        // Update all entries in formState
        Object.keys(formState.value).forEach(santriId => {
            formState.value[santriId] = status;
        });

        // Force reactivity update
        formState.value = { ...formState.value };
    };

    /**
     * Save absensi record
     * @param {string} jadwalId - Jadwal ID (optional, uses active if not provided)
     */
    const saveAbsensi = async (jadwalId = null) => {
        const jId = jadwalId || absensiState.activeJadwal?._id;

        if (!jId) {
            alert('Jadwal tidak ditemukan');
            return;
        }

        try {
            // Build details array from formState
            const details = [];
            absensiState.santriList.forEach(s => {
                const status = formState.value[s._id] || 'H';
                details.push({
                    santri_id: s._id,
                    status: status
                });
            });

            // Calculate day_name from date
            const dateObj = new Date(absensiState.dateFilter);
            const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const dayName = days[dateObj.getDay()];

            const payload = {
                date: absensiState.dateFilter,
                day_name: dayName,
                jadwal_id: jId,
                details: details
            };

            // Check if updating existing record
            const existing = getAbsensiForJadwal(jId);

            if (existing) {
                await DB.update(existing._id, payload);
                alert('Absensi berhasil diupdate!');
            } else {
                await DB.create('absensi', payload);
                alert('Absensi berhasil disimpan!');
            }

            // Refresh data
            if (window.refreshData) {
                window.refreshData();
            }

            // Reset state
            absensiState.activeJadwal = null;
            absensiState.santriList = [];
            formState.value = {};

            return true;

        } catch (error) {
            console.error('Error saving absensi:', error);
            alert('Gagal menyimpan absensi: ' + error.message);
            return false;
        }
    };

    /**
     * Update status for a specific santri (for v-model binding)
     * @param {string} santriId - Santri ID
     * @param {string} status - New status
     */
    const updateSantriStatus = (santriId, status) => {
        formState.value[santriId] = status;
        // Force reactivity
        formState.value = { ...formState.value };
    };

    // ===== RETURN =====
    return {
        // State
        absensiState,
        formState,
        genderFilter,

        // Computed
        absensiDayName,
        dailyJadwal,
        getAbsensiForJadwal,
        getAbsensiSummary,

        // Methods
        openAbsensiPage,
        changeAbsensiDate,
        saveAbsensi,
        setAllAbsensi,
        updateSantriStatus
    };
}
