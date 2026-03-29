/**
 * useAnalytics Composable
 * 
 * Shared logic for scoring, stats, and trends across Dashboard and Rekap.
 * Centralizes the complex calculation logic to ensure consistency.
 */

function useAnalytics(uiData, userSession) {
    const { ref, reactive, computed } = Vue;

    // --- SHARED SETTINGS ---
    const defaultScoringSettings = {
        weights: { sabaq: 50, manzil: 30, ujian: 20, tilawah: 0 },
        visibility: { sabaq: true, manzil: true, ujian: true, tilawah: false },
        raportMetadata: {
            institution: "Madrasah Tahfidz Al-Quran",
            address: "Jl. Pendidikan No. 123, Kota Muslim",
            report_title: "LAPORAN HASIL BELAJAR (RAPORT) SANTRI",
            logo_url: "", // New field for institution logo
            logo_size: 18, // Default 18mm
            logo_y: 10, // Default 10mm from top
            semester: "Ganjil",
            tahun_ajaran: "2023/2024",
            signature_place: "Jakarta",
            signature_name_left: "Dr. H. Ahmad Furqon, M.Pd",
            signature_label_left: "Kepala Madrasah",
            signature_label_right: "Musyrif / Wali Kelas"
        }
    };

    const getScoringSettings = () => {
        const stored = (uiData.settings || []).find(s => s._id === 'rekap_config');
        if (stored) {
            return {
                weights: { ...defaultScoringSettings.weights, ...(stored.weights || {}) },
                visibility: { ...defaultScoringSettings.visibility, ...(stored.visibility || {}) },
                raportMetadata: { ...defaultScoringSettings.raportMetadata, ...(stored.raportMetadata || {}) }
            };
        }
        return JSON.parse(JSON.stringify(defaultScoringSettings));
    };

    // --- CORE CALCULATION ENGINE ---

    /**
     * Calculate performance for a single student based on provided data context.
     * This is the "Source of Truth" for scoring.
     */
    const calculateStudentPerformance = (santri, contextData, settings = null) => {
        if (!settings) settings = getScoringSettings();
        const { weights, visibility } = settings;

        const { setoran, ujian, pelanggaran } = contextData;

        // 1. Target Sabaq
        const targetSabaq = parseInt(santri.target_sabaq) || 20;

        // 2. Target Manzil
        let totalJuz = 0;
        if (santri.hafalan_manual) {
            const match = santri.hafalan_manual.match(/(\d+)/);
            if (match) totalJuz = parseInt(match[1]);
        }

        // v36 logic: If hafalan_progress is object, count keys
        if (santri.hafalan_progress && typeof santri.hafalan_progress === 'object') {
            const keys = Object.keys(santri.hafalan_progress).filter(k => santri.hafalan_progress[k]);
            if (keys.length > totalJuz) totalJuz = keys.length;
        }

        const manzilPct = parseInt(santri.target_manzil_pct) || 20;
        const calcTargetManzil = (totalJuz * 20) * (manzilPct / 100);
        const targetManzil = Math.max(20, Math.round(calcTargetManzil));

        // 3. Actual Sabaq & Manzil
        const mySetoran = setoran.filter(x => x.santri_id === santri._id || x.santri_id === santri.santri_id || x.santri_id === santri.nis);
        const actualSabaq = mySetoran.filter(x => x.setoran_type === 'Sabaq' || x.setoran_type === 'Sabqi').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);
        const actualManzil = mySetoran.filter(x => x.setoran_type === 'Manzil').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);

        // 4. Actual Ujian
        const myUjian = ujian.filter(x => x.santri_id === santri._id || x.santri_id === santri.santri_id || x.santri_id === santri.nis);
        let avgUjian = 0;
        if (myUjian.length > 0) {
            const examRecs = myUjian.filter(u => u.type === 'Ujian Al-Quran' || u.type === 'Ujian Pelajaran');
            if (examRecs.length > 0) {
                const totalScore = examRecs.reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0);
                avgUjian = totalScore / examRecs.length;
            }
        }

        // 5. Actual Tilawah
        const actualTilawah = mySetoran.filter(x => x.setoran_type === 'Tilawah').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);
        const targetTilawah = parseInt(santri.target_tilawah) || 600;

        // 6. Pelanggaran Points
        const myPelanggaran = pelanggaran.filter(x => x.santri_id === santri._id || x.santri_id === santri.santri_id || x.santri_id === santri.nis);
        const totalPointsPelanggaran = myPelanggaran.reduce((acc, curr) => acc + (parseInt(curr.points) || 0), 0);

        // --- Weighted Scoring ---
        let scoreSabaqWeighted = visibility.sabaq && targetSabaq > 0 ? (actualSabaq / targetSabaq) * 100 * (weights.sabaq / 100) : 0;
        let scoreManzilWeighted = visibility.manzil && targetManzil > 0 ? (actualManzil / targetManzil) * 100 * (weights.manzil / 100) : 0;
        let scoreUjianWeighted = visibility.ujian ? avgUjian * (weights.ujian / 100) : 0;
        let scoreTilawahWeighted = visibility.tilawah && targetTilawah > 0 ? (actualTilawah / targetTilawah) * 100 * (weights.tilawah / 100) : 0;

        let finalScore = scoreSabaqWeighted + scoreManzilWeighted + scoreUjianWeighted + scoreTilawahWeighted;
        finalScore -= totalPointsPelanggaran;
        finalScore = Math.round(finalScore * 10) / 10;

        // Predikat
        let predikat = 'C';
        if (finalScore >= 95) predikat = 'A+';
        else if (finalScore >= 85) predikat = 'A';
        else if (finalScore >= 75) predikat = 'B+';
        else if (finalScore >= 65) predikat = 'B';
        else if (finalScore >= 60) predikat = 'B-';

        return {
            santri_id: santri.santri_id || santri._id,
            name: santri.full_name,
            class: santri.kelas || santri.class_id,
            gender: santri.gender,

            sabaq: { actual: actualSabaq, target: targetSabaq, weighted: scoreSabaqWeighted },
            manzil: { actual: actualManzil, target: targetManzil, weighted: scoreManzilWeighted },
            ujian: { avg: avgUjian, weighted: scoreUjianWeighted },
            tilawah: { actual: actualTilawah, target: targetTilawah, weighted: scoreTilawahWeighted },
            pelanggaran: { points: totalPointsPelanggaran },

            total: finalScore,
            nilai_akhir: finalScore,
            predikat: predikat,
            juzCompleted: totalJuz,
            hafalan_progress: santri.hafalan_progress || {}
        };
    };

    /**
     * Get trend data for charts (Weekly or Monthly)
     * Supports: sabaq, manzil, tilawah (outputs in Juz), and ujian.
     */
    const getTrendData = (setoranList, daysCount = 7, filteredSantriIds = null, ujianList = [], allSantriCount = 1, endDate = null) => {
        const labels = [];
        const sabaq = [];
        const manzil = [];
        const tilawah = [];
        const ujian = [];

        const dayNames = ['Ahad', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const now = endDate ? new Date(endDate) : new Date();
        const isGlobalAvg = !filteredSantriIds && allSantriCount > 1;
        const divisor = isGlobalAvg ? allSantriCount : 1;

        // Optimized Helper for O(1) lookup
        const idSet = filteredSantriIds ? new Set(filteredSantriIds.map(id => String(id).toLowerCase())) : null;

        // --- PRE-GROUPING (The Performance Key) ---
        // Group data by date FIRST, so we don't loop it again for every day
        const setoranByDate = new Map();
        const ujianByDate = new Map();

        const toYMD = (d) => {
            if (!d) return null;
            const date = (d instanceof Date) ? d : new Date(d);
            if (isNaN(date.getTime())) return null;
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        // One pass through setoranList
        (setoranList || []).forEach(s => {
            // Check ID filter (Skip if not match)
            if (idSet) {
                const recUid = String(s.santri_id || s.santri_nis || s.nis || '').toLowerCase();
                if (!idSet.has(recUid)) return;
            }

            const ymd = toYMD(s.setoran_date || s.created_at);
            if (!ymd) return;

            if (!setoranByDate.has(ymd)) setoranByDate.set(ymd, []);
            setoranByDate.get(ymd).push(s);
        });

        // One pass through ujianList
        (ujianList || []).forEach(u => {
            if (idSet) {
                const recUid = String(u.santri_id || u.nis || '').toLowerCase();
                if (!idSet.has(recUid)) return;
            }

            const ymd = toYMD(u.date || u.created_at);
            if (!ymd) return;

            if (!ujianByDate.has(ymd)) ujianByDate.set(ymd, []);
            ujianByDate.get(ymd).push(u);
        });

        // --- CALCULATION (O(daysCount)) ---
        for (let i = daysCount - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateYMD = toYMD(date);

            labels.push(dayNames[date.getDay()]);

            const dailySetoran = setoranByDate.get(dateYMD) || [];
            const dailyUjian = ujianByDate.get(dateYMD) || [];

            const daySabaq = dailySetoran.filter(s => s.setoran_type === 'Sabaq' || s.setoran_type === 'Sabqi').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);
            const dayManzil = dailySetoran.filter(s => s.setoran_type === 'Manzil').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);
            const dayTilawah = dailySetoran.filter(s => s.setoran_type === 'Tilawah').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);

            const dayUjianSum = dailyUjian.reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0);
            const dayUjianCount = dailyUjian.length;

            sabaq.push(parseFloat((daySabaq / divisor).toFixed(1)));
            manzil.push(parseFloat((dayManzil / divisor).toFixed(1)));
            tilawah.push(parseFloat((dayTilawah / 20 / divisor).toFixed(1)));
            ujian.push(dayUjianCount > 0 ? parseFloat((dayUjianSum / dayUjianCount).toFixed(1)) : 0);
        }

        return { 
            labels, 
            sabaq, 
            manzil, 
            tilawah, 
            ujian,
            totalSabaq: parseFloat(sabaq.reduce((a, b) => a + b, 0).toFixed(1)),
            totalManzil: parseFloat(manzil.reduce((a, b) => a + b, 0).toFixed(1)),
            totalTilawah: parseFloat(tilawah.reduce((a, b) => a + b, 0).toFixed(1)),
            avgUjian: (() => {
                const nonZero = ujian.filter(v => v > 0);
                if (nonZero.length === 0) return 0;
                return parseFloat((nonZero.reduce((a, b) => a + b, 0) / nonZero.length).toFixed(1));
            })()
        };
    };

    /**
     * Calculate Month-over-Month Comparison
     */
    const calculateComparison = (current, previous) => {
        if (!previous || previous === 0) return { diff: 0, percent: 0, status: 'stable' };
        const diff = current - previous;
        const percent = (diff / previous) * 100;
        return {
            diff: Math.round(diff * 10) / 10,
            percent: Math.round(percent * 10) / 10,
            status: diff > 0 ? 'up' : (diff < 0 ? 'down' : 'stable')
        };
    };

    return {
        getScoringSettings,
        calculateStudentPerformance,
        getTrendData,
        calculateComparison
    };
}
