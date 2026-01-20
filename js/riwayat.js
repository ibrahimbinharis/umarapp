// --- 4. RIWAYAT & REKAP ---
function renderRiwayatPage(page = 1) {
    refreshData();
    const ITEMS_PER_PAGE = 20;
    let history = allData.filter(d => d.__type === 'setoran');
    history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const items = history.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    const html = `
    <div class="fade-in space-y-4 pb-24">
        <div class="flex justify-between items-center px-2">
            <h2 class="text-2xl font-bold text-slate-900">Riwayat Setoran</h2>
            <div class="space-x-2">
                <button ${page <= 1 ? 'disabled' : ''} onclick="renderRiwayatPage(${page - 1})" class="px-3 py-1 rounded border bg-white disabled:opacity-50">Prev</button>
                <span class="text-xs font-bold">${page} / ${totalPages || 1}</span>
                <button ${page >= totalPages ? 'disabled' : ''} onclick="renderRiwayatPage(${page + 1})" class="px-3 py-1 rounded border bg-white disabled:opacity-50">Next</button>
            </div>
        </div>
        <div class="bg-white rounded-xl border shadow-sm overflow-hidden mx-2">
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b">
                        <tr><th class="px-4 py-3">Waktu</th><th class="px-4 py-3">Santri</th><th class="px-4 py-3">Jenis</th><th class="px-4 py-3">Detail</th><th class="px-4 py-3 text-center">Nilai</th><th class="px-4 py-3 text-center">Aksi</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
        ${items.map(item => {
        const santriName = dataMap.santri[item.santri_id]?.full_name || 'Unknown';

        let detail = '';
        if (item.setoran_type === 'Sabaq') {
            // Remove numbering from surah name if present (e.g. "1. Al-Fatihah" -> "Al-Fatihah")
            const cleanSurah = (name) => name ? name.replace(/^\d+\.\s*/, '') : '';
            const sFrom = cleanSurah(item.surah_from_latin);
            const sTo = cleanSurah(item.surah_to_latin);

            const surah = sFrom + (sTo && sTo !== sFrom ? ` - ${sTo}` : '');
            const ayat = `Ayat ${item.ayat_from || '?'} - ${item.ayat_to || '?'}`;
            detail = `
                <div class="font-bold text-slate-700 text-xs">${surah}</div>
                <div class="text-[10px] text-slate-500">${ayat}</div>
                <div class="text-[10px] font-bold text-slate-400 mt-1">${item.pages} Hal</div>
             `;
        } else if (item.setoran_type === 'Manzil') {
            let info = '';
            if (item.manzil_mode === 'juz') info = `Juz ${item.juz}`;
            else if (item.manzil_mode === 'page') info = `Hal ${item.page_from} - ${item.page_to}`;
            else info = 'Manzil';

            detail = `
                <div class="font-bold text-slate-700 text-xs">${info}</div>
                <div class="text-[10px] font-bold text-slate-400 mt-1">${item.pages} Hal</div>
             `;
        } else {
            detail = `<div class="font-bold text-slate-700 text-xs">${item.pages} Hal</div>`;
        }

        const gradeColor = item.grade === 'A+' ? 'text-emerald-600 bg-emerald-50' : item.grade === 'C' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50';
        return `<tr class="hover:bg-slate-50 transition"><td class="px-4 py-3"><div class="font-bold text-slate-700 text-xs">${formatDateLong(item.setoran_date, item.setoran_time)}</div></td><td class="px-4 py-3 font-bold text-xs">${santriName}</td><td class="px-4 py-3 text-[10px] font-bold uppercase text-slate-500">${item.setoran_type}</td><td class="px-4 py-3">${detail}</td><td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded text-xs font-black ${gradeColor}">${item.grade}</span></td><td class="px-4 py-3 text-center"><button onclick="deleteData('${item._id}', 'riwayat')" class="text-red-400"><span class="material-symbols-outlined text-lg">delete</span></button></td></tr>`;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>`;
    document.getElementById('app-root').innerHTML = renderLayout('riwayat', html);
}
function renderRekapPage() { renderRiwayatPage(); }
