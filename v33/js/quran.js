// --- 9. QURAN DIGITAL MODULE (MUSHAF STYLE) ---
// Uses android.quran.com images for "App-like" feel
// Updates: Transparent Burger, Spacing, RTL Swipe

// Standard Madani Mapping (Surah No -> Start Page)
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

const JUZ_PAGE_START = {
    1: 1, 2: 22, 3: 42, 4: 62, 5: 82, 6: 102, 7: 122, 8: 142, 9: 162, 10: 182,
    11: 202, 12: 222, 13: 242, 14: 262, 15: 282, 16: 302, 17: 322, 18: 342, 19: 362, 20: 382,
    21: 402, 22: 422, 23: 442, 24: 462, 25: 482, 26: 502, 27: 522, 28: 542, 29: 562, 30: 582
};

let currentQPage = 1;

// Swipe State
let touchStartX = 0;
let touchEndX = 0;

function renderQuranPage() {
    refreshData();
    const html = `
    <div class="h-full flex flex-col bg-slate-50">
        <!-- Header -->
        <div class="px-3 py-2 bg-white border-b shadow-sm flex justify-between items-center z-20">
            <button onclick="navigate('dashboard')" class="p-2 text-slate-600 hover:text-primary transition rounded-full hover:bg-slate-100">
                <span class="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <!-- Burger Menu (Transparent & Clean) -->
            <button onclick="toggleNavDrawer()" class="p-2 text-slate-600 hover:text-primary transition rounded-full hover:bg-slate-100">
                <span class="material-symbols-outlined text-2xl">menu</span>
            </button>
        </div>

        <!-- Main Viewer Area -->
        <div id="quran-viewer" class="flex-1 relative overflow-hidden bg-[#fdfaf7] flex flex-col items-center justify-center">
            <!-- Image Container with Padding Bottom for Gap -->
            <div class="w-full h-full flex items-center justify-center relative bg-[#fdfaf7]" id="quran-img-container" 
                 ontouchstart="recordTouchStart(event)" 
                 ontouchend="detectSwipe(event)">
                 
                 <!-- Maximize Image Size -->
                 <img id="quran-page-img" src="" class="max-h-full max-w-full shadow-sm transition-opacity duration-200 select-none" alt="Halaman Quran" ondragstart="return false">
                 
                 <!-- Touch Navigation Overlay (RTL Logic) -->
                 <div class="absolute inset-0 flex">
                     <div onclick="nextQPage()" class="w-1/2 h-full z-10 cursor-pointer active:bg-black/5 transition"></div> 
                     <div onclick="prevQPage()" class="w-1/2 h-full z-10 cursor-pointer active:bg-black/5 transition"></div> 
                 </div>
            </div>
        </div>

        <!-- Sticky Footer Navigation -->
        <!-- Added pb-8 for mobile safe area -->
        <div class="bg-white border-t p-2 pb-4 flex justify-between items-center gap-3 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button onclick="nextQPage()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition">
                <span class="material-symbols-outlined">chevron_left</span> <span class="hidden sm:inline">Lanjut</span>
            </button>

            <div class="text-center w-32 border-x border-slate-100 flex flex-col justify-center">
                 <span class="block text-[10px] uppercase font-bold text-slate-400 tracking-wider" id="q-juz-num">Juz -</span>
                 <span class="block text-xl font-bold text-slate-800 leading-none" id="q-page-num">-</span>
            </div>

            <button onclick="prevQPage()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition">
                <span class="hidden sm:inline">Kembali</span> <span class="material-symbols-outlined">chevron_right</span>
            </button>
        </div>

        <!-- Navigation Drawer -->
        <div id="nav-drawer" onclick="if(event.target === this) toggleNavDrawer()" class="absolute inset-0 bg-black/50 z-30 hidden transition-opacity">
            <div class="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl flex flex-col transform transition-transform translate-x-full duration-300" id="nav-drawer-panel">
                <div class="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 class="font-bold text-slate-800">Navigasi</h3>
                    <button onclick="toggleNavDrawer()" class="size-8 flex items-center justify-center hover:bg-slate-200 rounded-full"><span class="material-symbols-outlined">close</span></button>
                </div>
                
                <div class="flex-1 overflow-y-auto p-4 space-y-6">
                    <!-- 1. Jump Logic -->
                    <div class="space-y-3">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Loncat ke Halaman</label>
                        <div class="flex gap-2">
                            <input type="number" id="jump-page-input" class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="1 - 604" min="1" max="604">
                            <button onclick="jumpToPage()" class="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm">Go</button>
                        </div>
                    </div>

                     <!-- 2. Ayat Logic -->
                    <div class="space-y-3 pt-4 border-t border-dashed">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Cari Surat & Ayat</label>
                        <select id="jump-surah-select" class="w-full border rounded-lg px-3 py-2 text-sm bg-white mb-2">
                            <option value="">Pilih Surat...</option>
                            ${surahList ? surahList.map(s => `<option value="${s.no}">${s.no}. ${s.latin}</option>`).join('') : ''}
                        </select>
                        <div class="flex gap-2">
                            <input type="number" id="jump-ayat-input" class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Ayat No.">
                            <button onclick="jumpToAyat()" class="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm">Cari</button>
                        </div>
                        <p id="jump-info" class="text-xs text-orange-500 italic hidden"></p>
                    </div>

                    <!-- 3. Juz Index -->
                    <div class="space-y-2 pt-4 border-t border-dashed">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Indeks Juz</label>
                        <select onchange="if(this.value) goToJuz(this.value)" class="w-full border rounded-lg px-3 py-2 text-sm bg-white mb-2">
                            <option value="">Pilih Juz...</option>
                            ${renderJuzListSimple()}
                        </select>
                    </div>

                    <!-- 4. Surah Index -->
                    <div class="space-y-2 pt-4 border-t border-dashed">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Indeks Surat</label>
                        <div class="space-y-1">
                             ${renderSurahListSimple()}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- EXAM MODE OVERLAY (Floating Button) -->
        <div id="exam-fab" class="hidden absolute bottom-24 right-4 z-50 w-14 h-14" style="touch-action: none;">
             <button id="exam-fab-btn" 
                     ontouchstart="initDrag(event)" onmousedown="initDrag(event)"
                     onclick="handleClickFab()" 
                     class="w-full h-full bg-primary text-white rounded-full shadow-lg border border-primary flex items-center justify-center transition active:scale-95 z-50">
                 <span class="material-symbols-outlined text-3xl">add</span>
             </button>
        </div>

        <!-- EXAM POPUP (Counter) -->
        <div id="exam-popup-overlay" class="hidden absolute inset-0 z-[60]" onclick="toggleExamPopup()"></div>
        <div id="exam-popup" class="hidden absolute bottom-40 right-4 bg-white rounded-xl shadow-xl border w-48 p-3 z-[61] animate-scale-in">
             <h3 class="font-bold text-slate-800 text-xs mb-2 text-center">Hitung Kesalahan</h3>
             <div class="flex items-center justify-between bg-slate-50 rounded-lg p-1 mb-2 border shadow-inner">
                 <button onclick="updateExamScore(-1)" class="size-8 bg-white border shadow text-slate-500 rounded font-bold text-lg active:scale-95">-</button>
                 <span id="exam-mistakes" class="text-2xl font-black text-red-500">0</span>
                 <button onclick="updateExamScore(1)" class="size-8 bg-white border shadow text-slate-500 rounded font-bold text-lg active:scale-95">+</button>
             </div>
             <button onclick="finishExam()" class="w-full bg-primary text-white py-1.5 rounded-lg font-bold text-xs shadow-lg shadow-primary/30">Simpan</button>
        </div>
    </div>`;

    document.getElementById('app-root').innerHTML = renderLayout('quran', html);
    loadQPage(currentQPage);

    // Animation Fix
    setTimeout(() => {
        const panel = document.getElementById('nav-drawer-panel');
        if (panel) panel.classList.remove('translate-x-full');
        // Check Exam Mode
        const isExam = localStorage.getItem('exam_mode');
        if (isExam) {
            document.getElementById('exam-fab').classList.remove('hidden');
            document.getElementById('exam-mistakes').innerText = localStorage.getItem('exam_mistakes') || 0;

            // Auto Jump logic validation
            const sJump = localStorage.getItem('exam_jump_surah');
            const aJump = localStorage.getItem('exam_jump_ayat');
            const jJump = localStorage.getItem('exam_jump_juz');

            if (jJump) {
                // Juz Exam Mode
                const page = JUZ_PAGE_START[jJump] || 1;
                loadQPage(page);
                localStorage.removeItem('exam_jump_juz');
            } else if (sJump && aJump) {
                // ... existing Surah/Ayat jump ...
                // Logic to find page for this surat:ayat
                // We reuse jumpToAyat logic but we need to find the Surah Number from Name first
                const sObj = surahList.find(s => s.latin === sJump);
                if (sObj) {
                    // Fetch API to resolve page
                    fetch(`https://api.alquran.cloud/v1/ayah/${sObj.no}:${aJump}/en.asad`)
                        .then(r => r.json())
                        .then(json => {
                            if (json.data && json.data.page) {
                                loadQPage(json.data.page);
                                // Clear Jump flags so we don't jump on every reload
                                localStorage.removeItem('exam_jump_surah');
                                localStorage.removeItem('exam_jump_ayat');
                            }
                        });
                }
            }
        }
    }, 50);
}

