/**
 * NotificationService.js
 * 
 * Layanan terpusat untuk menangani notifikasi sistem.
 * - Membuat notifikasi di tabel 'notifications' Supabase.
 * - Menangani pembersihan otomatis (retensi 3 bulan).
 */

const NotificationService = {

    /**
     * Metode umum untuk membuat/update notifikasi via DB Engine
     * @param {Object} payload { id, userId, title, message, type, relatedId }
     */
    async create({ id, userId, title, message, type, relatedId = null }) {
        if (!userId) return;

        const notifId = `notif_${id}`; // Gunakan prefix agar tidak bentrok ID dengan source record
        const payload = {
            _id: notifId,
            user_id: userId,
            title,
            message,
            type,
            santri_id: relatedId,
            source_id: id,
            is_read: false,
            _deleted: false
        };

        // Cek apakah sudah ada di cache lokal menggunakan ID ber-prefix
        const existing = DB.getAll().find(item => item._id === notifId && item.__type === 'notifications');

        try {
            if (existing) {
                console.log(`[Notifikasi] Updating existing: ${notifId}`);
                // Safely update without overwriting is_read status (don't force false)
                const { is_read, ...updatePayload } = payload;
                await DB.update(notifId, updatePayload);
            } else {
                console.log(`[Notifikasi] Creating new: ${notifId}`);
                await DB.create('notifications', payload);
            }
        } catch (err) {
            console.error("[Notifikasi] DB Error:", err);
        }
    },

    /**
     * Tarik kembali notifikasi menggunakan standar DB.delete (Soft Delete)
     * @param {string} sourceId - ID dari record asal
     */
    async removeBySource(sourceId) {
        if (!sourceId) return;
        try {
            const notifId = `notif_${sourceId}`;
            // Kita hapus menggunakan DB engine agar status _deleted=true tersinkron otomatis
            await DB.delete(notifId);
            console.log(`[Notifikasi] Berhasil ditarik via DB engine: ${notifId}`);
        } catch (err) {
            console.warn("[Notifikasi] Gagal tarik:", err.message);
        }
    },

    /**
     * Beri tahu Wali saat Santri menyelesaikan Setoran
     */
    async notifySetoran(santri, type, pages, sourceId) {
        let waliId = santri.wali_id;
        if (!waliId) {
            const { data } = await sb.from('santri').select('wali_id').eq('_id', santri._id).maybeSingle();
            if (data) waliId = data.wali_id;
        }
        if (!waliId) return;

        // --- ROLE VALIDATION (v36) ---
        // Ensure recipient is actually a Wali to prevent Guru receiving activity alerts
        const { data: user } = await sb.from('users').select('role').eq('_id', waliId).maybeSingle();
        if (!user || user.role !== 'wali') {
            console.warn(`[Notifikasi] Skip activity notif: User ${waliId} is not a Wali.`);
            return;
        }

        await this.create({
            id: sourceId,
            userId: waliId,
            title: `Setoran ${type} Diterima`,
            message: `Alhamdulillah, Ananda ${santri.full_name} telah menyelesaikan setoran ${type} sebanyak ${pages} halaman.`,
            type: 'success',
            relatedId: santri._id
        });
    },

    /**
     * Beri tahu Wali saat Santri menyelesaikan Ujian
     */
    async notifyUjian(santri, examType, score, sourceId) {
        let waliId = santri.wali_id;
        if (!waliId) {
            const { data } = await sb.from('santri').select('wali_id').eq('_id', santri._id).maybeSingle();
            if (data) waliId = data.wali_id;
        }
        if (!waliId) return;

        // --- ROLE VALIDATION (v36) ---
        const { data: user } = await sb.from('users').select('role').eq('_id', waliId).maybeSingle();
        if (!user || user.role !== 'wali') return;

        const type = score >= 70 ? 'info' : 'warning';
        await this.create({
            id: sourceId,
            userId: waliId,
            title: `Hasil Ujian ${examType}`,
            message: `Ananda ${santri.full_name} telah menyelesaikan ujian dengan nilai: ${score}.`,
            type,
            relatedId: santri._id
        });
    },

    /**
     * Beri tahu Wali tentang Pelanggaran
     */
    async notifyPelanggaran(santri, pelanggaranName, points, sourceId) {
        let waliId = santri.wali_id;
        if (!waliId) {
            const { data } = await sb.from('santri').select('wali_id').eq('_id', santri._id).maybeSingle();
            if (data && data.wali_id) waliId = data.wali_id;
        }
        if (!waliId) return;

        // --- ROLE VALIDATION (v36) ---
        const { data: user } = await sb.from('users').select('role').eq('_id', waliId).maybeSingle();
        if (!user || user.role !== 'wali') return;

        await this.create({
            id: sourceId,
            userId: waliId,
            title: `Laporan Pelanggaran`,
            message: `Mohon perhatian, tercatat pelanggaran: ${pelanggaranName} (${points} Poin) untuk Ananda ${santri.full_name}.`,
            type: 'alert',
            relatedId: santri._id
        });
    },

    /**
     * Pembersihan Otomatis: Hapus notifikasi yang lebih lama dari 3 bulan (90 hari)
     * Disarankan dijalankan sekali saat Dashboard Admin dimuat
     */
    async cleanupOldNotifications() {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        try {
            const { error, count } = await sb.from('notifications')
                .delete({ count: 'exact' })
                .lt('created_at', ninetyDaysAgo.toISOString());

            if (error) throw error;
            if (count > 0) console.log(`[Notifikasi] Membersihkan ${count} notifikasi lama.`);
        } catch (err) {
            console.error("[Notifikasi] Pembersihan gagal:", err);
        }
    }
};

// Ekspos secara global
window.NotificationService = NotificationService;
