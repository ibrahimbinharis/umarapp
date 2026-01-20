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
                    <div><label class="text-xs font-bold text-slate-400">Dari Surat</label><select id="sabaq_s_from" class="w-full p-2 border rounded-xl text-sm" onchange="window.syncSurah()">${surahOpts}</select></div>
                    <div><label class="text-xs font-bold text-slate-400">Sampai Surat</label><select id="sabaq_s_to" class="w-full p-2 border rounded-xl text-sm">${surahOpts}</select></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="text-xs font-bold text-slate-400">Dari Ayat</label><input type="number" id="sabaq_a_from" class="w-full p-2 border rounded-xl text-center font-bold" placeholder="1"></div>
                    <div><label class="text-xs font-bold text-slate-400">Sampai Ayat</label><input type="number" id="sabaq_a_to" class="w-full p-2 border rounded-xl text-center font-bold" placeholder="10"></div>
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
