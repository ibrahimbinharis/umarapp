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

function useDashboard(uiData, userSession, activeChildId, appConfig) {
    const { reactive, computed, ref, nextTick } = Vue;

    // --- STATE ---
    const dashboardStats = reactive({
        totalSantri: 0,
        totalPutra: 0,
        totalPutri: 0,
        totalSabaq: 0, // Keep in case needed for calculations, though not displayed
        totalManzil: 0,
        juzCompleted: 0, // New: for Admin Average or Wali Single
        juzRemaining: 30, // New
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
        topSantri: []
    });

    // ... (rest of code) ...



    const activityFilter = ref('all'); // all | setoran | ujian | pelanggaran
    const rawActivities = ref([]);

    // --- METHODS ---

    const getStudentStats = (santriId) => {
        // Use global santri list for leaderboard scoring across all roles
        const santris = uiData.all_santri || uiData.santri || [];
        const santri = santris.find(s => s.santri_id === santriId || s._id === santriId);
        if (!santri) return null;

        // Use global setoran list
        const allSetorans = uiData.all_setoran || uiData.setoran || [];
        const setorans = allSetorans.filter(s => s.santri_id === santri._id || s.santri_id === santri.santri_id);

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
        const santris = uiData.all_santri || uiData.santri || [];
        const s = santris.find(x => x._id === id || x.santri_id === id);
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

                const labelBase = s.category || s.setoran_type;
                const typeLabel = labelBase.includes('(Mandiri)') ? labelBase : (s.is_holiday ? `${labelBase} (Mandiri)` : labelBase);

                acts.push({
                    type: 'setoran',
                    date: s.created_at || s.setoran_date || new Date().toISOString(),
                    label: 'Setoran Hafalan',
                    desc: `${getSantriName(s.santri_id)} menyetor ${typeLabel} ${s.pages} Hal.`,
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

    const loadWeeklyActivity = (santriIds = null) => {
        const days = [];
        const sabaq = [];
        const manzil = [];
        let tSabaq = 0;
        let tManzil = 0;

        const dayNames = ['Ahad', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const now = new Date();

        // Calculate for the last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();

            days.push(dayNames[date.getDay()]);

            // Sum up pages for this specific day
            const dailySetoran = uiData.setoran.filter(s => {
                const sDate = new Date(s.setoran_date || s.created_at).toDateString();
                const isMatch = sDate === dateStr;
                if (!isMatch) return false;

                // If santriIds provided (Wali mode), filter by those IDs
                if (santriIds && !santriIds.includes(s.santri_id)) return false;

                return true;
            });

            const daySabaq = dailySetoran.filter(s => s.setoran_type === 'Sabaq').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);
            const dayManzil = dailySetoran.filter(s => s.setoran_type === 'Manzil').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);

            sabaq.push(daySabaq);
            manzil.push(dayManzil);
            tSabaq += daySabaq;
            tManzil += dayManzil;
        }

        dashboardStats.weeklyActivity = {
            labels: days,
            sabaq: sabaq,
            manzil: manzil,
            totalSabaq: Math.round(tSabaq * 10) / 10,
            totalManzil: Math.round(tManzil * 10) / 10
        };
    };

    // --- Top Santri Filter ---
    const topSantriFilter = ref('Semua'); // Semua | L | P

    const calculateStats = (overrideChildId = null) => {
        const santris = uiData.santri || [];
        const allSantris = uiData.all_santri || santris;

        // --- 1. Common Aggregations (Needed for Leaderboard & General Stats) ---
        let tSabaq = 0, tManzil = 0;
        let tPutra = 0, tPutri = 0;
        const leaderboard = []; // Temp array for global leaderboard

        // Prepare Data for Current Month Scoring (Global)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const isMatch = (dateStr) => {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        };

        const allSetoran = uiData.all_setoran || uiData.setoran || [];
        const allUjian = uiData.all_ujian || uiData.ujian || [];
        const allPelanggaran = uiData.all_pelanggaran || uiData.pelanggaran || [];

        const filteredSetoran = allSetoran.filter(d => isMatch(d.setoran_date));
        const filteredUjian = allUjian.filter(d => isMatch(d.date));
        const filteredPelanggaran = allPelanggaran.filter(d => isMatch(d.created_at));

        // Loop through ALL santri to build the leaderboard
        allSantris.forEach(s => {
            // Gender Count
            if (s.gender === 'L') tPutra++;
            else if (s.gender === 'P') tPutri++;

            // Global All Time Pages
            const st = getStudentStats(s._id);
            if (st) {
                tSabaq += st.sabaq;
                tManzil += st.manzil;
            }

            // Calculate Monthly Score for Leaderboard
            const defaultSettings = {
                weights: { sabaq: 50, manzil: 30, ujian: 20, tilawah: 0 },
                visibility: { sabaq: true, manzil: true, ujian: true, tilawah: false }
            };
            const storedSettings = (uiData.settings || []).find(x => x._id === 'rekap_config');
            const settings = storedSettings ? {
                weights: { ...defaultSettings.weights, ...(storedSettings.weights || {}) },
                visibility: { ...defaultSettings.visibility, ...(storedSettings.visibility || {}) }
            } : defaultSettings;

            const targetSabaq = parseInt(s.target_sabaq) || 20;
            let totalJuz = 0;
            if (s.hafalan_manual) {
                const match = s.hafalan_manual.match(/(\d+)/);
                if (match) totalJuz = parseInt(match[1]);
            }
            const manzilPct = parseInt(s.target_manzil_pct) || 20;
            let calcTargetManzil = (totalJuz * 20) * (manzilPct / 100);
            const targetManzil = Math.max(20, Math.round(calcTargetManzil));

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

            const myTilawah = filteredSetoran.filter(x => x.santri_id === s._id || x.santri_id === s.santri_id);
            const actualTilawah = myTilawah.filter(x => x.setoran_type === 'Tilawah').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);
            const targetTilawah = s.target_tilawah || 600;

            const myPelanggaran = filteredPelanggaran.filter(x => x.santri_id === s._id || x.santri_id === s.santri_id);
            const totalPointsPelanggaran = myPelanggaran.reduce((acc, curr) => acc + (parseInt(curr.points) || 0), 0);

            let scoreSabaqWeighted = 0;
            if (settings.visibility.sabaq) {
                const scoreSabaqRaw = targetSabaq > 0 ? (actualSabaq / targetSabaq) * 100 : 0;
                scoreSabaqWeighted = scoreSabaqRaw * (settings.weights.sabaq / 100);
            }

            let scoreManzilWeighted = 0;
            if (settings.visibility.manzil) {
                const scoreManzilRaw = targetManzil > 0 ? (actualManzil / targetManzil) * 100 : 0;
                scoreManzilWeighted = scoreManzilRaw * (settings.weights.manzil / 100);
            }

            let scoreUjianWeighted = 0;
            if (settings.visibility.ujian) {
                scoreUjianWeighted = avgUjian * (settings.weights.ujian / 100);
            }

            let scoreTilawahWeighted = 0;
            if (settings.visibility.tilawah) {
                const scoreTilawahRaw = (actualTilawah / targetTilawah) * 100;
                scoreTilawahWeighted = scoreTilawahRaw * (settings.weights.tilawah / 100);
            }

            let finalScore = scoreSabaqWeighted + scoreManzilWeighted + scoreUjianWeighted + scoreTilawahWeighted;
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

        // Update global counts
        dashboardStats.totalSantri = allSantris.length;
        dashboardStats.totalPutra = tPutra;
        dashboardStats.totalPutri = tPutri;
        dashboardStats.leaderboard = leaderboard;

        // --- 2. PERSONALIZED STATS (Wali & Santri) ---
        if (userSession.value && (userSession.value.role === 'wali' || userSession.value.role === 'santri')) {
            const targetId = userSession.value.role === 'santri'
                ? userSession.value.username
                : (overrideChildId || (activeChildId ? activeChildId.value : null) || userSession.value.child_id);

            let santri = santris.find(s => s._id === targetId || s.santri_id === targetId || s.nis === targetId);
            if (!santri && santris.length > 0) santri = santris[0];

            let completed = 0;
            if (santri && santri.hafalan_progress) {
                try {
                    const prog = typeof santri.hafalan_progress === 'string' ? JSON.parse(santri.hafalan_progress) : santri.hafalan_progress;
                    completed = Object.keys(prog).filter(k => prog[k]).length;
                } catch (e) { }
            }

            const st = santri ? getStudentStats(santri._id || santri.santri_id) : null;

            const mySetoran = uiData.setoran.filter(s => {
                const d = new Date(s.setoran_date || s.created_at);
                return (s.santri_id === santri?._id || s.santri_id === santri?.santri_id) &&
                    d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });

            const actualSabaq = mySetoran.filter(s => s.setoran_type === 'Sabaq').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);
            const actualManzil = mySetoran.filter(s => s.setoran_type === 'Manzil').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);

            const targetSabaq = parseInt(santri?.target_sabaq) || 20;
            const manzilPct = parseInt(santri?.target_manzil_pct) || 20;
            const targetManzil = Math.max(1, Math.round((completed * 20) * (manzilPct / 100)));

            dashboardStats.monthlyTarget = {
                sabaqCurrent: actualSabaq,
                sabaqTarget: targetSabaq,
                manzilCurrent: actualManzil,
                manzilTarget: targetManzil,
                diffLabel: actualSabaq >= targetSabaq ? 'Selesai' : `-${targetSabaq - actualSabaq} Hal`
            };

            const sabaqPct = st ? (st.sabaq / 604) * 100 : 0;
            const manzilPctTotal = st ? (st.manzil / 604) * 100 : 0;

            dashboardStats.juzCompleted = completed;
            dashboardStats.juzRemaining = 30 - completed;

            dashboardStats.waliData = {
                sabaqPercent: Math.min(100, sabaqPct),
                manzilPercent: Math.min(100, manzilPctTotal)
            };

            loadWeeklyActivity(santri ? [santri._id, santri.santri_id].filter(Boolean) : []);
        }
        // --- 3. ADMIN/GURU VIEW (Global Averages) ---
        else {
            dashboardStats.totalSabaq = parseFloat(tSabaq.toFixed(1));
            dashboardStats.totalManzil = parseFloat(tManzil.toFixed(1));

            if (allSantris.length > 0) {
                const totalCompleted = allSantris.reduce((sum, s) => {
                    let c = 0;
                    if (s.hafalan_progress) {
                        try {
                            const prog = typeof s.hafalan_progress === 'string' ? JSON.parse(s.hafalan_progress) : s.hafalan_progress;
                            c = Object.keys(prog).filter(k => prog[k]).length;
                        } catch (e) { }
                    }
                    return sum + c;
                }, 0);
                const avg = totalCompleted / allSantris.length;
                dashboardStats.juzCompleted = Math.round(avg * 10) / 10;
                dashboardStats.juzRemaining = Math.max(0, 30 - dashboardStats.juzCompleted);

                // Admin Monthly Target Averages
                let totalActualSabaq = 0, totalTargetSabaq = 0;
                let totalActualManzil = 0, totalTargetManzil = 0;

                allSantris.forEach(s => {
                    const mySetoran = filteredSetoran.filter(x => x.santri_id === s._id || x.santri_id === s.santri_id);
                    const actS = mySetoran.filter(x => x.setoran_type === 'Sabaq').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);
                    const actM = mySetoran.filter(x => x.setoran_type === 'Manzil').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);
                    const tS = parseInt(s.target_sabaq) || 20;

                    let c = 0;
                    if (s.hafalan_progress) {
                        try {
                            const prog = typeof s.hafalan_progress === 'string' ? JSON.parse(s.hafalan_progress) : s.hafalan_progress;
                            c = Object.keys(prog).filter(k => prog[k]).length;
                        } catch (e) { }
                    }
                    const mPct = parseInt(s.target_manzil_pct) || 20;
                    const tM = Math.max(1, Math.round((c * 20) * (mPct / 100)));

                    totalActualSabaq += actS; totalTargetSabaq += tS;
                    totalActualManzil += actM; totalTargetManzil += tM;
                });

                const avgActS = totalActualSabaq / allSantris.length;
                const avgTarS = totalTargetSabaq / allSantris.length;
                const avgActM = totalActualManzil / allSantris.length;
                const avgTarM = totalTargetManzil / allSantris.length;

                dashboardStats.monthlyTarget = {
                    sabaqCurrent: Math.round(avgActS * 10) / 10,
                    sabaqTarget: Math.round(avgTarS),
                    manzilCurrent: Math.round(avgActM * 10) / 10,
                    manzilTarget: Math.round(avgTarM),
                    diffLabel: `Avg: ${Math.round(avgActS)} Hal`
                };
            } else {
                dashboardStats.juzCompleted = 0;
                dashboardStats.juzRemaining = 30;
            }

            loadWeeklyActivity(); // Admin/Guru: Total all students
        }

        // Calculate Recent Activities
        loadRecentActivities();
    };

    // Computed: Filtered Top Santri
    const filteredTopSantri = computed(() => {
        if (!dashboardStats.leaderboard) return [];

        let items = dashboardStats.leaderboard;

        // --- GENDER FILTER LOGIC ---
        let currentFilter = topSantriFilter.value;

        // Special requirement: Santri role filter is forced to match their own gender
        if (userSession.value && userSession.value.role === 'santri') {
            currentFilter = userSession.value.gender || 'L';
        }

        // Filter Gender
        if (currentFilter !== 'Semua') {
            items = items.filter(s => s.gender === currentFilter);
        }

        // Sort Descending & Take Top 10 (Fix Array Mutation Bug)
        return [...items]
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
