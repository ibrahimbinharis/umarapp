/**
 * useUjian Composable
 * 
 * Manages Ujian (Exam) state and operations
 * - Bulanan (Monthly) & Semester Exams
 * - Quran & Mapel types
 * - Scoring & Grading logic
 * 
 * Dependencies: DB, uiData, userSession
 */

function useUjian(uiData, DB, userSession, refreshData, quranControls = null, currentViewRef = null, modalState = null) {
    const { reactive, computed, watch } = Vue;

    // ===== STATE =====
    const ujianForm = reactive({
        // Tabs
        tab: 'bulanan', // bulanan | semester

        // Common Fields
        santri_id: '',
        date: window.DateUtils.getTodayDateString(),
        notes: '',

        // Bulanan Fields
        b_type: 'quran', // quran | mapel
        b_soal: 5,
        b_salah: 0,
        b_score: 100,
        b_mapel: 'Fiqih',

        // Semester Fields
        s_type: 'quran', // quran | mapel
        s_juz: null,
        s_salah: 0,
        s_score: 100,
        s_grade: null, // A+, A, B+, B, B-, C
        s_score_manual: 100,
        s_mapel: 'Fiqih'
    });

    const ujianModalState = reactive({
        isOpen: false,
        title: ''
    });

    // ===== COMPUTED =====
    /**
     * Get recent exams based on active tab
     */
    const filteredUjian = computed(() => {
        if (!uiData.ujian || !uiData.ujian.length) return [];

        const isSemester = ujianForm.tab === 'semester';

        // Filter based on active tab type
        let list = uiData.ujian.filter(u => {
            const typeLower = (u.type || '').toLowerCase();
            const isTypeMatch = isSemester ? typeLower.includes('semester') : !typeLower.includes('semester');

            if (!isTypeMatch) return false;

            // Filter out orphan data (Santri deleted)
            if (u.santri_id) {
                const exists = uiData.santri.some(s => s._id === u.santri_id || s.santri_id === u.santri_id);
                if (!exists) return false;
            }

            return true;
        });

        // Sort Newest First
        list.sort((a, b) => {
            const dateA = new Date((a.date || '2000-01-01') + 'T' + (a.time || '00:00'));
            const dateB = new Date((b.date || '2000-01-01') + 'T' + (b.time || '00:00'));
            return dateB - dateA;
        });

        return list.slice(0, 20); // Limit 20
    });

    const selectedSantriProgress = computed(() => {
        if (!ujianForm.santri_id) return {};
        const s = uiData.santri.find(x => x.santri_id === ujianForm.santri_id);
        if (!s || !s.hafalan_progress) return {};
        // Parse if string
        try {
            return typeof s.hafalan_progress === 'string' ? JSON.parse(s.hafalan_progress) : s.hafalan_progress;
        } catch (e) { return {}; }
    });

    /**
     * Get Bulanan Stats for Selected Santri
     */
    const selectedSantriBulananStats = computed(() => {
        if (!ujianForm.santri_id) return null;

        // Use reactive uiData to ensure updates (e.g. target change) reflect immediately
        const s = uiData.santri.find(x => x.santri_id === ujianForm.santri_id);
        if (!s) return null;

        const history = uiData.setoran.filter(d => d.santri_id === ujianForm.santri_id);

        const now = new Date();
        const monthly = history.filter(d => {
            const date = new Date(d.setoran_date);
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });

        const sabaqCurrent = monthly
            .filter(d => d.setoran_type === 'Sabaq')
            .reduce((sum, d) => sum + (parseFloat(d.pages) || 0), 0);

        const targetSabaq = parseInt(s.target_sabaq) || 20;

        return {
            sabaq: {
                current: parseFloat(sabaqCurrent.toFixed(1)),
                target: targetSabaq,
                percent: Math.min(100, (sabaqCurrent / targetSabaq) * 100)
            }
        };
    });

    // ===== METHODS =====

    /**
     * Determine Letter Grade from Score
     * Consolidated logic for both Semester and Manual input
     */
    const getSemesterGrade = (score) => {
        const s = parseFloat(score) || 0;
        if (s >= 95) return 'A+';
        if (s >= 85) return 'A';
        if (s >= 75) return 'B+';
        if (s >= 65) return 'B';
        if (s >= 60) return 'B-';
        return 'C';
    };

    /**
     * Calculate Score for Ujian Bulanan
     * Logic: (TotalPoints - Salah) / TotalPoints * 100
     */
    const calcBulananScore = () => {
        // User Formula: ((Jumlah soal x 10) - Kesalahan) / (jumlah soal x 10) * 100
        const soal = parseInt(ujianForm.b_soal) || 5;
        const salah = parseInt(ujianForm.b_salah) || 0;

        if (soal <= 0) {
            ujianForm.b_score = 0;
            return;
        }

        const totalPoints = soal * 10;
        // Ensure accurate calculation
        let s = ((totalPoints - salah) / totalPoints) * 100;

        s = Math.max(0, Math.min(100, s));
        ujianForm.b_score = Math.round(s * 10) / 10; // 1 decimal place
    };

    const calcSemesterScore = () => {
        // User Formula: 100 - Kesalahan
        const salah = parseInt(ujianForm.s_salah) || 0;

        // Base score 100 per Juz
        let s = 100 - salah;

        ujianForm.s_score = Math.max(0, s);
        // Sync Manual Score & Grade
        ujianForm.s_score_manual = ujianForm.s_score;
        ujianForm.s_grade = getSemesterGrade(ujianForm.s_score);
    };

    /**
     * Handle Juz Selection for Semester Exam
     */
    const selectUjianJuz = (juz, navigateToQuran = false, navControls = quranControls, viewRef = currentViewRef) => {
        if (!ujianForm.santri_id) {
            alert("Pilih Santri dahulu!");
            return;
        }

        ujianForm.s_juz = juz;

        // Reset score for this new entry
        ujianForm.s_salah = 0;
        calcSemesterScore();

        if (navigateToQuran && juz && navControls && viewRef) {
            // Handle both object and function for backward compatibility
            if (typeof navControls === 'function') {
                navControls(juz);
            } else if (navControls.goToJuz) {
                navControls.goToJuz(juz);
            }
            viewRef.value = 'quran';
            // Use closure modalState if available
            if (modalState) modalState.isOpen = false;
        }
    };

    /**
     * Start Bulanan Exam (Navigate to first sabaq of month)
     */
    const startBulananExam = async () => {
        if (!ujianForm.santri_id) return alert("Pilih Santri");

        const history = (window.allData || []).filter(d =>
            d.__type === 'setoran' &&
            d.santri_id === ujianForm.santri_id &&
            d.setoran_type === 'Sabaq' &&
            new Date(d.setoran_date).getMonth() === new Date().getMonth()
        ).sort((a, b) => new Date(a.setoran_date) - new Date(b.setoran_date));

        if (history.length === 0) return alert("Belum ada setoran hafalan (Sabaq) bulan ini.");

        const first = history[0];
        // Expect surah_from, ayat_from
        if (!first.surah_from) return alert("Data setoran tidak lengkap (Surat/Ayat).");

        // Fetch Page
        try {
            const res = await fetch(`https://api.alquran.cloud/v1/ayah/${first.surah_from}:${first.ayat_from}/en.asad`);
            const json = await res.json();
            if (json.code === 200 && json.data && json.data.page) {
                const page = json.data.page;

                // Navigate
                if (quranControls && quranControls.setPage && currentViewRef) {
                    quranControls.setPage(page);
                    currentViewRef.value = 'quran';
                } else {
                    console.warn("Navigation controls not found");
                }
            } else {
                alert("Gagal mendeteksi halaman awal.");
            }
        } catch (e) {
            console.error(e);
            alert("Gagal koneksi untuk mengambil halaman.");
        }
    };

    // ===== NEW GRADING LOGIC =====
    // getSemesterGrade is defined above

    // Alias for backward compatibility if needed, or just use getSemesterGrade everywhere
    const calcGradeFromScore = getSemesterGrade;

    const calcScoreFromGrade = (grade) => {
        switch (grade) {
            case 'A+': return 95;
            case 'A': return 85;
            case 'B+': return 75;
            case 'B': return 65;
            case 'B-': return 60;
            case 'C': return 50;
            case 'Centang': return 0; // Special case
            default: return 0;
        }
    };

    const setGrade = (grade) => {
        ujianForm.s_grade = grade;
        if (grade === 'Centang') {
            ujianForm.s_score_manual = 0;
            ujianForm.s_score = 100; // Treat as full pass (internal) but displayed as Check
        } else {
            ujianForm.s_score_manual = calcScoreFromGrade(grade);
            ujianForm.s_score = ujianForm.s_score_manual;
        }
    };

    // Watchers for Bidirectional Logic
    watch(() => ujianForm.s_score_manual, (newScore) => {
        // Automatically calculate grade when manual score changes
        // Use loose check to allow overriding 'Centang' if user types a number
        const s = parseFloat(newScore);
        if (!isNaN(s) && ujianForm.s_grade !== 'Centang') {
            // If currently Centang, we only override if the user explicitly types meaningful score > 0?
            // Actually user might want to set 0.
            // But 'Centang' sets score manual to 0.
            // If we type 0, it stays Centang?
            // Let's simpler approach: Always update grade if input changes, UNLESS we are currently 'setting grade' (circular).
            // But we don't have a flag.
            // Let's just update it.
            ujianForm.s_grade = getSemesterGrade(s);
        } else if (!isNaN(s) && ujianForm.s_grade === 'Centang' && s > 0) {
            // If was Centang (score 0), and user types > 0, switch to Grade
            ujianForm.s_grade = getSemesterGrade(s);
        }

        // Simpler: Just always update if it looks like a score input
        if (!isNaN(s)) {
            // Avoid loop if the grade matches the score already?
            // No, just set it.
            // But if I clicked 'A' -> score 85. Watcher sees 85 -> Grade A. Stable.
            // If I type 95 -> Grade A+.
            // If I was Centang (0) -> Type 95 -> A+.
            // If I type 0 -> C?
            // If I intentionally want Centang, I click button.
            // If I type 0, getSemesterGrade(0) -> C.
            // That seems correct behavior for "Score 0".
            ujianForm.s_grade = getSemesterGrade(s);
        }

        ujianForm.s_score = newScore; // Sync legacy score
    });

    /**
     * Submit Ujian Data
     */
    const editingId = Vue.ref(null);

    /**
     * Submit Ujian Data
     */
    const submitUjian = async () => {
        if (!ujianForm.santri_id) {
            alert("Pilih Santri");
            return;
        }

        try {
            // DETECT CONTEXT: Hafalan vs Ujian
            const isHafalanView = (currentViewRef && (currentViewRef.value === 'hafalan' || currentViewRef.value === 'quran')) && ujianForm.tab === 'semester';
            // Note: When calling from Hafalan Grid, we set tab='semester' just to reuse the form. 
            // But we need to distinguish if it's "Monitoring" (Hafalan menu) or "Exam" (Ujian menu).
            // Actually, best way is to check the View Name directly if passed.
            // If currentViewRef is 'hafalan', then it is Monitoring Mode.

            const isMonitoringMode = currentViewRef && currentViewRef.value === 'hafalan';

            if (isMonitoringMode) {
                // --- HAFALAN MONITORING MODE ---
                // NO Ujian Record. JUST Update Progress + Logs.

                if (!ujianForm.s_juz) throw new Error("Pilih Juz dahulu");

                const grade = ujianForm.s_grade; // Should be 'Centang' mostly, or A-C if teacher grades manually here

                // 1. Update Santri Progress
                const s = uiData.santri.find(x => x.santri_id === ujianForm.santri_id);
                if (s) {
                    let prog = {};
                    if (s.hafalan_progress && typeof s.hafalan_progress === 'string') {
                        try { prog = JSON.parse(s.hafalan_progress); } catch (e) { }
                    } else if (s.hafalan_progress) {
                        prog = { ...s.hafalan_progress };
                    }

                    if (grade === null) {
                        delete prog[ujianForm.s_juz];
                    } else {
                        prog[ujianForm.s_juz] = grade;
                    }

                    // Count
                    const count = Object.values(prog).filter(v => v).length; // Just count any status
                    const newManual = `${count} Juz`;

                    await DB.update(s._id, {
                        hafalan_progress: JSON.stringify(prog),
                        hafalan_manual: newManual
                    });
                }

                // 2. Create History Log (Milestone/Completion - NOT Ujian)
                // Only if grade is NOT null (not deleting)
                if (grade) {
                    const logPayload = {
                        santri_id: ujianForm.santri_id,
                        date: ujianForm.date,
                        time: window.DateUtils.getCurrentTimeString(),
                        type: 'Hafalan Selesai', // New Type
                        detail: `Telah menyetorkan hafalan Juz ${ujianForm.s_juz}`,
                        score: 0, // Ignored
                        grade: grade, // 'Centang' or actual grade
                        meta: {
                            juz: ujianForm.s_juz
                        }
                    };
                    await DB.create('riwayat_hafalan', logPayload); // Use generic collection or 'ujian' with special type? 
                    // Let's use 'ujian' collection but with distinct type so it shows in Riwayat
                    // Actually 'ujian' collection is fine, just filter it out from "Exam Reports". 
                    // But wait, Riwayat menu usually shows 'setoran' or 'ujian'. 
                    // Let's save as 'setoran' maybe? No, 'setoran' has specific structure.
                    // Let's save as 'ujian' but with type 'Hafalan Selesai' so it appears in recent history.

                    await DB.create('ujian', {
                        ...logPayload,
                        __type: 'ujian' // Ensure it syncs
                    });
                }

                alert("Status Hafalan Diupdate");

                if (refreshData) refreshData();
                ujianForm.s_juz = null;
                if (modalState) modalState.isOpen = false;
                return;
            }

            // --- NORMAL UJIAN MODE ---
            const isSemester = ujianForm.tab === 'semester';
            let payload = {
                santri_id: ujianForm.santri_id,
                date: ujianForm.date,
                time: window.DateUtils.getCurrentTimeString(),
                meta: {}
            };

            if (isSemester) {
                payload.type = ujianForm.s_type === 'quran' ? 'Ujian Semester (Quran)' : 'Ujian Semester (Mapel)';
                payload.score = parseFloat(ujianForm.s_score);

                if (ujianForm.s_type === 'quran') {
                    if (!ujianForm.s_juz) throw new Error("Pilih Juz dahulu");
                    payload.detail = `Juz ${ujianForm.s_juz}`;
                    payload.meta.juz = ujianForm.s_juz;
                    payload.meta.salah = ujianForm.s_salah;

                    // Determine Grade
                    let grade = ujianForm.s_grade;
                    if (!grade && ujianForm.s_grade !== null) {
                        grade = getSemesterGrade(payload.score);
                    }
                    payload.grade = grade;

                    // Update Santri Record
                    const s = uiData.santri.find(x => x.santri_id === ujianForm.santri_id);
                    if (s) {
                        let prog = {};
                        if (s.hafalan_progress && typeof s.hafalan_progress === 'string') {
                            try { prog = JSON.parse(s.hafalan_progress); } catch (e) { }
                        } else if (s.hafalan_progress) {
                            prog = { ...s.hafalan_progress };
                        }

                        if (grade === null) {
                            delete prog[ujianForm.s_juz];
                        } else {
                            // In Exam Mode, we allow upgrading status
                            prog[ujianForm.s_juz] = grade;
                        }

                        const count = Object.values(prog).filter(v => v && v !== 'C').length;
                        const newManual = `${count} Juz`;

                        await DB.update(s._id, {
                            hafalan_progress: JSON.stringify(prog),
                            hafalan_manual: newManual
                        });
                    }
                } else {
                    payload.detail = ujianForm.s_mapel;
                    payload.grade = getSemesterGrade(payload.score);
                }
            } else {
                // Bulanan
                payload.type = ujianForm.b_type === 'quran' ? 'Ujian Al-Quran' : 'Ujian Pelajaran';
                payload.score = parseFloat(ujianForm.b_score);

                if (ujianForm.b_type === 'quran') {
                    payload.detail = "Ujian Bulanan (Quran)";
                    payload.meta.soal = ujianForm.b_soal;
                    payload.meta.salah = ujianForm.b_salah;
                } else {
                    payload.detail = ujianForm.b_mapel;
                }

                payload.grade = getSemesterGrade(payload.score);
            }

            if (editingId.value) {
                await DB.update(editingId.value, payload);
                alert("Data Ujian Berhasil Diupdate");
                editingId.value = null;
            } else {
                await DB.create('ujian', payload);
                alert("Nilai Ujian Berhasil Disimpan");
            }

            if (refreshData) refreshData();

            ujianForm.s_juz = null;
            ujianForm.s_salah = 0;
            ujianForm.b_salah = 0;
            calcBulananScore();

        } catch (e) {
            console.error(e);
            alert("Gagal: " + e.message);
        }
    };

    const editUjian = (item) => {
        if (!item) return;
        editingId.value = item._id;

        ujianForm.santri_id = item.santri_id;
        ujianForm.date = item.date;

        // Detect Type
        // Semester: "Ujian Semester (Quran)" or "Ujian Semester (Mapel)"
        // Bulanan: "Ujian Al-Quran" or "Ujian Pelajaran"

        if (item.type.includes('Semester')) {
            ujianForm.tab = 'semester';
            if (item.type.includes('Quran')) {
                ujianForm.s_type = 'quran';
                ujianForm.s_juz = item.meta?.juz || null;
                ujianForm.s_salah = item.meta?.salah || 0;
            } else {
                ujianForm.s_type = 'mapel';
                ujianForm.s_mapel = item.detail; // usually stored in detail
            }
            ujianForm.s_score = item.score;
            ujianForm.s_grade = item.grade;
            // Manual score sync
            ujianForm.s_score_manual = item.score;
        } else {
            ujianForm.tab = 'bulanan';
            if (item.type.includes('Quran')) {
                ujianForm.b_type = 'quran';
                ujianForm.b_soal = item.meta?.soal || 5;
                ujianForm.b_salah = item.meta?.salah || 0;
            } else {
                ujianForm.b_type = 'mapel';
                ujianForm.b_mapel = item.detail === "Ujian Bulanan (Quran)" ? "Fiqih" : item.detail; // Fallback
            }
            ujianForm.b_score = item.score;
        }
    };

    const cancelEdit = () => {
        editingId.value = null;
        // Reset defaults
        ujianForm.b_score = 100;
        ujianForm.s_score = 100;
        ujianForm.s_juz = null;
    };

    return {
        ujianForm,
        calcBulananScore,
        calcSemesterScore,
        selectUjianJuz,
        submitUjian,
        getSemesterGrade,
        setGrade,
        filteredUjian,
        editUjian,
        cancelEdit,
        editingId,
        selectedSantriProgress,
        selectedSantriBulananStats,
        startBulananExam
    };
}

