/**
 * useProfile Composable
 * 
 * Manages User Profile State and Updates
 * - Handles Profile Form State
 * - Updates User/Guru/Santri(Wali) data
 * - Manages Password Updates
 * 
 * Dependencies: DB, refreshData
 */

function useProfile(uiData, DB, userSession, refreshData) {
    const { reactive } = Vue;

    // --- STATE ---
    const activeSubMenu = Vue.ref(null); // null, 'account', 'santri'

    const profileForm = reactive({
        full_name: '',
        username: '',
        password: '',
        phone: '',
        gender: '', // Added for cloud notification filtering
        photo_url: '' // Added for better tracking
    });

    // --- METHODS ---
    const initProfileForm = () => {
        if (!userSession.value) return;
        profileForm.full_name = userSession.value.full_name || '';
        profileForm.username = userSession.value.custom_username || userSession.value.username || '';
        profileForm.phone = userSession.value.phone || '';
        profileForm.gender = userSession.value.gender || '';
        profileForm.password = '';
    };

    const saveProfile = async () => {
        if (!profileForm.full_name) return alert("Nama wajib diisi");
        if (!profileForm.username) return alert("Username wajib diisi");

        // We can't access 'loading' ref from here directly unless passed or we use a local one?
        // Usually composables return 'loading' or we rely on parent's loading if passed.
        // Let's assume we use window.loading or just define a local ref if we want to be pure.
        // But app_vue uses its own global loading. 
        // Let's pass 'loading' as an argument or just use window.loading if it was global (it is not).
        // For now, let's keep it simple and maybe return a promise?
        // Or better: Use a local loading state if needed, but app_vue controls the UI overlay.
        // Let's try to access the loading ref if we can, or just skip it for now (it's fast).

        try {
            const updates = {
                full_name: profileForm.full_name,
                phone: profileForm.phone,
                gender: profileForm.gender,
                custom_username: profileForm.username
            };

            // --- AUTH PASSWORD UPDATE ---
            if (profileForm.password) {
                console.log("Updating Supabase Auth password...");
                const { error: authError } = await sb.auth.updateUser({
                    password: profileForm.password
                });
                if (authError) throw new Error("Gagal update Auth: " + authError.message);

                updates.password = profileForm.password;
            }

            // --- DATABASE UPDATE ---
            try {
                console.log("Saving profile for ID:", userSession.value._id, updates);
                await DB.update(userSession.value._id, updates);
            } catch (err) {
                if (err.message && err.message.includes("not found")) {
                    console.warn("Profile record not found in local DB. Creating new one...");
                    // Create minimal profile if none exists locally
                    const newProfile = {
                        _id: userSession.value._id,
                        username: userSession.value.username || profileForm.username,
                        full_name: updates.full_name,
                        phone: updates.phone,
                        gender: updates.gender,
                        custom_username: updates.custom_username,
                        role: userSession.value.role || 'wali',
                        password: profileForm.password || 'migrated_user' // Provide placeholder to satisfy NOT NULL
                    };
                    await DB.create('user', newProfile);
                } else {
                    throw err;
                }
            }

            // --- UPDATE LOCAL SESSION ---
            userSession.value.full_name = updates.full_name;
            userSession.value.phone = updates.phone;
            userSession.value.gender = updates.gender;
            userSession.value.custom_username = updates.custom_username;

            // Persistence
            localStorage.setItem('tahfidz_session', JSON.stringify(userSession.value));

            alert("Profil berhasil disimpan");

            // Clear password and re-sync form
            profileForm.password = '';
            initProfileForm();

            if (refreshData) refreshData();

            // Trigger Sync
            if (DB.syncToCloud) DB.syncToCloud();

            return true;
        } catch (e) {
            console.error("Save Profile Error:", e);
            alert("Gagal menyimpan profil: " + e.message);
            return false;
        }
    };

    const deletePhoto = async () => {
        if (!userSession.value.photo_url) return;
        if (!confirm("Hapus foto profil?")) return;

        try {
            await DB.update(userSession.value._id, { photo_url: null });
            userSession.value.photo_url = null;
            localStorage.setItem('tahfidz_session', JSON.stringify(userSession.value));
            alert("Foto profil berhasil dihapus");
        } catch (e) {
            console.error(e);
            alert("Gagal menghapus foto profil");
        }
    };

    // --- PHOTO UPLOAD LOGIC ---
    const isUploading = reactive({ value: false }); // Use object for ref-like behavior if ref not destructured

    const resizeImage = (file, maxWidth = 800) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL(file.type, 0.7));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    // Refactored to accept base64 string directly (from Cropper)
    const uploadPhoto = async (base64Data) => {
        if (!base64Data) return;

        isUploading.value = true;
        try {
            // No resize needed here, assume Cropper output is already sized/compressed
            const filename = `profile_${userSession.value._id}_${Date.now()}.jpg`;

            // Key must match core.js 'tahfidz_sync_url'
            const url = localStorage.getItem('tahfidz_sync_url');

            if (!url) throw new Error("URL Sync belum di-set");

            // Strip header if present to ensure raw base64
            const rawBase64 = String(base64Data).includes(',') ? String(base64Data).split(',')[1] : String(base64Data);

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'upload_profile',
                    image_data: rawBase64,
                    mime_type: 'image/jpeg',
                    filename: filename
                })
            });

            const json = await res.json();
            if (json.success) {
                await DB.update(userSession.value._id, { photo_url: json.url });
                userSession.value.photo_url = json.url;
                localStorage.setItem('tahfidz_session', JSON.stringify(userSession.value));
                alert("Foto berhasil diubah! (Mungkin butuh waktu untuk muncul)");
            } else {
                throw new Error(json.error || "Upload gagal");
            }
        } catch (e) {
            console.error(e);
            alert("Gagal upload foto: " + e.message);
        }
    };

    // --- WALI: LINK SANTRI LOGIC ---
    const nisInput = Vue.ref('');
    const linkedSantri = Vue.ref([]);

    /**
     * Get list of Santri linked to current Wali
     */
    const getLinkedSantri = async () => {
        if (userSession.value?.role !== 'wali') return;

        console.log('📥 Loading linked santri for Wali:', userSession.value._id);

        try {
            const { data, error } = await sb.from('santri')
                .select('*')
                .eq('wali_id', userSession.value._id)
                .or('_deleted.is.null,_deleted.eq.false');

            console.log('📊 Linked santri result:', { data, error });

            if (error) throw error;
            linkedSantri.value = data || [];
        } catch (e) {
            console.error('Error loading linked santri:', e);
        }
    };

    /**
     * Link a Santri to current Wali by NIS
     * @param {string} nis - NIS Santri
     */
    const linkSantri = async (nis) => {
        if (!nis) return alert('NIS wajib diisi');
        if (userSession.value?.role !== 'wali') return alert('Fitur ini khusus Wali');

        try {
            console.log('🔍 Searching for NIS:', nis.trim());

            // 1. Find santri by NIS (allow _deleted = null or false)
            const { data: santriList, error: findError } = await sb.from('santri')
                .select('*')
                .eq('nis', nis.trim())
                .or('_deleted.is.null,_deleted.eq.false');

            console.log('📊 Query result:', { santriList, error: findError });

            if (findError) throw findError;

            // Get first result
            const santri = santriList && santriList.length > 0 ? santriList[0] : null;

            if (!santri) return alert('NIS tidak ditemukan');

            // 2. Check if already linked to another Wali
            // 2. Check if already linked to another Wali (Allow override with confirmation)
            if (santri.wali_id && santri.wali_id !== userSession.value._id) {
                const proceed = confirm(`Santri ini sudah terhubung ke akun Wali lain. Ambil alih sambungan ke akun Anda?`);
                if (!proceed) return;
            }

            // 3. Link to current Wali
            const { error: updateError } = await sb.from('santri')
                .update({ wali_id: userSession.value._id })
                .eq('_id', santri._id);

            if (updateError) throw updateError;

            // 4. Update local state immediately
            // Manual update ensures instant UI feedback without waiting for network
            await DB.update(santri._id, { wali_id: userSession.value._id });

            const linked = { ...santri, wali_id: userSession.value._id };
            // Remove if exists to prevent duplicates
            linkedSantri.value = linkedSantri.value.filter(s => s._id !== linked._id);
            linkedSantri.value.push(linked);

            // Background fetch to ensure sync
            getLinkedSantri();

            nisInput.value = ''; // Reset input
            alert(`Berhasil menghubungkan dengan ${santri.full_name}`);

            // Manual update of global UI state for immediate Dashboard visibility
            if (uiData && uiData.santri) {
                const existingInUi = uiData.santri.find(s => s._id === linked._id);
                if (!existingInUi) {
                    uiData.santri.push(linked);
                }
            }

            if (refreshData) {
                console.log("Refreshing global data...");
                refreshData();
            }
        } catch (e) {
            console.error('Error linking santri:', e);
            alert('Gagal menghubungkan santri: ' + e.message);
        }
    };

    /**
     * Unlink a Santri from current Wali
     * @param {string} santriId - ID Santri
     */
    const unlinkSantri = async (santriId) => {
        if (!confirm('Putuskan hubungan dengan santri ini?')) return;

        try {
            const { error } = await sb.from('santri')
                .update({ wali_id: null })
                .eq('_id', santriId);

            if (error) throw error;

            await DB.update(santriId, { wali_id: null });
            await getLinkedSantri();

            alert('Hubungan berhasil diputuskan');
            if (refreshData) refreshData();
        } catch (e) {
            console.error('Error unlinking santri:', e);
            alert('Gagal memutuskan hubungan: ' + e.message);
        }
    };

    return {
        activeSubMenu,
        profileForm,
        initProfileForm,
        saveProfile,
        uploadPhoto,
        deletePhoto,
        isUploading: Vue.computed(() => isUploading.value),
        // Wali Link Santri
        nisInput,
        linkedSantri,
        getLinkedSantri,
        linkSantri,
        unlinkSantri
    };
}
