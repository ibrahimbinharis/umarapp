const useAuth = (currentView, loading) => {
    const { ref, reactive, onMounted } = Vue;

    const userSession = ref(null);
    const isRegisterMode = ref(false); // Toggle Login/Register
    const loginForm = reactive({
        username: '',
        password: '',
        fullName: '' // For registration
    });

    // --- Actions ---

    const handleLogin = async () => {
        if (!loginForm.username || !loginForm.password) {
            alert("Username dan Password wajib diisi!");
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

                // Setup Initial for Wali (Optional logic if needed)
                if (user.role === 'wali') {
                    // Logic Wali specific 
                }

                loginForm.username = '';
                loginForm.password = '';
            } else {
                alert(res.message || "Username atau Password salah!");
            }
        } catch (e) {
            console.error("Login error:", e);
            alert("Gagal login: " + (e.message || "Periksa koneksi internet"));
        } finally {
            loading.value = false;
        }
    };

    const handleRegister = async () => {
        if (!loginForm.username || !loginForm.password) {
            alert("Username dan Password wajib diisi!");
            return;
        }

        loading.value = true;

        try {
            // Register to Supabase Auth
            const username = loginForm.username.trim();
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
                    // Create new user profile (Standardized to 'user' singular)
                    await DB.create('user', {
                        _id: data.user.id, // Important: Link ID
                        username: username,
                        full_name: fullName,
                        role: 'wali',
                        password: '', // No need to store hash anymore
                        created_at: new Date().toISOString()
                    });
                } else {
                    // MIGRATION: Claim existing profile
                    // Update the old profile's ID to match the new Auth ID
                    // This is safely allowing the existing profile to be "adopted" by the new Auth User
                    // We update '_id' (Local ID) and attempt to update 'id' if schema allows.
                    console.log("Migrating existing user:", existingUser.username);

                    const { error: updateError } = await sb.from('users')
                        .update({ _id: data.user.id })
                        .eq('username', username);

                    if (updateError) {
                        console.error("Migration Failed (ID update):", updateError);
                    } else {
                        console.log("Migration Success: Profile linked to Auth ID");
                    }
                }

                alert("Registrasi berhasil! Silakan login.");
                isRegisterMode.value = false;
            }

        } catch (e) {
            console.error("Register error:", e);
            alert("Gagal registrasi: " + e.message);
        } finally {
            loading.value = false;
        }
    };

    const logout = async () => {
        if (confirm("Keluar dari aplikasi?")) {
            try {
                // Try to sign out from Supabase (might fail if offline)
                await sb.auth.signOut();
            } catch (e) {
                console.error("SignOut error:", e);
            } finally {
                // ALWAYS clear local state and redirect
                localStorage.removeItem('tahfidz_session');
                userSession.value = null;
                currentView.value = 'login';
                loginForm.username = '';
                loginForm.password = '';

                // Clear Hash and history to prevent "back" to protected area
                window.location.hash = '#login';
                window.history.replaceState({ view: 'login' }, '', '#login');

                // Hard reload to clear all sensitive state (filtered data, etc.)
                // and ensure we are back at login screen.
                console.log("Logout successful, performing clean reload...");
                window.location.reload();
            }
        }
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
            currentView.value = 'login';
            window.history.replaceState({ view: 'login' }, '', '#login');
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
