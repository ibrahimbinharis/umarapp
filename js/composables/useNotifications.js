/**
 * useNotifications Composable (formerly useMonitoring)
 * 
 * Logic for:
 * 1. Monitoring santri setoran progress (Local Logic)
 * 2. Real-time Notifications from Supabase (Remote Logic)
 */

function useNotifications(uiData, userSession) {
    const { computed, ref, onMounted, onUnmounted, watch } = Vue;

    const dbNotifications = ref([]); // Notifications from DB
    let realtimeChannel = null;

    onMounted(() => {
        // Initial Fetch
        if (userSession.value) {
            fetchNotifications();
            subscribeRealtime();
        }
    });

    onUnmounted(() => {
        if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    });

    // Watch for login/logout to sub/unsub
    watch(userSession, (newVal) => {
        if (newVal) {
            fetchNotifications();
            subscribeRealtime();
        } else {
            dbNotifications.value = [];
            if (realtimeChannel) supabase.removeChannel(realtimeChannel);
        }
    });

    // --- 1. Realtime Notifications Logic ---

    const fetchNotifications = async () => {
        if (!userSession.value) return;

        // Fetch last 50 notifications for better history
        const { data, error } = await sb.from('notifications')
            .select('*')
            .eq('_deleted', false)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) console.error("Error fetching notifications:", error);
        else dbNotifications.value = data || [];
    };

    const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');

    const subscribeRealtime = () => {
        if (!userSession.value) return;

        // Initialize Push Service also
        if (window.PushService) window.PushService.init();

        // Subscribe to events on 'notifications' table for current user
        realtimeChannel = sb
            .channel('notifications-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userSession.value.id || userSession.value._id}`
            }, (payload) => {
                console.log("[Notifikasi] Realtime event:", payload.eventType);

                if (payload.eventType === 'INSERT') {
                    if (!payload.new._deleted) {
                        dbNotifications.value.unshift(payload.new);
                        // Play Sound
                        notificationSound.play().catch(e => console.warn("Autoplay blocked:", e));
                    }
                } else if (payload.eventType === 'UPDATE') {
                    if (payload.new._deleted) {
                        dbNotifications.value = dbNotifications.value.filter(n => n._id !== payload.new._id);
                    } else {
                        const idx = dbNotifications.value.findIndex(n => n._id === payload.new._id);
                        if (idx !== -1) {
                            dbNotifications.value[idx] = payload.new;
                        } else {
                            dbNotifications.value.unshift(payload.new);
                        }
                    }
                } else if (payload.eventType === 'DELETE') {
                    dbNotifications.value = dbNotifications.value.filter(n => n._id !== payload.old._id);
                }

                // Update Badge if supported
                if (navigator.setAppBadge) {
                    navigator.setAppBadge(unreadCount.value).catch(() => { });
                }
            })
            .subscribe();
    };

    const markAsRead = async (notifId) => {
        // Optimistic Update
        const idx = dbNotifications.value.findIndex(n => n._id === notifId);
        if (idx !== -1) dbNotifications.value[idx].is_read = true;

        await sb.from('notifications')
            .update({ is_read: true })
            .eq('_id', notifId);
    };

    const markAllRead = async () => {
        dbNotifications.value.forEach(n => n.is_read = true);
        await sb.from('notifications')
            .update({ is_read: true })
            .eq('user_id', userSession.value.id || userSession.value._id)
            .eq('_deleted', false);
    };

    const allNotifications = computed(() => {
        return dbNotifications.value;
    });

    const unreadCount = computed(() => {
        return dbNotifications.value.filter(n => !n.is_read).length;
    });

    // --- 2. BADGE MANAGEMENT (v36) ---
    watch(unreadCount, (newCount) => {
        if (navigator.setAppBadge) {
            if (newCount > 0) {
                navigator.setAppBadge(newCount).catch(e => console.warn("Badge error:", e));
            } else {
                navigator.clearAppBadge().catch(e => console.warn("Badge clear error:", e));
            }
        }
    }, { immediate: true });

    return {
        dbNotifications,
        allNotifications,
        unreadCount,
        markAsRead,
        markAllRead,
        refreshNotifications: fetchNotifications
    };
}