// --- EXAM MODE FUNCTIONS ---
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let hasMoved = false;

function initDrag(e) {
    // Only handle left click or touch
    if (e.type === 'mousedown' && e.button !== 0) return;

    isDragging = true;
    hasMoved = false;

    const fab_div = document.getElementById('exam-fab');
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Calculate offset relative to the element
    const rect = fab_div.getBoundingClientRect();
    dragOffset.x = clientX - rect.left;
    dragOffset.y = clientY - rect.top;

    // Add global listeners
    document.addEventListener(e.type === 'mousedown' ? 'mousemove' : 'touchmove', doDrag, { passive: false });
    document.addEventListener(e.type === 'mousedown' ? 'mouseup' : 'touchend', stopDrag);
}

function doDrag(e) {
    if (!isDragging) return;
    e.preventDefault(); // Prevent scroll/selection
    hasMoved = true;

    const fab_div = document.getElementById('exam-fab');
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    fab_div.style.left = (clientX - dragOffset.x) + 'px';
    fab_div.style.top = (clientY - dragOffset.y) + 'px';
    fab_div.style.bottom = 'auto';
    fab_div.style.right = 'auto';
}

function stopDrag(e) {
    isDragging = false;
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('touchmove', doDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);
}

function handleClickFab() {
    if (!hasMoved) {
        toggleExamPopup();
    }
}

