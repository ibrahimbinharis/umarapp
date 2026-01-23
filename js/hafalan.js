// --- HAFALAN SYSTEM ---
function renderHafalanPage() {
    refreshData();
    const santri = allData.filter(i => i.__type === 'santri').sort((a, b) => a.full_name.localeCompare(b.full_name));

    const html = `
    <div class="space-y-6 fade-in pb-24">
        <div class="px-2">
            <h2 class="text-2xl font-bold text-slate-900">Monitoring Hafalan</h2>
            <p class="text-xs text-slate-500">Pantau progres 30 Juz santri.</p>
        </div>
        
        <div class="bg-white p-3 rounded-xl border shadow-sm mx-2 sticky top-0 z-20">
            <input type="text" placeholder="Cari Nama Santri..." class="w-full p-2 bg-slate-50 border rounded-lg text-sm font-bold" onkeyup="filterSantriHafalan(this.value)">
        </div>

        <div id="hafalan-list" class="space-y-3 px-2">
            ${santri.map(s => {
        let progress = s.hafalan_progress || {};
        if (typeof progress === 'string') {
            try { progress = JSON.parse(progress); } catch (e) { progress = {}; }
        }
        const count = Object.values(progress).filter(v => v !== 'C').length;
        return `
                <div onclick="renderHafalanDetail('${s._id}')" class="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center cursor-pointer hover:bg-slate-50 transition group">
                    <div class="flex items-center gap-4">
                        <div class="size-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-200">
                            ${count}
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-900 group-hover:text-primary transition">${s.full_name}</h4>
                            <p class="text-xs text-slate-500 font-mono">${s.kelas || 'No Kelas'} • ${s.hafalan_manual || '0 Juz'}</p>
                        </div>
                    </div>
                    <span class="material-symbols-outlined text-slate-300">chevron_right</span>
                </div>
                `;
    }).join('')}
        </div>
    </div>`;
    document.getElementById('app-root').innerHTML = renderLayout('hafalan', html);
}

function filterSantriHafalan(query) {
    const list = document.getElementById('hafalan-list');
    const items = list.children;
    const q = query.toLowerCase();
    for (let item of items) {
        const name = item.querySelector('h4').innerText.toLowerCase();
        item.style.display = name.includes(q) ? 'flex' : 'none';
    }
}

function renderHafalanDetail(id) {
    refreshData(); // Ensure fresh data
    const s = allData.find(i => i._id === id);
    if (!s) return renderHafalanPage(); // Fallback
    let progress = s.hafalan_progress || {};

    // FIX: Handle Legacy/Corrupted data where progress might be a string
    if (typeof progress === 'string') {
        try {
            progress = JSON.parse(progress);
        } catch (e) {
            console.warn("Invalid progress data for", s.full_name, progress);
            progress = {};
        }
    }

    const html = `
    <div class="space-y-6 fade-in pb-24">
        <div class="px-2 flex items-center gap-3">
            <button onclick="renderHafalanPage()" class="size-10 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-slate-50">
                <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
                <h2 class="text-xl font-bold text-slate-900">${s.full_name}</h2>
                <p class="text-xs text-slate-500">Progres 30 Juz</p>
            </div>
        </div>

        <div class="bg-white p-6 rounded-3xl border shadow-sm mx-2">
            <div class="grid grid-cols-5 gap-3 sm:gap-4 justify-items-center">
                ${Array.from({ length: 30 }, (_, i) => {
        const juz = i + 1;
        const grade = progress[juz];
        const isActive = !!grade;

        // Color logic
        let bgClass = 'bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-300';

        if (isActive) {
            if (['A+', 'A'].includes(grade)) {
                bgClass = 'bg-blue-500 text-white shadow-lg shadow-blue-200 border-transparent';
            } else if (['B+', 'B', 'B-'].includes(grade)) {
                bgClass = 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 border-transparent';
            } else if (grade === 'C') {
                bgClass = 'bg-red-500 text-white shadow-lg shadow-red-200 border-transparent';
            } else if (grade === 'Centang') {
                bgClass = 'bg-orange-400 text-white shadow-lg shadow-orange-200 border-transparent';
            } else {
                bgClass = 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 border-transparent';
            }
        }

        return `
                    <button onclick="openHafalanGrade('${id}', ${juz})" class="size-12 sm:size-14 rounded-full border-2 flex flex-col items-center justify-center transition-all transform hover:scale-110 active:scale-95 ${bgClass}">
                        <span class="text-sm sm:text-lg font-bold">${juz}</span>
                        ${isActive ? `<span class="text-[9px] font-black uppercase tracking-tighter opacity-90">${grade === 'Centang' ? 'OK' : (grade.length > 3 ? 'OK' : grade)}</span>` : ''}
                    </button>
                    `;
    }).join('')}
            </div>
        </div>
    </div>`;
    document.getElementById('app-root').innerHTML = renderLayout('hafalan', html);
}

