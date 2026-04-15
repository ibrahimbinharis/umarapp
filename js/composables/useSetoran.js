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

function useSetoran(uiData, DB, refreshData, userSession, appConfig) {
    // Get Vue from global (loaded via CDN)
    const { reactive, computed, ref, watch, onMounted, onUnmounted } = Vue;

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
        ayat_to: 1,
        surah_from_latin: '',
        surah_to_latin: '',

        // Manzil specific
        manzil_mode: 'page', // juz | page
        juz: 1,
        page_from: 1,
        page_to: 1,

        // Tilawah specific
        tilawah_mode: 'juz', // juz | page
        juz_from: 1,
        juz_to: 1
    });

    /**
     * Auto-calc info display
     */
    const autoCalcInfo = ref({
        visible: false,
        text: ''
    });

    const isClockRunning = ref(true);
    let clockInterval = null;

    const setNow = () => {
        setoranForm.setoran_date = window.DateUtils.getTodayDateString();
        setoranForm.setoran_time = window.DateUtils.getCurrentTimeString();
        isClockRunning.value = true;
    };

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
    const setoranEditingId = ref(null);

    // Search State for Santri Dropdown
    const setoranSantriSearch = ref('');
    const surahSearch = ref('');
    const isSetoranSantriDropdownOpen = ref(false);

    // Caches for page calculation
    const surahPageCache = {};
    const pageDensityCache = {};

    // ===== COMPUTED =====

    /**
     * Get surah list from global
     */
    const surahList = computed(() => {
        return uiData.surahList || [];
    });

    /**
     * Filtered surah list based on search text (v37)
     */
    const filteredSurahList = computed(() => {
        const q = surahSearch.value.toLowerCase().trim();
        if (!q) return surahList.value;

        return surahList.value.filter(s => 
            s.latin.toLowerCase().includes(q) || 
            String(s.no).includes(q)
        );
    });

    /**
     * Menu state for each setoran (tracked separately for reactivity)
     */
    const menuStates = ref({});

    /**
     * Format setoran detail for display
     */
    const formatSetoranDetail = (setoran) => {
        const pages = setoran.pages || 0;
        
        if (setoran.setoran_type === 'Sabaq') {
            const sFrom = (setoran.surah_from_latin || '').replace(/^\d+\.\s*/, '');
            const sTo = (setoran.surah_to_latin || '').replace(/^\d+\.\s*/, '');
            
            if (setoran.surah_from === setoran.surah_to) {
                return `${sFrom}: ${setoran.ayat_from}-${setoran.ayat_to}, ${pages} Hal`;
            } else {
                return `${sFrom} (${setoran.ayat_from}) - ${sTo} (${setoran.ayat_to}), ${pages} Hal`;
            }
        } else if (setoran.setoran_type === 'Sabqi' || setoran.setoran_type === 'Robt') {
            if (setoran.surah_from_latin) {
                const sFrom = (setoran.surah_from_latin || '').replace(/^\d+\.\s*/, '');
                const sTo = (setoran.surah_to_latin || '').replace(/^\d+\.\s*/, '');
                const range = (setoran.surah_from === setoran.surah_to)
                    ? `${sFrom}: ${setoran.ayat_from}-${setoran.ayat_to}`
                    : `${sFrom} ${setoran.ayat_from} - ${sTo} ${setoran.ayat_to}`;
                return `${range}, ${pages} Hal`;
            }
            return `${pages} Hal`;
        } else if (setoran.setoran_type === 'Manzil') {
            return setoran.manzil_mode === 'juz'
                ? `Juz ${setoran.juz}, ${pages} Hal`
                : `Hal ${setoran.page_from}-${setoran.page_to}, ${pages} Hal`;
        } else if (setoran.setoran_type === 'Tilawah') {
            return setoran.tilawah_mode === 'juz'
                ? `Juz ${setoran.juz_from}-${setoran.juz_to}, ${pages} Hal`
                : `Hal ${setoran.page_from}-${setoran.page_to}, ${pages} Hal`;
        } else {
            return `${pages} Hal`;
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
            .slice(0, 10);

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
            // Start formatSetoranDetail logic
            const detailText = formatSetoranDetail(r);

            return {
                ...r,
                santri_name: s ? s.full_name : 'Unknown',
                detail: detailText,
                formatted_date: window.DateUtils.formatDateFriendly(r.setoran_date)
            };
        });
    });

    /**
     * Get the last submission for the selected santri and current type
     */
    const lastRecordForType = computed(() => {
        if (!setoranForm.santri_id) return null;

        const type = setoranForm.setoran_type;
        const lookupType = (type === 'Sabqi') ? 'Sabaq' : (type === 'Robt' ? 'Sabqi' : type);
        const allRecords = (uiData.setoran || []);
        const records = allRecords
            .filter(d => d.santri_id === setoranForm.santri_id && d.setoran_type === lookupType)
            .sort((a, b) => {
                const da = new Date((a.setoran_date || '2000-01-01') + 'T' + (a.setoran_time || '00:00'));
                const db = new Date((b.setoran_date || '2000-01-01') + 'T' + (b.setoran_time || '00:00'));
                return db - da; // Newest first
            });

        const last = records[0];
        if (!last) return null;

        // v37: Simplified detail for preview reference only
        let detail = formatSetoranDetail(last);

        return {
            ...last,
            detail: detail,
            friendly_date: window.DateUtils.formatDateFriendly(last.setoran_date)
        };
    });

    /**
     * Apply the values from the last record to the form (v37)
     * For Sabaq: resume from last Surah/Ayat
     * For Manzil: resume from last Page/Juz
     */
    const applyLastRecord = () => {
        const last = lastRecordForType.value;
        if (!last) return;

        const type = setoranForm.setoran_type;

        if (type === 'Sabaq') {
            // Logic: Start from NEXT Ayat (+1)
            let nextSurah = parseInt(last.surah_to || 1);
            let nextAyat = parseInt(last.ayat_to || 0) + 1;
            
            const currentSurah = surahList.value.find(s => s.no === nextSurah);
            if (currentSurah && nextAyat > currentSurah.ayat) {
                // If end of surah, move to next surah
                if (nextSurah < 114) {
                    nextSurah++;
                    nextAyat = 1;
                } else {
                    // Already at An-Nas end
                    nextAyat = currentSurah.ayat;
                }
            }

            setoranForm.surah_from = nextSurah;
            setoranForm.ayat_from = nextAyat;
            setoranForm.surah_to = nextSurah;
            setoranForm.ayat_to = nextAyat;
            
            // Sync names and validation
            syncSurah();
            validateAyat('from');
            validateAyat('to');
        } else if (type === 'Manzil') {
            setoranForm.manzil_mode = last.manzil_mode || 'page';
            if (setoranForm.manzil_mode === 'page') {
                const nextPage = Math.min(604, parseInt(last.page_to || 0) + 1);
                setoranForm.page_from = nextPage;
                setoranForm.page_to = nextPage;
                calcPagesFromRange();
            } else {
                const nextJuz = Math.min(30, parseInt(last.juz || 0) + 1);
                setoranForm.juz = nextJuz;
                toggleManzilMode();
            }
        }
        
        updateGrade();
        window.showAlert("Melanjutkan ke posisi berikutnya (+1).", "Lanjutkan", "info");
    };

    /**
     * Calculate progress towards target for the current month
     */
    const santriTargetProgress = computed(() => {
        if (!setoranForm.santri_id) return { pct: 0, current: 0, target: 0, show: false, unit: '' };

        const activeSantri = (uiData.santri || []).find(s => s.santri_id === setoranForm.santri_id);
        if (!activeSantri) return { pct: 0, current: 0, target: 0, show: false, unit: '' };

        // Target calculation
        const type = setoranForm.setoran_type;
        let target = 0;
        let unit = '';

        if (type === 'Sabaq') { target = activeSantri.target_sabaq || 20; unit = 'Hal'; }
        else if (type === 'Manzil') { target = activeSantri.target_manzil || 20; unit = 'Hal'; }
        else if (type === 'Tilawah') { target = activeSantri.target_tilawah || 600; unit = 'Hal'; }
        else return { pct: 0, current: 0, target: 0, show: false, unit: '' };

        if (!target || target <= 0) return { pct: 0, current: 0, target: 0, show: false, unit: '' };

        // Current month achievement
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

        const monthlyRecords = (uiData.setoran || [])
            .filter(d =>
                d.santri_id === setoranForm.santri_id &&
                d.setoran_type === type &&
                (d.setoran_date || '').startsWith(monthPrefix)
            );

        const current = monthlyRecords.reduce((acc, curr) => {
            const val = type === 'Sabaq' ? (parseFloat(curr.counted) || 0) : (parseFloat(curr.pages) || 0);
            return acc + val;
        }, 0);

        const pct = Math.min(100, Math.round((current / target) * 100));

        return {
            pct,
            current: parseFloat(current.toFixed(1)),
            target,
            unit,
            show: true
        };
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
    const calculateGrade = (pages, errors, type = null) => {
        const p = parseFloat(pages) || 0;
        const e = parseInt(errors) || 0;

        // Tilawah doesn't need a grade (v36)
        if (type === 'Tilawah') {
            return { score: 0, grade: '-', counted: p };
        }

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
        if (type === 'Tilawah') {
            setoranForm.pages = 20; // Default 1 Juz
            setoranForm.tilawah_mode = 'juz';
            setoranForm.page_from = 1;
            setoranForm.page_to = 20;
            setoranForm.juz_from = 1;
            setoranForm.juz_to = 1;
        } else if (type === 'Manzil') {
            setoranForm.pages = 1;
            setoranForm.manzil_mode = 'page';
            setoranForm.page_from = 1;
            setoranForm.page_to = 1;
        } else if (type === 'Sabaq') {
            setoranForm.pages = 1;
            setoranForm.ayat_from = 1;
            setoranForm.ayat_to = 1;
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
        const result = calculateGrade(setoranForm.pages, setoranForm.errors, setoranForm.setoran_type);
        setoranForm.score = result.score;
        setoranForm.grade = result.grade;
        setoranForm.counted = result.counted;
    };

    /**
     * Get actual page count for a specific Juz (Standard Madinah Mushaf 604 Pages)
     */
    const getJuzPageCount = (juz) => {
        const j = parseInt(juz);
        if (j === 1) return 21;
        if (j === 30) return 23;
        return 20;
    };

    const getJuzRangePageCount = (from, to) => {
        const start = Math.min(parseInt(from), parseInt(to));
        const end = Math.max(parseInt(from), parseInt(to));
        let total = 0;
        for (let i = start; i <= end; i++) {
            total += getJuzPageCount(i);
        }
        return total;
    };

    /**
     * Adjust value (for +/- buttons)
     */
    const adjustValue = (field, delta) => {
        let finalDelta = delta;
        // For Tilawah, adjustments are in half-Juz steps (0.5 * 20 = 10 pages)
        if (field === 'pages' && setoranForm.setoran_type === 'Tilawah') {
            finalDelta = delta * 20;
        }
        setoranForm[field] = Math.max(0, (parseFloat(setoranForm[field]) || 0) + finalDelta);
        updateGrade();
    };

    /**
     * Toggle manzil mode (juz / page)
     */
    const toggleManzilMode = () => {
        if (setoranForm.manzil_mode === 'juz') {
            setoranForm.pages = getJuzPageCount(setoranForm.juz);
        } else {
            // Calculate from page range
            calcPagesFromRange();
        }
        updateGrade();
    };

    /**
     * Toggle tilawah mode (juz / page)
     */
    const toggleTilawahMode = () => {
        if (setoranForm.tilawah_mode === 'juz') {
            calcPagesFromJuzRange();
        } else {
            calcPagesFromRange();
        }
        updateGrade();
    };

    /**
     * Calculate pages from juz range
     */
    const calcPagesFromJuzRange = () => {
        setoranForm.pages = getJuzRangePageCount(setoranForm.juz_from, setoranForm.juz_to);
        updateGrade();
    };

    /**
     * Calculate pages from page range
     */
    const calcPagesFromRange = () => {
        let from = parseInt(setoranForm.page_from);
        let to = parseInt(setoranForm.page_to);

        const MAX_HAL = 604;

        // Capping logic
        if (from > MAX_HAL) { from = MAX_HAL; setoranForm.page_from = MAX_HAL; }
        if (to > MAX_HAL) { to = MAX_HAL; setoranForm.page_to = MAX_HAL; }

        if (!from || !to) {
            setoranForm.pages = 1;
            updateGrade();
            return;
        }

        // Calculate distance regardless of order (1-20 or 20-1)
        setoranForm.pages = Math.abs(to - from) + 1;
        updateGrade();
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
     * Fetch line-level metadata from Quran.com API (v37 Migration)
     */
    const fetchPageMap = async (surahNo) => {
        if (surahPageCache[surahNo]) {
            return surahPageCache[surahNo];
        }

        autoCalcInfo.value.visible = true;
        autoCalcInfo.value.text = 'Sinkronisasi baris Madinah...';

        try {
            // Using Quran.com V4 API with word metadata for precise line numbers
            // Correction: Add per_page=300 to ensure we get all ayahs (Baqarah has 286)
            const res = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahNo}?per_page=300&words=true&word_fields=line_number,page_number`);
            
            if (!res.ok) throw new Error('Status: ' + res.status);
            
            const json = await res.json();

            if (json.verses && json.verses.length > 0) {
                const map = {};
                
                json.verses.forEach(v => {
                    const ayatNo = v.verse_number;
                    const words = v.words || [];
                    
                    if (words.length > 0) {
                        const startLine = words[0].line_number;
                        const endLine = words[words.length - 1].line_number;
                        const page = words[0].page_number;
                        
                        map[ayatNo] = {
                            p: page,
                            sl: startLine,
                            el: endLine,
                            lines: (endLine - startLine) + 1
                        };
                    }
                });

                surahPageCache[surahNo] = map;
                return map;
            }
        } catch (error) {
            console.warn('Failed to fetch from Quran.com:', error);
            window.showAlert('Gagal sinkron baris: ' + error.message, 'API Error', 'warning');
        }

        autoCalcInfo.value.visible = false;
        return null;
    };

    /**
     * Auto-calculate pages using LINE-LEVEL precision (15 Lines Standard Madinah)
     */
    const autoCalcPages = async () => {
        if (setoranForm.setoran_type !== 'Sabaq') return;

        const sNo1 = parseInt(setoranForm.surah_from);
        const sNo2 = parseInt(setoranForm.surah_to);
        const aFrom = parseInt(setoranForm.ayat_from);
        const aTo = parseInt(setoranForm.ayat_to);

        if (!sNo1 || !sNo2 || !aFrom || !aTo) return;

        // Fetch data from new API
        const map1 = await fetchPageMap(sNo1);
        const map2 = (sNo1 === sNo2) ? map1 : await fetchPageMap(sNo2);

        if (!map1 || !map2) return;

        const metaStart = map1[aFrom];
        const metaEnd = map2[aTo];

        if (!metaStart || !metaEnd) return;

        const LINES_PER_PAGE = 15; // Standard Madinah Mushaf
        let exactCount = 0;

        if (metaStart.p === metaEnd.p) {
            // Case A: Same Page - Calculate lines between
            const totalLines = (metaEnd.el - metaStart.sl) + 1;
            exactCount = totalLines / LINES_PER_PAGE;
        } else {
            // Case B: Multiple Pages
            const middlePages = Math.max(0, metaEnd.p - metaStart.p - 1);
            
            // Lines on first page (from start line to bottom)
            const linesStart = (LINES_PER_PAGE - metaStart.sl) + 1;
            const fracStart = linesStart / LINES_PER_PAGE;

            // Lines on last page (from top to end line)
            const linesEnd = metaEnd.el;
            const fracEnd = linesEnd / LINES_PER_PAGE;

            exactCount = middlePages + fracStart + fracEnd;
        }

        // Apply result
        let final = parseFloat(exactCount.toFixed(1));
        if (final < 0.1) final = 0.1;

        setoranForm.pages = final;
        updateGrade();

        autoCalcInfo.value.visible = true;
        autoCalcInfo.value.text = `Akurasi Baris: <b>${final} Hal</b> (Halaman ${metaStart.p} - ${metaEnd.p})`;
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

        // v37: Both Sabqi and Robt now reference 'Sabaq' as primary source
        // Sabqi = 2 Sabaq, Robt = 4 Sabaq (2 Sabqi)
        const sourceType = 'Sabaq';
        const limitCount = type === 'Sabqi' ? 2 : 4;

        // Get history for this santri & Sabaq type
        const currentRefDate = new Date((setoranForm.setoran_date || '2000-01-01') + 'T' + (setoranForm.setoran_time || '00:00'));
        
        const history = (uiData.setoran || [])
            .filter(s => {
                const isMatch = s.santri_id === setoranForm.santri_id && s.setoran_type === sourceType;
                if (!isMatch) return false;
                
                // v37: Safe filtering (only include records before or at the current setoran time)
                const sDate = new Date((s.setoran_date || '2000-01-01') + 'T' + (s.setoran_time || '00:00'));
                return sDate <= currentRefDate;
            })
            .sort((a, b) => {
                const da = new Date((a.setoran_date || '2000-01-01') + 'T' + (a.setoran_time || '00:00'));
                const db = new Date((b.setoran_date || '2000-01-01') + 'T' + (b.setoran_time || '00:00'));
                return db - da; // Newest first
            });

        // Take the required records
        const records = history.slice(0, limitCount);

        // Sum pages
        const sumPages = records.reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);

        // Default to 1 if no history, otherwise use sum
        let finalPages = sumPages > 0 ? parseFloat(sumPages.toFixed(1)) : 1;

        // Construct info message and range detail
        if (records.length > 0) {
            const newest = records[0];
            const oldest = records[records.length - 1];

            // Set Form Data for persistence
            setoranForm.surah_from = oldest.surah_from || 1;
            setoranForm.ayat_from = oldest.ayat_from || 1;
            setoranForm.surah_from_latin = oldest.surah_from_latin || '';
            
            setoranForm.surah_to = newest.surah_to || 1;
            setoranForm.ayat_to = newest.ayat_to || 1;
            setoranForm.surah_to_latin = newest.surah_to_latin || '';

            const sNameStart = (oldest.surah_from_latin || 'Surat').replace(/^\d+\.\s*/, '');
            const sNameEnd = (newest.surah_to_latin || 'Surat').replace(/^\d+\.\s*/, '');

            const rangeText = (setoranForm.surah_from === setoranForm.surah_to)
                ? `${sNameStart}: ${setoranForm.ayat_from}-${setoranForm.ayat_to}`
                : `${sNameStart} ${setoranForm.ayat_from} - ${sNameEnd} ${setoranForm.ayat_to}`;

            infoText = `Otomatis: <b>${rangeText}, ${finalPages.toFixed(1)} H</b> (Gabungan ${records.length} Sabaq)`;
        } else {
            infoText = `Otomatis: 1 Hal (Data ${sourceType} tidak ditemukan)`;
            setoranForm.pages = 1;
        }

        setoranForm.pages = parseFloat(finalPages.toFixed(1));
        autoCalcInfo.value.visible = true;
        autoCalcInfo.value.text = infoText;

        updateGrade();
    };


    onMounted(() => {
        document.addEventListener('click', closeAllMenus);

        // Start live clock
        clockInterval = setInterval(() => {
            if (isClockRunning.value && !setoranEditingId.value) {
                setoranForm.setoran_time = window.DateUtils.getCurrentTimeString();
                // Also update date just in case it's midnight
                setoranForm.setoran_date = window.DateUtils.getTodayDateString();
            }
        }, 10000); // Check every 10s is better than 60s for precision
    });

    onUnmounted(() => {
        document.removeEventListener('click', closeAllMenus);
        if (clockInterval) clearInterval(clockInterval);
    });

    // Stop clock if editing
    watch(setoranEditingId, (newVal) => {
        if (newVal) isClockRunning.value = false;
    });

    // Auto sync ayat_to from ayat_from
    watch(() => setoranForm.ayat_from, (newVal) => {
        if (newVal !== '' && (setoranForm.ayat_to === '' || Number(setoranForm.ayat_to) < Number(newVal))) {
            setoranForm.ayat_to = newVal;
        }
    });

    // Auto sync page_to from page_from
    watch(() => setoranForm.page_from, (newVal) => {
        if (newVal !== '' && (setoranForm.page_to === '' || Number(setoranForm.page_to) < Number(newVal))) {
            setoranForm.page_to = newVal;
        }
    });

    // Auto sync juz_to from juz_from (v36)
    watch(() => setoranForm.juz_from, (newVal) => {
        if (newVal !== '' && (setoranForm.juz_to === '' || Number(setoranForm.juz_to) < Number(newVal))) {
            setoranForm.juz_to = newVal;
        }
        if (setoranForm.setoran_type === 'Tilawah' && setoranForm.tilawah_mode === 'juz') {
            calcPagesFromJuzRange();
        }
    });

    watch(() => setoranForm.juz_to, () => {
        if (setoranForm.setoran_type === 'Tilawah' && setoranForm.tilawah_mode === 'juz') {
            calcPagesFromJuzRange();
        }
    });

    // Watch Manzil Juz Change
    watch(() => setoranForm.juz, (newVal) => {
        if (setoranForm.setoran_type === 'Manzil' && setoranForm.manzil_mode === 'juz') {
            setoranForm.pages = getJuzPageCount(newVal);
            updateGrade();
        }
    });

    // Watch for Santri change to trigger auto-calc if in Sabqi/Robt mode
    watch(() => setoranForm.santri_id, (newVal) => {
        if (newVal && (setoranForm.setoran_type === 'Sabqi' || setoranForm.setoran_type === 'Robt')) {
            handleAutoCalc();
        }
    });

    /**
     * Reset Form to Defaults
     */
    const resetSetoranForm = (keepSantri = false) => {
        // Reset Common
        if (!keepSantri) {
            // v36: Santri/Wali lock
            if (userSession.value && (userSession.value.role === 'santri' || userSession.value.role === 'wali')) {
                setoranForm.santri_id = userSession.value.child_id || '';
            } else {
                setoranForm.santri_id = '';
            }
            setoranSantriSearch.value = '';
        }

        setoranForm.setoran_date = window.DateUtils.getTodayDateString();
        setoranForm.setoran_time = window.DateUtils.getCurrentTimeString();
        setoranForm.errors = 0;
        isClockRunning.value = true; // Restart clock on reset

        // Reset Type Specifics
        if (setoranForm.setoran_type === 'Sabaq') {
            setoranForm.surah_from = 1;
            setoranForm.surah_to = 1;
            setoranForm.ayat_from = 1;
            setoranForm.ayat_to = 1;
            setoranForm.pages = 1;
        } else if (setoranForm.setoran_type === 'Manzil') {
            setoranForm.manzil_mode = 'page';
            setoranForm.page_from = 1;
            setoranForm.page_to = 1;
            setoranForm.pages = 1;
        } else if (setoranForm.setoran_type === 'Tilawah') {
            setoranForm.tilawah_mode = 'juz';
            setoranForm.page_from = 1;
            setoranForm.page_to = 1;
            setoranForm.juz_from = 1;
            setoranForm.juz_to = 1;
            setoranForm.pages = 1;
        } else {
            // Sabqi / Robt
            setoranForm.pages = 1;
        }

        setoranEditingId.value = null;
        updateGrade();
    };

    /**
     * Save setoran (CREATE or UPDATE)
     */
    const saveSetoran = async () => {
        if (!setoranForm.santri_id) {
            window.showAlert('Pilih Santri terlebih dahulu', 'Peringatan', 'warning');
            return;
        }

        // --- Role Protection (v36) ---
        const role = userSession.value?.role;
        const isHoliday = appConfig?.value?.isHolidayMode === true;
        
        // Only Admin, Guru, OR (Santri/Wali during Holiday Mode) can save
        const canHolidaySave = (role === 'santri' || role === 'wali') && isHoliday;
        
        if (role !== 'admin' && role !== 'guru' && !canHolidaySave) {
            window.showAlert("Anda tidak memiliki akses untuk menyimpan data saat ini.", "Dilarang", "danger");
            return;
        }

        return window.withSaving(async () => {
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
                    counted: setoranForm.counted,
                    // Holiday Mode Flag & Category (v36)
                    is_holiday: appConfig?.value?.isHolidayMode || false,
                    input_by: role,
                    category: (appConfig?.value?.isHolidayMode && (role === 'santri' || role === 'wali'))
                        ? `${setoranForm.setoran_type} (Mandiri)`
                        : setoranForm.setoran_type
                };

                // Add type-specific fields
                if (['Sabaq', 'Sabqi', 'Robt'].includes(setoranForm.setoran_type)) {
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
                } else if (setoranForm.setoran_type === 'Tilawah') {
                    payload.tilawah_mode = setoranForm.tilawah_mode;
                    if (setoranForm.tilawah_mode === 'juz') {
                        payload.juz_from = setoranForm.juz_from;
                        payload.juz_to = setoranForm.juz_to;
                    } else {
                        payload.page_from = setoranForm.page_from;
                        payload.page_to = setoranForm.page_to;
                    }
                }

                // CREATE or UPDATE
                if (setoranEditingId.value) {
                    // UPDATE mode
                    await DB.update(setoranEditingId.value, payload);

                    // --- NOTIFICATION UPDATE (v36) ---
                    const santri = uiData.santri.find(s => s.santri_id === setoranForm.santri_id || s._id === setoranForm.santri_id);
                    if (santri && window.NotificationService) {
                        window.NotificationService.notifySetoran(santri, setoranForm.setoran_type, setoranForm.pages, setoranEditingId.value);
                    }

                    window.showAlert('Setoran berhasil diupdate!', 'Sukses', 'info');
                } else {
                    // CREATE mode
                    const res = await DB.create('setoran', payload);
                    window.showAlert('Setoran berhasil disimpan!', 'Sukses', 'info');

                    // --- NOTIFICATION TRIGGER (v36) ---
                    const santri = uiData.santri.find(s => s.santri_id === setoranForm.santri_id || s._id === setoranForm.santri_id);
                    if (santri && window.NotificationService) {
                        window.NotificationService.notifySetoran(santri, setoranForm.setoran_type, setoranForm.pages, res._id);
                    }
                }

                // Refresh data
                if (refreshData) {
                    refreshData();
                }

                // FULL RESET (Keep Santri for batch input)
                resetSetoranForm(true);

                return true;
            } catch (error) {
                console.error('Error saving setoran:', error);
                window.showAlert('Gagal menyimpan setoran: ' + error.message, 'Error', 'danger');
                return false;
            }
        }); // end withSaving
    };

    /**
     * Delete setoran record
     */
    const deleteSetoran = async (setoranId) => {
        if (!setoranId) return;

        const role = userSession.value?.role;
        const isHoliday = appConfig?.value?.isHolidayMode === true;
        const canHolidayDelete = (role === 'santri' || role === 'wali') && isHoliday;

        // v37: Precise Protection
        // 1. Admin/Guru can delete everything
        if (role === 'admin' || role === 'guru') {
            // Allow
        } 
        // 2. Santri/Wali can only delete Mandiri records during Holiday
        else if (canHolidayDelete) {
            // v37 Fix: Search in ALL data to ensure we find old records too
            const allData = DB.getAll();
            const setoran = allData.find(s => s._id === setoranId && s.__type === 'setoran');
            const creator = setoran ? setoran.input_by : null;
            
            if (creator === 'admin' || creator === 'guru') {
                window.showAlert("Anda tidak diperbolehkan menghapus data yang dimasukkan oleh Guru/Admin.", "Dilarang", "danger");
                return;
            }
        } 
        else {
            window.showAlert("Anda tidak memiliki akses untuk menghapus data saat ini.", "Dilarang", "danger");
            return;
        }

        window.showConfirm({
            title: 'Hapus Setoran',
            message: 'Hapus data setoran ini?',
            confirmText: 'Ya, Hapus',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await DB.delete(setoranId);
                    if (window.NotificationService) {
                        window.NotificationService.removeBySource(setoranId);
                    }
                    if (refreshData) refreshData();
                    window.showAlert('Setoran berhasil dihapus!', 'Sukses', 'info');
                } catch (error) {
                    console.error('Error deleting setoran:', error);
                    window.showAlert('Gagal menghapus setoran: ' + error.message, 'Error', 'danger');
                }
            }
        });
    };

    /**
     * Edit setoran - load data into form
     */
    const editSetoran = (setoran) => {
        if (!setoran) return;

        // --- Role Protection (v37) ---
        const role = userSession.value?.role;
        const isHoliday = appConfig?.value?.isHolidayMode === true;

        if (role === 'santri' || role === 'wali') {
            if (!isHoliday) {
                window.showAlert("Penyuntingan hanya diizinkan selama Masa Liburan.", "Akses Dibatasi", "warning");
                return;
            }
            if (setoran.input_by === 'admin' || setoran.input_by === 'guru') {
                window.showAlert("Anda tidak boleh mengedit data yang dimasukkan oleh Guru/Admin.", "Dilarang", "danger");
                return;
            }
        }


        // Toggle Off if clicking SAME item
        if (setoranEditingId.value === setoran._id) {
            resetSetoranForm();
            return;
        }

        // Set editing mode
        setoranEditingId.value = setoran._id;
        // Load data into form
        setoranForm.santri_id = setoran.santri_id;
        setoranForm.setoran_type = setoran.setoran_type;
        setoranForm.setoran_date = setoran.setoran_date;
        setoranForm.setoran_time = setoran.setoran_time;
        setoranForm.pages = setoran.pages || 1;
        setoranForm.errors = setoran.errors || 0;

        // Type-specific fields
        if (['Sabaq', 'Sabqi', 'Robt'].includes(setoran.setoran_type)) {
            setoranForm.surah_from = setoran.surah_from || 1;
            setoranForm.surah_to = setoran.surah_to || 1;
            setoranForm.ayat_from = setoran.ayat_from || 1;
            setoranForm.ayat_to = setoran.ayat_to || 1;
        } else if (setoran.setoran_type === 'Manzil') {
            setoranForm.manzil_mode = setoran.manzil_mode || 'juz';
            setoranForm.juz = setoran.juz || 1;
            setoranForm.page_from = setoran.page_from || 1;
            setoranForm.page_to = setoran.page_to || 20;
        } else if (setoran.setoran_type === 'Tilawah') {
            setoranForm.tilawah_mode = setoran.tilawah_mode || 'page';
            setoranForm.juz_from = setoran.juz_from || 1;
            setoranForm.juz_to = setoran.juz_to || 1;
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
    const cancelSetoranEdit = () => {
        setoranEditingId.value = null;
        // Reset form to defaults
        setoranForm.pages = (setoranForm.setoran_type === 'Manzil' || setoranForm.setoran_type === 'Tilawah') ? 20 : 1;
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
    const closeAllMenus = () => {
        Object.keys(menuStates.value).forEach(key => {
            menuStates.value[key] = false;
        });
    };



    // Return everything needed for template
    return {
        setoranForm,
        autoCalcInfo,
        surahHints,
        setoranEditingId,

        // Search State
        setoranSantriSearch,
        isSetoranSantriDropdownOpen,
        setoranFilteredSantriOptions,
        selectSetoranSantri,
        setoranSelectedSantriName,

        surahList,
        recentSetoran,

        // Modes
        toggleManzilMode,
        toggleTilawahMode,
        calcPagesFromJuzRange,
        calcPagesFromRange,
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
        cancelSetoranEdit,
        saveSetoran,
        deleteSetoran,
        resetSetoranForm,

        // Realtime Clock Status
        isClockRunning,

        // Helpers
        getSantriName,
        formatSetoranDetail,
        formatDate: window.DateUtils.formatDate,
        formatDateFriendly: window.DateUtils.formatDateFriendly,
        formatDateLong: window.DateUtils.formatDateLong,
        formatTime: window.DateUtils.formatTime,

        lastRecordForType,
        applyLastRecord,
        santriTargetProgress,
        getJuzPageCount,

        // Surah Search (v37)
        surahSearch,
        filteredSurahList
    };
}
