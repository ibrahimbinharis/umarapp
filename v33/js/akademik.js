// --- 5. MAPEL, KELAS ---
function renderMapelPage() {
    refreshData();
    const items = allData.filter(i => i.__type === 'mapel');
    const html = `
    <div class="fade-in space-y-4 pb-24">
        <div class="flex justify-between items-center px-2">
            <h2 class="text-2xl font-bold">Mata Pelajaran</h2>
            <button onclick="openMapelForm()" class="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow">+ Tambah</button>
        </div>
        <div class="space-y-3 px-2">
            ${items.map(m => `
                <div class="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center">
                    <h3 class="font-bold text-slate-900">${m.name}</h3>
                    <div class="flex gap-2">
                        <button onclick="openMapelForm('${m._id}')" class="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-bold">Edit</button>
                        <button onclick="deleteData('${m._id}', 'mapel')" class="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold">Hapus</button>
                    </div>
                </div>`).join('')}
        </div>
    </div>`;
    document.getElementById('app-root').innerHTML = renderLayout('mapel', html);
}

function openMapelForm(id = null) {
    const data = id ? dataMap[id] : {};
    document.getElementById('modal-content').innerHTML = `
    <div class="p-6 space-y-4">
        <h3 class="font-bold text-lg">${id ? 'Edit' : 'Tambah'} Mapel</h3>
        <input id="m_name" value="${data.name || ''}" class="w-full p-2 border rounded" placeholder="Nama Mapel">
        <button onclick="saveMapel('${id || ''}')" class="w-full bg-primary text-white py-3 rounded-xl font-bold">Simpan</button>
        <button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="w-full mt-2 text-slate-500 py-2">Batal</button>
    </div>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

async function saveMapel(id) {
    const name = document.getElementById('m_name').value;
    if (!name) return;
    if (id) await DB.update(id, { name }); else await DB.create('mapel', { name });
    document.getElementById('modal-overlay').classList.add('hidden');
    renderMapelPage();
}

function renderKelasPage() {
    refreshData();
    const items = allData.filter(i => i.__type === 'kelas');
    const html = `
    <div class="fade-in space-y-4 pb-24">
        <div class="flex justify-between items-center px-2">
            <h2 class="text-2xl font-bold">Data Kelas</h2>
            <button onclick="openKelasForm()" class="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow">+ Tambah</button>
        </div>
        <div class="space-y-3 px-2">
            ${items.map(k => `
                <div class="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center">
                    <h3 class="font-bold text-slate-900">${k.name}</h3>
                    <div class="flex gap-2">
                         <button onclick="deleteData('${k._id}', 'kelas')" class="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold">Hapus</button>
                    </div>
                </div>`).join('')}
        </div>
    </div>`;
    document.getElementById('app-root').innerHTML = renderLayout('kelas', html);
}

function openKelasForm() {
    document.getElementById('modal-content').innerHTML = `
    <div class="p-6 space-y-4">
        <h3 class="font-bold text-lg">Tambah Kelas</h3>
        <input id="k_name" class="w-full p-2 border rounded" placeholder="Nama Kelas">
        <button onclick="saveKelas()" class="w-full bg-primary text-white py-3 rounded-xl font-bold">Simpan</button>
        <button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="w-full mt-2 text-slate-500 py-2">Batal</button>
    </div>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

async function saveKelas() {
    const name = document.getElementById('k_name').value;
    if (!name) return;
    await DB.create('kelas', { name });
    document.getElementById('modal-overlay').classList.add('hidden');
    renderKelasPage();
}
