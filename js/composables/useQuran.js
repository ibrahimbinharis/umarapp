/**
 * useQuran Composable
 * 
 * Manages Al-Quran viewer state and navigation
 * - Page navigation (Next/Prev)
 * - Jump to Surah/Page/Ayat
 * - API integration for Ayat lookup
 * 
 * Dependencies: uiData (from parent) for Surah names
 */

const SURAH_PAGE_START = {
    1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187, 10: 208,
    11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267, 17: 282, 18: 293, 19: 305, 20: 312,
    21: 322, 22: 332, 23: 342, 24: 350, 25: 359, 26: 367, 27: 377, 28: 385, 29: 396, 30: 404,
    31: 411, 32: 415, 33: 418, 34: 428, 35: 434, 36: 440, 37: 446, 38: 453, 39: 458, 40: 467,
    41: 477, 42: 483, 43: 489, 44: 496, 45: 499, 46: 502, 47: 507, 48: 511, 49: 515, 50: 518,
    51: 520, 52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537, 58: 542, 59: 545, 60: 549,
    61: 551, 62: 553, 63: 554, 64: 556, 65: 558, 66: 560, 67: 562, 68: 564, 69: 566, 70: 568,
    71: 570, 72: 572, 73: 574, 74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583, 80: 585,
    81: 586, 82: 587, 83: 587, 84: 589, 85: 590, 86: 591, 87: 591, 88: 592, 89: 593, 90: 594,
    91: 595, 92: 595, 93: 596, 94: 596, 95: 597, 96: 597, 97: 598, 98: 598, 99: 599, 100: 599,
    101: 600, 102: 600, 103: 601, 104: 601, 105: 601, 106: 602, 107: 602, 108: 602, 109: 603, 110: 603,
    111: 603, 112: 604, 113: 604, 114: 604
};

