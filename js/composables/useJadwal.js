/**
 * useJadwal Composable
 * 
 * Manages Jadwal (KBM Schedule) data and operations
 * - Day filtering
 * - CRUD operations for schedules
 * - Dropdown options from master data (mapel, kelas, guru)
 * - Time range handling (start + end time)
 * 
 * Dependencies: DB (from core.js), uiData (from parent)
 */

function useJadwal(uiData, DB, modalState) {
    // Get Vue from global (loaded via CDN)
    const { reactive, computed, ref } = Vue;

    // ===== STATE =====

    /**
     * Gender Filter (L/P)
     */
    const jadwalGenderFilter = ref('L');

    /**
     * Jadwal form state
     */
    const jadwalForm = reactive({
        id: null,
        day: 'Senin',
        gender: 'L',
        mapel: '',
        time_start: '07:00',
        time_end: '08:00',
        class_name: '',
        teacher: ''
    });

    /**
     * Day filter for view
     */
    const dayFilter = reactive({
        value: 'Semua'
    });

    // ===== COMPUTED =====

    /**
     * Filtered jadwal list based on day and gender filter
     */
    const filteredJadwalList = computed(() => {
        const jadwalData = uiData.jadwal || [];

        // Filter by Gender
        // Strict Check: j.gender must equal jadwalGenderFilter.value
        // If j.gender is undefined/null, assume 'L' (Legacy Data compatibility)
        let items = jadwalData.filter(j => {
            const g = j.gender || 'L';
            return g === jadwalGenderFilter.value;
        });

        if (dayFilter.value === 'Semua') {
            return items;
        }

        return items.filter(j => j.day === dayFilter.value);
    });

    // ... (mapelOptions, kelasOptions, guruOptions unmodified) ...
    const mapelOptions = computed(() => {
        return (uiData.mapel || [])
            .map(m => m.name)
            .sort((a, b) => a.localeCompare(b));
    });

    const kelasOptions = computed(() => {
        return (uiData.kelas || [])
            .map(k => k.name)
            .sort((a, b) => a.localeCompare(b));
    });

    const guruOptions = computed(() => {
        return (uiData.guru || [])
            .map(g => g.full_name)
            .filter(name => name) // Filter out empty names
            .sort((a, b) => a.localeCompare(b));
    });

    // ===== METHODS =====

    /**
     * Set day filter
     * @param {string} day - Day name or 'Semua'
     */
    const setDayFilter = (day) => {
        dayFilter.value = day;
    };

    /**
     * Open jadwal modal
     * @param {Object|null} jadwal - Jadwal object for edit, null for create
     */
    const openJadwalModal = (jadwal = null) => {
        if (jadwal) {
            // Edit mode - populate form
            jadwalForm.id = jadwal._id;
            jadwalForm.day = jadwal.day || 'Senin';
            jadwalForm.gender = jadwal.gender || 'L'; // Use schedule's gender
            jadwalForm.mapel = jadwal.mapel || '';
            jadwalForm.class_name = jadwal.class_name || '';
            jadwalForm.teacher = jadwal.teacher || '';

            // Parse time range "HH:MM - HH:MM"
            if (jadwal.time && jadwal.time.includes(' - ')) {
                const [start, end] = jadwal.time.split(' - ');
                jadwalForm.time_start = start.trim();
                jadwalForm.time_end = end.trim();
            } else {
                jadwalForm.time_start = '07:00';
                jadwalForm.time_end = '08:00';
            }

            modalState.isEdit = true;
            modalState.title = 'Edit Jadwal';
        } else {
            // Create mode - reset form
            jadwalForm.id = null;
            jadwalForm.day = 'Senin';
            jadwalForm.gender = jadwalGenderFilter.value; // Auto-set based on current filter
            jadwalForm.mapel = '';
            jadwalForm.time_start = '07:00';
            jadwalForm.time_end = '08:00';
            jadwalForm.class_name = '';
            jadwalForm.teacher = '';
            modalState.isEdit = false;
            modalState.title = 'Tambah Jadwal ' + (jadwalGenderFilter.value === 'L' ? 'Putra' : 'Putri');
        }

        modalState.view = 'jadwal'; // Use shared modal view
        modalState.isOpen = true;
    };

    /**
     * Close jadwal modal
     */
    const closeJadwalModal = () => {
        modalState.isOpen = false;
        jadwalForm.id = null;
    };

    /**
     * Save jadwal (create or update)
     */
    const saveJadwal = async () => {
        // Validation
        if (!jadwalForm.mapel || !jadwalForm.mapel.trim()) {
            return alert("Mata pelajaran wajib diisi");
        }
        if (!jadwalForm.class_name || !jadwalForm.class_name.trim()) {
            return alert("Kelas wajib diisi");
        }
        if (!jadwalForm.teacher || !jadwalForm.teacher.trim()) {
            return alert("Guru pengampu wajib diisi");
        }
        if (!jadwalForm.time_start || !jadwalForm.time_end) {
            return alert("Jam mulai dan selesai wajib diisi");
        }

        try {
            // Combine time_start and time_end into "HH:MM - HH:MM" format
            const timeRange = `${jadwalForm.time_start} - ${jadwalForm.time_end}`;

            const payload = {
                day: jadwalForm.day,
                gender: jadwalForm.gender,
                mapel: jadwalForm.mapel.trim(),
                time: timeRange,
                class_name: jadwalForm.class_name.trim(),
                teacher: jadwalForm.teacher.trim()
            };

            if (jadwalForm.id) {
                // Update existing
                await DB.update(jadwalForm.id, payload);
                alert("Jadwal berhasil diupdate!");
            } else {
                // Create new
                await DB.create('jadwal', payload);
                alert("Jadwal berhasil ditambahkan!");
            }

            // Refresh UI
            if (window.refreshData) {
                window.refreshData();
            }

            // Close modal
            closeJadwalModal();

        } catch (error) {
            console.error('Error saving jadwal:', error);
            alert('Gagal menyimpan jadwal: ' + error.message);
        }
    };

    /**
     * Delete jadwal
     * @param {string} id - Jadwal ID to delete
     */
    const deleteJadwal = async (id) => {
        if (!confirm("Hapus jadwal ini?")) return;

        try {
            await DB.delete(id);

            // Refresh UI
            if (window.refreshData) {
                window.refreshData();
            }

            alert("Jadwal berhasil dihapus!");
        } catch (error) {
            console.error('Error deleting jadwal:', error);
            alert('Gagal menghapus jadwal: ' + error.message);
        }
    };

    // ===== RETURN =====
    return {
        // State
        jadwalForm,
        // jadwalModalState removed, utilizing global modalState
        dayFilter,
        jadwalGenderFilter,

        // Computed
        filteredJadwalList,
        mapelOptions,
        kelasOptions,
        guruOptions,

        // Methods
        openJadwalModal,
        closeJadwalModal,
        saveJadwal,
        deleteJadwal,
        setDayFilter
    };
}
