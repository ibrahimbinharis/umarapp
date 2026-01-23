// --- 3. DASHBOARD ---
function renderDashboard() {
    refreshData();
    const myMenus = APP_MENUS.filter(m => m.roles.includes(currentUser.role));
    const santriList = allData.filter(d => d.__type === 'santri');

    // Calculate total stats
    let totalSabaq = 0, totalManzil = 0;
    santriList.forEach(s => { const st = getStudentStats(s.santri_id); if (st) { totalSabaq += st.sabaq.current; totalManzil += st.manzil.current; } });

    // Greeting (v31 Style)
    const greeting = `
    <div onclick="navigate('profile')" class="bg-white p-5 rounded-3xl border border-slate-100 card-shadow mb-6 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition active:scale-95 group">
        <div class="size-12 rounded-full bg-blue-50 flex items-center justify-center text-primary font-bold text-xl group-hover:bg-primary group-hover:text-white transition">${currentUser.full_name.charAt(0).toUpperCase()}</div>
        <div><h2 class="text-xl font-bold text-slate-900 group-hover:text-primary transition">Ahlan, ${currentUser.full_name.split(' ')[0]}!</h2><p class="text-xs text-slate-500">Selamat datang kembali</p></div>
    </div>
    `;

    // Menu Grid (v31 Style - All Menus)
    const menuGrid = `
    <div class="grid grid-cols-4 gap-3 mb-6">
        ${myMenus.filter(m => m.id !== 'logout').map(m => `
            <button onclick="navigate('${m.id}')" class="flex flex-col items-center gap-2 group">
                <div class="menu-icon-box w-14 h-14 ${m.id === 'input' ? 'bg-blue-50 border-blue-200' : ''}"><span class="material-symbols-outlined text-2xl ${m.id === 'input' ? 'text-primary' : 'text-slate-600'}">${m.icon}</span></div>
                <span class="text-[11px] font-medium text-slate-600 text-center leading-tight">${m.label}</span>
            </button>
        `).join('')}
    </div>
    `;

    let infoContent = '';
    if (currentUser.role === 'wali') {
        const st = getStudentStats(currentUser.child_id);
        infoContent = `<div class="bg-primary rounded-3xl p-6 text-white shadow-lg mb-4"><h2 class="text-xl font-bold">Progress Hafalan</h2><div class="flex gap-4 mt-4"><div class="flex-1 bg-white/10 rounded-xl p-3 text-center"><p class="text-xs opacity-70">Sabaq</p><p class="text-2xl font-bold">${st?.sabaq?.percent.toFixed(0) || 0}%</p></div><div class="flex-1 bg-white/10 rounded-xl p-3 text-center"><p class="text-xs opacity-70">Manzil</p><p class="text-2xl font-bold">${st?.manzil?.percent.toFixed(0) || 0}%</p></div></div></div>`;
    } else {
        infoContent = `
        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-white p-4 rounded-2xl border card-shadow">
                <p class="text-xs font-bold text-slate-400">TOTAL SANTRI</p>
                <p class="text-2xl font-black text-slate-900">${santriList.length}</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border card-shadow">
                <p class="text-xs font-bold text-slate-400">CAPAIAN SABAQ</p>
                <p class="text-2xl font-black text-emerald-600">${totalSabaq} Hal</p>
            </div>
        </div>
        <div class="bg-white p-5 rounded-2xl border card-shadow mb-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-slate-900">Grafik</h3>
                ${currentUser.role === 'admin' ? '<button onclick="DB.syncFromCloud().then(() => {refreshData();renderDashboard();})" class="text-primary text-xs font-bold flex items-center gap-1"><span class="material-symbols-outlined text-sm">cloud_sync</span> Sync</button>' : ''}
            </div>
            <canvas id="mainChart" height="150"></canvas>
        </div>`;
    }

    const html = `<div class="fade-in px-2 pt-2">${greeting} ${menuGrid} ${infoContent}</div>`;
    document.getElementById('app-root').innerHTML = renderLayout('dashboard', html);

    if (currentUser.role !== 'wali') {
        const ctx = document.getElementById('mainChart');
        if (ctx) new Chart(ctx, { type: 'bar', data: { labels: ['Sabaq', 'Manzil'], datasets: [{ label: 'Halaman', data: [totalSabaq, totalManzil], backgroundColor: ['#10B981', '#F59E0B'], borderRadius: 6 }] }, options: { responsive: true, plugins: { legend: { display: false } } } });
    }
}
