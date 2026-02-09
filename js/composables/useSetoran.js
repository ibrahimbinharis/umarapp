/**
 * useSetoran Composable
 * 
 * Manages Setoran (Quran Submission) system
 * - 4 Types: Sabaq (new), Sabqi (review yesterday), Robt (review week), Manzil (full review)
 * - Auto page calculation from ayat ranges (API integration)
 * - Grading system (score = 100 - errors, A+/A/B/C)
 * - Surah validation
 * - Manzil modes: Per Juz or Per Page
 * 
 * Dependencies: DB (from core.js), uiData (from parent)
 */

function useSetoran(uiData, DB, refreshData) {
    // Get Vue from global (loaded via CDN)
    const { reactive, computed, ref, watch } = Vue;

    // ===== STATE =====

    /**
     * Setoran form state
     */
    const setoranForm = reactive({
        santri_id: '',
        setoran_type: 'Sabaq', // Sabaq | Sabqi | Robt | Manzil
        setoran_date: window.DateUtils.getTodayDateString(),
        setoran_time: window.DateUtils.getCurrentTimeString(),

        // Common fields
        pages: 1,
        errors: 0,
        score: 100,
        grade: 'A+',
        counted: 1,

        // Sabaq specific
        surah_from: 1,
        surah_to: 1,
        ayat_from: 1,
        ayat_to: 10,
        surah_from_latin: '',
        surah_to_latin: '',

        // Manzil specific
        manzil_mode: 'juz', // juz | page
        juz: 1,
        page_from: 1,
        page_to: 20
    });

    /**
     * Auto-calc info display
     */
    const autoCalcInfo = ref({
        visible: false,
        text: ''
    });

    /**
     * Surah validation hints
     */
    const surahHints = reactive({
        from: { visible: false, text: '', max: 0 },
        to: { visible: false, text: '', max: 0 }
    });

    /**
     * Track editing mode (null = create, id = edit)
     */
    /**
     * Track editing mode (null = create, id = edit)
     */
    const editingId = ref(null);

    // Search State for Santri Dropdown
    const setoranSantriSearch = ref('');
    const isSetoranSantriDropdownOpen = ref(false);

    // Caches for page calculation
    const surahPageCache = {};
    const pageDensityCache = {};

    // ===== COMPUTED =====

    /**
     * Get surah list from global
     */
    const surahList = computed(() => {
        return window.surahList || [];
    });

    /**
     * Menu state for each setoran (tracked separately for reactivity)
     */
    const menuStates = ref({});

    /**
     * Format setoran detail for display
     */
    const formatSetoranDetail = (setoran) => {
        if (setoran.setoran_type === 'Sabaq') {
            const sFrom = (setoran.surah_from_latin || '').replace(/^\d+\.\s*/, '');
            const sTo = (setoran.surah_to_latin || '').replace(/^\d+\.\s*/, '');
            return `${sFrom}${sTo && sTo !== sFrom ? ' - ' + sTo : ''} (A. ${setoran.ayat_from}-${setoran.ayat_to})`;
        } else if (setoran.setoran_type === 'Manzil') {
            return setoran.manzil_mode === 'juz'
                ? `Juz ${setoran.juz}`
                : `Hal ${setoran.page_from}-${setoran.page_to}`;
        } else {
            return `${setoran.pages} Halaman`;
        }
    };

    /**
     * Recent setoran filtered by type
     */
    const recentSetoran = computed(() => {
        let records = (uiData.setoran || [])
            .filter(d => d.setoran_type === setoranForm.setoran_type)
            // Filter out orphan data (Santri deleted)
            .filter(d => {
                if (!d.santri_id) return false;
                return uiData.santri.some(s => s.santri_id === d.santri_id || s._id === d.santri_id);
            })
            .slice()
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);

        return records.map(r => {
            const s = (uiData.santri || []).find(santri => santri.santri_id === r.santri_id);
            // Format detail manually since function is not hoisted yet or use simple logic if needed
            // Actually, functions are hoisted in JS if defined as function declarations, but here they are const.
            // So we need to define formatSetoranDetail BEFORE useSetoran or move it up.
            // Alternatively, since we are inside useSetoran, we can just use the logic inline or move the helper up.

            // Let's move formatSetoranDetail up or duplicate logic for now to be safe, 
            // OR better: define the helper functions at the top of useSetoran or outside.

            // Wait, "functions defined with const are NOT hoisted".
            // I need to see where formatSetoranDetail is defined. It is at line ~686.
            // I should move formatSetoranDetail to the top of the file or change it to a function declaration.

            // Strategy: Move helper functions to the top of useSetoran body.
            return {
                ...r,
                santri_name: s ? s.full_name : 'Unknown',
                detail: formatSetoranDetail(r)
            };
        });
    });

    /**
     * Toggle menu for specific setoran
     */
    const toggleMenu = (setoranId) => {
        // Close all other menus first
        Object.keys(menuStates.value).forEach(key => {
            if (key !== setoranId) {
                menuStates.value[key] = false;
            }
        });

        // Toggle current menu
        menuStates.value[setoranId] = !menuStates.value[setoranId];
    };

    /**
     * Check if menu is open
     */
    const isMenuOpen = (setoranId) => {
        return menuStates.value[setoranId] || false;
    };

    /**
     * Santri options for dropdown
     */
    /**
     * Santri options for dropdown (Filtered by Search)
     */
    const setoranFilteredSantriOptions = computed(() => {
        let items = uiData.santri || [];
        if (setoranSantriSearch.value) {
            const q = setoranSantriSearch.value.toLowerCase();
            items = items.filter(s =>
                (s.full_name || '').toLowerCase().includes(q) ||
                String(s.santri_id || '').toLowerCase().includes(q)
            );
        }
        return items.slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    });

    /**
     * Helpers for Custom Dropdown
     */
    const selectSetoranSantri = (santri) => {
        setoranForm.santri_id = santri.santri_id;
        setoranSantriSearch.value = ''; // Reset search logic if needed, or keep for UX
        isSetoranSantriDropdownOpen.value = false;
    };

    // Get selected santri name for display
    const setoranSelectedSantriName = computed(() => {
        if (!setoranForm.santri_id) return '';
        const s = (uiData.santri || []).find(x => String(x.santri_id) === String(setoranForm.santri_id));
        return s ? s.full_name : '';
    });

    /**
     * Calculate grade from pages and errors
     */
    const calculateGrade = (pages, errors) => {
        const p = parseFloat(pages) || 0;
        const e = parseInt(errors) || 0;

        if (p <= 0) return { score: 0, grade: 'C', counted: 0 };

        // Standard Logic (Same as core.js)
        // 1 Page = 10 Points base
        // Score = ((TotalPoints - Errors) / TotalPoints) * 100
        const totalPoints = p * 10;
        let score = Math.max(0, Math.min(100, ((totalPoints - e) / totalPoints) * 100));

        // Round to 1 decimal
        score = Math.round(score * 10) / 10;

        let grade = 'C';
        if (score >= 95) grade = 'A+';
        else if (score >= 85) grade = 'A';
        else if (score >= 75) grade = 'B+';
        else if (score >= 65) grade = 'B';
        else if (score >= 60) grade = 'B-';

        // Counted pages based on score threshold (passing grade)
        const counted = score >= 60 ? p : 0;

        return { score, grade, counted };
    };

    // ===== METHODS =====

    /**
     * Change setoran type
     */
    const changeSetoranType = (type) => {
        setoranForm.setoran_type = type;

        // Reset fields based on type
        if (type === 'Manzil') {
            setoranForm.pages = 20; // Default 1 Juz
            setoranForm.manzil_mode = 'juz';
            setoranForm.juz = 1;
        } else if (type === 'Sabaq') {
            setoranForm.pages = 1;
            autoCalcInfo.value.visible = false;
        } else { // Sabqi or Robt
            // Auto-calculate pages for review types
            handleAutoCalc();
        }

        updateGrade();
    };

    /**
     * Update grade display
     */
    const updateGrade = () => {
        const result = calculateGrade(setoranForm.pages, setoranForm.errors);
        setoranForm.score = result.score;
        setoranForm.grade = result.grade;
        setoranForm.counted = result.counted;
    };

    /**
     * Adjust value (for +/- buttons)
     */
    const adjustValue = (field, delta) => {
        setoranForm[field] = Math.max(0, (parseFloat(setoranForm[field]) || 0) + delta);
        updateGrade();
    };

    /**
     * Toggle manzil mode (juz / page)
     */
    const toggleManzilMode = () => {
        if (setoranForm.manzil_mode === 'juz') {
            setoranForm.pages = 20; // 1 Juz = 20 pages
        } else {
            // Calculate from page range
            calcPagesFromRange();
        }
        updateGrade();
    };

    /**
     * Calculate pages from page range
     */
    const calcPagesFromRange = () => {
        let from = parseInt(setoranForm.page_from);
        let to = parseInt(setoranForm.page_to);

        // Validation: Quran Pages 1 - 604
        const MAX_PAGE = 604;

        if (from && (from < 1 || from > MAX_PAGE)) {
            from = Math.max(1, Math.min(MAX_PAGE, from));
            setoranForm.page_from = from;
        }

        if (to && (to < 1 || to > MAX_PAGE)) {
            to = Math.max(1, Math.min(MAX_PAGE, to));
            setoranForm.page_to = to;
        }

        if (from > 0 && to > 0) {
            // Calculate distance regardless of order (1-20 or 20-1)
            // User request: "halaman dari 20 - 3 > juga terhitung"
            setoranForm.pages = Math.abs(to - from) + 1;
            updateGrade();
        }
    };

    /**
     * Sync surah (from → to)
     */
    const syncSurah = () => {
        setoranForm.surah_to = setoranForm.surah_from;
        validateAyat('from');
        validateAyat('to');
    };

    /**
     * Validate ayat number against surah max
     */
    const validateAyat = (field) => {
        const surahNo = field === 'from' ? setoranForm.surah_from : setoranForm.surah_to;
        const ayatVal = field === 'from' ? setoranForm.ayat_from : setoranForm.ayat_to;

        const surah = surahList.value.find(s => s.no === parseInt(surahNo));
        if (!surah) return;

        const max = surah.ayat;
        const hint = surahHints[field];

        hint.visible = true;
        hint.max = max;
        hint.text = `Max: ${max} Ayat`;

        // Auto-correct if exceeded
        if (ayatVal > max) {
            if (field === 'from') {
                setoranForm.ayat_from = max;
            } else {
                setoranForm.ayat_to = max;
            }
            hint.text = `Max ${max}!`;
        } else if (ayatVal < 1 && ayatVal !== '') {
            if (field === 'from') {
                setoranForm.ayat_from = 1;
            } else {
                setoranForm.ayat_to = 1;
            }
        }

        // Trigger auto-calc for Sabaq
        if (setoranForm.setoran_type === 'Sabaq') {
            // Debounce
            if (window._calcTimer) clearTimeout(window._calcTimer);
            window._calcTimer = setTimeout(() => autoCalcPages(), 800);
        }
    };

    /**
     * Fetch page map from API for a surah
     */
    const fetchPageMap = async (surahNo) => {
        if (surahPageCache[surahNo]) {
            return surahPageCache[surahNo];
        }

        autoCalcInfo.value.visible = true;
        autoCalcInfo.value.text = 'Mengambil data halaman...';

        try {
            const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNo}`);
            const json = await res.json();

            if (json.code === 200 && json.data && json.data.ayahs) {
                const map = {};
                const density = {};

                json.data.ayahs.forEach(a => {
                    map[a.numberInSurah] = a.page;
                    if (!density[a.page]) density[a.page] = 0;
                    density[a.page]++;
                });

                surahPageCache[surahNo] = map;
                pageDensityCache[surahNo] = density;

                return map;
            }
        } catch (error) {
            console.warn('Failed to fetch page map:', error);
        }

        autoCalcInfo.value.visible = false;
        return null;
    };

    /**
     * Auto-calculate pages from ayat ranges (Sabaq type)
     */
    const autoCalcPages = async () => {
        if (setoranForm.setoran_type !== 'Sabaq') return;

        const sNo1 = parseInt(setoranForm.surah_from);
        const sNo2 = parseInt(setoranForm.surah_to);
        const aFrom = parseInt(setoranForm.ayat_from);
        const aTo = parseInt(setoranForm.ayat_to);

        if (!sNo1 || !sNo2 || !aFrom || !aTo) return;

        // Fetch page maps
        const map1 = await fetchPageMap(sNo1);
        const map2 = (sNo1 === sNo2) ? map1 : await fetchPageMap(sNo2);

        if (!map1 || !map2) return;

        let pStart = map1[aFrom];
        let pEnd = map2[aTo];

        // Fallback to last page if ayat not found
        if (!pStart) pStart = map1[Object.keys(map1).pop()];
        if (!pEnd) pEnd = map2[Object.keys(map2).pop()];

        if (!pStart || !pEnd) return;

        let exactCount = 0;

        if (pStart === pEnd) {
            // Same page - calculate fraction
            const density1 = pageDensityCache[sNo1]?.[pStart] || 15;
            const density2 = (sNo1 !== sNo2) ? (pageDensityCache[sNo2]?.[pEnd] || 15) : 0;
            const totalDensity = density1 + density2 || 15;

            const versesCov = (sNo1 === sNo2)
                ? Math.abs(aTo - aFrom) + 1
                : totalDensity;

            exactCount = versesCov / totalDensity;
        } else {
            // Multiple pages
            const middlePages = Math.max(0, pEnd - pStart - 1);

            // Start page fraction
            const d1 = pageDensityCache[sNo1]?.[pStart] || 15;
            const s1VersesOnPage = Object.entries(map1)
                .filter(([k, v]) => v === pStart)
                .map(([k, v]) => parseInt(k));
            const s1EndVerseOnPage = Math.max(...s1VersesOnPage);
            const capturedStart = (s1EndVerseOnPage - aFrom) + 1;
            const fracStart = Math.max(0, capturedStart) / d1;

            // End page fraction
            const d2 = pageDensityCache[sNo2]?.[pEnd] || 15;
            const s2VersesOnPage = Object.entries(map2)
                .filter(([k, v]) => v === pEnd)
                .map(([k, v]) => parseInt(k));
            const s2StartVerseOnPage = Math.min(...s2VersesOnPage);
            const capturedEnd = (aTo - s2StartVerseOnPage) + 1;
            const fracEnd = Math.max(0, capturedEnd) / d2;

            exactCount = middlePages + fracStart + fracEnd;
        }

        let final = parseFloat(exactCount.toFixed(1));
        if (final < 0.1) final = 0.1;

        setoranForm.pages = final;
        updateGrade();

        autoCalcInfo.value.visible = true;
        autoCalcInfo.value.text = `Otomatis: <b>${final} Hal</b> (Hal ${pStart} - ${pEnd})`;

        setTimeout(() => {
            autoCalcInfo.value.visible = false;
        }, 5000);
    };

    /**
     * Auto-calculate pages for Sabqi/Robt based on santri's hafalan
     */
    /**
     * Auto-calculate pages for Sabqi/Robt based on history
     * - Sabqi: Sum of last 2 Sabaq
     * - Robt: Sum of last 2 Sabqi
     */
    const handleAutoCalc = () => {
        if (!setoranForm.santri_id) return;
        const type = setoranForm.setoran_type;

        if (type !== 'Sabqi' && type !== 'Robt') return;

        // Determine source type (Previous level)
        const sourceType = type === 'Sabqi' ? 'Sabaq' : 'Sabqi';

        // Get history for this santri & source type
        const history = (uiData.setoran || [])
            .filter(s => s.santri_id === setoranForm.santri_id && s.setoran_type === sourceType)
            .sort((a, b) => {
                const da = new Date((a.setoran_date || '2000-01-01') + 'T' + (a.setoran_time || '00:00'));
                const db = new Date((b.setoran_date || '2000-01-01') + 'T' + (b.setoran_time || '00:00'));
                return db - da; // Newest first
            });

        // Take last 2 records
        const lastTwo = history.slice(0, 2);

        // Sum pages
        const sumPages = lastTwo.reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);

        // Default to 1 if no history, otherwise use sum
        let finalPages = sumPages > 0 ? sumPages : 1;

        // Construct info message
        let infoText = '';
        if (lastTwo.length === 2) {
            infoText = `Otomatis: ${finalPages} Hal (Gabungan 2 ${sourceType} terakhir)`;
        } else if (lastTwo.length === 1) {
            infoText = `Otomatis: ${finalPages} Hal (Dari 1 ${sourceType} terakhir)`;
        } else {
            infoText = `Otomatis: 1 Hal (Data ${sourceType} tidak ditemukan)`;
        }

        setoranForm.pages = parseFloat(finalPages.toFixed(1));
        autoCalcInfo.value.visible = true;
        autoCalcInfo.value.text = infoText;

        updateGrade();

        // Auto-hide info
        if (window._infoTimer) clearTimeout(window._infoTimer);
        window._infoTimer = setTimeout(() => {
            autoCalcInfo.value.visible = false;
        }, 5000);
    };

    // Watch for Santri change to trigger auto-calc if in Sabqi/Robt mode
    watch(() => setoranForm.santri_id, (newVal) => {
        if (newVal && (setoranForm.setoran_type === 'Sabqi' || setoranForm.setoran_type === 'Robt')) {
            handleAutoCalc();
        }
    });

    /**
     * Save setoran (CREATE or UPDATE)
     */
    const saveSetoran = async () => {
        if (!setoranForm.santri_id) {
            alert('Pilih Santri terlebih dahulu');
            return;
        }

        try {
            // Build payload
            const payload = {
                santri_id: setoranForm.santri_id,
                setoran_date: setoranForm.setoran_date,
                setoran_time: setoranForm.setoran_time,
                setoran_type: setoranForm.setoran_type,
                pages: setoranForm.pages,
                errors: setoranForm.errors,
                score: setoranForm.score,
                grade: setoranForm.grade,
                counted: setoranForm.counted
            };

            // Add type-specific fields
            if (setoranForm.setoran_type === 'Sabaq') {
                // Get surah latin names
                const surahFrom = surahList.value.find(s => s.no === parseInt(setoranForm.surah_from));
                const surahTo = surahList.value.find(s => s.no === parseInt(setoranForm.surah_to));

                payload.surah_from = setoranForm.surah_from;
                payload.surah_to = setoranForm.surah_to;
                payload.ayat_from = setoranForm.ayat_from;
                payload.ayat_to = setoranForm.ayat_to;
                payload.surah_from_latin = surahFrom ? `${surahFrom.no}. ${surahFrom.latin}` : '';
                payload.surah_to_latin = surahTo ? `${surahTo.no}. ${surahTo.latin}` : '';
            } else if (setoranForm.setoran_type === 'Manzil') {
                payload.manzil_mode = setoranForm.manzil_mode;
                if (setoranForm.manzil_mode === 'juz') {
                    payload.juz = setoranForm.juz;
                } else {
                    payload.page_from = setoranForm.page_from;
                    payload.page_to = setoranForm.page_to;
                }
            }

            // CREATE or UPDATE
            if (editingId.value) {
                // UPDATE mode
                await DB.update(editingId.value, payload);
                alert('Setoran berhasil diupdate!');
                editingId.value = null; // Reset edit mode
            } else {
                // CREATE mode
                await DB.create('setoran', payload);
                alert('Setoran berhasil disimpan!');
            }

            // Refresh data
            if (refreshData) {
                refreshData();
            }

            // Reset form
            setoranForm.santri_id = '';
            setoranSantriSearch.value = ''; // Reset search text
            setoranForm.pages = setoranForm.setoran_type === 'Manzil' ? 20 : 1;
            setoranForm.errors = 0;
            updateGrade();

            return true;
        } catch (error) {
            console.error('Error saving setoran:', error);
            alert('Gagal menyimpan setoran: ' + error.message);
            return false;
        }
    };

    /**
     * Delete setoran record
     */
    const deleteSetoran = async (setoranId) => {
        if (!setoranId) return;

        if (!confirm('Hapus data setoran ini?')) {
            return;
        }

        try {
            await DB.delete(setoranId);

            // Refresh data
            if (refreshData) {
                refreshData();
            }

            alert('Setoran berhasil dihapus!');
            return true;
        } catch (error) {
            console.error('Error deleting setoran:', error);
            alert('Gagal menghapus setoran: ' + error.message);
            return false;
        }
    };

    /**
     * Edit setoran - load data into form
     */
    const editSetoran = (setoran) => {
        if (!setoran) return;


        // Set editing mode
        editingId.value = setoran._id;
        // Load data into form
        setoranForm.santri_id = setoran.santri_id;
        setoranForm.setoran_type = setoran.setoran_type;
        setoranForm.setoran_date = setoran.setoran_date;
        setoranForm.setoran_time = setoran.setoran_time;
        setoranForm.pages = setoran.pages || 1;
        setoranForm.errors = setoran.errors || 0;

        // Type-specific fields
        if (setoran.setoran_type === 'Sabaq') {
            setoranForm.surah_from = setoran.surah_from || 1;
            setoranForm.surah_to = setoran.surah_to || 1;
            setoranForm.ayat_from = setoran.ayat_from || 1;
            setoranForm.ayat_to = setoran.ayat_to || 1;
        } else if (setoran.setoran_type === 'Manzil') {
            setoranForm.manzil_mode = setoran.manzil_mode || 'juz';
            setoranForm.juz = setoran.juz || 1;
            setoranForm.page_from = setoran.page_from || 1;
            setoranForm.page_to = setoran.page_to || 20;
        }

        updateGrade();

        // Scroll to top to see form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /**
     * Cancel edit mode
     */
    const cancelEdit = () => {
        editingId.value = null;
        // Reset form to defaults
        setoranForm.pages = setoranForm.setoran_type === 'Manzil' ? 20 : 1;
        setoranForm.errors = 0;
        updateGrade();
    };

    /**
     * Get santri name by ID
     */
    const getSantriName = (santriId) => {
        const santri = (uiData.santri || []).find(s => s.santri_id === santriId);
        return santri ? santri.full_name : 'Unknown';
    };



    // Initialize grade
    updateGrade();

    // Close dropdown menus when clicking outside
    const { onMounted, onUnmounted } = Vue;
    const closeAllMenus = () => {
        Object.keys(menuStates.value).forEach(key => {
            menuStates.value[key] = false;
        });
    };

    onMounted(() => {
        document.addEventListener('click', closeAllMenus);
    });

    onUnmounted(() => {
        document.removeEventListener('click', closeAllMenus);
    });

    // Return everything needed for template
    return {
        setoranForm,
        autoCalcInfo,
        surahHints,
        editingId,

        // Search State
        setoranSantriSearch,
        isSetoranSantriDropdownOpen,
        setoranFilteredSantriOptions,
        selectSetoranSantri,
        setoranSelectedSantriName,

        surahList,
        recentSetoran,
        menuStates,

        // Methods
        toggleMenu,
        isMenuOpen,

        changeSetoranType,
        updateGrade,
        adjustValue,
        syncSurah,
        validateAyat,
        toggleManzilMode,
        calcPagesFromRange,

        editSetoran,
        cancelEdit,
        saveSetoran,
        deleteSetoran,

        // Helpers
        getSantriName,
        formatSetoranDetail,
        formatDate: window.DateUtils.formatDate,
        formatDateFriendly: window.DateUtils.formatDateFriendly,
        formatDateLong: window.DateUtils.formatDateLong,
        formatTime: window.DateUtils.formatTime
    };
}
