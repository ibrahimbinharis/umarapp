/**
 * NotificationService.js
 * 
 * Layanan terpusat untuk menangani notifikasi sistem.
 * - Membuat notifikasi di tabel 'notifications' Supabase.
 * - Menangani pembersihan otomatis (retensi 3 bulan).
 */

const NotificationService = {

    /**
     * Helper to get global app configuration from allData
     */
    getConfig() {
        const raw = (window.allData || []).find(s => s._id === 'app_config') || {};
        return {
            enabled: raw.notifications?.enabled !== false,
            targets: raw.notifications?.targets || ['admin', 'guru', 'wali']
        };
    },

    /**
     * Metode umum untuk membuat/update notifikasi via DB Engine
     * @param {Object} payload { id, userId, title, message, type, relatedId, role }
     */
    async create({ id, userId, title, message, type, relatedId = null, role = null }) {
        if (!userId) return;

        // Check Global Toggle & Target roles
        const config = this.getConfig();
        if (!config.enabled) return;
        if (role && !config.targets.includes(role)) return;

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
            // 1. Soft delete di Supabase berdasarkan source_id (v37)
            // Ini akan menarik SEMUA notifikasi terkait (Wali, Guru, Admin) sekaligus
            const { error } = await sb.from('notifications')
                .update({ _deleted: true })
                .eq('source_id', sourceId);

            if (error) {
                console.warn('[Notifikasi] Supabase recall gagal:', error.message);
                // Fallback: coba via local DB untuk ID utama
                await DB.delete(`notif_${sourceId}`);
            } else {
                console.log(`[Notifikasi] Berhasil recall semua notif untuk source: ${sourceId}`);

                // 2. Update local cache (v37 logic)
                // Filter dan update semua notif yang memiliki source_id yang sama
                let localUpdatesCount = 0;
                allData.forEach(d => {
                    if (d.__type === 'notifications' && d.source_id === sourceId) {
                        d._deleted = true;
                        localUpdatesCount++;
                    }
                });

                if (localUpdatesCount > 0) {
                    DB.saveAll(allData);
                }
            }
        } catch (err) {
            console.warn('[Notifikasi] Gagal tarik:', err.message);
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

        // --- ROLE VALIDATION (v37) ---
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
            relatedId: santri._id,
            role: 'wali'
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

        // --- ROLE VALIDATION (v37) ---
        const { data: user } = await sb.from('users').select('role').eq('_id', waliId).maybeSingle();
        if (!user || user.role !== 'wali') return;

        const type = score >= 70 ? 'info' : 'warning';
        await this.create({
            id: sourceId,
            userId: waliId,
            title: `Hasil Ujian ${examType}`,
            message: `Ananda ${santri.full_name} telah menyelesaikan ujian dengan nilai: ${score}.`,
            type,
            relatedId: santri._id,
            role: 'wali'
        });
    },

    /**
     * Beri tahu Wali tentang Pelanggaran
     */
    async notifyPelanggaran(santri, pelanggaranName, points, sourceId) {
        // --- 1. NOTIFY WALI ---
        let waliId = santri.wali_id;
        if (!waliId) {
            const { data } = await sb.from('santri').select('wali_id').eq('_id', santri._id).maybeSingle();
            if (data && data.wali_id) waliId = data.wali_id;
        }

        if (waliId) {
            const { data: user } = await sb.from('users').select('role').eq('_id', waliId).maybeSingle();
            if (user && user.role === 'wali') {
                await this.create({
                    id: sourceId,
                    userId: waliId,
                    title: `Laporan Pelanggaran`,
                    message: `Mohon perhatian, tercatat pelanggaran: ${pelanggaranName} (${points} Poin) untuk Ananda ${santri.full_name}.`,
                    type: 'alert',
                    relatedId: santri._id,
                    role: 'wali'
                });
            }
        }

        // --- 2. NOTIFY ADMINS (v37) ---
        const { data: adminAndGurus } = await sb.from('users')
            .select('_id, role, gender')
            .in('role', ['admin', 'guru'])
            .eq('_deleted', false);

        if (adminAndGurus) {
            for (const user of adminAndGurus) {
                // Admin gets everything
                // Guru only gets their gender (L guru for L santri, etc)
                const isRelevantGuru = user.role === 'guru' && (!user.gender || user.gender === '' || user.gender === santri.gender);
                const isAdmin = user.role === 'admin';

                if (isAdmin || isRelevantGuru) {
                    await this.create({
                        id: `${sourceId}_${user.role.slice(0, 3)}`,
                        userId: user._id,
                        title: `📌 Pelanggaran: ${santri.full_name}`,
                        message: `${santri.full_name} (${santri.santri_id || 'Santri'}) melanggar: ${pelanggaranName} (${points} Poin).`,
                        type: 'alert',
                        relatedId: santri._id,
                        role: user.role
                    });
                }
            }
        }
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
