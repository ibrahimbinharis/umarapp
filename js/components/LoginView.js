const LoginView = {
    props: ['appName', 'appVersion', 'loginForm', 'isRegisterMode'],
    emits: ['login', 'register', 'toggle-mode'],
    template: `
        <div class="w-full h-full flex flex-col md:flex-row bg-slate-50 relative overflow-hidden">
            <!-- (LEFT SIDE UNCHANGED) -->
            <!-- DESKTOP LEFT: Branding -->
            <div class="hidden md:flex md:w-1/2 lg:w-3/5 relative bg-primary items-center justify-center overflow-hidden">
                <!-- Gradients -->
                <div class="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-800 opacity-90">
                </div>
                <!-- Decorative Circles -->
                <div class="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl">
                </div>
                <div class="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-3xl">
                </div>

                <div class="relative z-10 text-white max-w-lg p-12">
                    <h1 class="text-5xl font-black mb-6 tracking-tight leading-tight">{{ appName }}</h1>
                    <p class="text-blue-100 text-lg leading-relaxed font-medium">Sistem Manajemen Akademik Ma'had Umar
                        Bin Khattab</p>
                    <div class="mt-8 flex gap-3">
                        <div class="w-16 h-1.5 rounded-full bg-white/30"></div>
                        <div class="w-4 h-1.5 rounded-full bg-white/10"></div>
                        <div class="w-4 h-1.5 rounded-full bg-white/10"></div>
                    </div>
                </div>
            </div>

            <!-- RIGHT / MOBILE: Login Form -->
            <div class="w-full md:w-[45%] lg:w-[40%] h-full flex flex-col justify-center p-6 relative">

                <!-- Mobile Top Gradient (Taller & Cleaner) -->
                <div class="md:hidden absolute top-0 left-0 right-0 h-[45vh] bg-gradient-to-br from-blue-700 to-indigo-800 rounded-b-[3rem] shadow-blue-900/20 shadow-xl overflow-hidden">
                    <div class="absolute top-[-50px] right-[-50px] w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                    <div class="absolute bottom-10 left-[-20px] w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
                </div>

                <div class="w-full max-w-sm mx-auto relative z-10 md:mt-0">
                    <!-- Mobile Brand Text -->
                    <div class="md:hidden mb-8 text-white px-2 text-center">
                        <h2 class="text-3xl font-black tracking-tight">{{ appName }}</h2>
                        <p class="text-blue-50 text-sm mt-2 font-medium">Sistem Manajemen Akademik<br>Ma'had Umar Bin
                            Khattab</p>
                    </div>

                    <!-- Login Card -->
                    <div class="bg-white md:bg-transparent rounded-[1rem] md:rounded-none shadow-2xl md:shadow-none p-6 md:p-0 border border-slate-100 md:border-none">
                        <div class="mb-8 hidden md:block">
                            <h2 class="text-3xl font-bold text-slate-800 tracking-tight">{{ isRegisterMode ? 'Buat Akun Walisantri' : "Assalamu'alaikum!" }}</h2>
                        </div>

                        <!-- Mobile Title inside Card -->
                        <div class="mb-6 md:hidden text-center">
                            <h2 class="text-xl font-bold text-slate-800">{{ isRegisterMode ? 'Buat Akun Walisantri' : "Assalamu'alaikum!" }}</h2>
                        </div>

                        <form @submit.prevent="isRegisterMode ? $emit('register') : $emit('login')" class="space-y-4">
                            <div v-if="isRegisterMode" class="animate-pulse">
                                <div class="relative group">
                                    <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">badge</span>
                                    <input type="text" v-model="loginForm.fullName"
                                        class="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50 text-slate-700 transition-all placeholder:font-normal placeholder:text-slate-400"
                                        placeholder="Nama Lengkap Walisantri">
                                </div>
                            </div>
                            <!-- Phone number (register only) -->
                            <div v-if="isRegisterMode">
                                <div class="relative group">
                                    <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">phone</span>
                                    <input type="tel" v-model="loginForm.phone"
                                        @input="loginForm.phone = $event.target.value.replace(/[^0-9+]/g, '')"
                                        class="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50 text-slate-700 transition-all placeholder:font-normal placeholder:text-slate-400"
                                        placeholder="No. Telepon (cth: 08123456789)">
                                </div>
                            </div>
                            <div>
                                <div class="relative group">
                                    <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">person</span>
                                    <input type="text" v-model="loginForm.username"
                                        @input="isRegisterMode ? sanitizeUsername($event) : null"
                                        class="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50 text-slate-700 transition-all placeholder:font-normal placeholder:text-slate-400"
                                        :placeholder="isRegisterMode ? 'Username' : 'Username / NIG / NIS'">
                                </div>
                                <!-- Hint untuk register: lowercase, no spasi -->
                                <div v-if="isRegisterMode" class="mt-1.5 flex items-start gap-1.5 px-1">
                                    <span class="material-symbols-outlined text-[13px] mt-0.5"
                                        :class="usernameWarning ? 'text-amber-500' : 'text-slate-300'">info</span>
                                    <p class="text-[11px] leading-snug"
                                        :class="usernameWarning ? 'text-amber-600 font-semibold' : 'text-slate-400'">
                                        {{ usernameWarning || 'Gunakan huruf kecil, angka, dan tanpa spasi. Contoh: ayahfulan123' }}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <div class="relative group">
                                    <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">lock</span>
                                    <input :type="showPassword ? 'text' : 'password'" v-model="loginForm.password"
                                        class="w-full pl-11 pr-12 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50 text-slate-700 transition-all placeholder:font-normal placeholder:text-slate-400"
                                        placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;">
                                    <button type="button" @click="showPassword = !showPassword"
                                        class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition active:scale-95">
                                        <span class="material-symbols-outlined text-[20px]">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                                    </button>
                                </div>
                            </div>

                            <button type="submit"
                                class="w-full bg-primary text-white py-3 rounded-2xl font-bold text-base hover:bg-blue-800 transform active:scale-[0.98] transition-all shadow-lg shadow-blue-900/20 mt-2 flex items-center justify-center gap-2">
                                <span>{{ isRegisterMode ? 'Daftar Sekarang' : 'Masuk' }}</span>
                                <span class="material-symbols-outlined text-xl">{{ isRegisterMode ? 'check_circle' : 'arrow_forward' }}</span>
                            </button>

                            <div class="text-center mt-4">
                                <button type="button" @click="$emit('toggle-mode')" class="text-slate-500 font-medium hover:text-primary transition text-sm">
                                    {{ isRegisterMode ? 'Sudah punya akun?' : 'Belum punya akun?' }} 
                                    <span class="text-primary font-bold ml-1">{{ isRegisterMode ? 'Masuk' : 'Daftar' }}</span>
                                </button>
                            </div>
                        </form>

                        <!-- Mobile Footer (with Install Button) -->
                        <div class="mt-8 text-center md:hidden pb-safe">
                            <button v-if="canInstall" @click="installApp" 
                                class="mb-4 px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-xs font-bold flex items-center gap-2 mx-auto hover:bg-slate-200 transition">
                                <span class="material-symbols-outlined text-sm">download</span> Install Aplikasi
                            </button>
                            <p class="text-[10px] text-slate-400 font-bold tracking-widest uppercase">E-Umar {{ appVersion }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const canInstall = Vue.ref(false);
        const showPassword = Vue.ref(false);
        const usernameWarning = Vue.ref('');

        const sanitizeUsername = (e) => {
            const raw = e.target.value;
            const hasUpper = /[A-Z]/.test(raw);
            const hasSpace = /\s/.test(raw);
            const cleaned = raw.toLowerCase().replace(/\s/g, '');

            // Auto-fix value
            e.target.value = cleaned;

            // Warning
            if (hasUpper && hasSpace) {
                usernameWarning.value = '⚠ Huruf kapital dan spasi otomatis dihapus!';
            } else if (hasUpper) {
                usernameWarning.value = '⚠ Huruf kapital otomatis diubah ke kecil.';
            } else if (hasSpace) {
                usernameWarning.value = '⚠ Spasi tidak diperbolehkan, otomatis dihapus.';
            } else {
                usernameWarning.value = '';
            }
        };

        const checkInstall = () => {
            if (window.deferredPrompt) {
                canInstall.value = true;
            }
        };

        const installApp = () => {
            if (window.installPWA) {
                window.installPWA();
                canInstall.value = false;
            }
        };

        Vue.onMounted(() => {
            checkInstall();
            window.addEventListener('pwa-install-available', checkInstall);
        });

        return { canInstall, installApp, showPassword, usernameWarning, sanitizeUsername };
    }
};
