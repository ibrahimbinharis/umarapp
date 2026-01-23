// --- 4. INITIALIZATION ---
async function initializeApp() {
    // Init Surah Data (equran.id)
    await initSurahData();

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
