const InstallView = {
    props: ['appName', 'appVersion'],
    template: `
        <div class="h-screen w-full bg-slate-50 flex flex-col overflow-hidden relative">
            <!-- Background Decoration -->
            <div class="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-br from-blue-700 to-indigo-900 rounded-b-[3rem] shadow-xl">
                 <div class="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-white/10 rounded-full blur-3xl"></div>
                 <div class="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl"></div>
            </div>

            <div class="relative z-10 flex-1 flex flex-col items-center justify-center p-6 mt-[-5vh]">
                <!-- App Icon -->
                <div class="size-32 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center p-4 mb-8 animate-bounce transition-transform hover:scale-110">
                    <img src="image/logo_new.png" alt="Logo" class="w-full h-full object-contain">
                </div>

                <!-- Text Info -->
                <div class="text-center mb-10 max-w-sm">
                    <h1 class="text-3xl font-black text-white mb-2 tracking-tight">{{ appName }}</h1>
                    <p class="text-blue-100 font-medium mb-12">Ma'had Umar Bin Khattab</p>
                    
                    <div class="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-white/20">
                        <h2 class="text-slate-800 font-bold text-lg mb-3">Install Aplikasi ke Layar Utama</h2>
                        <p class="text-slate-500 text-sm leading-relaxed mb-6">
                            Nikmati akses lebih cepat dan notifikasi real-time dengan mengunduh aplikasi ini ke smartphone Anda.
                        </p>

                        <!-- Install Button -->
                        <button v-if="canInstall" @click="handleInstall"
                            class="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
                            <span class="material-symbols-outlined font-bold">download_for_offline</span>
                            <span>UNDUH SEKARANG</span>
                        </button>

                        <div v-else class="space-y-4">
                            <div class="p-4 bg-blue-50 text-blue-700 rounded-2xl text-xs font-bold leading-relaxed border border-blue-100">
                                <span class="material-symbols-outlined text-sm align-middle mr-1">info</span> 
                                Aplikasi sudah terpasang atau browser Anda tidak mendukung auto-install.
                            </div>
                            <p class="text-xs text-slate-400 font-medium italic">Jika tombol tidak muncul, klik tombol menu (3 titik) di pojok browser lalu pilih "Tambahkan ke Layar Utama".</p>
                        </div>
                    </div>
                </div>

                <!-- Back to Login -->
                <button @click="$emit('nav', 'login')" class="text-slate-400 font-bold text-xs hover:text-primary transition-colors flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">arrow_back</span>
                    KE HALAMAN LOGIN
                </button>
            </div>

            <!-- Footer -->
            <div class="absolute bottom-6 left-0 right-0 text-center">
                <p class="text-[10px] text-slate-300 font-black tracking-widest uppercase">E-Umar Digital System {{ appVersion }}</p>
            </div>
        </div>
    `,
    setup() {
        const canInstall = Vue.ref(!!window.deferredPrompt);

        const handleInstall = async () => {
            if (window.installPWA) {
                await window.installPWA();
                // Check if still available (usually it goes null after prompt)
                setTimeout(() => {
                    canInstall.value = !!window.deferredPrompt;
                }, 500);
            }
        };

        Vue.onMounted(() => {
            window.addEventListener('pwa-install-available', () => {
                canInstall.value = true;
            });
        });

        return { canInstall, handleInstall };
    }
};
