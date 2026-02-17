/**
 * useNotifications Composable (formerly useMonitoring)
 * 
 * Logic for:
 * 1. Monitoring santri setoran progress (Local Logic)
 * 2. Real-time Notifications from Supabase (Remote Logic)
 */

function useNotifications(uiData, userSession) {
    const { computed, ref, onMounted, onUnmounted, watch } = Vue;

    const currentTime = ref(new Date());
    const dbNotifications = ref([]); // Notifications from DB
    let timer = null;
    let realtimeChannel = null;

    // --- 1. Local Monitoring Logic (Legacy useMonitoring) ---

    onMounted(() => {
        timer = setInterval(() => {
            currentTime.value = new Date();
        }, 60000);

        // Initial Fetch
        if (userSession.value) {
            fetchNotifications();
            subscribeRealtime();
        }
    });

    onUnmounted(() => {
        if (timer) clearInterval(timer);
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

    const monitoringAlerts = computed(() => {
        const now = currentTime.value;
        const day = now.getDay(); // 0 = Sun, 5 = Fri
        const hour = now.getHours();

        // 1. Check Friday (Libur)
        if (day === 5) return [];

        const reports = [];
        const todayStr = window.DateUtils ? window.DateUtils.getTodayDateString() : new Date().toISOString().split('T')[0];

        // Access raw data
        const santriList = uiData.santri || [];
        const setoranList = uiData.setoran || [];
        const absensiList = uiData.absensi || [];

        // Filter targeted santri
        let targets = santriList;
        if (userSession.value && userSession.value.role === 'wali') {
            targets = targets.filter(s => s.parent_phone === userSession.value.username);
        }

        // Processing
        for (const s of targets) {
            // Check Absensi
            const abs = absensiList.find(a =>
                (a.santri_id === s.santri_id || a.santri_id === s._id) &&
                a.date === todayStr
            );

            if (abs && ['S', 'I', 'A'].includes(abs.status)) {
                continue;
            }

            // Check Setorans
            const setoransToday = setoranList.filter(r =>
                (r.santri_id === s.santri_id || r.santri_id === s._id) &&
                r.setoran_date === todayStr
            );

            const hasSabaq = setoransToday.some(r => r.setoran_type === 'Sabaq');

            // Rule A: Sabaq (> 10:00)
            if (hour >= 10 && !hasSabaq) {
                reports.push({
                    id: s._id + '_sabaq',
                    type: 'alert',
                    title: 'Peringatan Sabaq',
                    message: `${s.full_name} belum menyetorkan Sabaq`,
                    timestamp: now
                });
            }
        }
        return reports;
    });

    // --- 2. Realtime Notifications Logic ---

    const fetchNotifications = async () => {
        if (!userSession.value) return;

        // Fetch last 20 notifications
        const { data, error } = await sb.from('notifications')
            .select('*')
            .eq('_deleted', false)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) console.error("Error fetching notifications:", error);
        else dbNotifications.value = data || [];
    };

    const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');

    const subscribeRealtime = () => {
        if (!userSession.value) return;

        // Initialize Push Service also
        if (window.PushService) window.PushService.init();

        // Subscribe to ALL events on 'notifications' table
        realtimeChannel = sb
            .channel('notifications-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userSession.value.id || userSession.value._id}`
            }, (payload) => {
                console.log("[Notifikasi] Realtime event:", payload.eventType, payload);

                if (payload.eventType === 'INSERT') {
                    // Only add if not deleted and matches current filters
                    if (!payload.new._deleted) {
                        dbNotifications.value.unshift(payload.new);
                        // --- PLAY SOUND (v36) ---
                        notificationSound.play().catch(e => console.warn("Autoplay blocked:", e));

                        // --- UPDATE BADGE (v36) ---
                        if (navigator.setAppBadge) {
                            navigator.setAppBadge(unreadCount.value);
                        }
                    }
                } else if (payload.eventType === 'UPDATE') {
                    if (payload.new._deleted) {
                        // Soft delete: remove from list
                        dbNotifications.value = dbNotifications.value.filter(n => n._id !== payload.new._id);
                    } else {
                        // Update existing
                        const idx = dbNotifications.value.findIndex(n => n._id === payload.new._id);
                        if (idx !== -1) {
                            dbNotifications.value[idx] = payload.new;
                        } else {
                            // If it was hidden (e.g. was deleted) and now un-deleted
                            dbNotifications.value.unshift(payload.new);
                        }

                        // Update Badge
                        if (navigator.setAppBadge) {
                            navigator.setAppBadge(unreadCount.value);
                        }
                    }
                } else if (payload.eventType === 'DELETE') {
                    // Hard delete
                    dbNotifications.value = dbNotifications.value.filter(n => n._id !== payload.old._id);
                    // Update Badge
                    if (navigator.setAppBadge) {
                        navigator.setAppBadge(unreadCount.value);
                    }
                }

                // Refresh full list from cloud occasionally to be safe
                fetchNotifications();
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
            .eq('_deleted', false); // Only mark active ones
    };

    const allNotifications = computed(() => {
        // Merge Local Alerts (Priority) + DB Notifications
        // Add 'is_read: false' to alerts for UI consistency
        const alerts = monitoringAlerts.value.map(a => ({ ...a, is_read: false }));
        return [...alerts, ...dbNotifications.value];
    });

    const unreadCount = computed(() => {
        const dbUnread = dbNotifications.value.filter(n => !n.is_read).length;
        // Alerts are always considered "unread" until resolved (disappear from list)
        return monitoringAlerts.value.length + dbUnread;
    });

    // --- 3. BADGE MANAGEMENT (v36) ---
    // Reactive watcher for App Badge (Icon Number)
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
        currentTime,
        monitoringAlerts,
        dbNotifications,
        allNotifications, // Exposed for UI
        unreadCount,
        markAsRead,
        markAllRead,
        refreshNotifications: fetchNotifications
    };
}
