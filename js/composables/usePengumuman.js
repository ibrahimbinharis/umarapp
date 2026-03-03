/**
 * usePengumuman.js
 *
 * Composable untuk mengelola Pengumuman (Announcements).
 * - Admin: CRUD pengumuman
 * - Semua user: Baca pengumuman
 * - Broadcast notifikasi ke user sesuai target saat publish
 */

function usePengumuman(uiData, DB, userSession, refreshData) {
    const { ref, reactive, computed } = Vue;

    // ===== STATE =====
    const PAGE_SIZE = 10;

    const pengumumanList = ref([]);
    const currentPage = ref(1);
    const isLoading = ref(false);
    const showFormModal = ref(false);
    const showDetailModal = ref(false);
    const detailItem = ref(null);

    const form = reactive({
        _id: null,
        judul: '',
        isi: '',
        kategori: 'info',    // info | penting | darurat
        target: 'semua',     // semua | guru | wali
        created_at: null
    });

    // ===== COMPUTED =====
    const filteredList = computed(() => {
        const role = userSession.value?.role;
        if (!role || role === 'admin') return pengumumanList.value;

        return pengumumanList.value.filter(item =>
            item.target === 'semua' || item.target === role
        );
    });

    const totalPages = computed(() =>
        Math.ceil(filteredList.value.length / PAGE_SIZE)
    );

    const paginatedList = computed(() => {
        const start = (currentPage.value - 1) * PAGE_SIZE;
        return filteredList.value
            .slice()
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(start, start + PAGE_SIZE);
    });

    // ===== METHODS =====

    /** Load semua pengumuman dari Supabase langsung */
    const loadPengumuman = async () => {
        isLoading.value = true;
        try {
            const { data, error } = await sb
                .from('pengumuman')
                .select('*')
                .eq('_deleted', false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            pengumumanList.value = data || [];
        } catch (err) {
            console.error('[Pengumuman] Gagal load:', err.message);
            pengumumanList.value = [];
        } finally {
            isLoading.value = false;
        }
    };

    /** Buka form tambah pengumuman baru */
    const openAddForm = () => {
        form._id = null;
        form.judul = '';
        form.isi = '';
        form.kategori = 'info';
        form.target = 'semua';
        form.created_at = null;
        showFormModal.value = true;
    };

    /** Buka form edit pengumuman */
    const openEditForm = (item) => {
        form._id = item._id;
        form.judul = item.judul;
        form.isi = item.isi;
        form.kategori = item.kategori || 'info';
        form.target = item.target || 'semua';
        form.created_at = item.created_at;
        showFormModal.value = true;
    };

    /** Simpan (create atau edit) pengumuman */
    const savePengumuman = async () => {
        if (!form.judul.trim() || !form.isi.trim()) {
            window.showAlert('Judul dan isi pengumuman tidak boleh kosong.', 'Peringatan', 'warning');
            return;
        }

        isLoading.value = true;
        try {
            const isEdit = !!form._id;
            const now = new Date().toISOString();

            const payload = {
                judul: form.judul.trim(),
                isi: form.isi.trim(),
                kategori: form.kategori,
                target: form.target,
                _deleted: false
            };

            if (isEdit) {
                // UPDATE
                const { error } = await sb
                    .from('pengumuman')
                    .update({ ...payload, updated_at: now })
                    .eq('_id', form._id);

                if (error) throw error;

                // Update notifications (v37: Upsert will update existing records by ID)
                await broadcastNotification(form._id, form.judul, form.isi, form.target, form.kategori);
                window.showAlert('Pengumuman berhasil diperbarui dan notifikasi telah diupdate.', 'Sukses', 'info');
            } else {
                // CREATE
                const newId = `ann_${Date.now()}_${Math.random().toString(36).slice(-4)}`;
                const { error } = await sb
                    .from('pengumuman')
                    .insert([{
                        _id: newId,
                        ...payload,
                        created_by: userSession.value?._id || 'admin',
                        created_at: now,
                        updated_at: now
                    }]);

                if (error) throw error;

                // Broadcast notifikasi ke semua user target
                await broadcastNotification(newId, form.judul, form.isi, form.target, form.kategori);
                window.showAlert('Pengumuman berhasil dipublish dan notifikasi telah dikirim.', 'Sukses', 'info');
            }

            showFormModal.value = false;
            await loadPengumuman();
        } catch (err) {
            console.error('[Pengumuman] Gagal simpan:', err.message);
            window.showAlert('Gagal menyimpan pengumuman: ' + err.message, 'Error', 'danger');
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Broadcast notifikasi pengumuman ke semua user sesuai target
     * @param {string} annId  - ID pengumuman
     * @param {string} judul  - judul pengumuman
     * @param {string} isi    - isi pengumuman (dipakai sebagai preview message)
     * @param {string} target - 'semua' | 'guru' | 'wali'
     * @param {string} kategori - 'info' | 'penting' | 'darurat'
     */
    const broadcastNotification = async (annId, judul, isi, target, kategori) => {
        try {
            // Query users sesuai target
            let query = sb.from('users').select('_id, role').eq('_deleted', false);

            if (target === 'guru') {
                query = query.eq('role', 'guru');
            } else if (target === 'wali') {
                query = query.eq('role', 'wali');
            } else {
                // semua: guru + wali + admin
                query = query.in('role', ['admin', 'guru', 'wali']);
            }

            const { data: users, error } = await query;
            if (error) throw error;
            if (!users || users.length === 0) return;

            // Map kategori → notif type
            const typeMap = { penting: 'warning', darurat: 'alert', info: 'info' };
            const notifType = typeMap[kategori] || 'info';

            // Preview isi (strip HTML tags correctly using DOM, max 100 char)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = isi;
            const plainText = tempDiv.textContent || tempDiv.innerText || "";
            const preview = plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '');

            // Insert notifikasi untuk tiap user
            const now = new Date().toISOString();
            const notifRows = users.map(u => ({
                _id: `notif_ann_${annId}_${u._id.slice(-6)}`,
                user_id: u._id,
                title: `📢 ${judul}`,
                message: preview,
                type: notifType,
                source_id: annId,
                santri_id: null,
                is_read: false,
                _deleted: false,
                created_at: now
            }));

            // Upsert in batches of 50
            for (let i = 0; i < notifRows.length; i += 50) {
                const batch = notifRows.slice(i, i + 50);
                const { error: insertErr } = await sb
                    .from('notifications')
                    .upsert(batch, { onConflict: '_id', ignoreDuplicates: false });

                if (insertErr) console.warn('[Pengumuman] Batch notif gagal:', insertErr.message);
            }

            console.log(`[Pengumuman] Notifikasi dikirim ke ${notifRows.length} user.`);
        } catch (err) {
            console.error('[Pengumuman] Broadcast gagal:', err.message);
        }
    };

    /** Hapus pengumuman (soft delete) */
    const deletePengumuman = async (id) => {
        window.showConfirm({
            title: 'Hapus Pengumuman',
            message: 'Hapus pengumuman ini? Notifikasi di lonceng user juga akan ditarik.',
            confirmText: 'Ya, Hapus',
            type: 'danger',
            onConfirm: async () => {
                try {
                    // 1. Soft delete pengumuman
                    const { error: annErr } = await sb
                        .from('pengumuman')
                        .update({ _deleted: true })
                        .eq('_id', id);
                    if (annErr) throw annErr;

                    // 2. Recall notifikasi terkait (v37)
                    const { error: notifErr } = await sb
                        .from('notifications')
                        .update({ _deleted: true })
                        .eq('source_id', id);
                    if (notifErr) console.warn('[Pengumuman] Gagal recall notif:', notifErr.message);

                    await loadPengumuman();
                    window.showAlert('Berhasil dihapus', 'Sukses', 'info');
                } catch (err) {
                    console.error('[Pengumuman] Gagal hapus:', err.message);
                    window.showAlert('Gagal menghapus: ' + err.message, 'Error', 'danger');
                }
            }
        });
    };

    /** Buka modal detail pengumuman */
    const openDetail = (item) => {
        detailItem.value = item;
        showDetailModal.value = true;
    };

    /** Pagination */
    const goToPage = (page) => {
        if (page < 1 || page > totalPages.value) return;
        currentPage.value = page;
    };

    // ===== HELPERS =====
    const kategoriLabel = (k) => ({ info: 'Info', penting: 'Penting', darurat: 'Darurat' }[k] || k);
    const targetLabel = (t) => ({ semua: 'Semua', guru: 'Guru', wali: 'Wali Santri' }[t] || t);

    const kategoriClass = (k) => ({
        info: 'bg-blue-100 text-blue-700',
        penting: 'bg-orange-100 text-orange-700',
        darurat: 'bg-red-100 text-red-700'
    }[k] || 'bg-slate-100 text-slate-600');

    const formatDate = window.formatDate || ((d) => d ? d.split('T')[0] : '-');

    return {
        // State
        pengumumanList,
        paginatedList,
        currentPage,
        totalPages,
        isLoading,
        showFormModal,
        showDetailModal,
        detailItem,
        form,
        PAGE_SIZE,
        // Methods
        loadPengumuman,
        openAddForm,
        openEditForm,
        savePengumuman,
        deletePengumuman,
        openDetail,
        goToPage,
        broadcastNotification,
        // Helpers
        kategoriLabel,
        targetLabel,
        kategoriClass,
        formatDate
    };
}
