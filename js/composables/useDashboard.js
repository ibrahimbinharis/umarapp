/**
 * useDashboard Composable
 * 
 * Manages Dashboard statistics and visualizations
 * - Aggregates total santri, sabaq, manzil
 * - Renders Charts (Hafalan Progress & Activity Trend)
 * - Generates Top Santri Leaderboard
 * 
 * Dependencies: uiData, userSession, useAnalytics
 */

function useDashboard(uiData, userSession, activeChildId, appConfig) {
    const { reactive, computed, ref, nextTick } = Vue;

    // Initialize Shared Analytics
    const analytics = useAnalytics(uiData, userSession);

    // --- STATE ---
    const dashboardStats = reactive({
        totalSantri: 0,
        totalPutra: 0,
        totalPutri: 0,
        totalSabaq: 0,
        totalManzil: 0,
        juzCompleted: 0,
        juzRemaining: 30,
        monthlyTarget: {
            sabaqCurrent: 0,
            sabaqTarget: 20,
            manzilCurrent: 0,
            manzilTarget: 10,
            diffLabel: '0 Hal'
        },
        weeklyActivity: {
            labels: [],
            sabaq: [],
            manzil: [],
            totalSabaq: 0,
            totalManzil: 0
        },
        waliData: null,
        leaderboard: []
    });

    const activityFilter = ref('all'); // all | setoran | ujian | pelanggaran
    const rawActivities = ref([]);

    // --- METHODS ---

    const getSantriName = (id) => {
        const santris = uiData.all_santri || uiData.santri || [];
        const s = santris.find(x => x._id === id || x.santri_id === id);
        return s ? s.full_name : 'Santri';
    };

    const loadRecentActivities = () => {
        let acts = [];
        const santriExists = (id) => (uiData.all_santri || uiData.santri).some(x => x._id === id || x.santri_id === id);

        // Setoran
        (uiData.setoran || []).forEach(s => {
            if (!santriExists(s.santri_id)) return;
            const labelBase = s.category || s.setoran_type;
            const typeLabel = labelBase.includes('(Mandiri)') ? labelBase : (s.is_holiday ? `${labelBase} (Mandiri)` : labelBase);
            acts.push({
                type: 'setoran',
                date: s.created_at || s.setoran_date || new Date().toISOString(),
                desc: `${getSantriName(s.santri_id)} menyetor ${typeLabel} ${s.pages} Hal.`,
            });
        });

        // Ujian
        (uiData.ujian || []).forEach(u => {
            if (!santriExists(u.santri_id)) return;
            acts.push({
                type: 'ujian',
                date: u.created_at || new Date().toISOString(),
                desc: `${getSantriName(u.santri_id)} menyelesaikan Ujian ${u.b_mapel || u.s_mapel || 'Hafalan'}.`,
            });
        });

        // Pelanggaran
        (uiData.pelanggaran || []).forEach(p => {
            if (!santriExists(p.santri_id)) return;
            acts.push({
                type: 'pelanggaran',
                date: p.created_at || new Date().toISOString(),
                desc: `${getSantriName(p.santri_id)} melakukan pelanggaran.`,
            });
        });

        acts.sort((a, b) => new Date(b.date) - new Date(a.date));
        rawActivities.value = acts.slice(0, 10);
    };

    const calculateStats = (overrideChildId = null) => {
        const allSantris = uiData.all_santri || uiData.santri || [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Prepare context for Analytics
        const isThisMonth = (d) => {
            const date = new Date(d);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        };

        const context = {
            setoran: (uiData.all_setoran || uiData.setoran || []).filter(d => isThisMonth(d.setoran_date || d.created_at)),
            ujian: (uiData.all_ujian || uiData.ujian || []).filter(d => isThisMonth(d.date || d.created_at)),
            pelanggaran: (uiData.all_pelanggaran || uiData.pelanggaran || []).filter(d => isThisMonth(d.date || d.created_at))
        };

        const settings = analytics.getScoringSettings();
        const leaderboard = [];
        let totalSabaqAllTime = 0, totalManzilAllTime = 0;
        let tPutra = 0, tPutri = 0;

        // 1. Process All Santri (Leaderboard & Global Stats)
        allSantris.forEach(s => {
            if (s.gender === 'L') tPutra++; else if (s.gender === 'P') tPutri++;

            // Calculate Performance using Shared Logic
            const perf = analytics.calculateStudentPerformance(s, context, settings);
            leaderboard.push(perf);

            // All time pages (Helper for Admin stats)
            const allSetoran = uiData.all_setoran || uiData.setoran || [];
            const myAllSetoran = allSetoran.filter(x => x.santri_id === s._id || x.santri_id === s.santri_id);
            totalSabaqAllTime += myAllSetoran.filter(x => x.setoran_type === 'Sabaq' || x.setoran_type === 'Sabqi').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);
            totalManzilAllTime += myAllSetoran.filter(x => x.setoran_type === 'Manzil').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);
        });

        dashboardStats.totalSantri = allSantris.length;
        dashboardStats.totalPutra = tPutra;
        dashboardStats.totalPutri = tPutri;
        dashboardStats.leaderboard = leaderboard;

        // 2. Personalized View (Wali/Santri) or Global Avg (Admin)
        const isPersonal = userSession.value && (userSession.value.role === 'wali' || userSession.value.role === 'santri');

        if (isPersonal) {
            const targetId = userSession.value.role === 'santri'
                ? userSession.value.username
                : (overrideChildId || activeChildId.value || userSession.value.child_id);

            let santri = allSantris.find(s => s._id === targetId || s.santri_id === targetId || s.nis === targetId);
            if (!santri && allSantris.length > 0) santri = allSantris[0];

            if (santri) {
                const perf = analytics.calculateStudentPerformance(santri, context, settings);
                dashboardStats.juzCompleted = perf.juzCompleted;
                dashboardStats.juzRemaining = 30 - perf.juzCompleted;
                dashboardStats.monthlyTarget = {
                    sabaqCurrent: perf.sabaq.actual,
                    sabaqTarget: perf.sabaq.target,
                    manzilCurrent: perf.manzil.actual,
                    manzilTarget: perf.manzil.target,
                    diffLabel: perf.sabaq.actual >= perf.sabaq.target ? 'Selesai' : `-${perf.sabaq.target - perf.sabaq.actual} Hal`
                };

                const trend = analytics.getTrendData(uiData.setoran || [], 7, [santri._id, santri.santri_id]);
                dashboardStats.weeklyActivity = trend;
            }
        } else {
            // Admin/Guru: Average
            dashboardStats.totalSabaq = parseFloat(totalSabaqAllTime.toFixed(1));
            dashboardStats.totalManzil = parseFloat(totalManzilAllTime.toFixed(1));

            if (allSantris.length > 0) {
                const avgJuz = leaderboard.reduce((sum, p) => sum + p.juzCompleted, 0) / allSantris.length;
                dashboardStats.juzCompleted = Math.round(avgJuz * 10) / 10;
                dashboardStats.juzRemaining = Math.max(0, 30 - dashboardStats.juzCompleted);

                const avgActS = leaderboard.reduce((sum, p) => sum + p.sabaq.actual, 0) / allSantris.length;
                const avgTarS = leaderboard.reduce((sum, p) => sum + p.sabaq.target, 0) / allSantris.length;
                const avgActM = leaderboard.reduce((sum, p) => sum + p.manzil.actual, 0) / allSantris.length;
                const avgTarM = leaderboard.reduce((sum, p) => sum + p.manzil.target, 0) / allSantris.length;

                dashboardStats.monthlyTarget = {
                    sabaqCurrent: Math.round(avgActS * 10) / 10,
                    sabaqTarget: Math.round(avgTarS),
                    manzilCurrent: Math.round(avgActM * 10) / 10,
                    manzilTarget: Math.round(avgTarM),
                    diffLabel: `Avg: ${Math.round(avgActS)} Hal`
                };
            }

            const trend = analytics.getTrendData(uiData.setoran || [], 7);
            dashboardStats.weeklyActivity = trend;
        }

        loadRecentActivities();
    };

    const topSantriFilter = ref('Semua');

    const filteredTopSantri = computed(() => {
        let items = dashboardStats.leaderboard || [];
        let currentFilter = topSantriFilter.value;

        if (userSession.value?.role === 'santri') {
            currentFilter = userSession.value.gender || 'L';
        }

        if (currentFilter !== 'Semua') {
            items = items.filter(s => s.gender === currentFilter);
        }

        return [...items].sort((a, b) => b.total - a.total).slice(0, 10);
    });

    const filteredActivities = computed(() => {
        if (activityFilter.value === 'all') return rawActivities.value;
        if (activityFilter.value === 'today') {
            const todayStr = new Date().toDateString();
            return rawActivities.value.filter(a => new Date(a.date).toDateString() === todayStr);
        }
        return rawActivities.value.filter(a => a.type === activityFilter.value);
    });

    return {
        dashboardStats,
        calculateStats,
        initCharts: () => { }, // Handled by DashboardView
        activityFilter,
        filteredActivities,
        topSantriFilter,
        filteredTopSantri
    };
}
