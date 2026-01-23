// --- 3. INPUT FORM (Legacy v31 Full Logic) ---
function renderInputForm() {
    refreshData();
    const sOpts = allData.filter(i => i.__type === 'santri').map(s => `<option value="${s.santri_id}">${s.full_name}</option>`).join('');

    // Ensure surahList is ready
    const surahOpts = surahList.map(s => `<option value="${s.no}">${s.no}. ${s.latin}</option>`).join('');

    const html = `
    <div class="fade-in pb-48">
        <h2 class="text-2xl font-bold px-2 mb-5">Input Setoran</h2>
        
        <div class="bg-white p-6 rounded-3xl border shadow-sm mx-2 space-y-5">
            <!-- Santri Select -->
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase">Santri</label>
                <select id="santriId" class="w-full p-3 border rounded-xl font-bold" onchange="handleAutoCalc()">
                    <option value="">-- Pilih --</option>${sOpts}
                </select>
            </div>
            
            <!-- Type Tabs -->
            <div class="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                ${['Sabaq', 'Sabqi', 'Robt', 'Manzil'].map((t, i) => `
                <label class="flex-1 min-w-[70px]">
                    <input type="radio" name="type" value="${t}" class="peer hidden" ${i === 0 ? 'checked' : ''} onchange="toggleFormType(); handleAutoCalc()">
                    <div class="py-2 text-center rounded-lg border text-sm font-bold text-slate-500 peer-checked:bg-primary peer-checked:text-white transition cursor-pointer">${t}</div>
                </label>`).join('')}
            </div>

            <!-- F. SABAQ -->
            <div id="form-sabaq" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold text-slate-400">Dari Surat</label>
                        <select id="sabaq_s_from" class="w-full p-2 border rounded-xl text-sm" onchange="window.syncSurah(); validateAyat('from')">${surahOpts}</select>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-400">Sampai Surat</label>
                        <select id="sabaq_s_to" class="w-full p-2 border rounded-xl text-sm" onchange="validateAyat('to')">${surahOpts}</select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold text-slate-400">Dari Ayat</label>
                        <input type="number" id="sabaq_a_from" class="w-full p-2 border rounded-xl text-center font-bold" placeholder="1" onchange="validateAyat('from')">
                        <p id="hint_from" class="text-[10px] text-slate-400 mt-1 text-center hidden"></p>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-400">Sampai Ayat</label>
                        <input type="number" id="sabaq_a_to" class="w-full p-2 border rounded-xl text-center font-bold" placeholder="10" onchange="validateAyat('to')">
                         <p id="hint_to" class="text-[10px] text-slate-400 mt-1 text-center hidden"></p>
                    </div>
                </div>
            </div>

            <!-- F. MANZIL -->
            <div id="form-manzil" class="hidden space-y-3">
                 <div>
                    <label class="text-xs font-bold text-slate-400">Opsi Input</label>
                    <select id="manzil_mode" class="w-full p-2 border rounded-xl font-bold" onchange="toggleManzilMode()">
                        <option value="juz">Per Juz</option>
                        <option value="page">Per Halaman</option>
                    </select>
                 </div>
                 <div id="fz_juz">
                    <label class="text-xs font-bold text-slate-400">Juz</label>
                    <select id="manzil_juz" class="w-full p-2 border rounded-xl font-bold" onchange="document.getElementById('pages').value=20; updateGrade()">
                        ${Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}">Juz ${i + 1}</option>`).join('')}
                    </select>
                 </div>
                 <div id="fz_page" class="hidden grid grid-cols-2 gap-3">
                    <div><label class="text-xs font-bold text-slate-400">Dari Hal</label><input type="number" id="mz_p_from" class="w-full p-2 border rounded-xl text-center font-bold" onchange="calcPages()"></div>
                    <div><label class="text-xs font-bold text-slate-400">Sampai Hal</label><input type="number" id="mz_p_to" class="w-full p-2 border rounded-xl text-center font-bold" onchange="calcPages()"></div>
                 </div>
            </div>
            
            <!-- AUTO INFO -->
            <div id="auto-info" class="hidden bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-2">
                 <span class="material-symbols-outlined text-blue-600">info</span>
                 <p id="auto-info-text" class="text-xs text-blue-800 font-medium">Otomatis menghitung...</p>
            </div>

            <!-- SCORING -->
            <div class="bg-slate-50 p-4 rounded-xl border space-y-4">
                 <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-xs font-bold text-slate-400">Halaman</label>
                        <div class="flex items-center gap-2">
                            <button onclick="adjVal('pages', -0.5)" class="size-8 rounded-lg bg-white border shadow-sm font-bold text-slate-500">-</button>
                            <input type="number" id="pages" class="w-full bg-white p-2 border rounded-lg text-center font-bold" value="1" onchange="updateGrade()">
                            <button onclick="adjVal('pages', 0.5)" class="size-8 rounded-lg bg-white border shadow-sm font-bold text-slate-500">+</button>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-400">Salah</label>
                        <div class="flex items-center gap-2">
                            <button onclick="adjVal('errors', -1)" class="size-8 rounded-lg bg-white border shadow-sm font-bold text-slate-500">-</button>
                            <input type="number" id="errors" class="w-full bg-white p-2 border rounded-lg text-center font-bold text-red-500" value="0" onchange="updateGrade()">
                            <button onclick="adjVal('errors', 1)" class="size-8 rounded-lg bg-white border shadow-sm font-bold text-slate-500">+</button>
                        </div>
                    </div>
                 </div>
                 
                 <!-- PREVIEW GRADE -->
                 <div class="flex justify-between items-center pt-2 border-t">
                     <span class="text-xs font-bold text-slate-400">Nilai & Grade</span>
                     <div class="text-right">
                         <span id="prevGrade" class="text-3xl font-black text-emerald-600">A+</span>
                         <span id="prevScore" class="text-xs font-mono text-slate-400 block">100.0</span>
                     </div>
                 </div>
            </div>

            <!-- META -->
            <div class="grid grid-cols-2 gap-3">
                <input type="date" id="date" value="${new Date().toISOString().split('T')[0]}" class="w-full p-2 border rounded-xl text-xs font-bold">
                <input type="time" id="time" value="${new Date().toTimeString().slice(0, 5)}" class="w-full p-2 border rounded-xl text-xs font-bold">
            </div>

            <button onclick="submitSetoran()" class="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg text-lg">Simpan Setoran</button>
        </div>
    </div>`;

    document.getElementById('app-root').innerHTML = renderLayout('input', html);
    toggleFormType(); // Init state
}

// Logic Functions attached to Window for HTML calls (or declared globally in scope)
window.syncSurah = function () { const start = document.getElementById('sabaq_s_from').value; const end = document.getElementById('sabaq_s_to'); if (end) end.value = start; };

window.toggleManzilMode = function () {
    const mode = document.getElementById('manzil_mode').value;
    const fj = document.getElementById('fz_juz');
    const fp = document.getElementById('fz_page');
    const p = document.getElementById('pages');

    if (mode === 'juz') {
        fj.classList.remove('hidden'); fp.classList.add('hidden');
        p.value = 20; // Default 1 Juz
        p.setAttribute('readonly', true);
    } else {
        fj.classList.add('hidden'); fp.classList.remove('hidden');
        p.value = 0;
        p.setAttribute('readonly', true); // Auto calc
    }
    updateGrade();
}

window.calcPages = function () {
    const f = parseInt(document.getElementById('mz_p_from').value) || 0;
    const t = parseInt(document.getElementById('mz_p_to').value) || 0;
    if (f > 0 && t >= f) {
        document.getElementById('pages').value = (t - f + 1);
        updateGrade();
    }
}

function toggleFormType() {
    const type = document.querySelector('input[name="type"]:checked').value;
    const s = document.getElementById('form-sabaq');
    const m = document.getElementById('form-manzil');
    const a = document.getElementById('auto-info');
    const p = document.getElementById('pages');

    s.classList.add('hidden'); m.classList.add('hidden'); a.classList.add('hidden');
    p.removeAttribute('readonly'); p.classList.remove('text-gray-400');

    if (type === 'Sabaq') {
        s.classList.remove('hidden');
    } else if (type === 'Manzil') {
        m.classList.remove('hidden');
        p.setAttribute('readonly', true); p.classList.add('text-gray-400');
        if (document.getElementById('manzil_mode')) toggleManzilMode();
    } else {
        a.classList.remove('hidden');
        p.setAttribute('readonly', true); p.classList.add('text-gray-400');
    }
}

function handleAutoCalc() {
    const t = document.querySelector('input[name="type"]:checked').value;
    const id = document.getElementById('santriId').value;
    if (!id) return;
    if (t === 'Sabqi' || t === 'Robt') {
        const r = getAutoPages(id, t);
        document.getElementById('pages').value = r.pages;
        document.getElementById('auto-info-text').innerText = r.info;
        updateGrade();
    }
}

function adjVal(id, v) {
    const el = document.getElementById(id);
    if (!el.hasAttribute('readonly') || id === 'errors') {
        el.value = Math.max(0, (parseFloat(el.value) || 0) + v);
        updateGrade();
    }
}

function updateGrade() {
    const p = parseFloat(document.getElementById('pages').value) || 0;
    const e = parseInt(document.getElementById('errors').value) || 0;
    const r = calculateGrade(p, e);
    document.getElementById('prevGrade').innerText = r.grade;
    document.getElementById('prevScore').innerText = r.score.toFixed(1);
    document.getElementById('prevGrade').className = `text-3xl font-black ${r.grade === 'C' ? 'text-red-600' : r.grade.startsWith('A') ? 'text-emerald-600' : 'text-blue-600'}`;
}

async function submitSetoran() {
    const id = document.getElementById('santriId').value;
    if (!id) return alert('Pilih Santri');
    const t = document.querySelector('input[name="type"]:checked').value;
    const p = parseFloat(document.getElementById('pages').value) || 0;
    const e = parseInt(document.getElementById('errors').value) || 0;
    const g = calculateGrade(p, e); // Get calculated grade

    let x = {};
    if (t === 'Sabaq') {
        const sf = document.getElementById('sabaq_s_from'); x.surah_from_latin = sf.options[sf.selectedIndex].text;
        const st = document.getElementById('sabaq_s_to'); x.surah_to_latin = st.options[st.selectedIndex].text;
        x.ayat_from = document.getElementById('sabaq_a_from').value;
        x.ayat_to = document.getElementById('sabaq_a_to').value;
    } else if (t === 'Manzil') {
        const mode = document.getElementById('manzil_mode').value;
        x.manzil_mode = mode;
        if (mode === 'juz') {
            x.juz = document.getElementById('manzil_juz').value;
        } else {
            x.page_from = document.getElementById('mz_p_from').value;
            x.page_to = document.getElementById('mz_p_to').value;
        }
    }

    await DB.create('setoran', {
        santri_id: id,
        setoran_date: document.getElementById('date').value,
        setoran_time: document.getElementById('time').value,
        setoran_type: t,
        pages: p,
        errors: e,
        score: g.score,
        grade: g.grade,
        counted: g.counted,
        ...x
    });

    alert("Disimpan");
    navigate('riwayat');
}

// Validasi Ayat (equran.id integration)
window.validateAyat = function (field) {
    const sId = field === 'from' ? 'sabaq_s_from' : 'sabaq_s_to';
    const aId = field === 'from' ? 'sabaq_a_from' : 'sabaq_a_to';
    const hId = field === 'from' ? 'hint_from' : 'hint_to';

    const surahNo = parseInt(document.getElementById(sId).value);
    const ayatInput = document.getElementById(aId);
    const hint = document.getElementById(hId);

    // Ensure surahList is populated
    if (!surahList || surahList.length === 0) return;

    const surah = surahList.find(s => s.no === surahNo);
    if (!surah) return;

    const max = surah.ayat;
    const val = parseInt(ayatInput.value);

    hint.classList.remove('hidden');
    hint.innerText = `Max: ${max} Ayat`;

    if (val > max) {
        ayatInput.value = max;
        hint.innerHTML = `<span class="text-red-500 font-bold">Max ${max}!</span>`;
        // Blink effect
        ayatInput.classList.add('bg-red-50', 'text-red-600');
        setTimeout(() => ayatInput.classList.remove('bg-red-50', 'text-red-600'), 1000);
    } else if (val < 1 && ayatInput.value !== '') {
        ayatInput.value = 1;
    }
};

window.syncSurah = function () {
    const f = document.getElementById('sabaq_s_from');
    const t = document.getElementById('sabaq_s_to');
    if (t.value === '1' || parseInt(t.value) < parseInt(f.value)) {
        t.value = f.value;
    }
    validateAyat('from');
    validateAyat('to');
};

// --- AUTO PAGE CALCULATION ---
let surahPageCache = {};
let pageDensityCache = {};

async function fetchPageMap(surahNo) {
    if (surahPageCache[surahNo]) return surahPageCache[surahNo];

    // UI Feedback
    const hint = document.getElementById('auto-info-text');
    const box = document.getElementById('auto-info');
    if (box) { box.classList.remove('hidden'); hint.innerText = "Mengambil data halaman..."; }

    try {
        // Using api.alquran.cloud for reliable Verse->Page mapping
        const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNo}`);
        const json = await res.json();

        if (json.code === 200 && json.data && json.data.ayahs) {
            // Map: { ayat_number: page_number }
            const map = {};
            const density = {}; // Count verses per page

            json.data.ayahs.forEach(a => {
                map[a.numberInSurah] = a.page;
                // Count density
                if (!density[a.page]) density[a.page] = 0;
                density[a.page]++;
            });
            surahPageCache[surahNo] = map;
            pageDensityCache[surahNo] = density;
            if (box) box.classList.add('hidden');
            return map;
        }
    } catch (e) {
        console.warn("Failed to fetch page map:", e);
        if (box) box.classList.add('hidden');
    }
    return null;
}

