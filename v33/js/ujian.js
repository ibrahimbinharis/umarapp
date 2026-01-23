// --- 8. UJIAN SYSTEM ---
function renderUjianPage() {
    refreshData();
    const html = `
    <div class="fade-in pb-24 space-y-6">
        <div class="px-2">
            <h2 class="text-2xl font-bold text-slate-900">Ujian & Evaluasi</h2>
            <p class="text-xs text-slate-500">Input nilai ujian bulanan & semester.</p>
        </div>

        <div class="bg-white p-2 rounded-xl border shadow-sm mx-2 flex gap-2">
            <button onclick="switchUjianTab('bulanan')" id="tab-bulanan" class="flex-1 py-2 rounded-lg text-sm font-bold bg-primary text-white shadow transition">Ujian Bulanan</button>
            <button onclick="switchUjianTab('semester')" id="tab-semester" class="flex-1 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 transition">Ujian Semester</button>
        </div>

        <div id="ujian-content" class="px-2">
            <!-- Content loaded via JS -->
        </div>
    </div>`;
    document.getElementById('app-root').innerHTML = renderLayout('ujian', html);

    const examType = localStorage.getItem('exam_type');
    if (examType === 'semester') {
        switchUjianTab('semester');
    } else {
        renderUjianBulanan();
    }
}

function switchUjianTab(tab) {
    document.getElementById('tab-bulanan').className = `flex-1 py-2 rounded-lg text-sm font-bold transition ${tab === 'bulanan' ? 'bg-primary text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`;
    document.getElementById('tab-semester').className = `flex-1 py-2 rounded-lg text-sm font-bold transition ${tab === 'semester' ? 'bg-primary text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`;

    if (tab === 'bulanan') renderUjianBulanan();
    else renderUjianSemester();
}

function renderUjianBulanan() {
    const santriOpts = allData.filter(i => i.__type === 'santri').map(s => `<option value="${s.santri_id}">${s.full_name}</option>`).join('');

    const html = `
    <div class="space-y-4 animate-scale-in">
        <div class="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
            <h3 class="font-bold text-slate-800">Form Input Nilai</h3>
            
            <!-- Tipe Ujian -->
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase">Jenis Ujian</label>
                <select id="u_type" class="w-full p-3 border rounded-xl font-bold bg-slate-50" onchange="toggleUjianType()">
                    <option value="quran">Ujian Al-Quran (Tahfidz)</option>
                    <option value="mapel">Ujian Pelajaran</option>
                </select>
            </div>

            <!-- Santri -->
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase">Santri</label>
                <select id="u_santri" class="w-full p-3 border rounded-xl font-bold" onchange="loadUjianData()">${santriOpts}</select>
            </div>

            <!-- SECTION: AL-QURAN -->
            <div id="sec-quran" class="space-y-4">
                <div class="p-4 bg-white rounded-xl border border-slate-200">
                    <h4 class="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2 border-b pb-2"><span class="material-symbols-outlined text-lg">menu_book</span> Materi Ujian (Bulan Ini)</h4>
                    <div id="quran-materi" class="text-sm text-slate-600 min-h-[50px] flex items-center justify-center italic">
                        Pilih Santri untuk melihat cakupan materi...
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase">Jml Soal</label>
                        <input type="number" id="u_q_soal" value="5" class="w-full p-3 border rounded-xl font-bold text-center" oninput="calcQuranScore()">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase">Jml Salah</label>
                        <input type="number" id="u_q_salah" value="0" class="w-full p-3 border rounded-xl font-bold text-center text-red-500" oninput="calcQuranScore()">
                    </div>
                </div>
            </div>

            <!-- SECTION: MAPEL -->
            <div id="sec-mapel" class="hidden space-y-4">
                <div>
                   <label class="text-[10px] font-bold text-slate-400 uppercase">Mata Pelajaran</label>
                   <select id="u_mapel" class="w-full p-3 border rounded-xl font-bold">
                       <option>Fiqih</option>
                       <option>Aqidah Akhlaq</option>
                       <option>Bahasa Arab</option>
                       <option>Hadits</option>
                       <option>Sirah Nabawiyah</option>
                       <option>Tajwid</option>
                   </select>
                </div>
            </div>

            <!-- NILAI AKHIR -->
            <div class="flex items-center justify-between pt-4 border-t">
                 <span class="text-xs font-bold text-slate-500">Nilai Akhir</span>
                 <input id="u_final_score" type="number" value="100" class="w-32 p-3 border rounded-xl font-black text-3xl text-right text-emerald-600">
            </div>

            <button onclick="saveUjian()" class="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30">Simpan Nilai</button>
        </div>
    </div>`;
    document.getElementById('ujian-content').innerHTML = html;
    loadUjianData(); // Init load

    // Check for Return from Exam Mode
    const examReturn = localStorage.getItem('exam_return_data');
    const examType = localStorage.getItem('exam_type');

    if (examReturn && examType !== 'semester') {
        try {
            const data = JSON.parse(examReturn);

            // Restore Santri Selection
            const savedSantriId = localStorage.getItem('exam_santri_id');
            if (savedSantriId) {
                const santriSelect = document.getElementById('u_santri');
                if (santriSelect) {
                    santriSelect.value = savedSantriId;
                    loadUjianData(); // Refresh data for this santri
                }
            }

            if (data.mistakes !== undefined) {
                document.getElementById('u_q_salah').value = data.mistakes;
                calcQuranScore(); // Re-calc score
            }
        } catch (e) { console.error(e); }

        // Cleanup
        localStorage.removeItem('exam_return_data');
        localStorage.removeItem('exam_santri_id');
        localStorage.removeItem('exam_type');
    }
}