function toggleExamPopup() {
    const p = document.getElementById('exam-popup');
    const o = document.getElementById('exam-popup-overlay');
    if (p.classList.contains('hidden')) {
        p.classList.remove('hidden');
        o.classList.remove('hidden');
    } else {
        p.classList.add('hidden');
        o.classList.add('hidden');
    }
}

function updateExamScore(change) {
    let curr = parseInt(document.getElementById('exam-mistakes').innerText) || 0;
    curr += change;
    if (curr < 0) curr = 0;
    document.getElementById('exam-mistakes').innerText = curr;
    // Persist immediately
    localStorage.setItem('exam_mistakes', curr);
}

function finishExam() {
    // 1. Get final mistakes
    const mistakes = document.getElementById('exam-mistakes').innerText;

    // 2. Set return payload
    localStorage.setItem('exam_return_data', JSON.stringify({ mistakes: mistakes }));

    // 3. Clear Exam Mode flag (but keep jump data cleared)
    localStorage.removeItem('exam_mode');
    localStorage.removeItem('exam_mistakes');

    // 4. Navigate back
    navigate('ujian');
}

function recordTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
}

function detectSwipe(e) {
    touchEndX = e.changedTouches[0].screenX;
    checkSwipeValues();
}

function checkSwipeValues() {
    const threshold = 40;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > threshold) {
        if (diff > 0) {
            // Swiped Left (Diff > 0, StartX > EndX)
            // User request: "kiri untuk kembali" (Left = Prev)
            prevQPage();
        } else {
            // Swiped Right (Diff < 0, StartX < EndX)
            // User request: "kanan untuk lanjut" (Right = Next)
            nextQPage();
        }
    }
}

function renderJuzListSimple() {
    let html = '';
    for (let i = 1; i <= 30; i++) {
        html += `<option value="${i}">Juz ${i}</option>`;
    }
    return html;
}

