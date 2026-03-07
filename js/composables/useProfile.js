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

        // v36: If role is Santri, get phone from master data (it's synced with Wali)
        if (userSession.value.role === 'santri') {
            const s = (uiData.santri || []).find(x => x.santri_id === userSession.value.username || x.nis === userSession.value.username);
            profileForm.phone = s ? (s.parent_phone || s.no_hp || '') : '';
        } else {
            profileForm.phone = userSession.value.phone || '';
        }

        profileForm.gender = userSession.value.gender || '';
        profileForm.password = '';
    };

    const saveProfile = async () => {
        return window.withSaving(async () => {
            if (!profileForm.full_name) return window.showAlert("Nama wajib diisi", "Peringatan", "warning");
            if (!profileForm.username) return window.showAlert("Username wajib diisi", "Peringatan", "warning");

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

                // --- v36: SYNC PHONE TO LINKED SANTRI (Wali Only) ---
                if (userSession.value.role === 'wali' && updates.phone) {
                    console.log("Syncing updated Wali phone to linked santri...");
                    try {
                        // Update Cloud
                        await sb.from('santri')
                            .update({
                                parent_phone: updates.phone,
                                no_hp: updates.phone,
                                parent_name: updates.full_name
                            })
                            .eq('wali_id', userSession.value._id);

                        // Update Local data
                        const allData = DB.getAll();
                        let changed = false;
                        allData.forEach(d => {
                            if (d.__type === 'santri' && d.wali_id === userSession.value._id) {
                                d.parent_phone = updates.phone;
                                d.no_hp = updates.phone;
                                d.parent_name = updates.full_name;
                                changed = true;
                            }
                        });
                        if (changed) DB.saveAll(allData);
                    } catch (syncErr) {
                        console.error("Failed to sync phone to santri:", syncErr);
                    }
                }

                // --- UPDATE LOCAL SESSION ---
                userSession.value.full_name = updates.full_name;
                userSession.value.phone = updates.phone;
                userSession.value.gender = updates.gender;
                userSession.value.custom_username = updates.custom_username;

                // Persistence
                localStorage.setItem('tahfidz_session', JSON.stringify(userSession.value));

                window.showAlert("Profil berhasil disimpan", "Sukses", "info");

                // Clear password and re-sync form
                profileForm.password = '';
                initProfileForm();

                if (refreshData) refreshData();

                // Trigger Sync
                if (DB.syncToCloud) DB.syncToCloud();

                return true;
            } catch (e) {
                console.error("Save Profile Error:", e);
                window.showAlert("Gagal menyimpan profil: " + e.message, "Error", "danger");
                return false;
            }
        }); // end withSaving
    };

    const deletePhoto = async () => {
        if (!userSession.value.photo_url) return;

        window.showConfirm({
            title: 'Hapus Foto',
            message: 'Hapus foto profil?',
            confirmText: 'Ya, Hapus',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await DB.update(userSession.value._id, { photo_url: null });
                    userSession.value.photo_url = null;
                    localStorage.setItem('tahfidz_session', JSON.stringify(userSession.value));
                    window.showAlert("Foto profil berhasil dihapus", "Sukses", "info");
                } catch (e) {
                    console.error(e);
                    window.showAlert("Gagal menghapus foto profil", "Error", "danger");
                }
            }
        });
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

    // Refactored to use Supabase Storage Bucket 'profiles'
    const uploadPhoto = async (base64Data) => {
        if (!base64Data) return;

        isUploading.value = true;
        try {
            const filename = `profile_${userSession.value._id}_${Date.now()}.jpg`;
            const filePath = `uploads/${filename}`;

            // Convert base64 to Blob
            const response = await fetch(base64Data);
            const blob = await response.blob();

            // 1. Upload to Supabase Storage
            const { data, error } = await sb.storage
                .from('profiles')
                .upload(filePath, blob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (error) throw error;

            // 2. Get Public URL
            const { data: { publicUrl } } = sb.storage
                .from('profiles')
                .getPublicUrl(filePath);

            // 3. Update DB and local storage
            await DB.update(userSession.value._id, { photo_url: publicUrl });

            // Also update Supabase 'users' table directly to ensure cloud sync
            await sb.from('users').update({ photo_url: publicUrl }).eq('_id', userSession.value._id);

            userSession.value.photo_url = publicUrl;
            localStorage.setItem('tahfidz_session', JSON.stringify(userSession.value));

            window.showAlert("Foto profil berhasil diperbarui!", "Sukses", "info");
        } catch (e) {
            console.error("Upload Photo Error:", e);
            window.showAlert("Gagal upload foto: " + e.message, "Error", "danger");
        } finally {
            isUploading.value = false;
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
        if (!nis) return window.showAlert('NIS wajib diisi', 'Peringatan', 'warning');
        if (userSession.value?.role !== 'wali') return window.showAlert('Fitur ini khusus Wali', 'Peringatan', 'warning');

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

            // 2. Check if already linked to another Wali (Allow override with confirmation)
            if (santri.wali_id && santri.wali_id !== userSession.value._id) {
                window.showConfirm({
                    title: 'Ambil Alih Hubungan',
                    message: `Santri ini sudah terhubung ke akun Wali lain. Ambil alih sambungan ke akun Anda?`,
                    confirmText: 'Ya, Ambil Alih',
                    type: 'warning',
                    onConfirm: async () => {
                        // Recurse or just perform the update part here
                        await performLink(santri);
                    }
                });
                return;
            }

            await performLink(santri);
        } catch (e) {
            console.error('Error linking santri:', e);
            window.showAlert('Gagal menghubungkan santri: ' + e.message, 'Error', 'danger');
        }
    };

    // Helper for Linking logic to avoid duplication after confirm
    const performLink = async (santri) => {
        try {
            // v36: Sync phone number to santri profile
            const waliPhone = userSession.value.phone || '';
            const { error: updateError } = await sb.from('santri')
                .update({
                    wali_id: userSession.value._id,
                    parent_phone: waliPhone,
                    no_hp: waliPhone
                })
                .eq('_id', santri._id);

            if (updateError) throw updateError;

            await DB.update(santri._id, {
                wali_id: userSession.value._id,
                parent_phone: waliPhone,
                no_hp: waliPhone
            });

            const linked = {
                ...santri,
                wali_id: userSession.value._id,
                parent_phone: waliPhone,
                no_hp: waliPhone
            };
            linkedSantri.value = linkedSantri.value.filter(s => s._id !== linked._id);
            linkedSantri.value.push(linked);

            getLinkedSantri();
            nisInput.value = '';
            window.showAlert(`Berhasil menghubungkan dengan ${santri.full_name}`, "Sukses", "info");

            if (uiData && uiData.santri) {
                const existingInUi = uiData.santri.find(s => s._id === linked._id);
                if (!existingInUi) uiData.santri.push(linked);
            }

            if (refreshData) refreshData();
        } catch (e) {
            window.showAlert('Gagal menghubungkan: ' + e.message, 'Error', 'danger');
        }
    };

    /**
     * Unlink a Santri from current Wali
     * @param {string} santriId - ID Santri
     */
    const unlinkSantri = async (santriId, onSuccess) => {
        window.showConfirm({
            title: 'Putus Hubungan',
            message: 'Putuskan hubungan dengan santri ini?',
            confirmText: 'Ya, Putuskan',
            type: 'danger',
            onConfirm: async () => {
                try {
                    // Hapus dari local ref
                    linkedSantri.value = linkedSantri.value.filter(s => s._id !== santriId);

                    const { error } = await sb.from('santri')
                        .update({ wali_id: null, parent_phone: null, no_hp: null })
                        .eq('_id', santriId);
                    if (error) throw error;

                    await DB.update(santriId, { wali_id: null, parent_phone: null, no_hp: null });

                    window.showAlert('Hubungan berhasil diputuskan', 'Sukses', 'info');

                    // Panggil callback agar komponen bisa update UI lokal
                    if (onSuccess) onSuccess(santriId);

                    getLinkedSantri(); // background refresh
                    if (refreshData) refreshData();
                } catch (e) {
                    console.error('Error unlinking santri:', e);
                    await getLinkedSantri(); // pulihkan jika gagal
                    window.showAlert('Gagal memutuskan hubungan: ' + e.message, 'Error', 'danger');
                }
            }
        });
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