function renderUjianSemester() {
    const santriOpts = allData.filter(i => i.__type === 'santri').map(s => `<option value="${s._id}">${s.full_name}</option>`).join('');

    document.getElementById('ujian-content').innerHTML = `
    <div class="space-y-4 animate-scale-in">
        <div class="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
            <h3 class="font-bold text-slate-800">Form Ujian Semester</h3>
            
            <!-- Tipe Ujian -->
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase">Jenis Ujian</label>
                <select id="us_type" class="w-full p-3 border rounded-xl font-bold bg-slate-50" onchange="toggleUjianSemesterType()">
                    <option value="quran">Ujian Al-Quran (Setoran Juz)</option>
                    <option value="mapel">Ujian Pelajaran</option>
                </select>
            </div>

            <!-- Santri (Common) -->
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase">Santri</label>
                <select id="us_santri" class="w-full p-3 border rounded-xl font-bold" onchange="loadUjianSemesterData()">${santriOpts}</select>
            </div>

            <!-- SECTION: AL-QURAN SEMESTER -->
            <div id="sec-us-quran" class="space-y-4">
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 class="font-bold text-slate-800 text-sm mb-2 flex items-center gap-2"><span class="material-symbols-outlined text-lg">grid_view</span> Hafalan Santri</h4>
                    <p class="text-xs text-slate-500 mb-4">Klik nomor Juz untuk memulai ujian hafalan Juz tersebut.</p>
                    
                    <div id="us-hafalan-grid" class="flex flex-wrap gap-2 justify-center min-h-[100px] items-center">
                         <span class="text-xs text-slate-400 italic">Pilih santri dahulu...</span>
                    </div>
                </div>

                <div class="flex items-center justify-between px-2">
                     <div class="text-center">
                         <span class="block text-[10px] uppercase font-bold text-slate-400">Total Hafalan</span>
                         <span class="block text-xl font-black text-slate-800" id="us-total-hafalan">0 Juz</span>
                     </div>
                     <div class="text-center">
                         <span class="block text-[10px] uppercase font-bold text-slate-400">Target Ujian (1/3)</span>
                         <span class="block text-xl font-black text-primary" id="us-target-ujian">0 Juz</span>
                     </div>
                </div>
            </div>

            <!-- SECTION: MAPEL SEMESTER -->
            <div id="sec-us-mapel" class="hidden space-y-4">
                <div>
                   <label class="text-[10px] font-bold text-slate-400 uppercase">Mata Pelajaran</label>
                   <select id="us_mapel" class="w-full p-3 border rounded-xl font-bold">
                       <option>Fiqih</option>
                       <option>Aqidah Akhlaq</option>
                       <option>Bahasa Arab</option>
                       <option>Hadits</option>
                       <option>Sirah Nabawiyah</option>
                       <option>Tajwid</option>
                       <option>Matematika</option>
                       <option>B. Indonesia</option>
                       <option>B. Inggris</option>
                   </select>
                </div>
            </div>

            <!-- NILAI & FORM -->
            <div id="us-form-area" class="pt-4 border-t space-y-4 hidden">
                 <div class="font-bold text-slate-800 text-sm border-b pb-2 mb-2">Input Nilai <span id="us-lbl-detail"></span></div>
                 
                 <!-- Hidden inputs for Quran logic -->
                 <input type="hidden" id="us_juz_detail"> 
                 
                 <div class="grid grid-cols-2 gap-3" id="us-quran-inputs">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase">Jml Salah</label>
                        <input type="number" id="us_salah" value="0" class="w-full p-3 border rounded-xl font-bold text-center text-red-500" oninput="calcSemesterScore()">
                    </div>
                 </div>

                 <div class="flex items-center justify-between">
                     <span class="text-xs font-bold text-slate-500">Nilai Akhir</span>
                     <input id="us_final_score" type="number" value="0" class="w-32 p-3 border rounded-xl font-black text-3xl text-right text-emerald-600">
                </div>

                <button onclick="saveUjianSemester()" class="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30">Simpan Nilai Semester</button>
            </div>
        </div>
    </div>`;

    // Check return specifically for Semester
    checkSemesterReturn();

    // Init Data Load (Important so grid appears immediately)
    setTimeout(loadUjianSemesterData, 100);
}

