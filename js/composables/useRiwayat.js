const useRiwayat = (uiData, DB, refreshData, modules = {}, currentView) => {
    const { reactive, computed } = Vue;

    // --- STATE ---
    const riwayatState = reactive({
        page: 1,
        perPage: 20,
        search: '',
        startDate: '',
        endDate: '',
        category: '',
        endDate: '',
        category: '',
        santriId: '',
        selectedIds: [],
        activeActionId: null
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
            merged = merged.filter(i => i.__cat === riwayatState.category);
        }
        if (riwayatState.santriId) {
            merged = merged.filter(i => i.santri_id === riwayatState.santriId);
        }

        // Filter / Search (Optional future implementation, currently just sort)
        merged.sort((a, b) => {
            const getDateObj = (item) => {
                const d = item.date || '2000-01-01';
                // If date is already full ISO or contains time info, use it directly
                if (d.includes('T') || d.length > 10) return new Date(d);
                // Otherwise combine with time
                return new Date(d + 'T' + (item.time || '00:00'));
            };
            return getDateObj(b) - getDateObj(a);
        });

        return merged;
    });

    const paginatedRiwayat = computed(() => {
        const start = (riwayatState.page - 1) * riwayatState.perPage;
        return riwayatList.value.slice(start, start + riwayatState.perPage);
    });

    const riwayatTotalPages = computed(() => Math.ceil(riwayatList.value.length / riwayatState.perPage));

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
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        // Format: Senin, 20 Jan 2025
        const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
        return d.toLocaleDateString('id-ID', options);
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        // Handle ISO string from Sheets (1899-12-30T...)
        if (timeStr.includes('T') || timeStr.length > 8) {
            try {
                const d = new Date(timeStr);
                // Check if valid date
                if (!isNaN(d.getTime())) {
                    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
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
        deleteRiwayat,
        editRiwayat,
        formatDateLong,
        formatTime,
        toggleSelect,
        toggleSelectAll,
        deleteSelected,
        toggleActionMenu,
        closeActionMenu
    };
};
