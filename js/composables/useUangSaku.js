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
    const usMenuStates = ref({}); // Tracks 3-dot menu for each transaction
    const usGenderFilter = ref(''); // '' (all) | 'L' (putra) | 'P' (putri)

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
        const current = usMenuStates.value[id];
        usMenuStates.value = {}; // Close all
        if (!current) usMenuStates.value[id] = true;
    };

    const closeUsMenus = () => {
        usMenuStates.value = {};
    };

    // Global Statistics (Total across all/filtered santri)
    const globalSummary = computed(() => {
        const santriList = (uiData.santri || []);
        const filteredSantri = !usGenderFilter.value
            ? santriList 
            : santriList.filter(s => s.gender === usGenderFilter.value);
            
        const filteredSantriIds = new Set(filteredSantri.map(s => s._id || s.santri_id));
        
        const txList = (uiData.uang_saku || []).filter(tx => !tx._deleted && filteredSantriIds.has(tx.santri_id));
        
        const totalIn = txList.filter(tx => tx.type === 'masuk').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0);
        const totalOut = txList.filter(tx => tx.type === 'keluar').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0);
        
        return {
            totalMasuk: totalIn,
            totalKeluar: totalOut,
            saldo: totalIn - totalOut
        };
    });

    // Open Modal (Add Mode)
    const openTxModal = (type = 'masuk') => {
        if (!activeSantriId.value) {
            window.showAlert("Pilih santri terlebih dahulu", "Warning", "warning");
            return;
        }
        resetForm(type);
        isTxModalOpen.value = true;
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
            if (isEditMode.value && editingId.value) {
                // UPDATE
                await DB.update(editingId.value, payload);
                window.showToast("Perubahan disimpan", "success");
            } else {
                // CREATE
                payload.created_by = window.currentUser ? window.currentUser._id : 'system';
                await DB.create('uang_saku', payload);
                window.showToast("Transaksi berhasil disimpan", "success");
            }
            
            if (refreshUI) refreshUI();
            closeTxModal();
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
            activeSantriId.value = userSession.value.username;
        }
    };

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
        usMenuStates,
        txForm,
        listSemua: santriUangSaku,
        listMasuk,
        listKeluar,
        totalMasuk,
        totalKeluar,
        saldo,
        globalSummary,
        usGenderFilter,
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
