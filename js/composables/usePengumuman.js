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
    const searchQuery = ref('');
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
        created_at: null,
        file_url: null,      // Link file/foto dari Supabase
        file_name: null,     // Nama asli file
        file_type: null      // Jenis file (image/pdf/dll)
    });

    const fileUpload = reactive({
        file: null,
        preview: null,
        isUploading: false,
        isInlineUploading: false,
        error: null
    });

    // ===== COMPUTED =====
    const filteredList = computed(() => {
        const role = userSession.value?.role;
        let list = pengumumanList.value;

        // Filter by role
        if (role && role !== 'admin') {
            list = list.filter(item =>
                item.target === 'semua' || item.target === role
            );
        }

        // Filter by search query
        if (searchQuery.value.trim()) {
            const query = searchQuery.value.toLowerCase();
            list = list.filter(item =>
                item.judul.toLowerCase().includes(query) ||
                item.isi.toLowerCase().includes(query)
            );
        }

        return list;
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
        form.file_url = null;
        form.file_name = null;
        form.file_type = null;

        fileUpload.file = null;
        fileUpload.preview = null;
        fileUpload.isUploading = false;
        fileUpload.isInlineUploading = false;
        fileUpload.error = null;

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
        form.file_url = item.file_url || null;
        form.file_name = item.file_name || null;
        form.file_type = item.file_type || null;

        fileUpload.file = null;
        fileUpload.preview = item.file_url || null; // Jika ada URL, tampilkan sebagai preview
        fileUpload.isUploading = false;
        fileUpload.isInlineUploading = false;
        fileUpload.error = null;

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
                _deleted: false,
                file_url: form.file_url || null,
                file_name: form.file_name || null,
                file_type: form.file_type || null
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
            fileUpload.file = null;
            fileUpload.preview = null;

            // Reset form file data
            form.file_url = null;
            form.file_name = null;
            form.file_type = null;

            await loadPengumuman();
        } catch (err) {
            console.error('[Pengumuman] Gagal simpan:', err.message);
            window.showAlert('Gagal menyimpan pengumuman: ' + err.message, 'Error', 'danger');
        } finally {
            isLoading.value = false;
        }
    };

    /** Fungsi handling file selection dari UI */
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validasi ukuran (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            window.showAlert('Ukuran file terlalu besar (Maksimal 10MB)', 'Peringatan', 'warning');
            return;
        }

        fileUpload.file = file;
        fileUpload.isUploading = true;
        fileUpload.error = null;

        // Buat preview lokal jika itu gambar
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => fileUpload.preview = e.target.result;
            reader.readAsDataURL(file);
        } else {
            fileUpload.preview = null; // Bukan gambar, tidak ada preview
        }

        // Langsung upload ke Supabase Storage
        uploadFileToStorage(file);
    };

    /** Upload file ke Supabase Storage Bucket 'announcements' */
    const uploadFileToStorage = async (file) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(-4)}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            // 1. Upload ke Storage
            const { data, error } = await sb.storage
                .from('announcements')
                .upload(filePath, file);

            if (error) throw error;

            // 2. Dapatkan Public URL (Karena bucket public)
            const { data: { publicUrl } } = sb.storage
                .from('announcements')
                .getPublicUrl(filePath);

            // 3. Simpan link ke form state
            form.file_url = publicUrl;
            form.file_name = file.name;
            form.file_type = file.type;

            console.log('[Pengumuman] File terunggah:', publicUrl);
        } catch (err) {
            console.error('[Pengumuman] Gagal upload file:', err.message);
            fileUpload.error = "Gagal upload: " + err.message;
            window.showAlert('Gagal mengunggah file ke storage', 'Error', 'danger');
        } finally {
            fileUpload.isUploading = false;
        }
    };

    /** Upload gambar untuk disematkan di dalam teks pengumuman */
    const uploadInlineImage = async ({ file, callback }) => {
        fileUpload.isInlineUploading = true;
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `inline_${Date.now()}_${Math.random().toString(36).slice(-4)}.${fileExt}`;
            const filePath = `inline/${fileName}`;

            const { data, error } = await sb.storage
                .from('announcements')
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = sb.storage
                .from('announcements')
                .getPublicUrl(filePath);

            // Jalankan callback untuk memasukkan URL ke editor
            if (callback) callback(publicUrl);

            console.log('[Pengumuman] Inline image terunggah:', publicUrl);
        } catch (err) {
            console.error('[Pengumuman] Gagal upload inline image:', err.message);
            window.showAlert('Gagal mengunggah gambar ke dalam teks', 'Error', 'danger');
        } finally {
            fileUpload.isInlineUploading = false;
        }
    };

    const removeFile = () => {
        // Hapus file dari storage jika ada (Opsional, tapi bagus untuk hemat kuota)
        if (form.file_url) {
            deleteFileFromStorage(form.file_url);
        }
        form.file_url = null;
        form.file_name = null;
        form.file_type = null;
        fileUpload.file = null;
        fileUpload.preview = null;
    };

    /** Fungsi pembantu untuk menghapus file dari storage berdasarkan URL */
    const deleteFileFromStorage = async (url) => {
        try {
            if (!url || !url.includes('/storage/v1/object/public/announcements/')) return;
            const path = url.split('/announcements/')[1];
            if (path) {
                await sb.storage.from('announcements').remove([path]);
                console.log('[Pengumuman] File dihapus dari storage:', path);
            }
        } catch (err) {
            console.warn('[Pengumuman] Gagal hapus file dari storage:', err.message);
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
                _id: `notif_ann_${annId}_${u._id.slice(-6)}_${Math.random().toString(36).slice(-2)}`, // Lebih unik
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
                    // Cari item untuk hapus file storage jika ada
                    const item = pengumumanList.value.find(p => p._id === id);
                    if (item && item.file_url) {
                        await deleteFileFromStorage(item.file_url);
                    }
                    
                    // Cek juga isi pengumuman untuk mencari inline images (Opsional: Butuh regex rumit)
                    // Untuk saat ini hapus lampiran utama saja.

                    // 1. Soft delete pengumuman (atau hard delete jika ingin benar-benar bersih)
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

    const formatDate = (d) => {
        if (window.formatDateLong) return window.formatDateLong(d);
        return d ? d.split('T')[0] : '-';
    };

    return {
        // State
        pengumumanList,
        searchQuery,
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
        formatDate,
        // File Upload
        fileUpload,
        handleFileChange,
        removeFile,
        uploadInlineImage
    };
}
