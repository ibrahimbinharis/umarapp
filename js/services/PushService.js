/**
 * PushService.js
 * 
 * Mengelola pendaftaran Push Notification PWA (Web Push API).
 */

const PushService = {
    // Kunci Publik VAPID (Unik untuk Mahad Umar)
    VAPID_PUBLIC_KEY: 'BEgUHDlPB6vkIBT36OCvwZGY8YDCox-W82L-ESHfmGNjfthhahkdVBGNLHdPmhYB_wvjyS9WGezpKflqIDFek9Y',

    /**
     * Inisialisasi & Cek Izin
     */
    async init() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Browser tidak mendukung Push Notifications.');
            return;
        }

        // Cek jika user sudah login
        const session = JSON.parse(localStorage.getItem('tahfidz_session'));
        if (!session || !session._id) return;

        // Coba aktifkan
        try {
            const status = Notification.permission;
            if (status === 'granted') {
                this.subscribeUser(session._id);
            } else if (status !== 'denied') {
                // Tampilkan banner/prompt custom sebelum browser prompt (Best Practice)
                console.log('Push Notification belum diaktifkan.');
            }
        } catch (e) {
            console.error('Push Init Error:', e);
        }
    },

    /**
     * Minta Izin ke User
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
            console.error('Permission Error:', e);
            return false;
        }
    },

    /**
     * Daftarkan User ke Push Service (Google/Apple) dan simpan ke Supabase
     */
    async subscribeUser(userId) {
        try {
            const registration = await navigator.serviceWorker.ready;

            // Generate Subscription
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY)
            });

            console.log('[Push] User subscribed:', subscription);

            // Simpan ke Supabase (tabel push_subscriptions)
            const { error } = await sb.from('push_subscriptions').upsert({
                user_id: userId,
                subscription_json: subscription,
                device_info: navigator.userAgent
            }, { onConflict: 'user_id' });

            if (error) throw error;
            console.log('[Push] Subscription tersimpan di database.');

        } catch (e) {
            console.error('[Push] Gagal subscribe:', e);
        }
    },

    /**
     * Hapus Subscription (Logout)
     */
    async unsubscribeUser() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                console.log('[Push] User unsubscribed.');
            }
        } catch (e) {
            console.error('[Push] Gagal unsubscribe:', e);
        }
    },

    /**
     * Helper: Convert VAPID Key
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
