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

function useAbsensi(uiData, DB, modalState, userSession) {
    // Get Vue from global (loaded via CDN)
    const { reactive, computed, ref } = Vue;

    // Helper: Get Local Date String YYYY-MM-DD
    const getLocalDateString = (dateObj = new Date()) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // ===== STATE =====

    /**
     * Gender Filter (L/P)
     */
    const genderFilter = ref('L');

    /**
     * Absensi state
     */
    const absensiState = reactive({
        dateFilter: getLocalDateString(), // Use Local Time
        activeJadwal: null,  // Current jadwal being recorded
        santriList: [],       // Filtered santri for current jadwal
        absensiTab: 'absensi',// Tab: 'absensi' | 'jurnal'
        jurnal: {            // Form for Jurnal
            materi: '',
            catatan: ''
        },
        // Jurnal Filters (v37)
        jurnalStartDate: '',
        jurnalEndDate: '',
        quickJurnalFilter: 'month', // Default to This Month
        // Calendar State (v37)
        isCalendarOpen: false,
        viewMonth: new Date().getMonth(),
        viewYear: new Date().getFullYear(),
        tempStart: '',
        tempEnd: ''
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
            .filter(j => {
                // Strict gender match for ALL classes (including Umum)
                return (j.gender || 'L') === genderFilter.value;
            })
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    });

    /**
     * Get absensi data for a specific jadwal on current date
     * @param {string} jadwalId - Jadwal ID
     */
    const getAbsensiForJadwal = (jadwalId) => {
        const absensiData = uiData.absensi || [];

        return absensiData.find(a => {
            if (a.jadwal_id !== jadwalId) return false;

            // Robust Date Comparison: Normalize both to Local Start of Day
            try {
                // Parse filter date (YYYY-MM-DD -> Local Midnight)
                const targetDate = new Date(absensiState.dateFilter);
                targetDate.setHours(0, 0, 0, 0);

                // Parse record date (ISO String -> Local Midnight of that instant)
                const recordDate = new Date(a.date);
                recordDate.setHours(0, 0, 0, 0);

                // Check if same day
                return targetDate.getTime() === recordDate.getTime();
            } catch (e) {
                return false;
            }
        });
    };

    /**
     * Get summary counts (H/S/I/A) for absensi details
     * @param {Array} details - Absensi details array
     */
    const getAbsensiSummary = (details) => {
        const summary = { H: 0, S: 0, I: 0, A: 0 };
        
        // Auto parse string if it was recently saved as JSON string
        let parsedDetails = details;
        if (typeof details === 'string') {
            try { parsedDetails = JSON.parse(details); } catch(e) { parsedDetails = []; }
        }

        if (!parsedDetails || !Array.isArray(parsedDetails)) return summary;

        parsedDetails.forEach(d => {
            if (summary[d.status] !== undefined) {
                summary[d.status]++;
            }
        });

        return summary;
    };

    /**
     * Timeline History of all jurnals (absensi records with journal content)
     */
    const jurnalList = computed(() => {
        const absData = uiData.absensi || [];
        const jadwalData = uiData.jadwal || [];

        let filtered = absData.filter(a => a.jurnal_materi || a.jurnal_catatan);

        // Apply Date Filters
        if (absensiState.jurnalStartDate) {
            filtered = filtered.filter(a => a.date >= absensiState.jurnalStartDate);
        }
        if (absensiState.jurnalEndDate) {
            filtered = filtered.filter(a => a.date <= absensiState.jurnalEndDate);
        }

        // Apply Gender Filter (v37 Integration)
        filtered = filtered.filter(a => {
            const jadwalObj = jadwalData.find(j => j._id === a.jadwal_id);
            return (jadwalObj?.gender || 'L') === genderFilter.value;
        });

        return filtered
            .map(a => {
                const jadwalObj = jadwalData.find(j => j._id === a.jadwal_id);
                const inputGuru = (uiData.guru || []).find(g => g.username === a.input_by) || (uiData.users || []).find(u => u.username === a.input_by);
                const inputByName = inputGuru ? (inputGuru.full_name || inputGuru.username) : (a.input_by === 'Sistem' ? 'Sistem' : a.input_by);
                
                return {
                    ...a,
                    jadwalObj: jadwalObj,
                    input_by_name: inputByName,
                    mapel: jadwalObj?.mapel || 'Mapel Terhapus',
                    class_name: jadwalObj?.class_name || '-',
                    time: jadwalObj?.time || '-'
                };
            })
            // Sort by Date Descending
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    // ===== METHODS =====

    /**
     * Change date by adding/subtracting days
     * @param {number} days - Number of days to add (positive) or subtract (negative)
     */
    const changeAbsensiDate = (days) => {
        const current = new Date(absensiState.dateFilter);
        current.setDate(current.getDate() + days);
        absensiState.dateFilter = getLocalDateString(current);
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
        if (jadwal.class_name && jadwal.class_name !== 'Umum') {
            santriData = santriData.filter(s => s.kelas === jadwal.class_name);
        }

        // Filter by Gender
        // Strict: Use Schedule Gender
        let targetGender = jadwal.gender || 'L';

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
        
        // Initialize Jurnal State
        absensiState.jurnal.materi = existing?.jurnal_materi || '';
        absensiState.jurnal.catatan = existing?.jurnal_catatan || '';

        // Mark modal as open
        if (modalState) {
            modalState.view = 'absensi';
            modalState.title = 'Absensi Kelas';
            modalState.isOpen = true;
        }

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
            window.showAlert('Jadwal tidak ditemukan', 'Error', 'danger');
            return;
        }
        // -- GUARD START -- 
        // Only allow designated teacher or admin to save absensi for this jadwal
        if (userSession?.value?.role === 'guru') {
            const jObj = absensiState.activeJadwal;
            if (!jObj || jObj.username !== userSession.value.username) {
                window.showAlert("Akses Ditolak: Anda bukan guru pengampu jadwal ini.", "Peringatan Keamanan", "danger");
                return false;
            }
        }
        // -- GUARD END --

        try {
            const jId = absensiState.activeJadwal._id;
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
                details: JSON.stringify(details), // Serialize to prevent [Ljava.lang.Object error
                jurnal_materi: absensiState.jurnal.materi,
                jurnal_catatan: absensiState.jurnal.catatan,
                input_by: userSession?.value?.username || 'Sistem'
            };

            // Check if updating existing record
            const existing = getAbsensiForJadwal(jId);

            if (existing) {
                await DB.update(existing._id, payload);
                window.showAlert('Absensi berhasil diupdate!', 'Sukses', 'info');
            } else {
                await DB.create('absensi', payload);
                window.showAlert('Absensi berhasil disimpan!', 'Sukses', 'info');
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
            window.showAlert('Gagal menyimpan absensi: ' + error.message, 'Error', 'danger');
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

    /**
     * Set Quick Date Filter for Jurnal
     */
    const setQuickJurnalFilter = (preset) => {
        const today = new Date();
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        absensiState.quickJurnalFilter = preset;

        switch (preset) {
            case 'today':
                absensiState.jurnalStartDate = formatDate(today);
                absensiState.jurnalEndDate = formatDate(today);
                absensiState.isCalendarOpen = false;
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                absensiState.jurnalStartDate = formatDate(yesterday);
                absensiState.jurnalEndDate = formatDate(yesterday);
                absensiState.isCalendarOpen = false;
                break;
            case 'last7':
                const d7 = new Date(today);
                d7.setDate(today.getDate() - 7);
                absensiState.jurnalStartDate = formatDate(d7);
                absensiState.jurnalEndDate = formatDate(today);
                absensiState.isCalendarOpen = false;
                break;
            case 'last30':
                const d30 = new Date(today);
                d30.setDate(today.getDate() - 30);
                absensiState.jurnalStartDate = formatDate(d30);
                absensiState.jurnalEndDate = formatDate(today);
                absensiState.isCalendarOpen = false;
                break;
            case 'month':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                absensiState.jurnalStartDate = formatDate(monthStart);
                absensiState.jurnalEndDate = formatDate(today);
                absensiState.isCalendarOpen = false;
                break;
            case 'all':
                absensiState.jurnalStartDate = '';
                absensiState.jurnalEndDate = '';
                absensiState.isCalendarOpen = false;
                break;
            case 'custom':
                absensiState.isCalendarOpen = true;
                // Init temp range if empty
                if (!absensiState.tempStart) {
                    absensiState.tempStart = absensiState.jurnalStartDate;
                    absensiState.tempEnd = absensiState.jurnalEndDate;
                }
                break;
        }
    };

    /**
     * Calendar Logic (v37)
     */
    const moveCalendar = (dir) => {
        let m = absensiState.viewMonth + dir;
        let y = absensiState.viewYear;
        if (m > 11) { m = 0; y++; }
        if (m < 0) { m = 11; y--; }
        absensiState.viewMonth = m;
        absensiState.viewYear = y;
    };

    const selectCalendarDate = (dateStr) => {
        if (!absensiState.tempStart || (absensiState.tempStart && absensiState.tempEnd)) {
            absensiState.tempStart = dateStr;
            absensiState.tempEnd = '';
        } else {
            if (dateStr < absensiState.tempStart) {
                absensiState.tempEnd = absensiState.tempStart;
                absensiState.tempStart = dateStr;
            } else {
                absensiState.tempEnd = dateStr;
            }
        }
    };

    const applyCustomRange = () => {
        if (absensiState.tempStart && absensiState.tempEnd) {
            absensiState.jurnalStartDate = absensiState.tempStart;
            absensiState.jurnalEndDate = absensiState.tempEnd;
            absensiState.isCalendarOpen = false;
        }
    };

    const calendarWeeks = computed(() => {
        const year = absensiState.viewYear;
        const month = absensiState.viewMonth;
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        // Empty slots for prev month
        for (let i = 0; i < firstDay; i++) days.push(null);
        
        // Month days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateStr = date.toISOString().split('T')[0];
            days.push({
                day: i,
                dateStr: dateStr,
                isToday: dateStr === new Date().toISOString().split('T')[0],
                isSelected: dateStr === absensiState.tempStart || dateStr === absensiState.tempEnd,
                isInRange: absensiState.tempStart && absensiState.tempEnd && 
                          dateStr > absensiState.tempStart && dateStr < absensiState.tempEnd
            });
        }
        return days;
    });

    // Initial Filter
    setQuickJurnalFilter('month');

    /**
     * Delete absensi/jurnal record
     */
    const deleteAbsensi = async (id) => {
        // -- GUARD START --
        if (userSession?.value?.role === 'guru') {
            const existing = (uiData.absensi || []).find(a => a._id === id);
            if (existing && existing.input_by !== userSession.value.username) {
                window.showAlert("Akses Ditolak: Anda hanya diperbolehkan menghapus data jurnal milik Anda sendiri.", "Peringatan Keamanan", "danger");
                return false;
            }
        }
        // -- GUARD END --

        return new Promise((resolve) => {
            window.showConfirm({
                title: 'Hapus Data Jurnal & Absensi',
                message: 'Apakah Anda yakin ingin menghapus data absensi beserta catatan jurnal ini secara permanen?',
                confirmText: 'Ya, Hapus',
                type: 'danger',
                onConfirm: async () => {
                    try {
                        await DB.delete(id);
                        absensiState.jurnal.materi = '';
                        absensiState.jurnal.catatan = '';
                        window.showAlert('Data berhasil dihapus', 'Sukses', 'info');
                        if (window.refreshData) window.refreshData();
                        resolve(true);
                    } catch (e) {
                        console.error(e);
                        window.showAlert('Gagal menghapus: ' + e.message, 'Error', 'danger');
                        resolve(false);
                    }
                }
            });
        });
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
        jurnalList,
        getAbsensiForJadwal,
        getAbsensiSummary,

        // Methods
        openAbsensiPage,
        changeAbsensiDate,
        saveAbsensi,
        deleteAbsensi,
        setAllAbsensi,
        updateSantriStatus,
        setQuickJurnalFilter,
        moveCalendar,
        selectCalendarDate,
        applyCustomRange,
        calendarWeeks
    };
}
