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
            // SERVER SIDE AUTHENTICATION (New v34)
            const url = localStorage.getItem('tahfidz_sync_url');
            if (!url) throw new Error("URL Sync belum di-set");

            // Hash password before sending to match server expectation
            const hashedPassword = await hashPassword(loginForm.password);

            const res = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'login_server',
                    username: loginForm.username,
                    password: hashedPassword
                })
            });

            const json = await res.json();

            if (json.success && json.user) {
                // Login Success
                const user = json.user;
                userSession.value = user;
                localStorage.setItem('tahfidz_session', JSON.stringify(user));

                // Redirect
                currentView.value = 'dashboard';
                   // PWA: Fix URL state on login to prevent Back -> Login
                window.history.replaceState({ view: 'dashboard' }, '', '#dashboard');

                // Setup Initial for Wali
                if (user.role === 'wali') {
                    // Logic Wali specific if needed, currently handled in dashboard view
                }

                loginForm.username = '';
                loginForm.password = '';
            } else {
                alert(json.message || "Username atau Password salah!");
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
                }
            } catch (e) {
                console.error("Invalid session", e);
                sessionStorage.removeItem('tahfidz_session');
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

