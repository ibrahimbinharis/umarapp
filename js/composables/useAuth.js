const useAuth = (currentView, loading) => {
    const { ref, reactive } = Vue;

    const userSession = ref(null);
    const loginForm = reactive({
        username: '',
        password: ''
    });

    // --- Actions ---

    const handleLogin = async () => {
        if (!loginForm.username || !loginForm.password) {
            alert("Username dan Password wajib diisi!");
            return;
        }

        loading.value = true;

        try {
            // v36: Login via Supabase (DB.login)
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

    const logout = () => {
        if (confirm("Keluar dari aplikasi?")) {
            localStorage.removeItem('tahfidz_session');
            userSession.value = null;
            currentView.value = 'login';
            loginForm.username = '';
            loginForm.password = '';
        }
    };

    const checkSession = () => {
        const sess = localStorage.getItem('tahfidz_session');
        if (sess) {
            try {
                userSession.value = JSON.parse(sess);
                // If on login page, go to dashboard
                if (currentView.value === 'login') {
                    currentView.value = 'dashboard';
                    window.history.replaceState({ view: 'dashboard' }, '', '#dashboard');
                }
            } catch (e) {
                console.error("Invalid session", e);
                localStorage.removeItem('tahfidz_session');
            }
        }
    };

    return {
        userSession,
        loginForm,
        handleLogin,
        logout,
        checkSession
    };
};
