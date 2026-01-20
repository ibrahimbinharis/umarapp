// --- 4. INITIALIZATION ---
async function initializeApp() {
    try {
        const cached = sessionStorage.getItem('quran_data');
        if (cached) surahList = JSON.parse(cached);
        else {
            try {
                const response = await fetch('https://equran.id/api/v2/surat');
                const result = await response.json();
                surahList = result.data.map(s => ({ no: s.nomor, name: s.nama, latin: s.namaLatin }));
                sessionStorage.setItem('quran_data', JSON.stringify(surahList));
            } catch (e) {
                surahList = Array.from({ length: 114 }, (_, i) => ({ no: i + 1, latin: `Surat ${i + 1}` }));
            }
        }
    } catch (e) { console.warn("Quran Init Error", e); }

    allData = DB.getAll();
    buildIndexes();

    const s = sessionStorage.getItem('tahfidz_session');
    if (s) {
        currentUser = JSON.parse(s);
        renderDashboard();
    } else {
        renderLogin();
    }

    if (localStorage.getItem(SYNC_URL_KEY)) {
        DB.syncFromCloud().then(() => {
            refreshData();
            // sync complete - data refreshed silently
        }).catch(e => console.log("Bg Sync paused"));
    }
}

// Attach to window
window.initializeApp = initializeApp;
document.addEventListener('DOMContentLoaded', initializeApp);