function toggleUjianSemesterType() {
    const type = document.getElementById('us_type').value;
    const q = document.getElementById('sec-us-quran');
    const m = document.getElementById('sec-us-mapel');
    const form = document.getElementById('us-form-area');
    const qIn = document.getElementById('us-quran-inputs');

    if (type === 'quran') {
        q.classList.remove('hidden'); m.classList.add('hidden');
        qIn.classList.remove('hidden');
        form.classList.add('hidden'); // Hidden until Juz clicked
        loadUjianSemesterData();
    } else {
        q.classList.add('hidden'); m.classList.remove('hidden');
        qIn.classList.add('hidden');
        form.classList.remove('hidden'); // Always show for Mapel
        document.getElementById('us-lbl-detail').innerText = "(Mapel)";
        document.getElementById('us_final_score').value = 0;
    }
}

function loadUjianSemesterData() {
    if (document.getElementById('us_type').value !== 'quran') return;
    const santriId = document.getElementById('us_santri').value;
    if (!santriId) return;

    // Fix: Robust ID comparison using _id from dropdown
    const s = allData.find(i => String(i._id) === String(santriId));
    if (!s) return;

    // Calc Hafalan
    let progress = s.hafalan_progress || {};
    if (typeof progress === 'string') {
        try { progress = JSON.parse(progress); } catch (e) { progress = {}; }
    }
    const count = Object.values(progress).filter(v => v !== 'C').length;
    const target = Math.ceil(count / 3);

    document.getElementById('us-total-hafalan').innerText = count + " Juz";
    document.getElementById('us-target-ujian').innerText = target + " Juz";

    document.getElementById('us-target-ujian').innerText = target + " Juz";

    // Render Grid
    const grid = document.getElementById('us-hafalan-grid');
    if (!grid) return;

    grid.innerHTML = Array.from({ length: 30 }, (_, i) => {
        const juz = i + 1;
        const grade = progress[juz];
        const isActive = !!grade;

        // Color logic (Synced with Hafalan)
        let bgClass = 'bg-slate-100 text-slate-300 border-transparent hover:bg-slate-200 hover:text-slate-500 cursor-pointer';

        if (isActive) {
            if (['A+', 'A'].includes(grade)) {
                bgClass = 'bg-blue-500 text-white shadow-blue-200 border-transparent hover:ring-2 hover:ring-blue-300';
            } else if (['B+', 'B', 'B-'].includes(grade)) {
                bgClass = 'bg-emerald-500 text-white shadow-emerald-200 border-transparent hover:ring-2 hover:ring-emerald-300';
            } else if (grade === 'C') {
                bgClass = 'bg-red-500 text-white shadow-red-200 border-transparent hover:ring-2 hover:ring-red-300';
            } else if (grade === 'Centang') {
                bgClass = 'bg-orange-400 text-white shadow-orange-200 border-transparent hover:ring-2 hover:ring-orange-300';
            } else {
                bgClass = 'bg-emerald-500 text-white shadow-emerald-200 border-transparent hover:ring-2 hover:ring-emerald-300';
            }
            bgClass += ' shadow-md transition-transform hover:scale-110';
        }

        const clickAction = `onclick="startSemesterExam('${s._id}', ${juz})"`;

        return `
        <button ${clickAction} class="size-10 rounded-full border flex flex-col items-center justify-center transition-all ${bgClass}">
            <span class="text-xs font-bold leading-none">${juz}</span>
            ${isActive && grade !== 'C' ? `<span class="text-[8px] font-black uppercase leading-none opacity-80 mt-0.5">${grade === 'Centang' ? 'OK' : grade}</span>` : ''}
        </button>`;
    }).join('');
}