function useQuran(uiData) {
    const { reactive, computed } = Vue;

    // --- STATE ---
    const quranState = reactive({
        page: 1,
        maxPage: 604,
        showDrawer: false,
        jumpSurahSearch: '',
        jumpJuzSearch: '',
        jumpAyat: '',
        touchStartX: 0,
        touchEndX: 0,
        isSurahDropdownOpen: false,
        isJuzDropdownOpen: false,
        windowWidth: window.innerWidth
    });

    // Handle Window Resize
    const handleResize = () => {
        quranState.windowWidth = window.innerWidth;
    };
    window.addEventListener('resize', handleResize);

    // --- COMPUTED ---
    const isDesktop = computed(() => quranState.windowWidth >= 768);

    const filteredSurahList = computed(() => {
        const list = uiData.surahList || [];
        if (!quranState.jumpSurahSearch) return list;
        const q = quranState.jumpSurahSearch.toLowerCase();
        return list.filter(s => 
            s.latin.toLowerCase().includes(q) || 
            s.no.toString().includes(q)
        );
    });

    const filteredJuzList = computed(() => {
        const list = Array.from({length: 30}, (_, i) => i + 1);
        if (!quranState.jumpJuzSearch) return list;
        const q = quranState.jumpJuzSearch.toLowerCase();
        return list.filter(j => j.toString().includes(q) || `juz ${j}`.includes(q));
    });

    const getImageUrl = (pNum) => {
        if (!pNum || pNum > 604) return null;
        const p = pNum.toString().padStart(3, '0');
        return `https://android.quran.com/data/width_1024/page${p}.png`;
    };

    const quranImageSrc = computed(() => getImageUrl(quranState.page));
    const rightPageImageUrl = computed(() => getImageUrl(rightPage.value));
    const leftPageImageUrl = computed(() => getImageUrl(leftPage.value));

    const rightPage = computed(() => {
        // Right is always ODD.
        // If current is even (e.g 2), right is 2-1=1. If current is odd (e.g 1), right is 1.
        return quranState.page % 2 === 0 ? quranState.page - 1 : quranState.page;
    });

    const leftPage = computed(() => {
        // Left is always EVEN.
        // If current is even (e.g 2), left is 2. If current is odd (e.g 1), left is 1+1=2.
        const lp = quranState.page % 2 === 0 ? quranState.page : quranState.page + 1;
        return lp > 604 ? null : lp;
    });

    const currentSurahName = computed(() => {
        // Find surah based on page
        // Check reverse from SURAH_PAGE_START
        let sFound = 1;
        for (const [s, pStart] of Object.entries(SURAH_PAGE_START)) {
            if (quranState.page >= pStart) sFound = s;
        }
        const sData = (uiData.surahList || []).find(x => x.number == sFound || x.no == sFound);
        return sData ? sData.latin : 'Al-Fatihah';
    });

    const currentJuz = computed(() => {
        if (window.QuranUtils && window.QuranUtils.getJuzFromPage) {
            return window.QuranUtils.getJuzFromPage(quranState.page);
        }
        return 1;
    });

    // --- METHODS ---
    const nextQPage = () => {
        const step = isDesktop.value ? 2 : 1;
        if (quranState.page + step <= 604) {
            quranState.page += step;
        } else if (quranState.page < 604) {
            quranState.page = 604;
        }
    };

    const prevQPage = () => {
        const step = isDesktop.value ? 2 : 1;
        if (quranState.page - step >= 1) {
            quranState.page -= step;
        } else if (quranState.page > 1) {
            quranState.page = 1;
        }
    };

    const goToSurah = (sNo) => {
        if (sNo && SURAH_PAGE_START[sNo]) {
            quranState.page = SURAH_PAGE_START[sNo];
            quranState.showDrawer = false;
        }
    };

    const jumpToSurahStart = () => {
        const sNo = quranState.jumpSurah;
        goToSurah(sNo);
    };

    const jumpToPage = () => {
        const p = parseInt(quranState.jumpPage);
        if (p >= 1 && p <= 604) {
            quranState.page = p;
            quranState.showDrawer = false;
        } else {
            window.showAlert('Halaman harus 1-604', 'Peringatan', 'warning');
        }
    };

    const goToJuz = (juzNo) => {
        if (window.QuranUtils && window.QuranUtils.JUZ_BOUNDARIES) {
            const boundary = window.QuranUtils.JUZ_BOUNDARIES[juzNo - 1];
            if (boundary) {
                quranState.page = boundary;
                quranState.showDrawer = false;
            }
        }
    };

    const jumpToAyat = async () => {
        const sNo = quranState.jumpSurah;
        const ayat = quranState.jumpAyat;
        if (!sNo) return window.showAlert("Pilih surat dahulu", "Peringatan", "warning");
        if (!ayat) return goToSurah(sNo);

        // Use API to find page
        try {
            const res = await fetch(`https://api.alquran.cloud/v1/ayah/${sNo}:${ayat}/en.asad`);
            const json = await res.json();
            if (json.code === 200 && json.data && json.data.page) {
                quranState.page = json.data.page;
                quranState.showDrawer = false;
            } else {
                window.showAlert("Ayat tidak ditemukan", "Error", "danger");
            }
        } catch (e) {
            window.showAlert("Gagal koneksi API", "Error", "danger");
        }
    };

    // --- WATCHERS (Optimization) ---
    Vue.watch(() => quranState.page, (newPage) => {
        // Preload next and prev pages for smooth navigation
        const neighbors = [newPage + 1, newPage - 1];
        neighbors.forEach(p => {
            if (p >= 1 && p <= 604) {
                const img = new Image();
                const pStr = p.toString().padStart(3, '0');
                img.src = `https://android.quran.com/data/width_1024/page${pStr}.png`;
            }
        });
    }, { immediate: true });

    return {
        quranState,
        quranImageSrc,
        rightPageImageUrl,
        leftPageImageUrl,
        isDesktop,
        rightPage,
        leftPage,
        currentSurahName,
        currentJuz,
        filteredSurahList,
        filteredJuzList,
        nextQPage,
        prevQPage,
        goToSurah,
        jumpToSurahStart,
        jumpToPage,
        goToJuz,
        jumpToAyat,
        // Swipe Handlers
        handleTouchStart: (e) => {
            quranState.touchStartX = e.changedTouches[0].screenX;
        },
        handleTouchMove: (e) => {
            quranState.touchEndX = e.changedTouches[0].screenX;
        },
        handleTouchEnd: () => {
            if (!quranState.touchStartX || !quranState.touchEndX) return;
            const threshold = 50; // min distance
            const diff = quranState.touchStartX - quranState.touchEndX;

            if (Math.abs(diff) > threshold) {
                if (diff > 0) {
                    // Swipe Left (drag R->L) -> Prev Page (Mundur) because RTL
                    if (quranState.page > 1) quranState.page--;
                } else {
                    // Swipe Right (drag L->R) -> Next Page (Maju) because RTL
                    if (quranState.page < 604) quranState.page++;
                }
            }
            // Reset
            quranState.touchStartX = 0;
            quranState.touchEndX = 0;
        }
    };
}
