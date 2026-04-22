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
        'appConfig',
        'rekapSettings'
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
        
        // Initialize chartFilter based on visibility
        const initialFilter = computed(() => {
            if (props.rekapSettings?.visibility?.sabaq && props.rekapSettings?.visibility?.manzil) return 'all';
            if (props.rekapSettings?.visibility?.sabaq) return 'sabaq';
            if (props.rekapSettings?.visibility?.manzil) return 'manzil';
            return 'all';
        });
        const chartFilter = ref(initialFilter.value); 
        
        // Update filter if settings change and current filter is now hidden
        watch(initialFilter, (newVal) => {
            chartFilter.value = newVal;
        });

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

        const handlePopState = (e) => {
            if (showNotifications.value) {
                showNotifications.value = false;
            }
        };

        watch(showNotifications, (newVal, oldVal) => {
            if (newVal) {
                // v37: Push state so back button closes dropdown
                window.history.pushState({ notifOpen: true }, '', '#notif');
                window.addEventListener('popstate', handlePopState);

                // Use setTimeout to avoid immediate closure if triggered by the same click
                setTimeout(() => {
                    window.addEventListener('mousedown', handleNotifClose);
                    window.addEventListener('scroll', handleNotifClose, { passive: true });
                }, 10);
            } else {
                window.removeEventListener('mousedown', handleNotifClose);
                window.removeEventListener('scroll', handleNotifClose);
                window.removeEventListener('popstate', handlePopState);

                // If closed manually (not via back button), clear history state
                if (window.history.state && window.history.state.notifOpen) {
                    window.history.back();
                }
            }
        });

        onUnmounted(() => {
            window.removeEventListener('mousedown', handleNotifClose);
            window.removeEventListener('scroll', handleNotifClose);
            window.removeEventListener('popstate', handlePopState);
            // Clean up history if unmounted while open
            if (showNotifications.value && window.history.state && window.history.state.notifOpen) {
                window.history.back();
            }
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

            const weekly = props.dashboardStats.weeklyActivity || {};

            const labels = (weekly.labels && weekly.labels.length > 0)
                ? weekly.labels
                : ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahad'];

            const sabaqData = (weekly.sabaq && weekly.sabaq.length > 0)
                ? weekly.sabaq
                : [0, 0, 0, 0, 0, 0, 0];

            const manzilData = (weekly.manzil && weekly.manzil.length > 0)
                ? weekly.manzil
                : [0, 0, 0, 0, 0, 0, 0];

            const datasets = [];

            if (chartFilter.value === 'all' || chartFilter.value === 'sabaq') {
                datasets.push({
                    label: 'Sabaq (Halaman)',
                    data: sabaqData,
                    borderColor: 'rgba(30, 64, 175, 1)',
                    backgroundColor: 'rgba(30, 64, 175, 1)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointBackgroundColor: 'rgba(30, 64, 175, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    borderWidth: 2
                });
            }

            if (chartFilter.value === 'all' || chartFilter.value === 'manzil') {
                datasets.push({
                    label: 'Manzil (Halaman)',
                    data: manzilData,
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 1)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    borderWidth: 2
                });
            }

            if ((chartFilter.value === 'all' || chartFilter.value === 'tilawah') && props.rekapSettings?.visibility?.tilawah) {
                const tilawahData = (weekly.tilawah && weekly.tilawah.length > 0) ? weekly.tilawah : [0, 0, 0, 0, 0, 0, 0];
                datasets.push({
                    label: 'Tilawah (Juz)',
                    data: tilawahData,
                    borderColor: 'rgba(245, 158, 11, 1)',
                    backgroundColor: 'rgba(245, 158, 11, 1)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointBackgroundColor: 'rgba(245, 158, 11, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    borderWidth: 2
                });
            }

            if ((chartFilter.value === 'all' || chartFilter.value === 'ujian') && props.rekapSettings?.visibility?.ujian) {
                const ujianData = (weekly.ujian && weekly.ujian.length > 0) ? weekly.ujian : [0, 0, 0, 0, 0, 0, 0];
                datasets.push({
                    label: 'Ujian (Nilai)',
                    data: ujianData,
                    borderColor: 'rgba(99, 102, 241, 1)',
                    backgroundColor: 'rgba(99, 102, 241, 1)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    borderWidth: 2
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
                                    const unit = context.dataset.label.includes('Juz') ? ' Juz' : (context.dataset.label.includes('Nilai') ? '' : ' Hal');
                                    return context.dataset.label + ': ' + context.parsed.y + unit;
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
            totalTilawah: 0,
            avgUjian: 0,
            monthlySabaq: 0,
            monthlyManzil: 0,
            monthlyTilawah: 0,
            monthlyUjian: 0
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

                displayStats[key] = Math.round(startValue + easeProgress * (targetValue - startValue));

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
            animateNumber('totalTilawah', props.dashboardStats.weeklyActivity.totalTilawah || 0);
            animateNumber('avgUjian', props.dashboardStats.weeklyActivity.avgUjian || 0);
            animateNumber('monthlySabaq', props.dashboardStats.monthlyTarget.sabaqCurrent || 0);
            animateNumber('monthlyManzil', props.dashboardStats.monthlyTarget.manzilCurrent || 0);
            animateNumber('monthlyTilawah', props.dashboardStats.monthlyTarget.tilawahCurrent || 0);
            animateNumber('monthlyUjian', props.dashboardStats.monthlyTarget.ujianCurrent || 0);
        };

        // Watchers to trigger animations on data change
        // Debounce: Only animate if stats actually change to prevent CPU spike
        watch(() => JSON.stringify(props.dashboardStats), (newVal, oldVal) => {
            if (newVal !== oldVal) {
                runAllAnimations();
                initCharts(); // Re-render charts as well
            }
        });

        watch(() => [props.dashboardStats.totalPutra, props.dashboardStats.totalPutri], () => {
            initGenderChart();
        });

        let genderChart = null;
        const initGenderChart = () => {
            nextTick(() => {
                const ctx = document.getElementById('genderDonutChart');
                if (ctx) {
                    if (genderChart) genderChart.destroy();
                    genderChart = new Chart(ctx, {
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

            // v36: Onboarding Popup for Wali with NO linked santri (User Request v36.2)
            // Added sessionStorage check to prevent it from appearing every time we switch menus (v36.3)
            const hasShownOnboarding = sessionStorage.getItem('onboarding_shown');
            
            if (props.userSession?.role === 'wali' && (!props.uiData?.santri || props.uiData.santri.length === 0) && !hasShownOnboarding) {
                setTimeout(() => {
                    // Mark as shown immediately so navigation doesn't trigger it again
                    sessionStorage.setItem('onboarding_shown', 'true');

                    window.showConfirm({
                        title: 'NIS Belum Terhubung',
                        message: 'Data Belum Tersedia, Masukkan NIS santri untuk mulai memantau secara realtime.',
                        confirmText: 'Hubungkan',
                        cancelText: 'Nanti Saja',
                        type: 'info',
                        onConfirm: () => {
                            emit('navigate', 'connect_santri');
                        }
                    });
                }, 1000); // 1s delay for better UX
            }

            initCharts();
            initGenderChart();
            runAllAnimations(); // Trigger on initial load
        });

        // --- LIVE JADWAL SESSION ---
        const now = ref(new Date());
        const liveScrollEl = ref(null);
        const liveActiveIndex = ref(0);
        let clockTimer = null;
        
        // Tick every 30 seconds
        Vue.onMounted(() => {
            clockTimer = setInterval(() => { now.value = new Date(); }, 30000);
        });
        Vue.onUnmounted(() => {
            if (clockTimer) clearInterval(clockTimer);
        });

        const onLiveScroll = (e) => {
            const el = e.target;
            const cardWidth = el.firstElementChild?.offsetWidth || el.offsetWidth;
            liveActiveIndex.value = Math.round(el.scrollLeft / (cardWidth + 12)); // 12 = gap-3
        };

        const parseTime = (str) => {
            if (!str) return null;
            const parts = str.trim().split(':');
            return { h: parseInt(parts[0]), m: parseInt(parts[1] || 0) };
        };

        const liveSessions = computed(() => {
            const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const today = days[now.value.getDay()];
            const curH = now.value.getHours();
            const curM = now.value.getMinutes();
            const curTotal = curH * 60 + curM;

            const jadwalList = props.uiData?.jadwal || [];
            const role = props.userSession?.role;
            const isAdmin = role === 'admin';
            const isGuru = role === 'guru';
            const myName = props.userSession?.full_name;
            const myUsername = props.userSession?.username;

            // For santri/wali: find the santri's kelas to filter jadwal
            let santriKelas = null;
            if (role === 'santri' || role === 'wali') {
                let linkedSantri = null;
                if (role === 'wali' && props.activeChildId) {
                    linkedSantri = (props.uiData?.santri || []).find(
                        s => s._id === props.activeChildId || s.santri_id === props.activeChildId
                    );
                } else if (role === 'santri') {
                    linkedSantri = (props.uiData?.santri || [])[0];
                }
                santriKelas = linkedSantri?.kelas || linkedSantri?.class_id || null;
            }

            const todayJadwal = jadwalList.filter(j => j.day === today);
            const results = [];

            for (const j of todayJadwal) {
                if (isAdmin) {
                    // Admin: semua sesi
                } else if (isGuru) {
                    if (j.teacher !== myName && j.username !== myUsername) continue;
                } else {
                    // Santri/Wali: sesi kelas mereka ATAU sesi umum (berlaku semua)
                    if (!santriKelas || (j.class_name !== santriKelas && j.class_name !== 'Umum')) {
                        continue;
                    }
                }

                const times = (j.time || '').split(' - ');
                if (times.length < 2) continue;
                const start = parseTime(times[0]);
                const end = parseTime(times[1]);
                if (!start || !end) continue;

                const startTotal = start.h * 60 + start.m;
                const endTotal = end.h * 60 + end.m;

                if (curTotal >= startTotal && curTotal < endTotal) {
                    const remaining = endTotal - curTotal;
                    results.push({ ...j, startStr: times[0].trim(), endStr: times[1].trim(), remaining });
                }
            }
            return results;
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
            displayStats,
            getSantriName: window.getSantriName,
            activeNotifTab,
            currentTabNotifications,
            alertNotifications,
            infoNotifications,
            hasUnreadAlerts,
            handleNotifClick,
            stripHtml,
            holidayCountdown,
            liveSessions,
            liveScrollEl,
            liveActiveIndex,
            onLiveScroll,
            now
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
                <transition name="backdrop-fade">
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


            <!-- Menu Grid Container (Skeleton Loading) -->
            <div v-if="loading" class="bg-white px-5 pt-5 pb-8 rounded-3xl border border-slate-100 card-shadow mb-6 relative">
                <div class="grid grid-cols-4 gap-3">
                    <div v-for="i in 8" :key="i" class="flex flex-col items-center gap-2">
                        <div class="skeleton w-14 h-14 rounded-2xl"></div>
                        <div class="skeleton-text short"></div>
                    </div>
                </div>
            </div>

            <!-- Menu Grid Container (Real Data) -->
            <div v-else class="bg-white px-5 pt-5 pb-8 rounded-3xl border border-slate-100 card-shadow mb-6 relative transition-all duration-300">
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

            <!-- LIVE SESSIONS (Admin & Guru only) -->
            <div v-if="liveSessions.length > 0" class="mb-6">
                <!-- Scroll container: full-width snap on mobile, 3-col-peek on desktop -->
                <div ref="liveScrollEl"
                    class="flex gap-3 overflow-x-auto pb-1 no-scrollbar snap-x snap-mandatory md:snap-none scroll-smooth"
                    @scroll="onLiveScroll">
                    <div v-for="(s, i) in liveSessions" :key="i"
                        class="flex-shrink-0 w-full md:w-[calc(33.333%-8px)] snap-center flex items-center gap-3 px-4 py-3 rounded-2xl border border-emerald-200 bg-emerald-50">
                        <!-- Live dot -->
                        <span class="relative flex size-2 shrink-0">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span class="relative inline-flex rounded-full size-2 bg-red-500"></span>
                        </span>
                        <!-- Info -->
                        <div class="flex-1 min-w-0">
                            <p class="font-bold text-slate-800 text-sm truncate leading-tight">{{ s.mapel }}
                                <span class="text-slate-400 font-normal text-xs ml-1">· {{ s.class_name }}</span>
                            </p>
                            <p class="text-[10px] text-slate-500 font-medium truncate">{{ s.teacher }} · <span class="text-emerald-600 font-semibold">{{ s.startStr }}–{{ s.endStr }} · Sisa {{ s.remaining }} mnt</span></p>
                        </div>
                        <!-- CTA (Admin/Guru only) -->
                        <button v-if="userSession.role === 'admin' || userSession.role === 'guru'"
                            @click="$emit('navigate', 'absensi')"
                            class="shrink-0 flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-sm transition">
                            <span class="material-symbols-outlined text-sm">edit_document</span>
                            Absensi
                        </button>
                    </div>
                </div>
                <!-- Dot indicators (mobile only, only when >1 session) -->
                <div v-if="liveSessions.length > 1" class="flex justify-center gap-1.5 mt-2 md:hidden">
                    <span v-for="(s, i) in liveSessions" :key="i"
                        class="rounded-full transition-all duration-300"
                        :class="liveActiveIndex === i ? 'w-4 h-1.5 bg-emerald-500' : 'size-1.5 bg-slate-200'">
                    </span>
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

                <!-- Leaderboard Skeleton (Show when loading) -->
                <div v-if="loading" class="space-y-4">
                    <div v-for="i in 5" :key="i" class="flex items-center gap-3 animate-pulse">
                        <div class="skeleton size-8 rounded-full"></div>
                        <div class="flex-1">
                            <div class="skeleton-text w-3/4 h-3 bg-slate-100 rounded"></div>
                            <div class="skeleton-text w-1/2 h-2 bg-slate-50 rounded mt-1"></div>
                        </div>
                        <div class="w-10 h-6 skeleton rounded-lg"></div>
                    </div>
                </div>

                <!-- Gender Filter (Real Data) -->
                <div v-else-if="userSession.role !== 'santri'" class="flex gap-2 mb-4">
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
                        <div class="size-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                            :class="{
                                'bg-yellow-100 text-yellow-700': idx === 0,
                                'bg-slate-200 text-slate-600': idx > 0
                            }">
                            {{ idx + 1 }}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5">
                                <p class="font-bold text-slate-800 text-sm truncate">{{ s.name }}</p>
                                <span v-if="s.rankChange !== 0"
                                    class="text-[9px] font-black shrink-0"
                                    :class="s.rankChange > 0 ? 'text-emerald-500' : 'text-red-500'">
                                    {{ s.rankChange > 0 ? '↑' : '↓' }}{{ Math.abs(s.rankChange) }}
                                </span>
                            </div>
                            <p class="text-xs text-slate-500">{{ s.class }}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-black text-sm"
                                :class="{
                                    'text-blue-600': (s.predikat || '').startsWith('A'),
                                    'text-emerald-600': (s.predikat || '') === 'B' || (s.predikat || '') === 'B+',
                                    'text-amber-500': (s.predikat || '') === 'B-',
                                    'text-red-500': (s.predikat || '') === 'C',
                                    'text-primary': !(s.predikat)
                                }">{{ s.total.toFixed(1) }}</p>
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

                <!-- Filter Pills (Always Visible) -->
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

                <!-- Activity Skeleton (Show when loading) -->
                <div v-if="loading" class="space-y-6">
                    <div v-for="i in 3" :key="i" class="flex gap-4">
                        <div class="skeleton size-4 rounded-full"></div>
                        <div class="flex-1 space-y-2">
                            <div class="skeleton-text w-1/4 h-2 bg-slate-100 rounded"></div>
                            <div class="skeleton-text w-full h-3 bg-slate-50 rounded"></div>
                        </div>
                    </div>
                </div>

                <!-- List (Real Data) -->
                <div v-else class="space-y-4 max-h-60 overflow-y-auto pl-3 pr-1 custom-scrollbar">
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
                        <div class="flex items-center gap-2">
                            <p class="text-[10px] font-bold text-slate-500">{{ Math.round((dashboardStats.juzCompleted / 30) * 100) }}% Tercapai</p>
                        </div>
                    </div>

                    <!-- Target Monthly Bar -->
                    <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                        <div class="w-full mb-4 flex justify-between items-center">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Bulan Ini</span>
                            <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{{ dashboardStats.monthlyTarget.diffLabel }}</span>
                        </div>
                        <div class="space-y-4">
                            <div v-if="rekapSettings.visibility.sabaq">
                                <div class="flex justify-between items-center text-[10px] font-black mb-1.5 uppercase tracking-widest">
                                    <span class="text-slate-400">Sabaq</span>
                                    <span class="text-slate-900">{{ displayStats.monthlySabaq }}/{{ dashboardStats.monthlyTarget.sabaqTarget }} Hal</span>
                                </div>
                                <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div class="bg-primary h-full rounded-full transition-all duration-1000" 
                                         :style="{ width: Math.min(100, (displayStats.monthlySabaq / dashboardStats.monthlyTarget.sabaqTarget) * 100) + '%' }"></div>
                                </div>
                                <div v-if="dashboardStats.monthlyTarget.sabaqComp" class="flex justify-end mt-1">
                                    <span class="text-[8px] font-black flex items-center"
                                        :class="dashboardStats.monthlyTarget.sabaqComp.status === 'up' ? 'text-emerald-500' : (dashboardStats.monthlyTarget.sabaqComp.status === 'down' ? 'text-red-500' : 'text-slate-400')">
                                        {{ dashboardStats.monthlyTarget.sabaqComp.status === 'up' ? '↑' : (dashboardStats.monthlyTarget.sabaqComp.status === 'down' ? '↓' : '') }}{{ Math.abs(dashboardStats.monthlyTarget.sabaqComp.percent) }}% vs bln lalu
                                    </span>
                                </div>
                            </div>
                            <div v-if="rekapSettings.visibility.manzil">
                                <div class="flex justify-between items-center text-[10px] font-black mb-1.5 uppercase tracking-widest">
                                    <span class="text-slate-400">Manzil</span>
                                    <span class="text-slate-900">{{ displayStats.monthlyManzil }}/{{ dashboardStats.monthlyTarget.manzilTarget }} Hal</span>
                                </div>
                                <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div class="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                                         :style="{ width: Math.min(100, (displayStats.monthlyManzil / dashboardStats.monthlyTarget.manzilTarget) * 100) + '%' }"></div>
                                </div>
                                <div v-if="dashboardStats.monthlyTarget.manzilComp" class="flex justify-end mt-1">
                                    <span class="text-[8px] font-black flex items-center"
                                        :class="dashboardStats.monthlyTarget.manzilComp.status === 'up' ? 'text-emerald-500' : (dashboardStats.monthlyTarget.manzilComp.status === 'down' ? 'text-red-500' : 'text-slate-400')">
                                        {{ dashboardStats.monthlyTarget.manzilComp.status === 'up' ? '↑' : (dashboardStats.monthlyTarget.manzilComp.status === 'down' ? '↓' : '') }}{{ Math.abs(dashboardStats.monthlyTarget.manzilComp.percent) }}% vs bln lalu
                                    </span>
                                </div>
                            </div>
                            <div v-if="rekapSettings.visibility.tilawah">
                                <div class="flex justify-between items-center text-[10px] font-black mb-1.5 uppercase tracking-widest">
                                    <span class="text-slate-400">Tilawah</span>
                                    <span class="text-slate-900">{{ displayStats.monthlyTilawah }}/{{ dashboardStats.monthlyTarget.tilawahTarget }} Juz</span>
                                </div>
                                <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div class="bg-amber-500 h-full rounded-full transition-all duration-1000"
                                         :style="{ width: Math.min(100, (displayStats.monthlyTilawah / dashboardStats.monthlyTarget.tilawahTarget) * 100) + '%' }"></div>
                                </div>
                                <div v-if="dashboardStats.monthlyTarget.tilawahComp" class="flex justify-end mt-1">
                                    <span class="text-[8px] font-black flex items-center"
                                        :class="dashboardStats.monthlyTarget.tilawahComp.status === 'up' ? 'text-emerald-500' : (dashboardStats.monthlyTarget.tilawahComp.status === 'down' ? 'text-red-500' : 'text-slate-400')">
                                        {{ dashboardStats.monthlyTarget.tilawahComp.status === 'up' ? '↑' : (dashboardStats.monthlyTarget.tilawahComp.status === 'down' ? '↓' : '') }}{{ Math.abs(dashboardStats.monthlyTarget.tilawahComp.percent) }}% vs bln lalu
                                    </span>
                                </div>
                            </div>
                            <div v-if="rekapSettings.visibility.ujian">
                                <div class="flex justify-between text-[10px] font-black mb-1.5 uppercase tracking-widest">
                                    <span class="text-slate-400">Ujian</span>
                                    <span class="text-slate-900">{{ displayStats.monthlyUjian }}</span>
                                </div>
                                <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div class="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                                         :style="{ width: displayStats.monthlyUjian + '%' }"></div>
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
                        <div class="flex flex-col gap-3">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keaktifan (7 Hari)</span>
                            
                            <!-- Legend / Filter Tabs -->
                            <div class="flex gap-2.5 px-1 relative">
                                <button v-if="rekapSettings.visibility.sabaq && rekapSettings.visibility.manzil" @click="chartFilter = 'all'" 
                                    class="pb-1 text-[10px] font-black uppercase tracking-widest transition-all duration-500 border-b"
                                    :class="chartFilter === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-400'">ALL</button>
                                <button v-if="rekapSettings.visibility.sabaq" @click="chartFilter = 'sabaq'" 
                                    class="pb-1 text-[10px] font-black uppercase tracking-widest transition-all duration-500 border-b"
                                    :class="chartFilter === 'sabaq' ? 'border-primary/40 text-primary' : 'border-transparent text-slate-400'">SABAQ</button>
                                <button v-if="rekapSettings.visibility.manzil" @click="chartFilter = 'manzil'" 
                                    class="pb-1 text-[10px] font-black uppercase tracking-widest transition-all duration-500 border-b"
                                    :class="chartFilter === 'manzil' ? 'border-emerald-500/40 text-emerald-500' : 'border-transparent text-slate-400'">MANZIL</button>
                                <button v-if="rekapSettings.visibility.tilawah" @click="chartFilter = 'tilawah'" 
                                    class="pb-1 text-[10px] font-black uppercase tracking-widest transition-all duration-500 border-b"
                                    :class="chartFilter === 'tilawah' ? 'border-amber-500/40 text-amber-500' : 'border-transparent text-slate-400'">TILAWAH</button>
                                <button v-if="rekapSettings.visibility.ujian" @click="chartFilter = 'ujian'" 
                                    class="pb-1 text-[10px] font-black uppercase tracking-widest transition-all duration-500 border-b"
                                    :class="chartFilter === 'ujian' ? 'border-indigo-500/40 text-indigo-500' : 'border-transparent text-slate-400'">UJIAN</button>
                            </div>
                        </div>

                        <!-- Stats Summary -->
                        <div class="flex items-center gap-4 overflow-x-auto pb-1 no-scrollbar">
                            <div v-if="(chartFilter === 'all' || chartFilter === 'sabaq') && rekapSettings.visibility.sabaq" class="flex flex-col flex-shrink-0">
                                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Sabaq</span>
                                <span class="text-sm font-black text-primary">{{ displayStats.totalSabaq }} Hal</span>
                            </div>
                            <div v-if="(chartFilter === 'all' || chartFilter === 'manzil') && rekapSettings.visibility.manzil" class="flex flex-col border-l border-slate-100 pl-4 flex-shrink-0">
                                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Manzil</span>
                                <span class="text-sm font-black text-emerald-500">{{ displayStats.totalManzil }} Hal</span>
                            </div>
                            <div v-if="(chartFilter === 'all' || chartFilter === 'tilawah') && rekapSettings.visibility.tilawah" class="flex flex-col border-l border-slate-100 pl-4 flex-shrink-0">
                                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Tilawah</span>
                                <span class="text-sm font-black text-amber-500">{{ displayStats.totalTilawah }} Juz</span>
                            </div>
                            <div v-if="(chartFilter === 'all' || chartFilter === 'ujian') && rekapSettings.visibility.ujian" class="flex flex-col border-l border-slate-100 pl-4 flex-shrink-0">
                                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rerata Ujian</span>
                                <span class="text-sm font-black text-indigo-500">{{ displayStats.avgUjian }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="h-40 w-full">
                        <canvas id="weeklyActivityChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Admin/Guru Global Stats (Hidden for Santri/Wali) -->
            <div v-if="userSession.role === 'admin' || userSession.role === 'guru'">
                <div class="mb-6">
                    <div @click="$emit('navigate', 'santri')"
                        class="bg-white p-6 rounded-3xl border border-slate-100 card-shadow cursor-pointer hover:shadow-md transition-all group relative overflow-hidden flex items-center justify-between">
                        
                        <!-- Skeleton for Stats -->
                        <div v-if="loading" class="flex-1">
                            <div class="skeleton-text w-1/2 mb-2"></div>
                            <div class="skeleton-text w-3/4 h-8 mb-4"></div>
                        </div>
                        
                        <!-- Real Data for Stats -->
                        <div v-else class="flex-1">
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
                        
                        <!-- Gender Chart (Skeleton or Real) -->
                        <div class="relative size-20 flex items-center justify-center">
                            <div v-if="loading" class="skeleton size-full rounded-full"></div>
                            <canvas v-show="!loading" id="genderDonutChart"></canvas>
                            <div v-if="!loading" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none leading-none">
                                <div class="flex flex-col items-center">
                                    <span class="text-[10px] font-black text-blue-600">{{ displayStats.totalPutra }}</span>
                                    <div class="w-4 h-[1px] bg-slate-200 my-0.5"></div>
                                    <span class="text-[10px] font-black text-pink-500">{{ displayStats.totalPutri }}</span>
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