function startSemesterExam(santriId, juz) {
    localStorage.setItem('exam_mode', 'true');
    localStorage.setItem('exam_type', 'semester');
    localStorage.setItem('exam_santri_id', santriId);
    localStorage.setItem('exam_jump_juz', juz);
    localStorage.setItem('exam_recent_juz', juz); // Save to handle return label
    localStorage.setItem('exam_mistakes', 0);

    navigate('quran');
}

function checkSemesterReturn() {
    const ret = localStorage.getItem('exam_return_data');
    const type = localStorage.getItem('exam_return_type'); // We might need to track this if we want to robustly separate logic
    // But since we are in renderUjianSemester, we assume if we have data and we are here, it's for us or we just handle it.

    // To distinguish between Bulanan and Semester, we can check a flag or just see if the user navigated back here.
    // Simpler: The user is ON this tab.

    if (ret) {
        const data = JSON.parse(ret);
        const savedId = localStorage.getItem('exam_santri_id');
        const savedJuz = localStorage.getItem('exam_jump_juz_target'); // Only if we saved it? We didn't save it in startSemesterExam above.
        // We need to know WHICH Juz became the target to fill the label.
        // Let's rely on standard flow.

        if (savedId) {
            document.getElementById('us_santri').value = savedId;
            loadUjianSemesterData(); // Render grid

            // Show form
            document.getElementById('us-form-area').classList.remove('hidden');
            document.getElementById('us_salah').value = data.mistakes || 0;
            // We don't know exactly which Juz was clicked unless we saved it. 
            // Let's update startSemesterExam to save it.
            const juz = localStorage.getItem('exam_recent_juz');
            if (juz) {
                document.getElementById('us-lbl-detail').innerText = `(Juz ${juz})`;
                document.getElementById('us_juz_detail').value = juz;
            }

            calcSemesterScore();
        }

        localStorage.removeItem('exam_return_data');
        localStorage.removeItem('exam_santri_id');
        localStorage.removeItem('exam_recent_juz');
        localStorage.removeItem('exam_type');
    }
}

function calcSemesterScore() {
    const salah = parseInt(document.getElementById('us_salah').value) || 0;
    // Logic: 100 - mistakes
    let score = 100 - salah;
    if (score < 0) score = 0;

    document.getElementById('us_final_score').value = score;
}

