// --- 7. TARGET SYSTEM ---
function renderTargetPage() {
    refreshData();
    const santri = allData.filter(i => i.__type === 'santri').sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || '')));

    const html = `
    <div class="space-y-6 fade-in pb-24">
        <div class="px-2">
            <h2 class="text-2xl font-bold text-slate-900">Target Bulanan</h2>
            <p class="text-xs text-slate-500">Atur target hafalan baru & murojaah.</p>
        </div>

        <div class="bg-white p-3 rounded-xl border shadow-sm mx-2 sticky top-0 z-20">
            <input type="text" placeholder="Cari Santri..." class="w-full p-2 bg-slate-50 border rounded-lg text-sm font-bold" onkeyup="filterSantriTarget(this.value)">
        </div>

        <div id="target-list" class="space-y-3 px-2">
            ${santri.map(s => {
        const defaults = getTargetDefaults(s);
        const sabaq = s.target_sabaq || defaults.sabaq;
        const manzil = s.target_manzil || defaults.manzil;
        const usedPct = s.target_manzil_pct || 20;

        return `
                <div class="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center group relative">
                    <div>
                        <h4 class="font-bold text-slate-900">${s.full_name}</h4>
                        <p class="text-xs text-slate-500 font-mono mb-2">${s.kelas || '-'} • Hafalan: ${s.hafalan_manual || '0 Juz'}</p>
                        <div class="flex gap-2 text-[10px] font-bold uppercase tracking-wider flex-wrap">
                            <span class="bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">Sabaq: ${sabaq} Hal</span>
                            <span class="bg-purple-50 text-purple-600 px-2 py-1 rounded border border-purple-100">Manzil: ${manzil} Hal (${usedPct}%)</span>
                        </div>
                    </div>
                    <div class="relative">
                        <button onclick="toggleMenu('${s._id}', event)" class="size-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition">
                            <span class="material-symbols-outlined">more_vert</span>
                        </button>
                        <div id="menu-${s._id}" class="hidden absolute right-0 top-8 bg-white rounded-xl shadow-xl border w-40 z-20 py-1 flex-col overflow-hidden animate-scale-in origin-top-right">
                            <button onclick="openTargetForm('${s._id}')" class="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                                <span class="material-symbols-outlined text-[16px]">edit_square</span> Edit Target
                            </button>
                            <div class="h-px bg-slate-100 mx-2"></div>
                            <button onclick="resetTarget('${s._id}')" class="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2">
                                <span class="material-symbols-outlined text-[16px]">restart_alt</span> Reset Default
                            </button>
                        </div>
                    </div>
                </div>
                `;
    }).join('')}
        </div>
    </div>`;
    document.getElementById('app-root').innerHTML = renderLayout('target', html);
}

function filterSantriTarget(query) {
    const list = document.getElementById('target-list');
    const items = list.children;
    const q = query.toLowerCase();
    for (let item of items) {
        const name = item.querySelector('h4').innerText.toLowerCase();
        item.style.display = name.includes(q) ? 'flex' : 'none';
    }
}

function getTargetDefaults(s) {
    // Sabaq Logic
    let sabaq = 20;
    const kelasStr = String(s.kelas || '');
    if (kelasStr.includes('1')) sabaq = 10;
    if (kelasStr.toLowerCase().includes('tahfidz')) sabaq = 20;

    // Manzil Logic: Pct of Total Hafalan Pages
    // 1 Juz = 20 Pages
    let totalJuz = 0;
    if (s.hafalan_manual) {
        const match = s.hafalan_manual.match(/(\d+)/);
        if (match) totalJuz = parseInt(match[1]);
    }

    const totalPages = totalJuz * 20;
    const pct = s.target_manzil_pct || 20; // Default 20 or Custom Pct
    const manzil = Math.round(totalPages * (pct / 100));

    return { sabaq, manzil, totalPages };
}

