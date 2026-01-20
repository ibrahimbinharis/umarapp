// --- 2. SANTRI MANAGEMENT ---
function formatWANumber(number) {
    if (!number) return '';
    let n = number.toString().replace(/\D/g, '');
    if (n.startsWith('0')) n = '62' + n.slice(1);
    if (n.startsWith('8')) n = '62' + n;
    return n;
}

function renderSantriManagement() {
    refreshData();
    let items = allData.filter(d => d.__type === 'santri');

    // GENDER SEGREGATION LOGIC
    if (currentUser.role === 'guru') {
        if (currentUser.gender) {
            items = items.filter(s => s.gender === currentUser.gender);
        }
    }

    const html = `
    <div class="fade-in space-y-4 pb-24">
        <div class="flex justify-between items-center px-2">
            <h2 class="text-2xl font-bold">Data Santri</h2>
            <button onclick="openSantriForm()" class="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow">+ Tambah</button>
        </div>
        <div class="space-y-3 px-2">
            ${items.map(s => `
                <div class="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-slate-900">${s.full_name}</h3>
                        <div class="text-xs text-slate-500 font-mono flex gap-2">
                            <span>${s.santri_id}</span>
                            <span>•</span>
                            <span>${s.kelas || '-'}</span>
                            <span>•</span>
                            <span class="${s.gender === 'L' ? 'text-blue-500' : 'text-pink-500'} font-bold">${s.gender === 'L' ? 'Putra' : 'Putri'}</span>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        ${s.no_hp ? `
                        <a href="https://wa.me/${formatWANumber(s.no_hp)}" target="_blank" class="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 hover:bg-green-100 transition">
                            <span class="material-symbols-outlined text-[16px]">chat</span>
                        </a>` : ''}
                        <button onclick="openSantriForm('${s._id}')" class="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-bold">Edit</button>
                        <button onclick="deleteData('${s._id}', 'santri')" class="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold">Hapus</button>
                    </div>
                </div>
            `).join('')}
            ${items.length === 0 ? '<p class="text-center text-slate-400 py-8">Belum ada santri (atau tidak sesuai gender Anda)</p>' : ''}
        </div>
    </div>`;
    document.getElementById('app-root').innerHTML = renderLayout('santri', html);
}

function generateSantriNIS() {
    // Format: 2 - Seq(2digit) - Month(2digit) - Year(2digit)
    // 2-01-01-26
    const santriList = allData.filter(d => d.__type === 'santri');
    const seq = (santriList.length + 1).toString().padStart(2, '0');
    const date = new Date();
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const yy = date.getFullYear().toString().slice(-2);
    return `2${seq}${mm}${yy}`;
}

function openSantriForm(id = null) {
    const isEdit = !!id;
    const data = isEdit ? dataMap[id] : {};
    const autoId = !isEdit ? generateSantriNIS() : '';

    // v31-like detailed form
    document.getElementById('modal-content').innerHTML = `
    <div class="p-6 space-y-4">
        <h3 class="font-bold text-lg">${isEdit ? 'Edit Santri' : 'Santri Baru'}</h3>
        
        <div class="grid grid-cols-2 gap-4">
            <div>
                 <label class="text-xs font-bold text-slate-400">NIS (Auto)</label>
                 <input id="f_nis" value="${data.santri_id || autoId}" class="w-full p-2 border rounded font-mono bg-slate-50" readonly>
            </div>
            <div>
                 <label class="text-xs font-bold text-slate-400">Kelas</label>
                 <input id="f_kelas" value="${data.kelas || ''}" class="w-full p-2 border rounded" placeholder="10A">
            </div>
        </div>

        <div>
             <label class="text-xs font-bold text-slate-400">Nama Lengkap</label>
             <input id="f_nama" value="${data.full_name || ''}" class="w-full p-2 border rounded font-bold" placeholder="Nama Santri">
        </div>

        <div>
             <label class="text-xs font-bold text-slate-400">No. WhatsApp Wali</label>
             <input id="f_hp" value="${data.no_hp || ''}" class="w-full p-2 border rounded font-bold" placeholder="Contoh: 08123456789">
        </div>

        <div class="grid grid-cols-2 gap-4">
            <div>
                 <label class="text-xs font-bold text-slate-400">Jenis Kelamin</label>
                 <select id="f_gender" class="w-full p-2 border rounded bg-white">
                    <option value="L" ${data.gender === 'L' ? 'selected' : ''}>Putra</option>
                    <option value="P" ${data.gender === 'P' ? 'selected' : ''}>Putri</option>
                 </select>
            </div>
            <div>
                 <label class="text-xs font-bold text-slate-400">Password Wali</label>
                 <input id="f_pass" value="" class="w-full p-2 border rounded" placeholder="${isEdit ? '(Tetap)' : 'Wajib diisi'}">
            </div>
        </div>

        <button onclick="saveSantri('${id || ''}')" class="w-full bg-primary text-white py-3 rounded-xl font-bold">Simpan</button>
        <button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="w-full mt-2 text-slate-500 py-2">Batal</button>
    </div>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

async function saveSantri(id) {
    const payload = {
        santri_id: document.getElementById('f_nis').value,
        full_name: document.getElementById('f_nama').value,
        kelas: document.getElementById('f_kelas').value,
        gender: document.getElementById('f_gender').value,
        no_hp: document.getElementById('f_hp').value // Add WA
    };
    const pass = document.getElementById('f_pass').value;
    if (pass) payload.password = pass; // Hash handled in DB.create/update

    if (!payload.full_name) return alert("Nama wajib diisi");

    if (id) await DB.update(id, payload);
    else await DB.create('santri', payload);
    document.getElementById('modal-overlay').classList.add('hidden');
    renderSantriManagement();
}