function openHafalanGrade(id, juz) {
    try {
        const s = allData.find(i => i._id === id);
        if (!s) {
            console.error("Santri not found for ID:", id);
            alert("Data santri tidak ditemukan. Mohon refresh halaman.");
            return;
        }

        let progress = s.hafalan_progress || {};
        if (typeof progress === 'string') {
            try { progress = JSON.parse(progress); } catch (e) { progress = {}; }
        }
        const currentGrade = progress[juz];

        const grades = ['Centang', 'A+', 'A', 'B+', 'B', 'B-', 'C'];

        const modalOverlay = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');

        if (!modalOverlay || !modalContent) {
            console.error("Modal elements missing!");
            alert("Terjadi kesalahan sistem (Modal Missing). Mohon refresh.");
            return;
        }

        modalContent.innerHTML = `
        <div class="bg-white rounded-2xl w-full max-w-sm mx-auto overflow-hidden">
            <div class="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 class="font-bold text-lg">Nilai Juz ${juz}</h3>
                <button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="size-8 flex items-center justify-center rounded-full hover:bg-slate-200">✕</button>
            </div>
            <div class="p-4 grid grid-cols-2 gap-3">
                ${grades.map(g => `
                <button onclick="saveHafalanGrade('${id}', ${juz}, '${g}')" class="p-3 rounded-xl border-2 font-bold transition flex items-center justify-center gap-2 ${currentGrade === g ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'border-slate-100 hover:border-emerald-200 text-slate-600'}">
                    ${g === 'Centang' ? '<span class="material-symbols-outlined">check_circle</span> Selesai' : g}
                </button>
                `).join('')}
                
                <button onclick="saveHafalanGrade('${id}', ${juz}, null)" class="col-span-2 mt-2 p-3 rounded-xl border-2 border-red-100 text-red-500 font-bold hover:bg-red-50 flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined">delete</span> Hapus / Reset
                </button>
            </div>
        </div>`;
        modalOverlay.classList.remove('hidden');
    } catch (e) {
        console.error("Error opening grade modal:", e);
        alert("Terjadi kesalahan: " + e.message);
    }
}

async function saveHafalanGrade(id, juz, grade) {
    const idx = allData.findIndex(i => i._id === id);
    if (idx === -1) return;

    let santri = allData[idx];

    // Fix: Ensure progress is an object
    let currentProgress = santri.hafalan_progress || {};
    if (typeof currentProgress === 'string') {
        try {
            currentProgress = JSON.parse(currentProgress);
        } catch (e) {
            currentProgress = {};
        }
    }

    // Create a copy of progress to avoid mutation issues
    let newProgress = { ...currentProgress };

    if (grade) {
        newProgress[juz] = grade;
    } else {
        delete newProgress[juz];
    }

    // Recalculate Total
    // Recalculate Total
    // Recalculate Total (Exclude 'C')
    const count = Object.values(newProgress).filter(v => v !== 'C').length;
    let newManual = `${count} Juz`;

    await DB.update(id, {
        hafalan_progress: JSON.stringify(newProgress),
        hafalan_manual: newManual
    });

    document.getElementById('modal-overlay').classList.add('hidden');
    renderHafalanDetail(id);
}
