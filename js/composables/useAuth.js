const useAuth = (currentView, loading) => {
    const { ref, reactive, onMounted } = Vue;

    const storedSession = localStorage.getItem('tahfidz_session');
    const userSession = ref(storedSession ? JSON.parse(storedSession) : null);
    const isRegisterMode = ref(false); // Toggle Login/Register
    const loginForm = reactive({
        username: '',
        password: '',
        fullName: '', // For registration
        phone: ''     // For registration (Wali)
    });

    // --- Actions ---

    const handleLogin = async () => {
        if (!loginForm.username || !loginForm.password) {
            window.showAlert("Username dan Password wajib diisi!", "Login", "warning");
            return;
        }

        loading.value = true;

        try {
            // v36: Login via Supabase (DB.login updated to use Supabase Auth)
            const res = await DB.login(loginForm.username, loginForm.password);

            if (res.success && res.user) {
                // Login Success
                const user = res.user;
                userSession.value = user;
                localStorage.setItem('tahfidz_session', JSON.stringify(user));

                // Redirect
                currentView.value = 'dashboard';
                // PWA: Fix URL state on login to prevent Back -> Login
                window.history.replaceState({ view: 'dashboard' }, '', '#dashboard');

                // Setup Initial for Wali/Santri (v36)
                if (user.role === 'santri') {
                    user.child_id = user.username;
                }

                loginForm.username = '';
                loginForm.password = '';
            } else {
                window.showAlert(res.message || "Username atau Password salah!", "Login Gagal", "danger");
            }
        } catch (e) {
            console.error("Login error:", e);
            window.showAlert("Gagal login: " + (e.message || "Periksa koneksi internet"), "Error", "danger");
        } finally {
            loading.value = false;
        }
    };

    const handleRegister = async () => {
        if (!loginForm.username || !loginForm.password) {
            window.showAlert("Username dan Password wajib diisi!", "Peringatan", "warning");
            return;
        }

        loading.value = true;

        try {
            // Register to Supabase Auth
            const username = loginForm.username.trim().toLowerCase();

            // v36: Username Validation (No space, no quotes, alphanumeric only)
            const usernameRegex = /^[a-zA-Z0-9._]+$/;
            if (!usernameRegex.test(username)) {
                window.showAlert("Username hanya boleh berisi huruf, angka, titik (.) atau underscore (_)", "Peringatan", "warning");
                loading.value = false;
                return;
            }

            // v36: NIS Protection (Prevent Wali from using a Santri NIS)
            const { data: isNIS } = await sb.from('santri')
                .select('santri_id')
                .or(`nis.eq."${username}",santri_id.eq."${username}"`)
                .maybeSingle();

            if (isNIS) {
                window.showAlert("Username ini adalah NIS milik Santri. Silakan gunakan username lain.", "Dilarang", "danger");
                loading.value = false;
                return;
            }

            // v36: Unique Check (Global: username or custom_username)
            const { data: taken } = await sb.from('users')
                .select('username')
                .or(`username.eq."${username}",custom_username.eq."${username}"`)
                .maybeSingle();

            if (taken) {
                window.showAlert("Username ini sudah digunakan oleh pengguna lain.", "Gagal", "warning");
                loading.value = false;
                return;
            }

            const password = loginForm.password.trim();
            const fullName = loginForm.fullName ? loginForm.fullName.trim() : username;

            const email = username.includes('@') ? username : `${username}@tahfidz.app`;

            const { data, error } = await sb.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        username: username,
                        full_name: fullName,
                        role: 'wali' // Default role for public registration
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                // Check if user profile exists (Server-side check)
                const { data: existingUser } = await sb.from('users')
                    .select('*')
                    .eq('username', username)
                    .maybeSingle();

                if (!existingUser) {
                    // Create new user profile
                    await DB.create('user', {
                        _id: data.user.id,
                        username: username,
                        full_name: fullName,
                        phone: loginForm.phone ? loginForm.phone.trim() : '',
                        role: 'wali',
                        password: '',
                        created_at: new Date().toISOString()
                    });
                } else {
                    // MIGRATION: Claim existing profile
                    // Update the old profile's ID to match the new Auth ID
                    // This is safely allowing the existing profile to be "adopted" by the new Auth User
                    // We update '_id' (Local ID) and attempt to update 'id' if schema allows.
                    console.log("Migrating existing user:", existingUser.username);

                    const { error: updateError } = await sb.from('users')
                        .update({ _id: data.user.id, phone: loginForm.phone ? loginForm.phone.trim() : undefined })
                        .eq('username', username);

                    if (updateError) {
                        console.error("Migration Failed (ID update):", updateError);
                    } else {
                        console.log("Migration Success: Profile linked to Auth ID");
                    }
                }

                window.showAlert("Registrasi berhasil! Silakan login.", "Sukses", "info");
                isRegisterMode.value = false;
                loginForm.phone = '';
                loginForm.fullName = '';
                loginForm.username = '';
                loginForm.password = '';
            }

        } catch (e) {
            console.error("Register error:", e);
            window.showAlert("Gagal registrasi: " + e.message, "Error", "danger");
        } finally {
            loading.value = false;
        }
    };

    const logout = async () => {
        window.showConfirm({
            title: 'Keluar Akun',
            message: 'Keluar dari aplikasi?',
            confirmText: 'Ya, Keluar',
            onConfirm: async () => {
                    try {
                        // v37: Clear Push Subscription on Logout with 3s Timeout Protection
                        if (window.PushService && userSession.value) {
                             console.log("[Auth] Attempting push unsubscription...");
                             const unsubscribePromise = window.PushService.unsubscribeUser(userSession.value._id);
                             const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000));
                             
                             // Race between unsubscription and 3s timeout
                             await Promise.race([unsubscribePromise, timeoutPromise]);
                        }
                        await sb.auth.signOut();
                    } catch (e) {
                        console.error("SignOut handling error:", e);
                    } finally {
                    localStorage.removeItem('tahfidz_session');
                    sessionStorage.removeItem('onboarding_shown'); // v36: Reset onboarding popup state on logout
                    userSession.value = null;
                    currentView.value = 'login';
                    loginForm.username = '';
                    loginForm.password = '';
                    window.location.hash = '#login';
                    window.history.replaceState({ view: 'login' }, '', '#login');
                    console.log("Logout successful, performing clean reload...");
                    window.location.reload();
                }
            }
        });
    };

    const checkSession = async () => {
        // 1. Check Supabase Session
        const { data } = await sb.auth.getSession();

        if (data.session) {
            // Sync with local Profile info
            // We can fetch from 'users' table using cached data or DB
            const user = data.session.user;

            // Find profile by ID (preferred) or username details
            // For strict correctness, we'd query DB, but for speed use local cache or session metadata
            // Let's rely on localStorage 'tahfidz_session' for instant load, then verify.
            let profile = localStorage.getItem('tahfidz_session') ? JSON.parse(localStorage.getItem('tahfidz_session')) : null;

            if (!profile || profile._id !== user.id) {
                // Refresh profile
                const { data: dbUser } = await sb.from('users').select('*').eq('_id', user.id).maybeSingle();
                if (dbUser) {
                    profile = dbUser;
                    // v36: If santri, set child_id to username (NIS)
                    if (profile.role === 'santri') profile.child_id = profile.username;
                    localStorage.setItem('tahfidz_session', JSON.stringify(profile));

                    // Standardize internal type and save to local DB
                    const uWithMeta = { ...dbUser, __type: 'user' };
                    const all = DB.getAll();
                    const idx = all.findIndex(x => x._id === uWithMeta._id);
                    if (idx === -1) all.unshift(uWithMeta);
                    else all[idx] = uWithMeta;
                    DB.saveAll(all);
                }
            }

            userSession.value = profile;

            // Redirect if on login
            if (currentView.value === 'login') {
                currentView.value = 'dashboard';
                window.history.replaceState({ view: 'dashboard' }, '', '#dashboard');
            }
        } else {
            // No session
            // Try legacy check? No, strictly Supabase Auth now.
            localStorage.removeItem('tahfidz_session');
            userSession.value = null;
            // Always force to login if no session is active during manual refresh/init
            // UNLESS we are in the 'install' landing page
            if (currentView.value !== 'install') {
                currentView.value = 'login';
                window.history.replaceState({ view: 'login' }, '', '#login');
            }
        }
    };

    onMounted(() => {
        // Listen to Auth State Changes
        sb.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                userSession.value = null;
                currentView.value = 'login';
            }
        });
    });

    return {
        userSession,
        loginForm,
        isRegisterMode,
        handleLogin,
        handleRegister,
        logout,
        checkSession
    };
};