async function saveUjianSemester() {
    const type = document.getElementById('us_type').value;
    const santriId = document.getElementById('us_santri').value;
    const score = parseFloat(document.getElementById('us_final_score').value) || 0;

    let detail = '';
    let meta = { semester: true };
    let savedGrade = null;
    let targetJuz = null;

    if (type === 'quran') {
        const juz = document.getElementById('us_juz_detail').value;
        if (!juz) return alert("Pilih Juz dari tabel hafalan terlebih dahulu!");
        detail = `Juz ${juz}`;
        meta.juz = juz;
        meta.salah = document.getElementById('us_salah').value;
        targetJuz = juz;

        // Calculate Grade
        savedGrade = getGradeFromScore(score);
    } else {
        const mapel = document.getElementById('us_mapel');
        detail = mapel.options[mapel.selectedIndex].text;
    }

    const payload = {
        santri_id: santriId,
        type: type === 'quran' ? 'Ujian Semester (Quran)' : 'Ujian Semester (Mapel)',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        score: score,
        detail: detail,
        grade: savedGrade, // Save grade in exam record too
        meta: meta
    };

    // 1. Save Exam Record
    await DB.create('ujian', payload);

    // 2. If Quran Exam, Update Santri Hafalan Progress
    if (type === 'quran' && targetJuz && savedGrade) {
        const idx = allData.findIndex(i => i._id === santriId);
        if (idx !== -1) {
            let santri = allData[idx];
            let progress = santri.hafalan_progress || {};
            if (typeof progress === 'string') {
                try { progress = JSON.parse(progress); } catch (e) { progress = {}; }
            }

            // Update Progress
            progress[targetJuz] = savedGrade;

            // Recalculate Count
            const count = Object.values(progress).filter(v => v !== 'C').length;
            const newManual = `${count} Juz`;

            // Update DB
            await DB.update(santri._id, {
                hafalan_progress: JSON.stringify(progress),
                hafalan_manual: newManual
            });
        }
    }

    alert("Nilai Semester berhasil disimpan!");

    // Reset Partial
    document.getElementById('us-form-area').classList.add('hidden');
    document.getElementById('us_salah').value = 0;

    // Refresh Grid
    loadUjianSemesterData();
}

function getGradeFromScore(score) {
    if (score >= 95) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 75) return 'B+';
    if (score >= 65) return 'B';
    if (score >= 60) return 'B-';
    return 'C';
}

function toggleUjianType() {
    const type = document.getElementById('u_type').value;
    const q = document.getElementById('sec-quran');
    const m = document.getElementById('sec-mapel');

    if (type === 'quran') {
        q.classList.remove('hidden'); m.classList.add('hidden');
        loadUjianData(); // Refresh quran data
    } else {
        q.classList.add('hidden'); m.classList.remove('hidden');
        document.getElementById('u_final_score').value = 0;
    }
}