function openTargetForm(id) {
    const s = allData.find(i => i._id === id);
    const defaults = getTargetDefaults(s);
    const sabaq = s.target_sabaq || defaults.sabaq;
    const manzil = s.target_manzil || defaults.manzil;
    const pct = s.target_manzil_pct || 20;

    document.getElementById('modal-content').innerHTML = `
    <div class="flex flex-col h-full">
        <div class="p-4 border-b bg-slate-50 flex justify-between items-center">
            <h3 class="font-bold text-lg">Atur Target Bulanan</h3>
            <button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="size-8 flex items-center justify-center rounded-full hover:bg-slate-200">✕</button>
        </div>
        <div class="p-5 space-y-4">
            <div class="flex items-center gap-3 mb-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
                <div class="size-10 bg-white rounded-full flex items-center justify-center font-bold text-blue-600 shadow-sm">${s.full_name.charAt(0)}</div>
                <div>
                    <p class="font-bold text-slate-900 text-sm">${s.full_name}</p>
                    <p class="text-[10px] text-slate-500 uppercase font-bold">Total Hafalan: ${s.hafalan_manual || '0 Juz'}</p>
                </div>
            </div>

            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Target Sabaq (Hafalan Baru)</label>
                <div class="flex items-center gap-2">
                    <input type="number" id="t_sabaq" value="${sabaq}" class="w-full p-3 border rounded-xl font-bold text-slate-700 text-center text-lg">
                    <div class="text-xs font-bold text-slate-400">Hal/Bulan</div>
                </div>
                <p class="text-[10px] text-slate-400 mt-1">*Default Kelas ${s.kelas || '?'}: ${defaults.sabaq} Hal</p>
            </div>

            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Target Manzil (Murojaah)</label>
                <div class="grid grid-cols-3 gap-2">
                     <div class="col-span-1">
                        <label class="text-[9px] font-bold text-slate-400 uppercase text-center block mb-1">Persen %</label>
                        <input type="number" id="t_pct" value="${pct}" class="w-full p-3 border rounded-xl font-bold text-slate-700 text-center" oninput="recalcManzil(this.value, ${defaults.totalPages})">
                     </div>
                     <div class="col-span-2">
                        <label class="text-[9px] font-bold text-slate-400 uppercase text-center block mb-1">Target Halaman</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="t_manzil" value="${manzil}" class="w-full p-3 border rounded-xl font-bold text-slate-700 text-center text-lg">
                            <div class="text-xs font-bold text-slate-400">Hal</div>
                        </div>
                     </div>
                </div>
                 <p class="text-[10px] text-slate-400 mt-1">*Total Hafalan: ${defaults.totalPages} Halaman</p>
            </div>

            <button onclick="saveTarget('${id}')" class="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 mt-2">Simpan Target</button>
        </div>
    </div>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function recalcManzil(pct, totalPages) {
    const p = parseFloat(pct) || 0;
    const res = Math.round(totalPages * (p / 100));
    document.getElementById('t_manzil').value = res;
}

async function saveTarget(id) {
    const sabaq = parseInt(document.getElementById('t_sabaq').value) || 0;
    const manzil = parseInt(document.getElementById('t_manzil').value) || 0;
    const pct = parseFloat(document.getElementById('t_pct').value) || 20;

    await DB.update(id, { target_sabaq: sabaq, target_manzil: manzil, target_manzil_pct: pct });
    // showToast("Target Disimpan", "success");

    document.getElementById('modal-overlay').classList.add('hidden');
    renderTargetPage();
}

async function resetTarget(id) {
    if (confirm("Reset target santri ini ke default sistem?")) {
        await DB.update(id, { target_sabaq: null, target_manzil: null, target_manzil_pct: null });
        // showToast("Target Direset ke Default", "success");
        renderTargetPage();
    }
}

// Global scope attachment if needed
window.recalcManzil = recalcManzil;
