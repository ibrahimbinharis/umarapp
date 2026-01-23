// --- 6. ABSENSI ---
function renderAbsensiPage(dateString = null) {
    refreshData();
    const date = dateString || new Date().toISOString().split('T')[0];
    const dateObj = new Date(date);
    const dayName = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dateObj.getDay()];

    const jadwalList = allData.filter(d => d.__type === 'jadwal' && d.day === dayName).sort((a, b) => a.time.localeCompare(b.time));
    const absensiList = allData.filter(d => d.__type === 'absensi' && d.date === date);

    const html = `
    <div class="fade-in space-y-6 pb-24">
        <div class="px-2">
            <h2 class="text-2xl font-bold text-slate-900">Absensi Harian</h2>
            <p class="text-xs text-slate-500">Rekap kehadiran santri per mata pelajaran.</p>
        </div>

        <div class="bg-white p-3 rounded-xl border shadow-sm mx-2 sticky top-0 z-20">
            <div class="flex items-center gap-2">
                <button onclick="changeAbsensiDate(-1)" class="size-10 rounded-lg bg-slate-50 border flex items-center justify-center text-slate-500 hover:bg-slate-100"><span class="material-symbols-outlined">chevron_left</span></button>
                <div class="flex-1 bg-slate-50 border rounded-lg flex flex-col items-center justify-center py-1 relative">
                    <span class="text-[10px] font-bold text-primary uppercase leading-none">${dayName}</span>
                    <input type="date" id="abs_date_filter" value="${date}" onchange="renderAbsensiPage(this.value)" class="bg-transparent border-none p-0 text-sm font-bold text-center uppercase tracking-wider text-slate-700 outline-none w-full h-5">
                </div>
                <button onclick="changeAbsensiDate(1)" class="size-10 rounded-lg bg-slate-50 border flex items-center justify-center text-slate-500 hover:bg-slate-100"><span class="material-symbols-outlined">chevron_right</span></button>
            </div>
        </div>

        <div class="px-2 space-y-3">
            ${jadwalList.length > 0 ? jadwalList.map(j => {
        const absenData = absensiList.find(a => a.jadwal_id === j._id);
        const isDone = !!absenData;
        const summary = isDone ? getAbsensiSummary(absenData.details) : null;

        return `
                <div onclick="openAbsensiForm('${date}', '${j._id}')" class="bg-white p-4 rounded-xl border shadow-sm group relative cursor-pointer hover:border-primary/50 transition">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">${j.class_name}</span>
                                <span class="text-xs font-mono text-slate-400">${j.time}</span>
                            </div>
                            <h4 class="font-bold text-slate-900 text-lg leading-tight mt-1 group-hover:text-primary transition">${j.mapel}</h4>
                            <p class="text-xs text-slate-500">${j.teacher}</p>
                        </div>
                        <div class="size-8 rounded-full flex items-center justify-center ${isDone ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-300'}">
                            <span class="material-symbols-outlined">${isDone ? 'check' : 'edit'}</span>
                        </div>
                    </div>

                    ${isDone ? `
                    <div class="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-50">
                        <div class="bg-green-50 p-1.5 rounded-lg border border-green-100 text-center">
                            <span class="block text-lg font-black text-green-600 leading-none">${summary.H}</span>
                            <span class="text-[9px] font-bold text-green-400 uppercase">H</span>
                        </div>
                        <div class="bg-yellow-50 p-1.5 rounded-lg border border-yellow-100 text-center">
                            <span class="block text-lg font-black text-yellow-600 leading-none">${summary.S}</span>
                            <span class="text-[9px] font-bold text-yellow-400 uppercase">S</span>
                        </div>
                        <div class="bg-blue-50 p-1.5 rounded-lg border border-blue-100 text-center">
                            <span class="block text-lg font-black text-blue-600 leading-none">${summary.I}</span>
                            <span class="text-[9px] font-bold text-blue-400 uppercase">I</span>
                        </div>
                        <div class="bg-red-50 p-1.5 rounded-lg border border-red-100 text-center">
                            <span class="block text-lg font-black text-red-600 leading-none">${summary.A}</span>
                            <span class="text-[9px] font-bold text-red-400 uppercase">A</span>
                        </div>
                    </div>
                    ` : `
                    <div class="flex items-center gap-2 text-slate-400 bg-slate-50 p-2 rounded-lg border border-dashed text-xs font-bold justify-center mt-2 group-hover:bg-blue-50 group-hover:text-blue-500 group-hover:border-blue-200 transition">
                        <span class="material-symbols-outlined text-[16px]">event_busy</span> Belum Diabsen
                    </div>
                    `}
                </div>`;
    }).join('') : `
                <div class="text-center py-12 text-slate-400">
                    <span class="material-symbols-outlined text-4xl mb-2">calendar_month</span>
                    <p class="text-sm font-bold">Tidak ada KBM hari ini.</p>
                </div>
            `}
        </div>
    </div>`;
    document.getElementById('app-root').innerHTML = renderLayout('absensi', html);
}

function changeAbsensiDate(days) {
    const current = document.getElementById('abs_date_filter').value;
    const date = new Date(current);
    date.setDate(date.getDate() + days);
    renderAbsensiPage(date.toISOString().split('T')[0]);
}

function getAbsensiSummary(details) {
    const s = { H: 0, S: 0, I: 0, A: 0 };
    if (!details) return s;
    details.forEach(d => { if (s[d.status] !== undefined) s[d.status]++; });
    return s;
}