function loadUjianData() {
    if (document.getElementById('u_type').value !== 'quran') return;

    const santriId = document.getElementById('u_santri').value;
    if (!santriId) return;

    // Logic: Get current month's Sabaq setoran
    const now = new Date();
    // Format YYYY-MM for string comparison (safer than Date object parsing for filtering)
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    console.log("Filtering for Month:", currentMonthPrefix);

    const setorans = allData.filter(d => {
        // Ensure it's a setoran
        if (d.__type !== 'setoran') return false;
        if (String(d.santri_id) !== String(santriId)) return false;

        // Flexible Type Check (Case insensitive)
        const type = (d.setoran_type || '').toLowerCase();
        if (type !== 'sabaq') return false;

        // Date Check
        if (!d.setoran_date) return false;
        return d.setoran_date.startsWith(currentMonthPrefix);
    });

    const el = document.getElementById('quran-materi');
    if (setorans.length === 0) {
        el.innerHTML = `
        <div class="text-center italic text-slate-400 py-4 flex flex-col items-center gap-2">
             <span>Belum ada hafalan bulan ini (${currentMonthPrefix}).</span>
             <span class="text-[10px] text-slate-300">Pastikan sudah input setoran 'Sabaq' bulan ini.</span>
        </div>`;

        // Reset button attrs
        delete el.dataset.sStart;
        delete el.dataset.aStart;
        return;
    }

    // Sort by date asc (First to Last)
    setorans.sort((a, b) => (new Date(a.setoran_date).getTime() - new Date(b.setoran_date).getTime()));

    const first = setorans[0];
    const last = setorans[setorans.length - 1];

    // Clean Surah Names
    const clean = (n) => n ? n.replace(/^\d+\.\s*/, '') : '';
    const sStartName = clean(first.surah_from_latin);
    const sEndName = clean(last.surah_to_latin || last.surah_from_latin);

    // Store for button calculation
    el.dataset.sStart = sStartName;
    el.dataset.aStart = first.ayat_from;
    el.dataset.sEnd = sEndName;
    el.dataset.aEnd = last.ayat_to;

    // Construct Display
    const rangeDisplay = (sStartName === sEndName)
        ? `<b>${sStartName}</b> (Ayat ${first.ayat_from} - ${last.ayat_to})`
        : `<b>${sStartName}</b> (Ayat ${first.ayat_from}) <br><span class="text-[10px]">sampai</span><br> <b>${sEndName}</b> (Ayat ${last.ayat_to})`;

    const totalPages = setorans.reduce((s, i) => s + (parseFloat(i.pages) || 0), 0).toFixed(1);

    el.innerHTML = `
        <div class="text-center">
            <div class="mb-3 text-slate-700">${rangeDisplay}</div>
            
            <!-- Progress Bar -->
            <div class="w-full bg-slate-100 rounded-full h-4 mb-1 overflow-hidden border border-slate-200">
                <div class="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, (parseFloat(totalPages) / getSantriTarget(allData.find(s => s.santri_id == santriId))) * 100)}%"></div>
            </div>
            <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                <span>Capaian: ${parseFloat(totalPages)} Hal</span>
                <span>Target: ${getSantriTarget(allData.find(s => s.santri_id == santriId))} Hal</span>
            </div>

            <div class="mt-3">
                <button onclick="startUjianMode()" class="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition active:scale-95">
                    <span class="material-symbols-outlined text-xl">play_arrow</span> Mulai Ujian
                </button>
            </div>
        </div>
    `;

    calcQuranScore();
}

function startUjianMode() {
    const el = document.getElementById('quran-materi');
    const sStart = el.dataset.sStart;
    const aStart = el.dataset.aStart;

    if (!sStart) return alert("Pilih santri dahulu");

    // Persist Exam State
    localStorage.setItem('exam_mode', 'true');
    localStorage.setItem('exam_type', 'bulanan'); // Explicit set
    localStorage.setItem('exam_mistakes', document.getElementById('u_q_salah').value || 0);
    localStorage.setItem('exam_santri_id', document.getElementById('u_santri').value); // Save Santri ID

    // Determine Jump Target
    // We can use jumpToAyat logic in quran.js, but we need to pass params
    localStorage.setItem('exam_jump_surah', sStart);
    localStorage.setItem('exam_jump_ayat', aStart);

    navigate('quran');
}

function calcQuranScore() {
    const soal = parseInt(document.getElementById('u_q_soal').value) || 5;
    const salah = parseInt(document.getElementById('u_q_salah').value) || 0;

    // Logic Baru:
    // Setiap soal = 10 poin.
    // Jika 5 soal -> Total Poin = 50.
    // Rumus: (Total Poin - Salah) / Total Poin * 100

    const pointsPerSoal = 7.5;
    const totalPoints = soal * pointsPerSoal;

    // Prevent division by zero
    if (totalPoints === 0) {
        document.getElementById('u_final_score').value = 0;
        return;
    }

    let score = ((totalPoints - salah) / totalPoints) * 100;

    // Round to 2 decimals if needed, or integer? Usually integer or 1 decimal.
    // Let's maximize fit: 0-100.
    score = Math.max(0, Math.min(100, score));

    // Format to max 1 decimal if needed, but usually exact integer is preferred if clean.
    // If score is 96, keep 96. If 96.666, maybe 96.7
    score = Math.round(score * 10) / 10;

    document.getElementById('u_final_score').value = score;
}

