// --- PROFILE MANAGEMENT ---

function renderProfilePage() {
    refreshData();
    const user = currentUser;
    if (!user) return navigate('logout');

    const isGuru = user.role === 'guru' || user.role === 'admin';
    const isWali = user.role === 'wali';

    let displayRole = isGuru ? 'Guru / Staff' : (isWali ? 'Wali Santri' : user.role);
    let usernameVal = user.custom_username || user.username;

    const html = `
    <div class="fade-in space-y-6 pb-24">
        <div class="px-2">
            <h2 class="text-2xl font-bold text-slate-900">Pengaturan Profil</h2>
            <p class="text-xs text-slate-500">Perbarui informasi akun Anda</p>
        </div>

        <div class="bg-white p-6 rounded-3xl border shadow-sm mx-2">
            <div class="flex flex-col items-center mb-6">
                <div class="size-20 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-3">
                    ${user.full_name.charAt(0).toUpperCase()}
                </div>
                <h3 class="font-bold text-lg text-slate-900">${user.full_name}</h3>
                <span class="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold mt-1">${displayRole}</span>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="text-xs font-bold text-slate-400 uppercase block mb-1">Nama Lengkap</label>
                    <input id="p_name" type="text" value="${user.full_name}" class="w-full p-3 border rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none">
                </div>
                
                <div>
                    <label class="text-xs font-bold text-slate-400 uppercase block mb-1">Username (Login)</label>
                    <input id="p_username" type="text" value="${usernameVal}" ${isWali ? 'readonly' : ''} class="w-full p-3 border rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none ${isWali ? 'bg-slate-50 text-slate-500' : ''}">
                    ${isWali ? '<p class="text-[10px] text-slate-400 mt-1">*Username Wali mengikuti NIS Santri</p>' : ''}
                </div>

                <div class="pt-2 border-t border-slate-100">
                    <label class="text-xs font-bold text-slate-400 uppercase block mb-1">Password Baru</label>
                    <div class="relative">
                        <input id="p_password" type="password" placeholder="Kosongkan jika tidak ingin mengubah" class="w-full p-3 border rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none pr-10">
                        <button onclick="togglePasswordVisibility('p_password', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition">
                            <span class="material-symbols-outlined">visibility</span>
                        </button>
                    </div>
                </div>

                <button onclick="saveProfile()" class="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition mt-4">Simpan Perubahan</button>
            </div>
        </div>

        <div class="mx-2 p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <p class="text-xs text-slate-400">App Version ${APP_CONFIG.version}</p>
        </div>
    </div>`;

    document.getElementById('app-root').innerHTML = renderLayout('profile', html);
}

async function saveProfile() {
    const newName = document.getElementById('p_name').value.trim();
    const newUsername = document.getElementById('p_username').value.trim();
    const newPass = document.getElementById('p_password').value;

    if (!newName) return alert("Nama wajib diisi");
    if (!newUsername) return alert("Username wajib diisi");

    showLoading(true, "Menyimpan...");

    try {
        const updates = {
            full_name: newName
        };

        if (currentUser.role === 'guru' || currentUser.role === 'admin') {
            updates.custom_username = newUsername;
        }

        if (newPass) {
            updates.password = newPass; // DB.update handles hashing
        }

        // Update DB
        const updatedUser = await DB.update(currentUser._id, updates);

        // Update Session
        currentUser = { ...currentUser, ...updates };
        // If password changed, we don't store plain pass in session, but we keep the object structure consistent
        if (newPass) delete currentUser.password;

        sessionStorage.setItem('tahfidz_session', JSON.stringify(currentUser));

        // Sync force
        await DB.syncToCloud();

        showLoading(false);
        alert("Profil berhasil diperbarui!");
        renderProfilePage(); // Refresh view

    } catch (e) {
        showLoading(false);
        console.error(e);
        alert("Gagal menyimpan profil: " + e.message);
    }
}
