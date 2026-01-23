// --- 4. LAYOUT & NAVIGATION ---

const APP_MENUS = [
    { id: 'dashboard', label: "Home", icon: "home", roles: ['admin', 'guru', 'wali'], inBottom: true },
    { id: 'santri', label: "Santri", icon: "group", roles: ['admin', 'guru'], inBottom: true },
    { id: 'hafalan', label: "Hafalan", icon: "menu_book", roles: ['admin', 'guru', 'wali'], inBottom: false },
    { id: 'input', label: "Input", icon: "add", roles: ['admin', 'guru'], inBottom: true, highlight: true },
    { id: 'ujian', label: "Ujian", icon: "assignment_turned_in", roles: ['admin', 'guru'], inBottom: false },
    { id: 'absensi', label: "Absensi", icon: "event_available", roles: ['admin', 'guru'], inBottom: true },
    { id: 'jadwal', label: "Jadwal", icon: "calendar_month", roles: ['admin', 'guru'], inBottom: false },
    { id: 'target', label: "Target", icon: "track_changes", roles: ['admin'], inBottom: false },
    { id: 'guru', label: "Guru", icon: "supervisor_account", roles: ['admin'], inBottom: false },
    { id: 'mapel', label: "Mapel", icon: "book_2", roles: ['admin'], inBottom: false },
    { id: 'kelas', label: "Kelas", icon: "meeting_room", roles: ['admin'], inBottom: false },
    { id: 'quran', label: "Al-Quran", icon: "auto_stories", roles: ['admin', 'guru', 'wali'], inBottom: false },
    { id: 'riwayat', label: "Riwayat", icon: "history", roles: ['admin', 'guru', 'wali'], inBottom: false },
    { id: 'rekap', label: "Rekap", icon: "analytics", roles: ['admin', 'guru', 'wali'], inBottom: false },
    { id: 'logout', label: "Keluar", icon: "logout", roles: ['admin', 'guru', 'wali'], inBottom: true, isAction: true }
];

function renderLayout(activePage, contentHTML) {
    const myMenus = APP_MENUS.filter(m => m.roles.includes(currentUser.role));

    const sidebar = `
    <aside class="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-full fixed left-0 top-0 z-30 shadow-sm">
        <div class="p-6 border-b border-slate-100 flex items-center gap-3">
            <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg"><span class="material-symbols-outlined">school</span></div>
            <div><h1 class="text-slate-900 font-bold text-lg leading-none">${APP_CONFIG.appName}</h1><p class="text-slate-500 text-xs mt-1">Ver. ${APP_CONFIG.version}</p></div>
        </div>
        <div class="flex-1 p-4 space-y-1 overflow-y-auto">
            ${myMenus.map(m => `<button onclick="navigate('${m.id}')" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activePage === m.id ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}"><span class="material-symbols-outlined">${m.icon}</span> ${m.label}</button>`).join('')}
        </div>
        <div class="p-4 border-t border-slate-100 space-y-2">
            <div onclick="navigate('profile')" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition group">
                <div class="size-8 bg-blue-100 text-primary rounded-full flex items-center justify-center font-bold text-xs group-hover:bg-primary group-hover:text-white transition">
                    ${currentUser.full_name.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1 overflow-hidden">
                    <p class="text-xs font-bold text-slate-900 truncate group-hover:text-primary">${currentUser.full_name}</p>
                    <p class="text-[10px] text-slate-500 truncate">${currentUser.role}</p>
                </div>
                <span class="material-symbols-outlined text-slate-300 text-sm">settings</span>
            </div>
            <button onclick="logout()" class="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 font-medium text-sm"><span class="material-symbols-outlined">logout</span> Keluar</button>
        </div>
    </aside>
    `;

    const bottomItems = myMenus.filter(m => m.inBottom).slice(0, 5);
    const mobileNav = `
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[50] h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
        <div class="flex h-full w-full relative">
            ${bottomItems.map((m) => {
        if (m.highlight) {
            return `
                    <div class="w-1/5 flex justify-center items-center relative">
                        <div class="floating-btn-wrapper">
                            <button onclick="navigate('${m.id}')" class="floating-btn">
                                <span class="material-symbols-outlined text-[32px]">${m.icon}</span>
                            </button>
                        </div>
                    </div>`;
        } else {
            return `
                    <button onclick="navigate('${m.id}')" class="w-1/5 flex flex-col items-center justify-center gap-1 ${activePage === m.id ? 'active' : 'text-slate-400'} active:scale-95 transition-transform">
                        <span class="material-symbols-outlined text-[26px]">${m.icon}</span>
                        <span class="text-[10px] font-bold">${m.label}</span>
                    </button>`;
        }
    }).join('')}
        </div>
    </nav>
    `;

    const isQuran = activePage === 'quran';
    const mainClasses = isQuran
        ? "flex-1 overflow-hidden w-full h-full p-0"
        : "flex-1 overflow-y-auto w-full max-w-7xl mx-auto p-4 md:p-8 pb-24 md:pb-8";

    return `
    ${sidebar}
    <div class="flex-1 flex flex-col h-full md:pl-64 bg-slate-50 relative">
        <header class="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-sm ${isQuran ? 'hidden' : ''}">
            <div class="flex items-center gap-2"><div class="size-8 bg-primary rounded-lg flex items-center justify-center text-white"><span class="material-symbols-outlined text-lg">school</span></div><h2 class="font-bold text-slate-800 text-lg tracking-tight">${APP_CONFIG.appName}</h2></div>
        </header>
        <main class="${mainClasses}">${contentHTML}</main>
        ${isQuran ? '' : mobileNav}
    </div>
    <div id="toast-container" class="fixed top-4 right-4 z-[100] space-y-2"></div>
    <div id="modal-overlay" class="hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div id="modal-content" class="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"></div>
    </div>
    `;
}

function navigate(pageId) {
    if (pageId === 'logout') { logout(); return; }

    if (pageId === 'dashboard') renderDashboard();
    else if (pageId === 'santri') renderSantriManagement();
    else if (pageId === 'guru') renderUserManagement();
    else if (pageId === 'mapel') renderMapelPage();
    else if (pageId === 'kelas') renderKelasPage();
    else if (pageId === 'input') renderInputForm();
    else if (pageId === 'quran') renderQuranPage();
    else if (pageId === 'riwayat') renderRiwayatPage();
    else if (pageId === 'rekap') renderRiwayatPage(); // Re-use Riwayat for now or add specific
    else if (pageId === 'absensi') renderAbsensiPage();
    else if (pageId === 'jadwal') renderJadwalPage();
    else if (pageId === 'target') renderTargetPage();
    else if (pageId === 'ujian') renderUjianPage();
    else if (pageId === 'hafalan') renderHafalanPage();
    else if (pageId === 'profile') renderProfilePage();
}

function refreshData() {
    allData = DB.getAll();
    buildIndexes();
}

// Global Toggle (added in previous session, ensuring it's kept)
window.toggleMenu = function (id, e) {
    e.stopPropagation();
    document.querySelectorAll('[id^="menu-"]').forEach(el => {
        if (el.id !== `menu-${id}`) el.classList.add('hidden');
    });
    const menu = document.getElementById(`menu-${id}`);
    if (menu) menu.classList.toggle('hidden');
};

window.addEventListener('click', () => {
    document.querySelectorAll('[id^="menu-"]').forEach(el => el.classList.add('hidden'));
});
