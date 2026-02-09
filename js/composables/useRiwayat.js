const useRiwayat = (uiData, DB, refreshData, modules = {}, currentView) => {
    const { reactive, computed } = Vue;

    // --- STATE ---
    const riwayatState = reactive({
        page: 1,
        perPage: 50,
        search: '',
        startDate: '',
        endDate: '',
        category: '',
        santriId: '',
        selectedIds: [],
        activeActionId: null,
        // Santri Dropdown
        santriSearch: '',
        isSantriDropdownOpen: false,
        // Filter Modal
        isFilterOpen: false,
        quickDateFilter: '' // 'today', 'week', 'month', 'custom'
    });

    // --- COMPUTED ---
    const riwayatList = computed(() => {
        // Gabungkan Setoran, Ujian, dan Pelanggaran
        let merged = [
            ...(uiData.setoran || []).map(s => ({ ...s, __cat: 'setoran', date: s.setoran_date, time: s.setoran_time })),
            ...(uiData.ujian || []).map(u => ({
                ...u,
                __cat: 'ujian',
                date: u.date || window.DateUtils.getTodayDateString(),
                time: u.time || '00:00',
                detail: u.detail || u.type || 'Data Ujian'
            })),
            ...(uiData.pelanggaran || []).map(p => ({ ...p, __cat: 'pelanggaran', date: p.date, time: p.time || '00:00' }))
        ];

        // --- FILTERS ---

        // 0. Filter Orphan Data (Santri Deleted)
        merged = merged.filter(item => {
            if (!item.santri_id) return true; // Keep if no santri_id (rare/system)
            return uiData.santri.some(s => s.santri_id === item.santri_id || s._id === item.santri_id);
        });

        if (riwayatState.startDate) {
            merged = merged.filter(i => i.date >= riwayatState.startDate);
        }
        if (riwayatState.endDate) {
            merged = merged.filter(i => i.date <= riwayatState.endDate);
        }
        if (riwayatState.category && riwayatState.category !== 'all') {
            // Support filtering by main category or sub-category (setoran_type)
            if (['sabaq', 'sabqi', 'manzil'].includes(riwayatState.category.toLowerCase())) {
                // Filter by setoran_type
                merged = merged.filter(i =>
                    i.__cat === 'setoran' &&
                    i.setoran_type &&
                    i.setoran_type.toLowerCase() === riwayatState.category.toLowerCase()
                );
            } else {
                // Filter by main category
                merged = merged.filter(i => i.__cat === riwayatState.category);
            }
        }
        if (riwayatState.santriId) {
            merged = merged.filter(i => i.santri_id === riwayatState.santriId);
        }

        // Filter / Search (Optional future implementation, currently just sort)
        merged.sort((a, b) => {
            // Sort by Date (Descending)
            const dateA = a.date || '2000-01-01';
            const dateB = b.date || '2000-01-01';
            if (dateA !== dateB) return dateB.localeCompare(dateA);

            // Same Date? Sort by Time (Descending)
            const timeA = a.time || '00:00';
            const timeB = b.time || '00:00';
            return timeB.localeCompare(timeA);
        });

        return merged;
    });

    const paginatedRiwayat = computed(() => {
        const start = (riwayatState.page - 1) * riwayatState.perPage;
        return riwayatList.value.slice(start, start + riwayatState.perPage);
    });

    const riwayatTotalPages = computed(() => Math.ceil(riwayatList.value.length / riwayatState.perPage));

    // Santri Dropdown
    // Note: State properties inside riwayatState (santriSearch, isSantriDropdownOpen)
    // are naturally namespaced by riwayatState, but the COMPUTED properties below were colliding.

    /**
     * Santri options for dropdown (Filtered by Search)
     */
    const riwayatFilteredSantriOptions = computed(() => {
        let items = uiData.santri || [];
        if (riwayatState.santriSearch) {
            const q = riwayatState.santriSearch.toLowerCase();
            items = items.filter(s =>
                (s.full_name || '').toLowerCase().includes(q) ||
                String(s.santri_id || '').toLowerCase().includes(q)
            );
        }
        return items.slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    });

    /**
     * Get selected santri name for display
     */
    const riwayatSelectedSantriName = computed(() => {
        if (!riwayatState.santriId) return '';
        const s = (uiData.santri || []).find(x => String(x.santri_id) === String(riwayatState.santriId));
        return s ? s.full_name : '';
    });

    /**
     * Filter Counts by Category (for pills)
     */
    const filterCounts = computed(() => {
        // Get all data without category filter
        let merged = [
            ...(uiData.setoran || []).map(s => ({ ...s, __cat: 'setoran', date: s.setoran_date, time: s.setoran_time })),
            ...(uiData.ujian || []).map(u => ({
                ...u,
                __cat: 'ujian',
                date: u.date || window.DateUtils.getTodayDateString(),
                time: u.time || '00:00',
                detail: u.detail || u.type || 'Data Ujian'
            })),
            ...(uiData.pelanggaran || []).map(p => ({ ...p, __cat: 'pelanggaran', date: p.date, time: p.time || '00:00' }))
        ];

        // Filter orphan data
        merged = merged.filter(item => {
            if (!item.santri_id) return true;
            return uiData.santri.some(s => s.santri_id === item.santri_id || s._id === item.santri_id);
        });

        // Apply date and santri filters (but not category)
        if (riwayatState.startDate) {
            merged = merged.filter(i => i.date >= riwayatState.startDate);
        }
        if (riwayatState.endDate) {
            merged = merged.filter(i => i.date <= riwayatState.endDate);
        }
        if (riwayatState.santriId) {
            merged = merged.filter(i => i.santri_id === riwayatState.santriId);
        }

        const setoran = merged.filter(i => i.__cat === 'setoran');

        return {
            all: merged.length,
            setoran: setoran.length,
            sabaq: setoran.filter(s => s.setoran_type && s.setoran_type.toLowerCase() === 'sabaq').length,
            sabqi: setoran.filter(s => s.setoran_type && s.setoran_type.toLowerCase() === 'sabqi').length,
            manzil: setoran.filter(s => s.setoran_type && s.setoran_type.toLowerCase() === 'manzil').length,
            ujian: merged.filter(i => i.__cat === 'ujian').length,
            pelanggaran: merged.filter(i => i.__cat === 'pelanggaran').length
        };
    });

    /**
     * Count active filters
     */
    const activeFilterCount = computed(() => {
        let count = 0;
        if (riwayatState.startDate || riwayatState.endDate || riwayatState.quickDateFilter) count++;
        if (riwayatState.category) count++;
        if (riwayatState.santriId) count++;
        return count;
    });

    /**
     * Get Juz number from page number (safe wrapper for Vue templates)
     */
    const getJuzFromPage = (page) => {
        if (window.QuranUtils && window.QuranUtils.getJuzFromPage) {
            return window.QuranUtils.getJuzFromPage(page);
        }
        return '-';
    };

    // --- ACTIONS ---
    const toggleSelect = (id) => {
        if (riwayatState.selectedIds.includes(id)) {
            riwayatState.selectedIds = riwayatState.selectedIds.filter(i => i !== id);
        } else {
            riwayatState.selectedIds.push(id);
        }
    };

    const toggleSelectAll = (items) => {
        const allIds = items.map(i => i._id);
        const allSelected = allIds.every(id => riwayatState.selectedIds.includes(id));

        if (allSelected) {
            // Deselect all visible
            riwayatState.selectedIds = riwayatState.selectedIds.filter(id => !allIds.includes(id));
        } else {
            // Select all visible
            const newIds = allIds.filter(id => !riwayatState.selectedIds.includes(id));
            riwayatState.selectedIds.push(...newIds);
        }
    };

    const deleteSelected = async () => {
        if (!riwayatState.selectedIds.length) return;
        if (!confirm(`Yakin hapus ${riwayatState.selectedIds.length} data terpilih?`)) return;

        try {
            await Promise.all(riwayatState.selectedIds.map(id => DB.delete(id)));
            refreshData();
            riwayatState.selectedIds = [];
            alert("Data terpilih berhasil dihapus");
        } catch (e) {
            console.error("Gagal hapus banyak:", e);
            alert("Gagal menghapus sebagian data: " + e.message);
        }
    };

    const toggleActionMenu = (id) => {
        if (riwayatState.activeActionId === id) {
            riwayatState.activeActionId = null;
        } else {
            riwayatState.activeActionId = id;
        }
    };

    const closeActionMenu = () => {
        riwayatState.activeActionId = null;
    };

    /**
     * Select santri from dropdown
     */
    const selectRiwayatSantri = (santri) => {
        riwayatState.santriId = santri.santri_id;
        riwayatState.santriSearch = '';
        riwayatState.isSantriDropdownOpen = false;
    };

    /**
     * Set Quick Date Filter
     */
    const setQuickDateFilter = (preset) => {
        const today = new Date();
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        riwayatState.quickDateFilter = preset;

        switch (preset) {
            case 'today':
                riwayatState.startDate = formatDate(today);
                riwayatState.endDate = formatDate(today);
                break;
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
                riwayatState.startDate = formatDate(weekStart);
                riwayatState.endDate = formatDate(today);
                break;
            case 'month':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                riwayatState.startDate = formatDate(monthStart);
                riwayatState.endDate = formatDate(today);
                break;
            case 'custom':
                // Keep current dates, just mark as custom
                break;
            default:
                riwayatState.startDate = '';
                riwayatState.endDate = '';
                riwayatState.quickDateFilter = '';
        }
    };

    /**
     * Reset all filters
     */
    const resetAllFilters = () => {
        riwayatState.startDate = '';
        riwayatState.endDate = '';
        riwayatState.category = '';
        riwayatState.santriId = '';
        riwayatState.quickDateFilter = '';
        riwayatState.page = 1;
    };

    /**
     * Remove individual filter
     */
    const removeFilter = (filterType) => {
        switch (filterType) {
            case 'date':
                riwayatState.startDate = '';
                riwayatState.endDate = '';
                riwayatState.quickDateFilter = '';
                break;
            case 'category':
                riwayatState.category = '';
                break;
            case 'santri':
                riwayatState.santriId = '';
                break;
        }
    };

    const deleteRiwayat = async (arg, type) => {
        // Handle input: arg can be ID string or Item object
        const id = (typeof arg === 'object' && arg !== null) ? arg._id : arg;

        if (!id) return alert("ID invalid");

        // type might be useful if we have different collections, but DB.delete(id) uses global ID
        if (!confirm("Yakin hapus data riwayat ini? Data tidak bisa dikembalikan.")) return;

        try {
            await DB.delete(id);
            refreshData(); // Refresh UI
            // alert("Data berhasil dihapus"); // Optional feedback
        } catch (e) {
            console.error("Gagal hapus riwayat:", e);
            alert("Gagal menghapus data: " + e.message);
        }
    };

    // --- HELPERS ---
    const formatDateLong = (dateStr) => {
        // Enhanced formatter to match activity feed style (date only)
        if (!dateStr) return '-';

        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr; // Fallback

            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            // Check if today or yesterday
            const isToday = date.toDateString() === today.toDateString();
            const isYesterday = date.toDateString() === yesterday.toDateString();

            if (isToday) {
                return 'Hari ini';
            } else if (isYesterday) {
                return 'Kemarin';
            } else {
                // Format: DD/MM/YYYY
                return date.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
        } catch (e) {
            return dateStr; // Fallback
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        // Handle ISO string from Sheets (1899-12-30T...)
        if (timeStr.includes('T') || timeStr.length > 8) {
            try {
                const d = new Date(timeStr);
                // Check if valid date
                if (!isNaN(d.getTime())) {
                    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
                }
            } catch (e) { }
        }
        // Handle HH:mm:ss
        if (timeStr.includes(':')) return timeStr.substring(0, 5);
        return timeStr;
    };

    /**
     * Edit item riwayat
     * Delegates to specific module based on __cat
     */
    const editRiwayat = (item) => {
        if (!item) return;

        // Ensure we have modules
        const { setoran, ujian, pelanggaran } = modules;

        switch (item.__cat) {
            case 'setoran':
                if (setoran && setoran.editSetoran) {
                    setoran.editSetoran(item);
                    if (currentView) currentView.value = 'input';
                }
                break;
            case 'ujian':
                if (ujian && ujian.editUjian) {
                    ujian.editUjian(item);
                    if (currentView) currentView.value = 'ujian';
                    if (ujian.ujianForm) ujian.ujianForm.tab = 'semester'; // Force correct tab
                }
                break;
            case 'pelanggaran':
                if (pelanggaran && pelanggaran.editPelanggaran) {
                    pelanggaran.editPelanggaran(item);
                    if (currentView) currentView.value = 'pelanggaran';
                    if (pelanggaran.pelanggaranForm) pelanggaran.pelanggaranForm.tab = 'input'; // Force input tab
                }
                break;
            default:
                console.warn("Unknown category for edit:", item.__cat);
        }

        // Scroll to Top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return {
        riwayatState,
        riwayatList,
        paginatedRiwayat,
        riwayatTotalPages,
        riwayatFilteredSantriOptions,
        riwayatSelectedSantriName,
        filterCounts,
        activeFilterCount,
        getJuzFromPage,
        deleteRiwayat,
        editRiwayat,
        formatDateLong,
        formatTime,
        toggleSelect,
        toggleSelectAll,
        deleteSelected,
        toggleActionMenu,
        closeActionMenu,
        selectRiwayatSantri,
        setQuickDateFilter,
        resetAllFilters,
        removeFilter
    };
};
