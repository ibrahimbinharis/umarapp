/**
 * useDashboard Composable
 * 
 * Manages Dashboard statistics and visualizations
 * - Aggregates total santri, sabaq, manzil
 * - Renders Charts (Hafalan Progress & Activity Trend)
 * - Generates Top Santri Leaderboard
 * 
 * Dependencies: uiData (from parent), userSession
 */

function useDashboard(uiData, userSession) {
    const { reactive, computed, ref, nextTick } = Vue;

    // --- STATE ---
    const dashboardStats = reactive({
        totalSantri: 0,
        totalPutra: 0,
        totalPutri: 0,
        totalSabaq: 0, // Keep in case needed for calculations, though not displayed
        totalManzil: 0,
        waliData: null,
        topSantri: []
    });

    // ... (rest of code) ...



    const activityFilter = ref('all'); // all | setoran | ujian | pelanggaran
    const rawActivities = ref([]);

    // --- METHODS ---

    const getStudentStats = (santriId) => {
        // Find santri
        const santri = uiData.santri.find(s => s.santri_id === santriId || s._id === santriId);
        if (!santri) return null;

        // MATCHING: Try both s._id (UUID) and s.santri_id (NIS)
        const setorans = uiData.setoran.filter(s => s.santri_id === santri._id || s.santri_id === santri.santri_id);

        // Cals Sabaq (Total Pages)
        const sabaqPages = setorans
            .filter(s => s.setoran_type === 'Sabaq' || s.setoran_type === 'Sabqi')
            .reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);

        // Calc Manzil (Total Pages)
        const manzilPages = setorans
            .filter(s => s.setoran_type === 'Manzil')
            .reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);

        return {
            sabaq: sabaqPages,
            manzil: manzilPages
        };
    };

    const getSantriName = (id) => {
        const s = uiData.santri.find(x => x._id === id || x.santri_id === id);
        return s ? s.full_name : 'Santri';
    };

    const loadRecentActivities = () => {
        let acts = [];

        // Helper to check if santri exists
        const santriExists = (id) => uiData.santri.some(x => x._id === id || x.santri_id === id);

        // Setoran
        if (uiData.setoran) {
            uiData.setoran.forEach(s => {
                if (!santriExists(s.santri_id)) return; // Filter Orphan
                acts.push({
                    type: 'setoran',
                    date: s.created_at || s.setoran_date || new Date().toISOString(),
                    label: 'Setoran Hafalan',
                    desc: `${getSantriName(s.santri_id)} menyetor ${s.setoran_type} ${s.pages} Hal.`,
                    icon: 'menu_book',
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50'
                });
            });
        }

        // Ujian
        if (uiData.ujian) {
            uiData.ujian.forEach(u => {
                if (!santriExists(u.santri_id)) return; // Filter Orphan
                acts.push({
                    type: 'ujian',
                    date: u.created_at || new Date().toISOString(),
                    label: 'Ujian Selesai',
                    desc: `${getSantriName(u.santri_id)} menyelesaikan Ujian ${u.b_mapel || u.s_mapel || 'Hafalan'}.`,
                    icon: 'assignment_turned_in',
                    color: 'text-blue-600',
                    bg: 'bg-blue-50'
                });
            });
        }

        // Pelanggaran
        if (uiData.pelanggaran) {
            uiData.pelanggaran.forEach(p => {
                if (!santriExists(p.santri_id)) return; // Filter Orphan
                acts.push({
                    type: 'pelanggaran',
                    date: p.created_at || new Date().toISOString(),
                    label: 'Pelanggaran',
                    desc: `${getSantriName(p.santri_id)} melakukan pelanggaran.`,
                    icon: 'warning',
                    color: 'text-red-600',
                    bg: 'bg-red-50'
                });
            });
        }

        // Sort by Date Desc
        acts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Take top 10
        rawActivities.value = acts.slice(0, 10);
    };

    // --- Top Santri Filter ---
    const topSantriFilter = ref('Semua'); // Semua | L | P

    const calculateStats = () => {
        const santris = uiData.santri || [];
        dashboardStats.totalSantri = santris.length;

        // 1. Wali View
        if (userSession.value && userSession.value.role === 'wali') {
            const childId = userSession.value.child_id;
            const st = getStudentStats(childId);
            const sabaqPct = st ? (st.sabaq / 604) * 100 : 0;
            const manzilPct = st ? (st.manzil / 604) * 100 : 0;

            dashboardStats.waliData = {
                sabaqPercent: Math.min(100, sabaqPct),
                manzilPercent: Math.min(100, manzilPct)
            };
        }
        // 2. Admin/Guru View
        else {
            let tSabaq = 0, tManzil = 0;
            let tPutra = 0, tPutri = 0;
            const leaderboard = []; // Temp array

            // Prepare Data for Current Month Scoring
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // Helper to check Date Match
            const isMatch = (dateStr) => {
                if (!dateStr) return false;
                const d = new Date(dateStr);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            };

            const allSetoran = uiData.setoran || [];
            const allUjian = uiData.ujian || [];
            const allPelanggaran = uiData.pelanggaran || [];

            const filteredSetoran = allSetoran.filter(d => isMatch(d.setoran_date));
            const filteredUjian = allUjian.filter(d => isMatch(d.date));
            const filteredPelanggaran = allPelanggaran.filter(d => isMatch(d.created_at));

            santris.forEach(s => {
                // Gender Count
                if (s.gender === 'L') tPutra++;
                else if (s.gender === 'P') tPutri++;

                // Global All Time Pages
                const st = getStudentStats(s._id);
                if (st) {
                    tSabaq += st.sabaq;
                    tManzil += st.manzil;
                }

                // --- Calculate Monthly Score for Leaderboard ---
                const targetSabaq = parseInt(s.target_sabaq) || 20;
                let totalJuz = 0;
                if (s.hafalan_manual) {
                    const match = s.hafalan_manual.match(/(\d+)/);
                    if (match) totalJuz = parseInt(match[1]);
                }
                const manzilPct = parseInt(s.target_manzil_pct) || 20;
                let calcTargetManzil = (totalJuz * 20) * (manzilPct / 100);
                const targetManzil = Math.max(20, Math.round(calcTargetManzil));

                // Actuals
                const mySetoran = filteredSetoran.filter(x => x.santri_id === s._id || x.santri_id === s.santri_id);
                const actualSabaq = mySetoran.filter(x => x.setoran_type === 'Sabaq').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);
                const actualManzil = mySetoran.filter(x => x.setoran_type === 'Manzil').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);

                const myUjian = filteredUjian.filter(x =>
                    (x.santri_id === s._id || x.santri_id === s.santri_id) &&
                    (x.type === 'Ujian Al-Quran' || x.type === 'Ujian Pelajaran')
                );

                let avgUjian = 0;
                if (myUjian.length > 0) {
                    const totalScore = myUjian.reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0);
                    avgUjian = totalScore / myUjian.length;
                }

                const myPelanggaran = filteredPelanggaran.filter(x => x.santri_id === s._id || x.santri_id === s.santri_id);
                const totalPointsPelanggaran = myPelanggaran.reduce((acc, curr) => acc + (parseInt(curr.points) || 0), 0);

                // Formula
                const scoreSabaqRaw = targetSabaq > 0 ? (actualSabaq / targetSabaq) * 100 : 0;
                const scoreSabaqWeighted = scoreSabaqRaw * 0.5;

                const scoreManzilRaw = targetManzil > 0 ? (actualManzil / targetManzil) * 100 : 0;
                const scoreManzilWeighted = scoreManzilRaw * 0.3;

                const scoreUjianWeighted = avgUjian * 0.2;

                let finalScore = scoreSabaqWeighted + scoreManzilWeighted + scoreUjianWeighted;
                finalScore -= totalPointsPelanggaran;
                finalScore = Math.round(finalScore * 10) / 10;

                leaderboard.push({
                    name: s.full_name,
                    class: s.kelas,
                    total: finalScore,
                    gender: s.gender,
                    sabaq: actualSabaq,
                    manzil: actualManzil
                });
            });

            dashboardStats.totalSabaq = parseFloat(tSabaq.toFixed(1));
            dashboardStats.totalManzil = parseFloat(tManzil.toFixed(1));

            dashboardStats.totalPutra = tPutra;
            dashboardStats.totalPutri = tPutri;

            // Store FULL Leaderboard (unsorted/unfiltered) to allow dynamic filtering
            dashboardStats.leaderboard = leaderboard;
        }

        // Calculate Recent Activities
        loadRecentActivities();
    };

    // Computed: Filtered Top Santri
    const filteredTopSantri = computed(() => {
        if (!dashboardStats.leaderboard) return [];

        let items = dashboardStats.leaderboard;

        // Filter Gender
        if (topSantriFilter.value !== 'Semua') {
            items = items.filter(s => s.gender === topSantriFilter.value);
        }

        // Sort Descending & Take Top 10
        return items
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
    });

    const filteredActivities = computed(() => {
        if (activityFilter.value === 'all') return rawActivities.value;

        if (activityFilter.value === 'today') {
            const todayStr = new Date().toDateString();
            return rawActivities.value.filter(a => new Date(a.date).toDateString() === todayStr);
        }

        return rawActivities.value.filter(a => a.type === activityFilter.value);
    });

    const initCharts = () => {
        // No-op
    };

    return {
        dashboardStats,
        calculateStats,
        initCharts,
        activityFilter,
        filteredActivities,
        topSantriFilter,
        filteredTopSantri
    };
}