function openAbsensiForm(date, jadwalId) {
    const jadwal = allData.find(j => j._id === jadwalId) || {};
    const existing = allData.find(d => d.__type === 'absensi' && d.date === date && d.jadwal_id === jadwalId);

    let santris = allData.filter(d => d.__type === 'santri').sort((a, b) => a.full_name.localeCompare(b.full_name));
    if (jadwal.class_name) {
        santris = santris.filter(s => s.kelas === jadwal.class_name);
    }

    document.getElementById('modal-content').innerHTML = `
    <div class="flex flex-col h-full bg-slate-50">
        <div class="p-4 bg-white border-b flex justify-between items-center z-10 shadow-sm">
            <div class="max-w-[80%]">
                <h3 class="font-bold text-lg text-slate-900 truncate">${jadwal.mapel || 'Absensi'}</h3>
                <p class="text-xs text-slate-500 font-bold">${date} • ${jadwal.time || ''} • ${jadwal.class_name || 'All Class'}</p>
            </div>
            <button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 font-bold text-slate-400">✕</button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-2 space-y-2">
            <div class="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center mb-2 sticky top-0 z-10 shadow-sm">
                <span class="text-xs font-bold text-blue-700">Set Semua Ke:</span>
                <div class="flex gap-1">
                    <button onclick="setAllAbsensi('H')" class="px-2 py-1 rounded bg-green-100 text-green-700 text-[10px] font-bold hover:bg-green-200 shadow-sm">Hadir</button>
                    <button onclick="setAllAbsensi('S')" class="px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-[10px] font-bold hover:bg-yellow-200 shadow-sm">Sakit</button>
                     <button onclick="setAllAbsensi('I')" class="px-2 py-1 rounded bg-blue-100 text-blue-700 text-[10px] font-bold hover:bg-blue-200 shadow-sm">Izin</button>
                 <button onclick="setAllAbsensi('A')" class="px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-bold hover:bg-red-200 shadow-sm">Alpha</button>
                </div>
            </div>

            ${santris.map(s => {
        const status = existing ? (existing.details.find(d => d.santri_id === s._id)?.status || 'H') : 'H';
        return `
                <div class="bg-white p-3 rounded-xl border shadow-sm flex flex-col gap-2 santri-absen-row" data-id="${s._id}">
                    <div class="flex justify-between items-center border-b pb-2 mb-1">
                        <span class="font-bold text-slate-800 text-sm truncate w-2/3">${s.full_name}</span>
                        <span class="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">${s.kelas || '-'}</span>
                    </div>
                    <div class="grid grid-cols-4 gap-1">
                        ${['H', 'S', 'I', 'A'].map(code => `
                            <label class="cursor-pointer">
                                <input type="radio" name="abs_${s._id}" value="${code}" class="peer sr-only" ${status === code ? 'checked' : ''}>
                                <div class="text-center py-2 rounded-lg border text-xs font-bold transition-all peer-checked:ring-2 peer-checked:border-transparent
                                    ${code === 'H' ? 'peer-checked:bg-green-500 peer-checked:ring-green-300 peer-checked:text-white text-green-600 bg-green-50' : ''}
                                    ${code === 'S' ? 'peer-checked:bg-yellow-500 peer-checked:ring-yellow-300 peer-checked:text-white text-yellow-600 bg-yellow-50' : ''}
                                    ${code === 'I' ? 'peer-checked:bg-blue-500 peer-checked:ring-blue-300 peer-checked:text-white text-blue-600 bg-blue-50' : ''}
                                    ${code === 'A' ? 'peer-checked:bg-red-500 peer-checked:ring-red-300 peer-checked:text-white text-red-600 bg-red-50' : ''}
                                ">
                                    ${code === 'H' ? 'Hadir' : code === 'S' ? 'Sakit' : code === 'I' ? 'Izin' : 'Alpha'}
                                </div>
                            </label>
                        `).join('')}
                    </div>
                </div>`;
    }).join('')}
            ${santris.length === 0 ? '<div class="text-center py-8 text-slate-400 text-sm font-bold">Tidak ada santri di kelas ini.</div>' : ''}
        </div>

        <div class="p-4 bg-white border-t z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button onclick="saveAbsensi('${date}', '${jadwalId}', '${existing ? existing._id : ''}')" class="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg text-sm uppercase tracking-wide hover:bg-blue-700 transition">Simpan Absensi</button>
        </div>
    </div>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function setAllAbsensi(status) {
    document.querySelectorAll('input[type="radio"]').forEach(el => {
        if (el.value === status) el.checked = true;
    });
}

async function saveAbsensi(date, jadwalId, id) {
    const rows = document.querySelectorAll('.santri-absen-row');
    const details = [];
    rows.forEach(row => {
        const sid = row.dataset.id;
        const status = row.querySelector(`input[name="abs_${sid}"]:checked`).value;
        details.push({ santri_id: sid, status });
    });

    const dateObj = new Date(date);
    const dayName = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dateObj.getDay()];

    const payload = { date, day_name: dayName, jadwal_id: jadwalId, details };

    if (id) {
        await DB.update(id, payload);
    } else {
        await DB.create('absensi', payload);
    }

    document.getElementById('modal-overlay').classList.add('hidden');
    renderAbsensiPage(date);
}