async function autoCalcPages() {
    const type = document.querySelector('input[name="type"]:checked').value;
    if (type !== 'Sabaq') return;

    const sNo1 = parseInt(document.getElementById('sabaq_s_from').value);
    const sNo2 = parseInt(document.getElementById('sabaq_s_to').value);

    if (!sNo1 || !sNo2) return;

    const aFrom = parseInt(document.getElementById('sabaq_a_from').value);
    const aTo = parseInt(document.getElementById('sabaq_a_to').value);

    // Swap logic if needed (optional, assuming user inputs correctly or simple generic validation)
    // Here we strictly follow Input Fields: Start -> End.

    if (!aFrom || !aTo) return;

    // Fetch Maps for BOTH Surahs
    const map1 = await fetchPageMap(sNo1);
    const map2 = (sNo1 === sNo2) ? map1 : await fetchPageMap(sNo2);

    if (!map1 || !map2) return;

    let pStart = map1[aFrom];
    let pEnd = map2[aTo];

    // Fallback
    if (!pStart) pStart = map1[Object.keys(map1).pop()];
    if (!pEnd) pEnd = map2[Object.keys(map2).pop()];

    if (pStart && pEnd) {
        let exactCount = 0;

        if (pStart === pEnd) {
            // Same Page Logic
            let density1 = pageDensityCache[sNo1]?.[pStart] || 0;
            let density2 = (sNo1 !== sNo2) ? (pageDensityCache[sNo2]?.[pEnd] || 0) : 0;
            let totalDensity = density1 + density2;
            if (totalDensity === 0) totalDensity = 15;

            let versesCov = 0;
            if (sNo1 === sNo2) versesCov = Math.abs(aTo - aFrom) + 1;
            else versesCov = totalDensity; // Transition: assume full coverage if different surahs on same page

            exactCount = versesCov / totalDensity;
        } else {
            // Multi Page Logic
            // 1. Full Middle Pages
            let middlePages = Math.max(0, pEnd - pStart - 1);

            // 2. Start Page Fraction
            const d1 = pageDensityCache[sNo1]?.[pStart] || 15;
            // Verses of S1 on pStart
            const s1VersesOnPage = Object.entries(map1).filter(([k, v]) => v === pStart).map(([k, v]) => parseInt(k));
            const s1EndVerseOnPage = Math.max(...s1VersesOnPage);
            const capturedStart = (s1EndVerseOnPage - aFrom) + 1;
            const fracStart = Math.max(0, capturedStart) / d1;

            // 3. End Page Fraction
            const d2 = pageDensityCache[sNo2]?.[pEnd] || 15;
            // Verses of S2 on pEnd
            const s2VersesOnPage = Object.entries(map2).filter(([k, v]) => v === pEnd).map(([k, v]) => parseInt(k));
            const s2StartVerseOnPage = Math.min(...s2VersesOnPage);
            const capturedEnd = (aTo - s2StartVerseOnPage) + 1;
            const fracEnd = Math.max(0, capturedEnd) / d2;

            exactCount = middlePages + fracStart + fracEnd;
        }

        let final = parseFloat(exactCount.toFixed(1));
        if (final < 0.1) final = 0.1;

        const pageInput = document.getElementById('pages');
        if (pageInput) {
            pageInput.parentElement.classList.add('animate-pulse');
            setTimeout(() => pageInput.parentElement.classList.remove('animate-pulse'), 500);
            pageInput.value = final;
            updateGrade(); // Trigger grade recalc
        }

        const hint = document.getElementById('auto-info-text');
        const box = document.getElementById('auto-info');
        if (box) {
            box.classList.remove('hidden');
            hint.innerHTML = `Otomatis: <b>${final} Hal</b> (Hal ${pStart} - ${pEnd})`;
            setTimeout(() => box.classList.add('hidden'), 5000);
        }
    }
}

// Hook into validation
const originalValid = window.validateAyat;
window.validateAyat = function (field) {
    if (originalValid) originalValid(field);
    // Debounce calc
    if (window._calcTimer) clearTimeout(window._calcTimer);
    window._calcTimer = setTimeout(autoCalcPages, 800);
};
