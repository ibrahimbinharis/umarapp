/**
 * useNotifications Composable (v2.6)
 * 
 * Logic for:
 * 1. Real-time Notifications from Supabase (Remote Logic)
 * 2. Badge Management
 * 
 * FIXED:
 * - Guru tidak dapat notif: gunakan _id sebagai user identifier (sesuai skema DB)
 * - Status read reset: notif dikelola SEPENUHNYA via dbNotifications ref,
 *   tidak melalui localStorage/syncFromCloud
 * - Hapus riwayat tidak hapus notif: removeBySource langsung ke Supabase
 */

function useNotifications(uiData, userSession) {
    const { computed, ref, onMounted, onUnmounted, watch } = Vue;

    const dbNotifications = ref([]); // Source of truth untuk notif (BUKAN localStorage)
    let realtimeChannel = null;

    // Helper: dapatkan user ID berdasarkan field _id (primary key di database)
    const getCurrentUserId = () => {
        if (!userSession.value) return null;
        return userSession.value._id || null;
    };

    onMounted(() => {
        if (userSession.value) {
            fetchNotifications();
            subscribeRealtime();
        }
    });

    onUnmounted(() => {
        if (realtimeChannel) sb.removeChannel(realtimeChannel);
    });

    // Watch for login/logout to sub/unsub
    watch(userSession, (newVal) => {
        if (newVal) {
            fetchNotifications();
            subscribeRealtime();
        } else {
            dbNotifications.value = [];
            if (realtimeChannel) sb.removeChannel(realtimeChannel);
        }
    });

    // --- 1. FETCH (Source of Truth dari Supabase langsung) ---
    const fetchNotifications = async () => {
        const userId = getCurrentUserId();
        if (!userId) return;

        const { data, error } = await sb.from('notifications')
            .select('*')
            .eq('user_id', userId)
            .eq('_deleted', false)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('[Notifikasi] Fetch error:', error);
        } else {
            dbNotifications.value = data || [];
        }
    };

    const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');

    // --- 2. REALTIME SUBSCRIPTION ---
    const subscribeRealtime = () => {
        const userId = getCurrentUserId();
        if (!userId) return;

        // Pastikan tidak ada channel duplikat
        if (realtimeChannel) sb.removeChannel(realtimeChannel);

        // Initialize Push Service
        if (window.PushService) window.PushService.init();

        realtimeChannel = sb
            .channel(`notif-${userId}`) // Channel unik per user
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                console.log('[Notifikasi] Realtime:', payload.eventType, payload.new?._id);

                if (payload.eventType === 'INSERT') {
                    // Cek duplikat sebelum tambahkan
                    const exists = dbNotifications.value.some(n => n._id === payload.new._id);
                    if (!exists && !payload.new._deleted) {
                        dbNotifications.value.unshift(payload.new);
                        notificationSound.play().catch(e => console.warn('Autoplay blocked:', e));
                    }
                } else if (payload.eventType === 'UPDATE') {
                    if (payload.new._deleted) {
                        // Hapus dari list
                        dbNotifications.value = dbNotifications.value.filter(n => n._id !== payload.new._id);
                    } else {
                        // Update data di list (termasuk is_read)
                        const idx = dbNotifications.value.findIndex(n => n._id === payload.new._id);
                        if (idx !== -1) {
                            dbNotifications.value[idx] = { ...dbNotifications.value[idx], ...payload.new };
                        } else {
                            dbNotifications.value.unshift(payload.new);
                        }
                    }
                } else if (payload.eventType === 'DELETE') {
                    dbNotifications.value = dbNotifications.value.filter(n => n._id !== payload.old._id);
                }

                // Update Badge
                if (navigator.setAppBadge) {
                    navigator.setAppBadge(unreadCount.value).catch(() => { });
                }
            })
            .subscribe();
    };

    // --- 3. MARK AS READ (Langsung ke Supabase, bypass localStorage) ---
    const markAsRead = async (notifId) => {
        // Optimistic: update UI dulu
        const idx = dbNotifications.value.findIndex(n => n._id === notifId);
        if (idx !== -1) dbNotifications.value[idx] = { ...dbNotifications.value[idx], is_read: true };

        // Tulis ke Supabase langsung (tidak lewat DB queue agar tidak tertimpa sync)
        const { error } = await sb.from('notifications')
            .update({ is_read: true })
            .eq('_id', notifId);

        if (error) {
            console.error('[Notifikasi] Gagal markAsRead:', error);
            // Rollback
            if (idx !== -1) dbNotifications.value[idx] = { ...dbNotifications.value[idx], is_read: false };
        }
    };

    const markAllRead = async () => {
        const userId = getCurrentUserId();
        if (!userId) return;

        // Optimistic
        dbNotifications.value = dbNotifications.value.map(n => ({ ...n, is_read: true }));

        // Tulis ke Supabase langsung
        const { error } = await sb.from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('_deleted', false);

        if (error) {
            console.error('[Notifikasi] Gagal markAllRead:', error);
            await fetchNotifications(); // Refresh jika error
        }
    };

    // --- 4. REMOVE (Hapus dari UI dan Supabase) ---
    const removeNotifBySource = async (sourceId) => {
        if (!sourceId) return;
        const notifId = `notif_${sourceId}`;

        // Hapus dari UI optimistically
        dbNotifications.value = dbNotifications.value.filter(n =>
            n._id !== notifId && n.source_id !== sourceId
        );

        // Soft delete di Supabase langsung (tidak lewat DB queue)
        await sb.from('notifications')
            .update({ _deleted: true })
            .eq('_id', notifId);
    };

    const allNotifications = computed(() => dbNotifications.value);

    const unreadCount = computed(() =>
        dbNotifications.value.filter(n => !n.is_read).length
    );

    // --- 5. BADGE MANAGEMENT ---
    watch(unreadCount, (newCount) => {
        if (navigator.setAppBadge) {
            if (newCount > 0) {
                navigator.setAppBadge(newCount).catch(e => console.warn('Badge error:', e));
            } else {
                navigator.clearAppBadge().catch(e => console.warn('Badge clear error:', e));
            }
        }
    }, { immediate: true });

    return {
        dbNotifications,
        allNotifications,
        unreadCount,
        markAsRead,
        markAllRead,
        removeNotifBySource,
        refreshNotifications: fetchNotifications
    };
}

