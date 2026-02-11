const DashboardView = {
    props: [
        'userSession',
        'dashboardStats',
        'myMenus',
        'activityFilter',
        'filteredActivities',
        'loading',
        'topSantriFilter',
        'filteredTopSantri'
    ],
    emits: [
        'update:activityFilter',
        'update:topSantriFilter',
        'navigate'
    ],
    setup(props) {
        // Helpers (injected or global)
        const getInitials = window.getInitials || ((name) => name ? name.substring(0, 2).toUpperCase() : '??');
        const formatDate = window.formatDate || ((d) => d);

        // Collapsible Menu Logic
        const { ref, computed } = Vue;
        const isMenuExpanded = ref(false);

        const displayedMenus = computed(() => {
            const menus = props.myMenus.filter(m => m.id !== 'logout');
            if (isMenuExpanded.value) return menus;
            return menus.slice(0, 8); // Show 2 rows (4 cols x 2 rows = 8 items)
        });

        const hasMoreMenus = computed(() => {
            return props.myMenus.filter(m => m.id !== 'logout').length > 8;
        });

        return {
            getInitials,
            formatDate,
            isMenuExpanded,
            displayedMenus,
            hasMoreMenus
        };
    },
    template: `
    <div class="fade-in pb-24 relative">
        <!-- DECORS: Blue Curved Background -->
        <div class="absolute top-0 left-0 right-0 h-[20rem] bg-primary rounded-b-[15px] -mx-4 md:-mx-6 -mt-20 md:-mt-24 -z-0 overflow-hidden shadow-xl">
            <!-- Decorative Circles for Effect -->
            <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div class="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-12 -mb-12 blur-3xl"></div>
        </div>

        <!-- CONTENT -->
        <div class="space-y-6 pt-0 relative z-10 px-0.5">
            <!-- Greeting Card -->
            <div @click="$emit('navigate', 'profile')"
                class="px-5 py-3 mb-0 flex items-center gap-4 cursor-pointer active:scale-95 transition">
                <!-- Photo or Initials -->
                <div v-if="userSession.photo_url"
                    class="size-14 rounded-full overflow-hidden border-2 border-white/50 shadow-md">
                    <img :src="userSession.photo_url" alt="Profile" class="w-full h-full object-cover"
                        referrerpolicy="no-referrer">
                </div>
                <div v-else
                    class="size-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white font-bold text-xl border border-white/30">
                    {{ getInitials(userSession.full_name) }}
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-white drop-shadow-sm">Ahlan,
                        {{ userSession.full_name ? userSession.full_name.split(' ')[0] : 'User' }}!</h2>
                    <p class="text-sm text-blue-100 font-medium opacity-90">Selamat datang kembali</p>
                </div>
            </div>

            <!-- Menu Grid Container -->
            <div class="bg-white px-5 pt-5 pb-8 rounded-3xl border border-slate-100 card-shadow mb-6 relative transition-all duration-300">
                <div class="grid grid-cols-4 gap-3 transition-all duration-500 ease-in-out">
                    <button v-for="menu in displayedMenus" :key="menu.id"
                        @click="$emit('navigate', menu.id)" class="flex flex-col items-center gap-2 group animate-fade-in-up">
                        <div class="menu-icon-box w-14 h-14 flex items-center justify-center rounded-2xl transition-all shadow-sm border border-slate-100 bg-white group-hover:shadow-md group-active:scale-95"
                            :class="menu.id === 'input' ? 'bg-blue-50 border-blue-200' : ''">
                            <span class="material-symbols-outlined text-2xl"
                                :class="menu.id === 'input' ? 'text-primary' : 'text-slate-600'">{{ menu.icon
                                }}</span>
                        </div>
                        <span class="text-[11px] font-medium text-slate-600 text-center leading-tight">{{
                            menu.label }}</span>
                    </button>
                </div>

                <!-- Expand/Collapse Handle -->
                <div v-if="hasMoreMenus" class="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-full flex justify-center pb-2 cursor-pointer" @click="isMenuExpanded = !isMenuExpanded">
                    <div class="w-10 h-1 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors"></div>
                </div>
            </div>

            <!-- Wali View -->
            <div v-if="userSession.role === 'wali' && dashboardStats.waliData"
                class="bg-white rounded-3xl p-6 text-slate-800 shadow-lg mb-4 border border-slate-100">
                <h2 class="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Progress Hafalan</h2>
                <div class="flex gap-4 mt-4">
                    <div class="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                        <p class="text-xs opacity-70">Sabaq</p>
                        <p class="text-2xl font-bold text-slate-900">{{ dashboardStats.waliData.sabaqPercent.toFixed(0) }}%
                        </p>
                    </div>
                    <div class="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                        <p class="text-xs opacity-70">Manzil</p>
                        <p class="text-2xl font-bold text-slate-900">{{ dashboardStats.waliData.manzilPercent.toFixed(0)
                            }}%</p>
                    </div>
                </div>
            </div>

            <!-- Admin/Guru View -->
            <div v-else>
                <!-- Stats Cards -->
                <div class="mb-6">
                    <!-- Total Santri (Consolidated) -->
                    <div @click="$emit('navigate', 'santri')"
                        class="bg-white p-5 rounded-2xl border card-shadow cursor-pointer hover:bg-slate-50 transition group">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="text-xs font-bold text-slate-400 mb-1">TOTAL SANTRI</p>
                                <p class="text-4xl font-black text-slate-900">{{ dashboardStats.totalSantri
                                    }}</p>
                            </div>
                            <div class="text-right flex flex-col gap-1">
                                <p class="text-xs font-bold text-slate-500">
                                    Putra: <span class="text-blue-600 ml-1 text-sm">{{
                                        dashboardStats.totalPutra }}</span>
                                </p>
                                <p class="text-xs font-bold text-slate-500">
                                    Putri: <span class="text-pink-500 ml-1 text-sm">{{
                                        dashboardStats.totalPutri }}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Charts Grid -->
                <!-- Top Santri Leaderboard -->
                <div class="bg-white p-5 rounded-3xl border card-shadow mb-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-bold text-slate-900 flex items-center gap-2">
                            <span class="material-symbols-outlined text-yellow-500">trophy</span>
                            Top 10 Santri
                        </h3>
                    </div>

                    <!-- Gender Filter -->
                    <div class="flex gap-2 mb-4">
                        <button @click="$emit('update:topSantriFilter', 'Semua')"
                            :class="topSantriFilter === 'Semua' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'"
                            class="px-3 py-1.5 rounded-xl text-xs font-bold transition">
                            Semua
                        </button>
                        <button @click="$emit('update:topSantriFilter', 'L')"
                            :class="topSantriFilter === 'L' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'"
                            class="px-3 py-1.5 rounded-xl text-xs font-bold transition">
                            Putra
                        </button>
                        <button @click="$emit('update:topSantriFilter', 'P')"
                            :class="topSantriFilter === 'P' ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-600'"
                            class="px-3 py-1.5 rounded-xl text-xs font-bold transition">
                            Putri
                        </button>
                    </div>
                    
                    <!-- Scrollable List Container -->
                    <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
                        <div v-for="(s, idx) in filteredTopSantri" :key="idx"
                            class="flex items-center gap-3 p-2 rounded-xl border border-slate-50 bg-slate-50/50">
                            <div class="size-8 rounded-full flex items-center justify-center font-bold text-sm"
                                :class="{
                                    'bg-yellow-100 text-yellow-700': idx === 0,
                                    'bg-slate-200 text-slate-600': idx > 0
                                }">
                                {{ idx + 1 }}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-bold text-slate-800 text-sm truncate">{{ s.name }}</p>
                                <p class="text-xs text-slate-500">{{ s.class }}</p>
                            </div>
                            <div class="text-right">
                                <p class="font-black text-primary text-sm">{{ s.total.toFixed(1) }}</p>
                                <p class="text-[10px] text-slate-400">Total Nilai</p>
                            </div>
                        </div>
                        <div v-if="!filteredTopSantri || filteredTopSantri.length === 0"
                            class="text-center text-slate-400 text-xs py-2">
                            Belum ada data
                        </div>
                    </div>
                </div>

                <!-- Recent Activity Feed -->
                <div class="bg-white p-5 rounded-3xl border card-shadow mb-8">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-bold text-slate-900">Aktivitas Terbaru</h3>
                    </div>
                    <!-- Filter Pills -->
                    <div class="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                        <button @click="$emit('update:activityFilter', 'all')"
                            :class="activityFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'"
                            class="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition">
                            Semua
                        </button>
                        <button @click="$emit('update:activityFilter', 'today')"
                            :class="activityFilter === 'today' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'"
                            class="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition">
                            Hari Ini
                        </button>
                        <button @click="$emit('update:activityFilter', 'setoran')"
                            :class="activityFilter === 'setoran' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'"
                            class="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition">
                            Setoran
                        </button>
                        <button @click="$emit('update:activityFilter', 'ujian')"
                            :class="activityFilter === 'ujian' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'"
                            class="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition">
                            Ujian
                        </button>
                        <button @click="$emit('update:activityFilter', 'pelanggaran')"
                            :class="activityFilter === 'pelanggaran' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'"
                            class="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition">
                            Pelanggaran
                        </button>
                    </div>

                    <!-- List -->
                    <div class="space-y-4 max-h-60 overflow-y-auto pl-3 pr-1 custom-scrollbar">
                        <div v-for="(act, idx) in filteredActivities" :key="idx"
                            class="flex items-start gap-3 relative pl-4 border-l-2 border-slate-100 last:border-0 pb-4 last:pb-0">
                            <!-- Timeline dot -->
                            <div class="absolute -left-[5px] top-1 size-2.5 rounded-full border-2 border-white ring-1 ring-slate-200 bg-slate-400"
                                :class="{
                                    'bg-emerald-500': act.type === 'setoran',
                                    'bg-blue-500': act.type === 'ujian',
                                    'bg-red-500': act.type === 'pelanggaran'
                                }"></div>

                            <div class="flex-1">
                                <p class="text-xs text-slate-400 mb-0.5">{{ formatDate(act.date) }}</p>
                                <p class="text-xs font-bold text-slate-800">{{ act.desc }}</p>
                            </div>
                        </div>

                        <div v-if="filteredActivities.length === 0"
                            class="text-center py-6 text-slate-400 text-xs">
                            Tidak ada aktivitas
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
};