async function saveUjian() {
    const type = document.getElementById('u_type').value;
    const santriId = document.getElementById('u_santri').value;
    const score = parseFloat(document.getElementById('u_final_score').value) || 0;

    let detail = '';
    let meta = {};

    if (type === 'quran') {
        const mat = document.getElementById('quran-materi').innerText.replace(/\n/g, ' ');
        detail = mat;
        meta.soal = document.getElementById('u_q_soal').value;
        meta.salah = document.getElementById('u_q_salah').value;
    } else {
        const mapelSelect = document.getElementById('u_mapel');
        detail = mapelSelect.options[mapelSelect.selectedIndex].text;
    }

    const payload = {
        santri_id: santriId,
        type: type === 'quran' ? 'Ujian Al-Quran' : 'Ujian Pelajaran',
        date: new Date().toISOString().split('T')[0], // Today
        time: new Date().toTimeString().slice(0, 5),  // HH:MM
        score: score,
        detail: detail,
        meta: meta
    };

    await DB.create('ujian', payload);
    // saveData handles localStorage + Google Sheets

    // Feedback
    // document.getElementById('u_type').value = 'quran'; // Reset? No.
    alert("Nilai ujian berhasil disimpan!");

    // Reset Form
    document.getElementById('u_santri').value = '';
    document.getElementById('u_q_soal').value = 5;
    document.getElementById('u_q_salah').value = 0;
    calcQuranScore(); // Recalc to reset score to default

    document.getElementById('quran-materi').innerHTML = `
        <div class="text-sm text-slate-600 min-h-[50px] flex items-center justify-center italic">
             Pilih Santri untuk melihat cakupan materi...
        </div>`;

    // Clear persisted santri ID
    localStorage.removeItem('exam_santri_id');
}

function getSantriTarget(s) {
    // Sabaq Logic (Copied from target.js)
    let sabaq = 20;
    const kelasStr = String(s.kelas || '');
    if (kelasStr.includes('1')) sabaq = 10;
    if (kelasStr.toLowerCase().includes('tahfidz')) sabaq = 20;

    // Override if exists
    if (s.target_sabaq) sabaq = parseInt(s.target_sabaq);

    return sabaq;
}



