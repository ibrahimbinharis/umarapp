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
        jumpPage: 1,
        jumpSurah: '',
        jumpAyat: ''
    });

    // --- COMPUTED ---
    const quranImageSrc = computed(() => {
        const p = quranState.page.toString().padStart(3, '0');
        return `https://android.quran.com/data/width_1024/page${p}.png`;
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
        const JUZ_PAGE_START = {
            1: 1, 2: 22, 3: 42, 4: 62, 5: 82, 6: 102, 7: 122, 8: 142, 9: 162, 10: 182,
            11: 202, 12: 222, 13: 242, 14: 262, 15: 282, 16: 302, 17: 322, 18: 342, 19: 362, 20: 382,
            21: 402, 22: 422, 23: 442, 24: 462, 25: 482, 26: 502, 27: 522, 28: 542, 29: 562, 30: 582
        };

        // Exact match or approximation
        // Iterate to find the range
        let juz = 1;
        for (const [j, p] of Object.entries(JUZ_PAGE_START)) {
            if (quranState.page >= p) juz = j;
        }
        return juz;
    });

    // --- METHODS ---
    const nextQPage = () => {
        if (quranState.page < 604) quranState.page++;
    };

    const prevQPage = () => {
        if (quranState.page > 1) quranState.page--;
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
            alert('Halaman harus 1-604');
        }
    };

    const goToJuz = (juzNo) => {
        const JUZ_PAGE_START = {
            1: 1, 2: 22, 3: 42, 4: 62, 5: 82, 6: 102, 7: 122, 8: 142, 9: 162, 10: 182,
            11: 202, 12: 222, 13: 242, 14: 262, 15: 282, 16: 302, 17: 322, 18: 342, 19: 362, 20: 382,
            21: 402, 22: 422, 23: 442, 24: 462, 25: 482, 26: 502, 27: 522, 28: 542, 29: 562, 30: 582
        };
        if (JUZ_PAGE_START[juzNo]) {
            quranState.page = JUZ_PAGE_START[juzNo];
            quranState.showDrawer = false;
        }
    };

    const jumpToAyat = async () => {
        const sNo = quranState.jumpSurah;
        const ayat = quranState.jumpAyat;
        if (!sNo) return alert("Pilih surat dahulu");
        if (!ayat) return goToSurah(sNo);

        // Use API to find page
        try {
            const res = await fetch(`https://api.alquran.cloud/v1/ayah/${sNo}:${ayat}/en.asad`);
            const json = await res.json();
            if (json.code === 200 && json.data && json.data.page) {
                quranState.page = json.data.page;
                quranState.showDrawer = false;
            } else {
                alert("Ayat tidak ditemukan");
            }
        } catch (e) {
            alert("Gagal koneksi API");
        }
    };

    return {
        quranState,
        quranImageSrc,
        currentSurahName,
        currentJuz,
        nextQPage,
        prevQPage,
        goToSurah,
        jumpToSurahStart,
        jumpToPage,
        goToJuz,
        jumpToAyat
    };
}
