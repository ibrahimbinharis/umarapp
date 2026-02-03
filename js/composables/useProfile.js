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
    const profileForm = reactive({
        full_name: '',
        username: '',
        password: ''
    });

    // --- METHODS ---
    const initProfileForm = () => {
        if (!userSession.value) return;
        profileForm.full_name = userSession.value.full_name || '';
        profileForm.username = userSession.value.custom_username || userSession.value.username || '';
        profileForm.password = '';
    };

    const saveProfile = async () => {
        if (!profileForm.full_name) return alert("Nama wajib diisi");
        if (!profileForm.username && userSession.value.role !== 'wali') return alert("Username wajib diisi");

        // We can't access 'loading' ref from here directly unless passed or we use a local one?
        // Usually composables return 'loading' or we rely on parent's loading if passed.
        // Let's assume we use window.loading or just define a local ref if we want to be pure.
        // But app_vue uses its own global loading. 
        // Let's pass 'loading' as an argument or just use window.loading if it was global (it is not).
        // For now, let's keep it simple and maybe return a promise?
        // Or better: Use a local loading state if needed, but app_vue controls the UI overlay.
        // Let's try to access the loading ref if we can, or just skip it for now (it's fast).

        try {
            const updates = { full_name: profileForm.full_name };

            if (userSession.value.role === 'guru' || userSession.value.role === 'admin') {
                updates.custom_username = profileForm.username;
            }

            if (profileForm.password) {
                // Determine format
                if (window.crypto && window.crypto.subtle) {
                    updates.password = await hashPassword(profileForm.password);
                } else {
                    updates.password = "F_" + btoa(profileForm.password).split('').reverse().join('');
                }
            }

            // Update based on Role
            if (userSession.value.role === 'wali') {
                // Update Santri Data (Parent Name/Password)
                // userSession for Wali is { ...santriData, role: 'wali' }
                // Real ID is userSession.child_id or userSession._id?
                // In login logic: user = { ...santri, role: 'wali', child_id: santri._id }
                const childId = userSession.value.child_id;
                const payload = { parent_name: profileForm.full_name };
                if (updates.password) payload.password = updates.password;

                await DB.update(childId, payload);

                // Update Session
                userSession.value.parent_name = payload.parent_name;
                // Don't store password in session
            } else {
                // Update User (Guru/Admin)
                await DB.update(userSession.value._id, updates);

                // Update Session
                userSession.value.full_name = updates.full_name;
                if (updates.custom_username) userSession.value.custom_username = updates.custom_username;
            }

            // Persistence
            sessionStorage.setItem('tahfidz_session', JSON.stringify(userSession.value));

            alert("Profil berhasil disimpan");
            refreshData(); // Refresh UI list if needed
        } catch (e) {
            console.error(e);
            alert("Gagal menyimpan profil");
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
                sessionStorage.setItem('tahfidz_session', JSON.stringify(userSession.value));
                alert("Foto berhasil diubah! (Mungkin butuh waktu untuk muncul)");
            } else {
                throw new Error(json.error || "Upload gagal");
            }
        } catch (e) {
            console.error(e);
            alert("Gagal upload foto: " + e.message);
        } finally {
            isUploading.value = false;
        }
    };

    return {
        profileForm,
        initProfileForm,
        saveProfile,
        uploadPhoto,
        isUploading: Vue.computed(() => isUploading.value)
    };
}