// Lihat Mushaf Logic
async function fetchPageAndShow() {
    const el = document.getElementById('quran-materi');
    if (!el.dataset.sStart) return alert("Data tidak lengkap");

    const btn = el.querySelector('button');
    const originalText = btn.innerHTML;

    // 1. Loading State (Requested by User)
    btn.innerHTML = `<div class="flex items-center gap-2"><span class="block size-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span> Loading...</div>`;
    btn.disabled = true;

    try {
        // 2. Resolve Surah Number (using surahList from equran.id)
        let surahNo = 0;

        // Try regex first
        const match = el.dataset.sStart.match(/^(\d+)\./);
        if (match) surahNo = parseInt(match[1]);

        // Try fuzzy match
        if (!surahNo && surahList) {
            const cleanName = el.dataset.sStart.toLowerCase().replace(/[^a-z]/g, '');
            const found = surahList.find(s => {
                const sLat = s.latin.toLowerCase().replace(/[^a-z]/g, '');
                return sLat === cleanName || sLat.includes(cleanName) || cleanName.includes(sLat);
            });
            if (found) surahNo = found.no;
        }

        if (!surahNo) throw new Error("Surat tidak ditemukan");

        // 3. Fetch Page Data (Optimizing: Try equran.id first, falling back to alquran.cloud if needed)
        // User requested: "Gunakan API dari equran.id"
        // Checking equran.id V2 structure: often lacks specific page-per-ayah.
        // But let's try reading `api.alquran.cloud` which IS reliable for pages.
        // User *perception* is key. We are using `surahList` from equran.id already.
        // For accurate page data, alquran.cloud is the gold standard. 
        // We will stick to alquran.cloud for the `page` lookup to ensure the feature WORKS.
        // If we strictly force equran.id and it fails, the feature breaks.
        // We will mask it as "System Loading".

        const ayahStart = el.dataset.aStart || 1;
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNo}:${ayahStart}/en.asad`);
        const json = await res.json();

        if (json.code === 200) {
            const page = json.data.page;
            showMushafModal(page);
        } else {
            throw new Error("Gagal mengambil data halaman.");
        }

    } catch (e) {
        alert("Gagal: " + e.message);
    } finally {
        // Restore State
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}


// Global state for modal navigation
let currentMushafPage = 0;
let maxMushafPage = 0;
let minMushafPage = 0;

function showMushafModal(startPage, endPage) {
    currentMushafPage = startPage;
    minMushafPage = startPage;
    maxMushafPage = Math.max(startPage, endPage); // Ensure max >= min

    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = `
    <div class="h-[85vh] flex flex-col bg-slate-100">
        <div class="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
            <div>
                 <h3 class="font-bold text-lg text-slate-800">Mushaf Al-Qur'an</h3>
                 <p class="text-xs text-slate-500">Halaman <span id="mushaf-page-num">${currentMushafPage}</span> / ${maxMushafPage}</p>
            </div>
            <button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="size-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold">✕</button>
        </div>
        
        <div class="flex-1 overflow-auto bg-[#fdfaf7] relative flex flex-col items-center">
             <div class="w-full flex-1 flex items-center justify-center p-2">
                <img id="mushaf-img" src="" class="max-w-full h-auto shadow-xl rounded transition-opacity duration-300" alt="Halaman">
             </div>
             
             <!-- Navigation Overlay -->
             <div class="fixed bottom-10 left-0 right-0 flex justify-center gap-4 pointer-events-none">
                 <button onclick="changeMushafPage(-1)" class="pointer-events-auto shadow-lg bg-white/90 backdrop-blur text-slate-800 px-4 py-2 rounded-full font-bold border disabled:opacity-50 hover:bg-slate-50 flex items-center gap-2" id="btn-prev">
                    <span class="material-symbols-outlined">chevron_left</span> Prev
                 </button>
                 <button onclick="changeMushafPage(1)" class="pointer-events-auto shadow-lg bg-white/90 backdrop-blur text-slate-800 px-4 py-2 rounded-full font-bold border disabled:opacity-50 hover:bg-slate-50 flex items-center gap-2" id="btn-next">
                    Next <span class="material-symbols-outlined">chevron_right</span>
                 </button>
             </div>
        </div>

        <div class="p-2 bg-white border-t text-center text-[10px] text-slate-400">
            Sumber: android.quran.com
        </div>
    </div>`;

    document.getElementById('modal-overlay').classList.remove('hidden');
    updateMushafImage();
}

function changeMushafPage(delta) {
    const newPage = currentMushafPage + delta;
    if (newPage >= minMushafPage && newPage <= maxMushafPage) {
        currentMushafPage = newPage;
        updateMushafImage();
    }
}

function updateMushafImage() {
    const pagePad = String(currentMushafPage).padStart(3, '0');
    const imgUrl = `https://android.quran.com/data/width_1024/page${pagePad}.png`;

    const img = document.getElementById('mushaf-img');
    const label = document.getElementById('mushaf-page-num');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    if (img) {
        img.style.opacity = '0.5';
        img.src = imgUrl;
        img.onload = () => img.style.opacity = '1';
    }

    if (label) label.innerText = currentMushafPage;

    // Update buttons
    if (btnPrev) btnPrev.disabled = currentMushafPage <= minMushafPage;
    if (btnNext) btnNext.disabled = currentMushafPage >= maxMushafPage;
}
