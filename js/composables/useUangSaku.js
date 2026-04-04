/**
 * useUangSaku Composable
 * 
 * Manages Pocket Money (Uang Saku) for students
 * - Tracks Income (Pemasukan) from parents/admin
 * - Tracks Expenses (Pengeluaran) for students
 * - Calculates Balance (Saldo)
 * 
 * Dependencies: DB (from core.js), uiData (from parent)
 */

function useUangSaku(uiData, DB, refreshUI, userSession) {
    const { ref, reactive, computed, onMounted, watch } = Vue;

    // State
    const activeSantriId = ref('');
    const listTab = ref('semua'); // 'semua' | 'masuk' | 'keluar'
    const isSantriDropdownOpen = ref(false);
    const santriSearchQuery = ref('');
    
    // Modal state for adding/editing transaction
    const isTxModalOpen = ref(false);
    const isEditMode = ref(false);
    const editingId = ref(null);
    const usActiveMenuId = ref(null); // Tracks 3-dot menu for each transaction

    const txForm = reactive({
        type: 'masuk',
        jumlah: '',
        keterangan: '',
        tanggal: window.DateUtils.getTodayDateString()
    });

    // Reset Form
    const resetForm = (type = 'masuk') => {
        txForm.type = type;
        txForm.jumlah = '';
        txForm.keterangan = '';
        txForm.tanggal = window.DateUtils.getTodayDateString();
        isEditMode.value = false;
        editingId.value = null;
        closeUsMenus();
    };

    const toggleUsMenu = (id) => {
        if (usActiveMenuId.value === id) {
            usActiveMenuId.value = null;
        } else {
            usActiveMenuId.value = id;
        }
    };

    const closeUsMenus = () => {
        usActiveMenuId.value = null;
    };

    // Open Modal (Add Mode)
    const openTxModal = (type = 'masuk') => {
        if (!activeSantriId.value) {
            window.showAlert("Pilih santri terlebih dahulu", "Warning", "warning");
            return;
        }
        resetForm(type);
        isTxModalOpen.value = true;

        // v37: Navigation Guard for Modal
        window.history.pushState({ view: 'uang_saku', detail: true, modal: true }, '', '#uang_saku-form');
    };

    // Open Modal (Edit Mode)
    const openEditModal = (item) => {
        isEditMode.value = true;
        editingId.value = item._id;
        
        txForm.type = item.type;
        txForm.jumlah = item.jumlah;
        txForm.keterangan = item.keterangan;
        txForm.tanggal = item.tanggal;
        
        isTxModalOpen.value = true;

        // v37: Navigation Guard for Modal
        window.history.pushState({ view: 'uang_saku', detail: true, modal: true }, '', '#uang_saku-form');
    };

    // Close Modal
    const closeTxModal = () => {
        isTxModalOpen.value = false;
        resetForm();
    };

    const activeSantriObj = computed(() => {
        if (!activeSantriId.value || !uiData.santri) return null;
        return uiData.santri.find(s => 
            s._id === activeSantriId.value || 
            s.santri_id === activeSantriId.value || 
            s.nis === activeSantriId.value
        );
    });

    // Data filtering computations for SELECTED santri
    const santriUangSaku = computed(() => {
        if (!activeSantriId.value) return [];
        
        // Get all possible IDs for this santri to handle mixed ID types in transactions
        const s = activeSantriObj.value;
        const possibleIds = s 
            ? [String(s._id), String(s.santri_id || ''), String(s.nis || '')].filter(v => v && v !== 'undefined')
            : [String(activeSantriId.value)];

        return (uiData.uang_saku || []).filter(tx => 
            possibleIds.includes(String(tx.santri_id)) && !tx._deleted
        ).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    });

    const listMasuk = computed(() => santriUangSaku.value.filter(tx => tx.type === 'masuk'));
    const listKeluar = computed(() => santriUangSaku.value.filter(tx => tx.type === 'keluar'));

    const totalMasuk = computed(() => listMasuk.value.reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0));
    const totalKeluar = computed(() => listKeluar.value.reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0));
    
    const saldo = computed(() => totalMasuk.value - totalKeluar.value);

    // Save transaction
    const saveTransaction = async () => {
        if (!activeSantriId.value) return window.showAlert("Santri tidak valid", "Error", "error");
        if (!txForm.jumlah || txForm.jumlah <= 0) return window.showAlert("Jumlah harus lebih dari 0", "Warning", "warning");

        const defaultKet = txForm.type === 'masuk' ? 'Pemasukan Uang Saku' : 'Pengeluaran Uang Saku';
        
        const payload = {
            santri_id: activeSantriId.value,
            type: txForm.type,
            jumlah: parseInt(txForm.jumlah),
            keterangan: txForm.keterangan ? txForm.keterangan : defaultKet,
            tanggal: txForm.tanggal
        };

        window.submitBtnLoading = true;
        try {
            let savedItem = null;
            if (isEditMode.value && editingId.value) {
                // UPDATE
                savedItem = await DB.update(editingId.value, payload);
                window.showToast("Perubahan disimpan", "success");
            } else {
                // CREATE
                payload.created_by = window.currentUser ? window.currentUser._id : 'system';
                savedItem = await DB.create('uang_saku', payload);
                window.showToast("Transaksi berhasil disimpan", "success");
            }
            
            if (refreshUI) await refreshUI();
            closeTxModal();

            // v37: Trigger Notification for Wali
            if (savedItem && activeSantriObj.value && window.NotificationService) {
                // We use the updated 'saldo' value after refreshUI()
                window.NotificationService.notifyUangSaku(
                    activeSantriObj.value, 
                    payload.type, 
                    payload.jumlah, 
                    saldo.value, 
                    savedItem._id
                );
            }
        } catch (error) {
            console.error("Save Uang Saku error:", error);
            window.showAlert("Gagal menyimpan: " + error.message, "Error", "error");
        } finally {
            window.submitBtnLoading = false;
        }
    };

    // Delete transaction
    const deleteTransaction = async (id) => {
        window.showConfirm({
            title: "Hapus Transaksi",
            message: "Yakin ingin menghapus transaksi ini?",
            type: "danger",
            onConfirm: async () => {
                try {
                    await DB.delete(id);
                    if (refreshUI) refreshUI();
                    window.showToast("Transaksi dihapus", "success");
                } catch (error) {
                    console.error("Del error:", error);
                    window.showAlert("Gagal menghapus: " + error.message, "Error", "error");
                }
            }
        });
    };

    // Helper formatting money
    const formatRp = (angka) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0);
    };

    // Auto-select santri if role is 'santri'
    const checkRoleAndAutoSelect = () => {
        if (userSession && userSession.value && userSession.value.role === 'santri') {
            // Fix: cari _id santri dari uiData berdasarkan username (NIS)
            // agar activeSantriObj bisa match via _id (konsisten)
            const username = userSession.value.username;
            const foundSantri = (uiData.santri || []).find(s =>
                s.santri_id === username || s.nis === username || s._id === username
            );
            activeSantriId.value = foundSantri ? foundSantri._id : username;
        }
    };

    // v37: Navigation Guard for System Back
    watch(activeSantriId, (newVal) => {
        // Only push state if we are moving TO a detail view (newVal is truthy)
        // and we are NOT already in a detail history state
        if (newVal && (!window.history.state || !window.history.state.detail)) {
            window.history.pushState({ view: 'uang_saku', detail: true }, '', '#uang_saku-detail');
        }
    });

    onMounted(checkRoleAndAutoSelect);
    watch(() => userSession?.value, checkRoleAndAutoSelect);

    return {
        usActiveSantri: activeSantriId, // remapped for distinction from other activeSantri
        listTab,
        isSantriDropdownOpen,
        santriSearchQuery,
        isTxModalOpen,
        isEditMode,
        editingId,
        usActiveMenuId,
        txForm,
        listSemua: santriUangSaku,
        listMasuk,
        listKeluar,
        totalMasuk,
        totalKeluar,
        saldo,
        openTxModal,
        openEditModal,
        closeTxModal,
        saveTransaction,
        deleteTransaction,
        toggleUsMenu,
        closeUsMenus,
        formatRp
    };
}
