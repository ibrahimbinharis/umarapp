/**
 * PushService.js (v2)
 *
 * Mengelola pendaftaran Push Notification PWA (Web Push API).
 *
 * PERUBAHAN v2:
 * - Auto-request izin notifikasi saat init() jika belum pernah diminta
 * - Tampilkan banner custom sebelum browser prompt (best practice)
 * - Simpan device subscription per perangkat (bukan per user saja)
 */

const PushService = {
    // Kunci Publik VAPID (Unik untuk Mahad Umar)
    VAPID_PUBLIC_KEY: 'BEgUHDlPB6vkIBT36OCvwZGY8YDCox-W82L-ESHfmGNjfthhahkdVBGNLHdPmhYB_wvjyS9WGezpKflqIDFek9Y',

    /**
     * Inisialisasi & Cek Izin
     * Otomatis meminta izin jika belum pernah diminta sebelumnya.
     */
    async init() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || window.location.protocol === 'file:') {
            console.warn('[Push] Push Notifications tidak didukung atau tidak diizinkan di protokol "file:".');
            return;
        }

        // Cek jika user sudah login
        const session = JSON.parse(localStorage.getItem('tahfidz_session'));
        if (!session || !session._id) return;

        try {
            const status = Notification.permission;

            if (status === 'granted') {
                // Izin sudah ada -> langsung subscribe (refresh token jika perlu)
                console.log('[Push] Izin sudah diberikan, memperbarui subscription...');
                await this.subscribeUser(session._id);

            } else if (status === 'denied') {
                // User sudah tolak -> jangan minta lagi (browser akan blokir)
                console.warn('[Push] Notifikasi diblokir oleh user. Tidak bisa auto-request.');

            } else {
                // 'default' -> Belum pernah diminta
                // Cek apakah sudah pernah tampil banner di sesi ini
                const alreadyPrompted = sessionStorage.getItem('push_banner_shown');
                if (alreadyPrompted) return;

                // Tampilkan banner custom (non-blocking, 3 detik setelah login)
                setTimeout(() => this._showPermissionBanner(session._id), 3000);
            }
        } catch (e) {
            console.error('[Push] Init Error:', e);
        }
    },

    /**
     * Tampilkan banner UI yang mengajak user mengaktifkan notifikasi.
     * Lebih ramah daripada langsung menampilkan prompt browser.
     */
    _showPermissionBanner(userId) {
        // Jangan tampil dua kali
        if (document.getElementById('push-permission-banner')) return;
        sessionStorage.setItem('push_banner_shown', '1');

        const banner = document.createElement('div');
        banner.id = 'push-permission-banner';
        banner.style.cssText = `
            position: fixed; bottom: 80px; left: 12px; right: 12px;
            background: #1E3A5F; color: white;
            padding: 14px 16px; border-radius: 16px;
            font-family: sans-serif; font-size: 13px; font-weight: 600;
            display: flex; align-items: center; justify-content: space-between; gap: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.25);
            z-index: 99999;
        `;

        banner.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;flex:1">
                <span style="font-size:22px">&#128276;</span>
                <span>Aktifkan notifikasi untuk mendapatkan update real-time</span>
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0">
                <button id="push-banner-deny" style="background:rgba(255,255,255,0.1);border:none;color:white;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600">Nanti</button>
                <button id="push-banner-allow" style="background:#3B82F6;border:none;color:white;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">Aktifkan</button>
            </div>
        `;

        document.body.appendChild(banner);

        // Tombol "Aktifkan" -> tampilkan browser prompt
        document.getElementById('push-banner-allow').addEventListener('click', async () => {
            banner.remove();
            const ok = await this.requestPermission();
            if (ok) {
                const toast = document.createElement('div');
                toast.textContent = 'Notifikasi berhasil diaktifkan!';
                toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#10B981;color:white;padding:10px 20px;border-radius:12px;font-size:13px;font-weight:700;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.2);white-space:nowrap';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            }
        });

        // Tombol "Nanti" -> tutup banner
        document.getElementById('push-banner-deny').addEventListener('click', () => {
            banner.remove();
        });

        // Auto-close setelah 10 detik
        setTimeout(() => {
            const b = document.getElementById('push-permission-banner');
            if (b) {
                b.style.transition = 'opacity 0.5s';
                b.style.opacity = '0';
                setTimeout(() => b.remove(), 500);
            }
        }, 10000);
    },

    /**
     * Minta Izin ke User (dipanggil dari banner atau ProfileView)
     */
    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const session = JSON.parse(localStorage.getItem('tahfidz_session'));
                if (session && session._id) {
                    await this.subscribeUser(session._id);
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error('[Push] Permission Error:', e);
            return false;
        }
    },

    /**
     * Daftarkan perangkat ini ke Push Service dan simpan ke Supabase.
     * Menggunakan device-specific ID agar satu user bisa multi-device.
     */
    async subscribeUser(userId) {
        try {
            const registration = await navigator.serviceWorker.ready;

            // Cek jika sudah ada subscription aktif di browser ini
            let subscription = await registration.pushManager.getSubscription();

            // Jika belum ada, buat baru
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY)
                });
                console.log('[Push] Subscription baru dibuat.');
            } else {
                console.log('[Push] Subscription existing ditemukan, memperbarui...');
            }

            // Buat device ID unik berdasarkan endpoint URL
            const endpointHash = subscription.endpoint.split('/').pop().slice(-16);
            const deviceId = userId + '_' + endpointHash;

            // Simpan ke Supabase (upsert per device ID)
            const { error } = await sb.from('push_subscriptions').upsert({
                _id: deviceId,
                user_id: userId,
                subscription_json: subscription.toJSON(),
                device_info: navigator.userAgent.substring(0, 200),
                updated_at: new Date().toISOString()
            }, { onConflict: '_id' });

            if (error) throw error;
            console.log('[Push] Subscription berhasil disimpan. Device:', deviceId);

        } catch (e) {
            console.error('[Push] Gagal subscribe:', e);
        }
    },

    /**
     * Hapus Subscription (dipanggil saat Logout)
     */
    async unsubscribeUser(userId) {
        if (!userId) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
                // 1. Hitung device ID yang sesuai untuk dihapus dari DB
                const endpointHash = subscription.endpoint.split('/').pop().slice(-16);
                const deviceId = userId + '_' + endpointHash;

                console.log('[Push] Menghapus subscription dari DB:', deviceId);
                
                // 2. Hapus record dari database Supabase (PENTING!)
                const { error } = await sb.from('push_subscriptions').delete().eq('_id', deviceId);
                if (error) console.warn('[Push] Gagal hapus record DB:', error.message);

                // 3. Unsubscribe browser (opsional, tapi disarankan agar token benar-benar mati)
                await subscription.unsubscribe();
                console.log('[Push] Unsubscribe browser berhasil.');
            }
        } catch (e) {
            console.error('[Push] Gagal proses unsubscribe:', e);
        }
    },

    /**
     * Helper: Convert VAPID Key dari base64url ke Uint8Array
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
};

// Ekspos secara global
window.PushService = PushService;