function renderSurahListSimple() {
    if (!surahList || surahList.length === 0) return '<div class="p-2 text-center text-xs">Memuat data...</div>';

    return surahList.map(s => `
        <button onclick="goToSurah(${s.no})" class="w-full text-left p-2 rounded hover:bg-slate-50 flex items-center gap-3 border-b border-transparent hover:border-slate-100 transition group">
            <span class="font-bold text-xs text-slate-400 group-hover:text-primary w-6">${s.no}</span>
            <div class="flex-1">
                <p class="font-bold text-sm text-slate-800">${s.latin}</p>
            </div>
        </button>
    `).join('');
}

function toggleNavDrawer() {
    const drawer = document.getElementById('nav-drawer');
    const panel = document.getElementById('nav-drawer-panel');

    if (drawer.classList.contains('hidden')) {
        drawer.classList.remove('hidden');
        setTimeout(() => panel.classList.remove('translate-x-full'), 10);
    } else {
        panel.classList.add('translate-x-full');
        setTimeout(() => drawer.classList.add('hidden'), 300);
    }
}

function goToSurah(surahNo) {
    const page = SURAH_PAGE_START[surahNo] || 1;
    loadQPage(page);
    toggleNavDrawer();
}

function goToJuz(juzNo) {
    const page = JUZ_PAGE_START[juzNo] || 1;
    loadQPage(page);
    toggleNavDrawer();
}

function jumpToPage() {
    const p = parseInt(document.getElementById('jump-page-input').value);
    if (p >= 1 && p <= 604) {
        loadQPage(p);
        toggleNavDrawer();
    } else {
        alert("Halaman tidak valid (1-604)");
    }
}

async function jumpToAyat() {
    const sNo = document.getElementById('jump-surah-select').value;
    const ayat = document.getElementById('jump-ayat-input').value;
    const info = document.getElementById('jump-info');

    if (!sNo) return alert("Pilih surat dahulu");

    // If only Surah selection, go to Surah start
    if (!ayat) {
        goToSurah(sNo);
        return;
    }

    // Resolving Page via API
    info.innerText = "Mencari halaman...";
    info.classList.remove('hidden');

    try {
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/${sNo}:${ayat}/en.asad`);
        const json = await res.json();

        if (json.code === 200 && json.data && json.data.page) {
            loadQPage(json.data.page);
            toggleNavDrawer();
        } else {
            alert("Ayat tidak ditemukan.");
        }
    } catch (e) {
        alert("Gagal koneksi API.");
    } finally {
        info.classList.add('hidden');
    }
}

function loadQPage(page) {
    if (page < 1) page = 1;
    if (page > 604) page = 604;

    currentQPage = page;

    const img = document.getElementById('quran-page-img');
    const label = document.getElementById('q-page-num');
    const juzLabel = document.getElementById('q-juz-num');
    const surahLabel = document.getElementById('q-surah-name');

    const pagePad = String(page).padStart(3, '0');
    const url = `https://android.quran.com/data/width_1024/page${pagePad}.png`;

    if (img) {
        // Preload generic loading behavior?
        img.style.opacity = '0.5';
        img.src = url;
        img.onload = () => img.style.opacity = '1';
    }

    if (label) label.innerText = page;

    // Update Header Surah Name based on Page logic
    if (surahLabel && typeof SURAH_PAGE_START !== 'undefined') {
        // Find Surah that starts at or before this page
        let sFound = 1;
        for (const [s, pStart] of Object.entries(SURAH_PAGE_START)) {
            if (page >= pStart) sFound = s;
        }
        // Get name
        if (typeof surahList !== 'undefined') {
            const sData = surahList.find(s => s.no == sFound);
            if (sData) surahLabel.innerText = sData.latin;
        }
    }

    // Determine current Juz
    if (juzLabel) {
        let currentJuz = 1;
        for (let j = 1; j <= 30; j++) {
            if (page >= JUZ_PAGE_START[j]) {
                currentJuz = j;
            }
        }
        juzLabel.innerText = "JUZ " + currentJuz;
    }
}

function nextQPage() {
    loadQPage(currentQPage + 1);
}

function prevQPage() {
    loadQPage(currentQPage - 1);
}
