// --- 6. JADWAL ---
function renderJadwalPage(filterDay = 'Semua') {
    refreshData();
    const days = ['Semua', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
    let items = allData.filter(d => d.__type === 'jadwal');

    if (filterDay !== 'Semua') {
        items = items.filter(d => d.day === filterDay);
    }

    const html = `
    <div class="fade-in space-y-4 pb-24">
        <div class="flex justify-between items-center px-2">
            <h2 class="text-2xl font-bold">Jadwal KBM</h2>
            <button onclick="openJadwalForm()" class="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow">+ Tambah</button>
        </div>
        
        <!--Day Filter-->
        <div class="flex gap-2 overflow-x-auto px-2 pb-2 no-scrollbar">
            ${days.map(d => `
                <button onclick="renderJadwalPage('${d}')" 
                    class="px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${filterDay === d ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100'}">
                    ${d}
                </button>
            `).join('')}
        </div>

        <div class="space-y-3 px-2">
            ${items.map(j => `
                <div class="bg-white p-4 rounded-xl border shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-bold text-slate-900 text-lg leading-tight">${j.mapel}</div>
                            <div class="text-xs text-slate-500 mt-1 font-bold">Kelas ${j.class_name}</div>
                        </div>
                         <div class="flex gap-2">
                            <button onclick="openJadwalForm('${j._id}')" class="text-blue-600 bg-blue-50 p-2 rounded-lg"><span class="material-symbols-outlined text-lg">edit</span></button>
                            <button onclick="deleteData('${j._id}', 'jadwal')" class="text-red-600 bg-red-50 p-2 rounded-lg"><span class="material-symbols-outlined text-lg">delete</span></button>
                        </div>
                    </div>
                    <div class="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center text-xs text-slate-600">
                        <div class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">schedule</span> <span>${j.day}, ${j.time}</span></div>
                        <div class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">person</span> <span>${j.teacher}</span></div>
                    </div>
                </div>`).join('')}
             ${items.length === 0 ? '<p class="text-center text-slate-400 py-8">Tidak ada jadwal</p>' : ''}
        </div>
    </div>`;
    document.getElementById('app-root').innerHTML = renderLayout('jadwal', html);
}

function openJadwalForm(id = null) {
    try {
        refreshData();
        const isEdit = !!id;
        const data = isEdit ? allData.find(d => d._id === id) : {};
        if (isEdit && !data) return alert("Data tidak ditemukan");

        const mapelList = allData.filter(d => d.__type === 'mapel').sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        const guruList = allData.filter(d => d.__type === 'user' && d.role === 'guru').sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || '')));
        const kelasList = allData.filter(d => d.__type === 'kelas').sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

        const mapelOpts = mapelList.map(m => `<option value="${m.name}" ${data.mapel === m.name ? 'selected' : ''}>${m.name}</option>`).join('');
        const guruOpts = guruList.map(g => `<option value="${g.full_name}" ${data.teacher === g.full_name ? 'selected' : ''}>${g.full_name}</option>`).join('');
        const kelasOpts = kelasList.map(k => `<option value="${k.name}" ${data.class_name === k.name ? 'selected' : ''}>${k.name}</option>`).join('');

        // Parse Time Range "HH:MM - HH:MM"
        let tStart = '07:00', tEnd = '08:00';
        if (data.time && data.time.includes(' - ')) {
            [tStart, tEnd] = data.time.split(' - ');
        }

        document.getElementById('modal-content').innerHTML = `
    <div class="p-6 space-y-4">
        <h3 class="font-bold text-lg">${isEdit ? 'Edit' : 'Tambah'} Jadwal</h3>
        
        <div>
            <label class="text-xs font-bold text-slate-400">Hari</label>
            <select id="j_day" class="w-full p-2 border rounded font-bold bg-white">
                ${['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'].map(d => `<option value="${d}" ${d === data.day ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
        </div>

        <div>
            <label class="text-xs font-bold text-slate-400">Mata Pelajaran</label>
            <select id="j_mapel" class="w-full p-2 border rounded font-bold bg-white">
                <option value="">-- Pilih Mapel --</option>
                ${mapelOpts}
            </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
             <div>
                <label class="text-xs font-bold text-slate-400">Jam Mulai</label>
                <input type="time" id="j_time_start" class="w-full p-2 border rounded font-bold" value="${tStart}">
             </div>
             <div>
                <label class="text-xs font-bold text-slate-400">Jam Selesai</label>
                <input type="time" id="j_time_end" class="w-full p-2 border rounded font-bold" value="${tEnd}">
             </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
             <div>
                <label class="text-xs font-bold text-slate-400">Kelas</label>
                <select id="j_class" class="w-full p-2 border rounded font-bold bg-white">
                    <option value="">-- Kelas --</option>
                    ${kelasOpts}
                </select>
             </div>
             <div>
                <label class="text-xs font-bold text-slate-400">Guru Pengampu</label>
                <select id="j_teacher" class="w-full p-2 border rounded font-bold bg-white">
                    <option value="">-- Guru --</option>
                    ${guruOpts}
                </select>
             </div>
        </div>

        <button onclick="saveJadwal('${id || ''}')" class="w-full bg-primary text-white py-3 rounded-xl font-bold mt-2">Simpan Jadwal</button>
        <button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="w-full mt-2 text-slate-500 py-2">Batal</button>
    </div>`;
        document.getElementById('modal-overlay').classList.remove('hidden');
    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    }
}

async function saveJadwal(id) {
    const mapel = document.getElementById('j_mapel').value;
    const teacher = document.getElementById('j_teacher').value;
    const kelas = document.getElementById('j_class').value;
    const tStart = document.getElementById('j_time_start').value;
    const tEnd = document.getElementById('j_time_end').value;

    if (!mapel || !teacher || !kelas || !tStart || !tEnd) {
        return alert("Mohon lengkapi semua data jadwal");
    }

    const payload = {
        day: document.getElementById('j_day').value,
        mapel: mapel,
        time: `${tStart} - ${tEnd}`,
        class_name: kelas,
        teacher: teacher
    };

    if (id) await DB.update(id, payload);
    else await DB.create('jadwal', payload);

    document.getElementById('modal-overlay').classList.add('hidden');
    renderJadwalPage(payload.day);
}
