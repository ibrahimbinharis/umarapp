const LoginView = {
    props: ['appName', 'appVersion', 'loginForm'],
    emits: ['login'],
    template: `
        <div class="w-full h-full flex flex-col md:flex-row bg-slate-50 relative overflow-hidden">

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
                            <h2 class="text-3xl font-bold text-slate-800">Assalamu'alaikum!</h2>
                            <p class="text-slate-500 mt-2 font-medium">Silahkan masuk</p>
                        </div>

                        <!-- Mobile Title inside Card -->
                        <div class="mb-6 md:hidden text-center">
                            <h2 class="text-xl font-bold text-slate-800">Assalamu'alaikum!</h2>
                            <p class="text-slate-400 text-xs font-bold mt-1">Silahkan masuk</p>
                        </div>

                        <form @submit.prevent="$emit('login')" class="space-y-4">
                            <div>
                                <div class="relative group">
                                    <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">person</span>
                                    <input type="text" v-model="loginForm.username"
                                        class="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50 font-bold text-slate-700 transition-all placeholder:font-normal placeholder:text-slate-400"
                                        placeholder="Username / NIG / NIS">
                                </div>
                            </div>
                            <div>
                                <div class="relative group">
                                    <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">lock</span>
                                    <input type="password" v-model="loginForm.password"
                                        class="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50 font-bold text-slate-700 transition-all placeholder:font-normal placeholder:text-slate-400"
                                        placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;">
                                </div>
                            </div>

                            <button type="submit"
                                class="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-800 transform active:scale-[0.98] transition-all shadow-lg shadow-blue-900/20 mt-2 flex items-center justify-center gap-2">
                                <span>Masuk</span>
                                <span class="material-symbols-outlined text-xl">arrow_forward</span>
                            </button>
                        </form>

                        <!-- Mobile Footer -->
                        <div class="mt-8 text-center md:hidden">
                            <p class="text-[10px] text-slate-400 font-bold tracking-widest uppercase">E-Umar {{ appVersion }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};
