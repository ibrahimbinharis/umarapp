const DashboardView = {
    props: [
        'userSession',
        'dashboardStats',
        'myMenus',
        'activityFilter',
        'filteredActivities',
        'loading',
        'topSantriFilter',
        'filteredTopSantri',
        'notifications',
        'unreadCount',
        'uiData',
        'activeChildId',
        'selectChild',
        'appConfig'
    ],
    emits: [
        'update:activityFilter',
        'update:topSantriFilter',
        'navigate',
        'mark-read',
        'mark-all-read'
    ],
    setup(props, { emit }) {
        const { ref, computed, onMounted, onUnmounted, nextTick, watch } = Vue;
        const isMenuExpanded = ref(false);
        const showNotifications = ref(false);
        const notifContainer = ref(null);
        const chartFilter = ref('all'); // all, sabaq, manzil
        let activityChart = null;
        let donutChart = null;

        // --- UX: Close Notif on Click Outside / Scroll ---
        const handleNotifClose = (e) => {
            if (!showNotifications.value) return;

            // 1. If scroll event
            if (e.type === 'scroll') {
                showNotifications.value = false;
                return;
            }

            // 2. If click event - check if outside
            if (notifContainer.value && !notifContainer.value.contains(e.target)) {
                // Check if click was on the bell button itself (to allow toggle)
                const bellBtn = e.target.closest('button');
                if (bellBtn && bellBtn.innerHTML.includes('notifications')) return;

                showNotifications.value = false;
            }
        };

        watch(showNotifications, (newVal) => {
            if (newVal) {
                // Use setTimeout to avoid immediate closure if triggered by the same click
                setTimeout(() => {
                    window.addEventListener('mousedown', handleNotifClose);
                    window.addEventListener('scroll', handleNotifClose, { passive: true });
                }, 10);
            } else {
                window.removeEventListener('mousedown', handleNotifClose);
                window.removeEventListener('scroll', handleNotifClose);
            }
        });

        onUnmounted(() => {
            window.removeEventListener('mousedown', handleNotifClose);
            window.removeEventListener('scroll', handleNotifClose);
        });

        // Helpers (injected or global)
        const getInitials = window.getInitials || ((name) => name ? name.substring(0, 2).toUpperCase() : '??');
        const formatDate = window.formatDate || ((d) => d);

        const displayedMenus = computed(() => {
            const menus = props.myMenus.filter(m => m.id !== 'logout');
            if (isMenuExpanded.value) return menus;
            return menus.slice(0, 8); // Show 2 rows (4 cols x 2 rows = 8 items)
        });

        const hasMoreMenus = computed(() => {
            return props.myMenus.filter(m => m.id !== 'logout').length > 8;
        });

        const activeNotifTab = ref('all'); // 'all' | 'info' | 'monitoring' | 'important' | 'emergency'

        const monitoringNotifications = computed(() => {
            return props.notifications.filter(n => n._id && n._id.startsWith('cl_'));
        });

        const alertNotifications = computed(() => {
            // Important: Violations or Warning types that are NOT cloud monitoring
            return props.notifications.filter(n =>
                (n.type === 'warning' || (n.type === 'alert' && !n._id.startsWith('cl_'))) &&
                !n._id.includes('_ann_')
            );
        });

        const emergencyNotifications = computed(() => {
            // Only Emergency Announcements
            return props.notifications.filter(n => n.type === 'alert' && n._id.includes('_ann_'));
        });

        const infoNotifications = computed(() => {
            return props.notifications.filter(n => n.type === 'info' || n.type === 'success');
        });

        const currentTabNotifications = computed(() => {
            if (activeNotifTab.value === 'all') return props.notifications;
            if (activeNotifTab.value === 'info') return infoNotifications.value;
            if (activeNotifTab.value === 'monitoring') return monitoringNotifications.value;
            if (activeNotifTab.value === 'important') return alertNotifications.value;
            if (activeNotifTab.value === 'emergency') return emergencyNotifications.value;
            return props.notifications;
        });

        const stripHtml = (html) => {
            if (!html) return '';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            return tempDiv.textContent || tempDiv.innerText || "";
        };

        const hasUnreadAlerts = computed(() => {
            return props.notifications.some(n => !n.is_read && (n.type === 'alert' || n.type === 'warning' || n.type === 'pelanggaran'));
        });

        const handleNotifClick = (notif) => {
            emit('mark-read', notif._id || notif.id);
            if (notif.source_id && notif.source_id.startsWith('ann_')) {
                emit('navigate', 'pengumuman');
                showNotifications.value = false;
            }
        };

        // --- CHARTS INITIALIZATION ---
        const initCharts = () => {
            nextTick(() => {
                // 1. Donut Chart: Progres 30 Juz
                const ctxDonut = document.getElementById('juzProgressChart');
                if (ctxDonut) {
                    if (donutChart) donutChart.destroy();
                    donutChart = new Chart(ctxDonut, {
                        type: 'doughnut',
                        data: {
                            labels: ['Selesai', 'Belum'],
                            datasets: [{
                                data: [props.dashboardStats.juzCompleted, props.dashboardStats.juzRemaining],
                                backgroundColor: ['#1E40AF', '#F1F5F9'],
                                borderWidth: 0,
                                borderRadius: 10,
                                hoverOffset: 4
                            }]
                        },
                        options: {
                            cutout: '80%',
                            plugins: {
                                legend: { display: false },
                                tooltip: { enabled: false }
                            },
                        }
                    });
                }

                updateActivityChart();
            });
        };

        const updateActivityChart = () => {
            const ctxBar = document.getElementById('weeklyActivityChart');
            if (!ctxBar) return;

            if (activityChart) {
                activityChart.destroy();
            }

            const labels = props.dashboardStats.weeklyActivity.labels.length > 0
                ? props.dashboardStats.weeklyActivity.labels
                : ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahad'];

            const sabaqData = props.dashboardStats.weeklyActivity.sabaq.length > 0
                ? props.dashboardStats.weeklyActivity.sabaq
                : [0, 0, 0, 0, 0, 0, 0];

            const manzilData = props.dashboardStats.weeklyActivity.manzil.length > 0
                ? props.dashboardStats.weeklyActivity.manzil
                : [0, 0, 0, 0, 0, 0, 0];

            const datasets = [];

            if (chartFilter.value === 'all' || chartFilter.value === 'sabaq') {
                datasets.push({
                    label: 'Sabaq (Halaman)',
                    data: sabaqData,
                    borderColor: 'rgba(30, 64, 175, 0.2)', // Blue-800 with 0.2 alpha
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(30, 64, 175, 0)');
                        gradient.addColorStop(1, 'rgba(30, 64, 175, 0.4)'); // Increased from 0.05 to 0.4
                        return gradient;
                    },
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgba(30, 64, 175, 0.2)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1.5,
                    borderWidth: 1.5
                });
            }

            if (chartFilter.value === 'all' || chartFilter.value === 'manzil') {
                datasets.push({
                    label: 'Manzil (Halaman)',
                    data: manzilData,
                    borderColor: 'rgba(16, 185, 129, 0.2)', // Emerald-500 with 0.2 alpha
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0)');
                        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.4)'); // Increased from 0.05 to 0.4
                        return gradient;
                    },
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgba(16, 185, 129, 0.2)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1.5,
                    borderWidth: 1.5
                });
            }

            activityChart = new Chart(ctxBar, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: '#1e293b',
                            titleFont: { size: 12, weight: 'bold' },
                            bodyFont: { size: 11 },
                            padding: 10,
                            displayColors: true,
                            callbacks: {
                                label: function (context) {
                                    return context.dataset.label + ': ' + context.parsed.y + ' Hal';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(241, 245, 249, 1)',
                                drawBorder: false
                            },
                            ticks: {
                                font: { size: 10 },
                                stepSize: 2
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                font: { size: 10, weight: 'bold', family: 'Inter, sans-serif' },
                                color: '#64748b'
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    },
                }
            });
        };

        watch(chartFilter, () => {
            updateActivityChart();
        });

        // --- NUMBER ANIMATIONS ---
        const displayStats = reactive({
            totalSantri: 0,
            totalPutra: 0,
            totalPutri: 0,
            juzCompleted: 0,
            totalSabaq: 0,
            totalManzil: 0,
            monthlySabaq: 0,
            monthlyManzil: 0
        });

        const animateNumber = (key, targetValue) => {
            const duration = 1500; // 1.5s
            const startValue = 0;
            const startTime = performance.now();

            const update = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease out cubic
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                displayStats[key] = Math.floor(startValue + easeProgress * (targetValue - startValue));

                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            };
            requestAnimationFrame(update);
        };

        const runAllAnimations = () => {
            animateNumber('totalSantri', props.dashboardStats.totalSantri || 0);
            animateNumber('totalPutra', props.dashboardStats.totalPutra || 0);
            animateNumber('totalPutri', props.dashboardStats.totalPutri || 0);
            animateNumber('juzCompleted', props.dashboardStats.juzCompleted || 0);
            animateNumber('totalSabaq', props.dashboardStats.weeklyActivity.totalSabaq || 0);
            animateNumber('totalManzil', props.dashboardStats.weeklyActivity.totalManzil || 0);
            animateNumber('monthlySabaq', props.dashboardStats.monthlyTarget.sabaqCurrent || 0);
            animateNumber('monthlyManzil', props.dashboardStats.monthlyTarget.manzilCurrent || 0);
        };

        // Watchers to trigger animations on data change
        watch(() => props.dashboardStats, () => {
            runAllAnimations();
        }, { deep: true });

        watch(() => [props.dashboardStats.totalPutra, props.dashboardStats.totalPutri], () => {
            initGenderChart();
        });

        const initGenderChart = () => {
            nextTick(() => {
                const ctx = document.getElementById('genderDonutChart');
                if (ctx) {
                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: ['Putra', 'Putri'],
                            datasets: [{
                                data: [props.dashboardStats.totalPutra, props.dashboardStats.totalPutri],
                                backgroundColor: ['#2563eb', '#db2777'],
                                borderWidth: 0,
                                borderRadius: 4,
                                hoverOffset: 4
                            }]
                        },
                        options: {
                            cutout: '75%',
                            plugins: {
                                legend: { display: false },
                                tooltip: { enabled: true }
                            },
                        }
                    });
                }
            });
        };

        const holidayCountdown = computed(() => {
            if (!props.appConfig?.holiday_start || !props.appConfig?.holiday_end) return null;

            // Timezone Fix: Today at Local Midnight
            const now = new Date();
            const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const today = new Date(todayStr + 'T00:00:00');

            const start = new Date(props.appConfig.holiday_start + 'T00:00:00');
            const end = new Date(props.appConfig.holiday_end + 'T00:00:00');

            if (today < start) {
                const diffDays = Math.ceil(Math.abs(start - today) / (1000 * 60 * 60 * 24));
                return {
                    status: 'upcoming',
                    days: diffDays,
                    label: 'Menuju Liburan',
                    color: 'from-blue-600 to-indigo-600',
                    icon: 'calendar_month'
                };
            } else if (today <= end) {
                const diffDays = Math.ceil(Math.abs(end - today) / (1000 * 60 * 60 * 24));
                return {
                    status: 'ongoing',
                    days: diffDays,
                    label: 'Libur Sedang Berlangsung',
                    color: 'from-orange-500 to-red-600',
                    icon: 'beach_access'
                };
            }
            return null;
        });

        onMounted(() => {
            if (props.userSession?.role === 'wali' && !props.activeChildId && props.uiData?.santri?.length > 0) {
                props.selectChild(props.uiData.santri[0]._id || props.uiData.santri[0].santri_id);
            }
            initCharts();
            initGenderChart();
            runAllAnimations(); // Trigger on initial load
        });

        return {
            getInitials,
            formatDate,
            isMenuExpanded,
            displayedMenus,
            hasMoreMenus,
            showNotifications,
            notifContainer,
            chartFilter,
            displayStats, // Export for template
            getSantriName: window.getSantriName,
            activeNotifTab,
            currentTabNotifications,
            alertNotifications,
            infoNotifications,
            hasUnreadAlerts,
            handleNotifClick,
            stripHtml,
            holidayCountdown
        };
    },
    template: `
    <div class="fade-in pb-24 relative">
        <!-- DECORS: Blue Curved Background -->
        <div class="absolute top-0 left-0 right-0 h-[20rem] bg-primary rounded-b-[35px] -mx-4 md:-mx-6 -mt-20 md:-mt-24 -z-0 overflow-hidden shadow-xl">
            <!-- Decorative Circles for Effect -->
            <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div class="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-12 -mb-12 blur-3xl"></div>
        </div>

        <!-- CONTENT -->
        <div class="space-y-6 pt-1 relative z-10 px-0.5">
            
            <!-- HEADER SECTION: Countdown & Profile/Bell Row -->
            <div class="relative px-5 pt-1">
                <!-- HOLIDAY COUNTDOWN (Simple & Centered) -->
                <transition name="fade">
                    <div v-if="holidayCountdown" 
                        class="flex justify-center mb-3 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div class="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 flex items-center gap-2">
                            <span class="material-symbols-outlined text-[10px] text-white">{{ holidayCountdown.icon }}</span>
                            <span class="text-[9px] font-black text-white uppercase tracking-widest">{{ holidayCountdown.label }}: {{ holidayCountdown.days }} Hari Lagi</span>
                        </div>
                    </div>
                </transition>

                <!-- Profile & Bell Row -->
                <div class="flex items-center justify-between gap-3">
                    <!-- Profile (Greeting) -->
                    <div @click="$emit('navigate', 'profile')"
                        class="flex items-center gap-3 cursor-pointer active:scale-95 transition flex-1 min-w-0">
                        <!-- Photo or Initials -->
                        <div v-if="userSession.photo_url"
                            class="size-10 rounded-full overflow-hidden border-2 border-white/50 shadow-md flex-shrink-0">
                            <img :src="userSession.photo_url" alt="Profile" class="w-full h-full object-cover"
                                referrerpolicy="no-referrer">
                        </div>
                        <div v-else
                            class="size-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white font-bold text-base border border-white/30 flex-shrink-0">
                            {{ getInitials(userSession.full_name) }}
                        </div>
                        <div class="min-w-0">
                            <h2 class="text-lg font-bold text-white drop-shadow-sm leading-tight truncate">Ahlan,
                                {{ userSession.full_name ? userSession.full_name.split(' ')[0] : 'User' }}!</h2>
                            <p class="text-[10px] text-blue-100 font-medium opacity-90 mt-0.5 whitespace-nowrap">Assalamualaikum!</p>
                            
                            <!-- Connection Status Badge (Wali Only) -->
                            <div v-if="userSession.role === 'wali' && uiData.santri && uiData.santri.length > 0" 
                                class="flex items-center gap-1.5 mt-1">
                                <div class="size-1 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                                <span class="text-[8px] font-bold text-white/80 uppercase tracking-widest truncate">
                                    {{ getSantriName(activeChildId) }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Notification Bell (Aligned with Profile) -->
                    <div class="relative flex-shrink-0">
                        <button @click="showNotifications = !showNotifications" class="relative p-2 rounded-full text-white transition hover:scale-110 active:scale-95">
                            <span class="material-symbols-outlined">notifications</span>
                            <span v-if="unreadCount > 0" class="absolute top-0 right-0 size-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold border border-white shadow-sm animate-pulse">
                                {{ unreadCount > 9 ? '9+' : unreadCount }}
                            </span>
                        </button>

                        <!-- Dropdown -->
                        <div v-if="showNotifications" ref="notifContainer" class="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up origin-top-right z-[60]">
                            <!-- Header with Tabs -->
                            <div class="p-2 border-b border-slate-100 bg-slate-50 flex flex-col gap-2">
                                <div class="flex justify-between items-center px-1">
                                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notifikasi</span>
                                    <button @click="$emit('mark-all-read')" class="text-[10px] text-blue-600 font-bold hover:underline">
                                        Baca Semua
                                    </button>
                                </div>
                                <div class="flex gap-1 overflow-x-auto pb-1 no-scrollbar text-left">
                                    <button @click="activeNotifTab = 'all'" 
                                        class="px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap"
                                        :class="activeNotifTab === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-100 hover:text-slate-600'">
                                        Semua
                                    </button>
                                    <button @click="activeNotifTab = 'info'" 
                                        class="px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap"
                                        :class="activeNotifTab === 'info' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-400 border border-blue-50 hover:text-blue-600'">
                                        Info
                                    </button>
                                    <button @click="activeNotifTab = 'monitoring'" 
                                        class="px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap"
                                        :class="activeNotifTab === 'monitoring' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white text-indigo-400 border border-indigo-50 hover:text-indigo-600'">
                                        Monitoring
                                    </button>
                                    <button @click="activeNotifTab = 'important'" 
                                        class="px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap"
                                        :class="activeNotifTab === 'important' ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-orange-500 border border-orange-50 hover:text-orange-600'">
                                        Penting
                                    </button>
                                    <button @click="activeNotifTab = 'emergency'" 
                                        class="px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap relative"
                                        :class="activeNotifTab === 'emergency' ? 'bg-red-500 text-white shadow-sm' : 'bg-white text-red-500 border border-red-50 hover:text-red-600'">
                                        Darurat
                                        <span v-if="notifications.some(n => !n.is_read && n.type === 'alert' && String(n._id).includes('_ann_'))" class="absolute top-0 right-0 size-2 bg-white rounded-full border-2 border-red-500"></span>
                                    </button>
                                </div>
                            </div>

                            <!-- List Content -->
                            <div class="max-h-80 overflow-y-auto custom-scrollbar bg-white">
                                <div v-if="currentTabNotifications.length === 0" class="p-8 text-center flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <span class="material-symbols-outlined text-3xl opacity-20">notifications_off</span>
                                    <span class="text-xs">Tidak ada notifikasi dalam kategori ini</span>
                                </div>
                                <div v-else v-for="notif in currentTabNotifications" :key="notif._id || notif.id" 
                                    class="p-3 border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer relative group text-left"
                                    :class="{'bg-blue-50/30': !notif.is_read}"
                                    @click="handleNotifClick(notif)">
                                    <div v-if="!notif.is_read" class="absolute left-2 top-4 size-1.5 rounded-full bg-blue-500"></div>
                                    <div class="flex gap-3 pl-3 text-left">
                                        <div class="flex-1 min-w-0 text-left">
                                            <div class="flex justify-between items-start mb-0.5">
                                                <h4 class="text-xs font-bold text-slate-800 line-clamp-1 text-left" 
                                                    :class="{
                                                        'text-red-600': notif.type === 'alert' && !notif.is_read,
                                                        'text-orange-600': notif.type === 'warning' && !notif.is_read,
                                                        'text-blue-600': notif.type === 'info' && !notif.is_read
                                                    }">{{ notif.title }}</h4>
                                                <span class="text-[9px] text-slate-400 whitespace-nowrap ml-2">{{ formatDate(notif.created_at || notif.timestamp) }}</span>
                                            </div>
                                            <p class="text-[11px] text-slate-500 leading-snug line-clamp-2 text-left">{{ stripHtml(notif.message) }}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Footer Action -->
                            <div class="p-3 bg-slate-50 border-t border-slate-100/50 text-center">
                                <button @click="$emit('navigate', 'notifications')" class="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center justify-center gap-1 w-full py-1">
                                    Lihat Selengkapnya
                                    <span class="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </div>
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

            <!-- Top Santri Leaderboard (Visible to All Roles) -->
            <div class="bg-white p-5 rounded-3xl border card-shadow mb-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-slate-900 flex items-center gap-2">
                        <span class="material-symbols-outlined text-yellow-500">trophy</span>
                        Top 10 Santri
                    </h3>
                </div>

                <!-- Gender Filter (Hidden for Santri Role as it is auto-filtered) -->
                <div v-if="userSession.role !== 'santri'" class="flex gap-2 mb-4">
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

            <!-- Recent Activity Feed (Moved to Top) -->
            <div class="bg-white p-5 rounded-3xl border card-shadow mb-6">
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

            <!-- ANALYTICS PREVIEWS (Mockup) -->
            <div class="space-y-4 mb-6">
                <div class="grid grid-cols-2 gap-4">
                    <!-- Achievement Donut -->
                    <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                        <div class="w-full mb-3 flex justify-between items-center">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">30 Juz Progres</span>
                            <span class="material-symbols-outlined text-sm text-blue-500">verified</span>
                        </div>
                        <div class="relative size-24 mb-3">
                            <canvas id="juzProgressChart"></canvas>
                            <div class="absolute inset-0 flex flex-col items-center justify-center">
                                <span class="text-xl font-black text-slate-800 leading-none">{{ displayStats.juzCompleted }}</span>
                                <span class="text-[9px] font-bold text-slate-400 mt-0.5">JUZ</span>
                            </div>
                        </div>
                        <p class="text-[10px] font-bold text-slate-500">{{ Math.round((dashboardStats.juzCompleted / 30) * 100) }}% Tercapai</p>
                    </div>

                    <!-- Target Monthly Bar -->
                    <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                        <div class="w-full mb-4 flex justify-between items-center">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Bulan Ini</span>
                            <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{{ dashboardStats.monthlyTarget.diffLabel }}</span>
                        </div>
                        <div class="space-y-4">
                            <div>
                                <div class="flex justify-between text-[10px] font-bold mb-1.5">
                                    <span class="text-slate-600">Sabaq</span>
                                    <span class="text-slate-900">{{ displayStats.monthlySabaq }}/{{ dashboardStats.monthlyTarget.sabaqTarget }} Hal</span>
                                </div>
                                <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div class="bg-primary h-full rounded-full transition-all duration-1000" 
                                         :style="{ width: Math.min(100, (displayStats.monthlySabaq / dashboardStats.monthlyTarget.sabaqTarget) * 100) + '%' }"></div>
                                </div>
                            </div>
                            <div>
                                <div class="flex justify-between text-[10px] font-bold mb-1.5">
                                    <span class="text-slate-600">Manzil</span>
                                    <span class="text-slate-900">{{ displayStats.monthlyManzil }}/{{ dashboardStats.monthlyTarget.manzilTarget }} Hal</span>
                                </div>
                                <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div class="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                                         :style="{ width: Math.min(100, (displayStats.monthlyManzil / dashboardStats.monthlyTarget.manzilTarget) * 100) + '%' }"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Weekly Activity Chart Enhanced -->
                <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                    <!-- Dynamic Background Glow -->
                    <div class="absolute -top-10 -right-10 w-32 h-32 blur-3xl rounded-full opacity-20 pointer-events-none z-0"
                        :class="chartFilter === 'manzil' ? 'bg-emerald-500' : 'bg-primary'"></div>

                    <div class="flex flex-col gap-4 mb-4">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keaktifan (7 Hari)</span>
                            
                            <!-- Legend / Filter Tabs -->
                            <div class="flex p-0.5 bg-slate-100 rounded-lg">
                                <button @click="chartFilter = 'all'" 
                                    class="px-3 py-1 text-[10px] font-bold rounded-md transition-all"
                                    :class="chartFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'">All</button>
                                <button @click="chartFilter = 'sabaq'" 
                                    class="px-3 py-1 text-[10px] font-bold rounded-md transition-all"
                                    :class="chartFilter === 'sabaq' ? 'bg-primary text-white shadow-sm' : 'text-slate-400'">Sabaq</button>
                                <button @click="chartFilter = 'manzil'" 
                                    class="px-3 py-1 text-[10px] font-bold rounded-md transition-all"
                                    :class="chartFilter === 'manzil' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'">Manzil</button>
                            </div>
                        </div>

                        <!-- Stats Summary -->
                        <div class="flex items-center gap-4">
                            <div v-if="chartFilter === 'all' || chartFilter === 'sabaq'" class="flex flex-col">
                                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Sabaq</span>
                                <span class="text-sm font-black text-primary">{{ displayStats.totalSabaq }} Hal</span>
                            </div>
                            <div v-if="chartFilter === 'all' || chartFilter === 'manzil'" class="flex flex-col border-l border-slate-100 pl-4">
                                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Manzil</span>
                                <span class="text-sm font-black text-emerald-500">{{ displayStats.totalManzil }} Hal</span>
                            </div>
                        </div>
                    </div>

                    <div class="h-40 w-full">
                        <canvas id="weeklyActivityChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Admin/Guru Global Stats (Visible to Admin/Guru/Santri) -->
            <div v-if="userSession.role !== 'wali'">
                <div class="mb-6">
                    <div @click="$emit('navigate', 'santri')"
                        class="bg-white p-6 rounded-3xl border border-slate-100 card-shadow cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
                        
                        <div class="flex justify-between items-center relative z-10">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="material-symbols-outlined text-primary text-xs">analytics</span>
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Santri</p>
                                </div>
                                <p class="text-4xl font-black text-slate-900 leading-none mb-4">{{ displayStats.totalSantri }}</p>
                                
                                <div class="space-y-1.5">
                                    <div class="flex items-center gap-2">
                                        <div class="size-2 rounded-full bg-blue-600"></div>
                                        <span class="text-[10px] font-bold text-slate-500">Putra: {{ displayStats.totalPutra }}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="size-2 rounded-full bg-pink-500"></div>
                                        <span class="text-[10px] font-bold text-slate-500">Putri: {{ displayStats.totalPutri }}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="relative size-20 flex items-center justify-center">
                                <canvas id="genderDonutChart"></canvas>
                                <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none leading-none">
                                    <div class="flex flex-col items-center">
                                        <span class="text-[10px] font-black text-blue-600">{{ displayStats.totalPutra }}</span>
                                        <div class="w-4 h-[1px] bg-slate-200 my-0.5"></div>
                                        <span class="text-[10px] font-black text-pink-500">{{ displayStats.totalPutri }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div> <!-- End v-if="userSession.role !== 'wali'" -->


        </div>
    </div>
    `
};
