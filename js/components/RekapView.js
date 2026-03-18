const RekapView = {
    props: [
        'rekapStartDate', 'rekapEndDate', 'rekapKelas', 'rekapGender', 'monthNames',
        'kelasOptions', 'rekapHafalanData', 'rekapGlobalStats', 'rekapSettings',
        'rekapTrendData', 'userSession', 'rekapSearch', 'rekapSantriId',
        'isRekapSantriDropdownOpen', 'rekapFilteredSantriOptions', 'selectRekapSantri',
        'uiData'
    ],
    emits: [
        'update:rekapStartDate', 'update:rekapEndDate', 'update:rekapKelas', 'update:rekapGender',
        'update:rekapSearch', 'update:rekapSantriId', 'update:isRekapSantriDropdownOpen',
        'export-to-excel', 'export-to-pdf', 'export-to-pdf-raport', 'export-to-pdf-mockup', 'save-settings',
        'set-range-realtime', 'set-range-kemarin', 'set-range-7hari', 'set-range-30hari', 'set-range-bulan-ini'
    ],
    setup(props, { emit }) {
        const { ref, reactive, computed, watch, onMounted, nextTick } = Vue;
        const isConfigOpen = ref(false);
        const tempSettings = reactive(JSON.parse(JSON.stringify(props.rekapSettings)));
        const activeMetric = ref('all'); // 'all' | 'sabaq' | 'manzil' | 'tilawah' | 'ujian'
        const activeTab = ref('data'); // 'data' | 'raport'
        const configTab = ref('weight'); // 'weight' | 'metadata'
        const isUploadingLogo = ref(false);
        const isJuzGridOpen = ref(false);
        const isCalendarOpen = ref(false);
        const calendarViewDate = ref(new Date()); // Current month shown in left calendar

        const tempRange = reactive({
            start: props.rekapStartDate,
            end: props.rekapEndDate
        });

        const parsedJuzProgress = computed(() => {
            const data = props.rekapHafalanData[0]?.hafalan_progress;
            if (!data) return {};
            try {
                return typeof data === 'string' ? JSON.parse(data) : data;
            } catch (e) { return {}; }
        });

        // Date Picker Helpers
        const toYMD = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const formatDateShort = (ymd) => {
            if (!ymd) return '';
            const [y, m, d] = ymd.split('-');
            return `${d}/${m}/${y}`;
        };

        const rekapSelectedSantriName = computed(() => {
            if (!props.rekapSantriId) return '-- Pilih Santri (Semua) --';
            const s = props.uiData?.santri?.find(s => s.santri_id === props.rekapSantriId || s._id === props.rekapSantriId);
            return s ? s.full_name : '-- Pilih Santri --';
        });

        const getDaysInMonth = (year, month) => {
            const date = new Date(year, month, 1);
            const days = [];
            while (date.getMonth() === month) {
                days.push(new Date(date));
                date.setDate(date.getDate() + 1);
            }
            return days;
        };

        const handleLogoUpload = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            if (file.size > 500 * 1024) return window.showAlert("Ukuran file terlalu besar (Max 500KB)", "Warning", "warning");

            isUploadingLogo.value = true;
            try {
                const ext = file.name.split('.').pop();
                const fileName = `logo_${Date.now()}.${ext}`;
                const url = await DB.uploadFile(file, `logos/${fileName}`);
                tempSettings.raportMetadata.logo_url = url;
                window.showAlert("Logo berhasil diunggah!", "Berhasil", "success");
            } catch (e) {
                window.showAlert("Gagal mengunggah logo: " + e.message, "Error", "danger");
            } finally {
                isUploadingLogo.value = false;
            }
        };

        const calendars = computed(() => {
            const leftMonth = calendarViewDate.value.getMonth();
            const leftYear = calendarViewDate.value.getFullYear();

            const rightDate = new Date(leftYear, leftMonth + 1, 1);
            const rightMonth = rightDate.getMonth();
            const rightYear = rightDate.getFullYear();

            const createMonthData = (y, m) => {
                const days = getDaysInMonth(y, m);
                const firstDayIdx = days[0].getDay(); // 0: Sunday, 1: Monday...
                // Adjust for Monday start if needed, but standard is Sunday.
                // The image shows M S S R K J S (Senin Selasa?) 
                // Wait, image headers: M S S R K J S (Indonesian: Minggu Senin Selasa Rabu Kamis Jumat Sabtu)
                // Actually M is Minggu (0), S is Senin (1)...
                const paddedDays = Array(firstDayIdx).fill(null).concat(days);
                return {
                    name: props.monthNames[m],
                    year: y,
                    days: paddedDays
                };
            };

            return [createMonthData(leftYear, leftMonth)];
        });

        const handleDateClick = (date) => {
            if (!date) return;
            const ymd = toYMD(date);

            if (!tempRange.start || (tempRange.start && tempRange.end)) {
                tempRange.start = ymd;
                tempRange.end = null;
            } else {
                if (ymd < tempRange.start) {
                    tempRange.start = ymd;
                    tempRange.end = null;
                } else {
                    tempRange.end = ymd;
                }
            }
        };

        const isDateInRange = (date) => {
            if (!date || !tempRange.start || !tempRange.end) return false;
            const ymd = toYMD(date);
            return ymd >= tempRange.start && ymd <= tempRange.end;
        };

        const isDateSelected = (date) => {
            if (!date) return false;
            const ymd = toYMD(date);
            return ymd === tempRange.start || ymd === tempRange.end;
        };

        const applyRange = () => {
            if (!tempRange.start) return;
            const finalEnd = tempRange.end || tempRange.start;
            emit('update:rekapStartDate', tempRange.start);
            emit('update:rekapEndDate', finalEnd);
            isCalendarOpen.value = false;
        };

        const activeShortcut = computed(() => {
            const start = props.rekapStartDate;
            const end = props.rekapEndDate;
            if (!start || !end) return null;

            const todayD = new Date();
            const today = toYMD(todayD);

            if (start === end && start === today) return 'realtime';

            const yesterdayD = new Date();
            yesterdayD.setDate(yesterdayD.getDate() - 1);
            if (start === end && start === toYMD(yesterdayD)) return 'kemarin';

            const p7 = new Date();
            p7.setDate(p7.getDate() - 7);
            if (end === today && start === toYMD(p7)) return '7hari';

            const p30 = new Date();
            p30.setDate(p30.getDate() - 30);
            if (end === today && start === toYMD(p30)) return '30hari';

            const startMonth = toYMD(new Date(todayD.getFullYear(), todayD.getMonth(), 1));
            if (end === today && start === startMonth) return 'bulan-ini';

            return null;
        });

        const moveMonth = (delta) => {
            const d = new Date(calendarViewDate.value);
            d.setMonth(d.getMonth() + delta);
            calendarViewDate.value = d;
        };

        let trendChart = null;
        let personalDonutChart = null;

        const totalWeight = computed(() => {
            return Object.values(tempSettings.weights).reduce((a, b) => a + b, 0);
        });

        const initChart = () => {
            const isPersonal = !!props.rekapSantriId;
            const chartId = isPersonal ? 'rekapTrendChartPersonal' : 'rekapTrendChartGlobal';
            let ctx = document.getElementById(chartId);

            // Also init donut if in personal mode
            if (isPersonal) initDonut();

            if (!ctx) {
                // Fallback: try to find either one
                ctx = document.getElementById('rekapTrendChartPersonal') || document.getElementById('rekapTrendChartGlobal');
            }

            if (!ctx) {
                setTimeout(() => {
                    const retryCtx = document.getElementById('rekapTrendChartPersonal') || document.getElementById('rekapTrendChartGlobal');
                    if (retryCtx) doInit(retryCtx);
                    if (isPersonal) initDonut();
                }, 200);
                return;
            }
            doInit(ctx);
        };

        const initDonut = () => {
            const ctxDonut = document.getElementById('juzProgressChartPersonal');
            if (!ctxDonut) return;
            if (personalDonutChart) personalDonutChart.destroy();

            const completed = props.rekapHafalanData[0]?.juzCompleted || 0;
            const remaining = Math.max(0, 30 - completed);

            personalDonutChart = new Chart(ctxDonut, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [completed, remaining],
                        backgroundColor: ['#1E40AF', '#F1F5F9'],
                        borderWidth: 0,
                        borderRadius: 10,
                    }]
                },
                options: {
                    cutout: '80%',
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    animation: { duration: 1500 }
                }
            });
        };

        const doInit = (ctx) => {

            if (trendChart) trendChart.destroy();

            const chartData = props.rekapTrendData;
            if (!chartData) return;

            const config = {
                sabaq: { label: 'Halaman Sabaq', color: 'rgba(30, 64, 175, 1)' },
                manzil: { label: 'Halaman Manzil', color: 'rgba(16, 185, 129, 1)' },
                tilawah: { label: 'Juz Tilawah', color: 'rgba(245, 158, 11, 1)' },
                ujian: { label: 'Nilai Ujian', color: 'rgba(99, 102, 241, 1)' }
            };

            let datasets = [];

            if (activeMetric.value === 'all') {
                // Show Sabaq, Manzil, Tilawah by default in 'all' mode
                ['sabaq', 'manzil', 'tilawah'].forEach(key => {
                    datasets.push({
                        label: config[key].label,
                        data: chartData[key] || [],
                        borderColor: config[key].color,
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointBackgroundColor: config[key].color,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    });
                });
            } else {
                const key = activeMetric.value;
                datasets.push({
                    label: config[key].label,
                    data: chartData[key] || [],
                    borderColor: config[key].color,
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointBackgroundColor: config[key].color,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                });
            }

            trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: activeMetric.value === 'all',
                            position: 'top',
                            align: 'end',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: { size: 9, weight: 'bold' },
                                boxWidth: 6,
                                padding: 10
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: '#1e293b',
                            padding: 10,
                            bodyFont: { size: 10, weight: 'bold' },
                            callbacks: {
                                label: (context) => ` ${context.dataset.label}: ${context.parsed.y}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#f1f5f9', drawBorder: false },
                            ticks: { font: { size: 9 }, color: '#94a3b8' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 9, weight: 'bold' }, color: '#64748b' }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    }
                }
            });
        };

        watch([() => props.rekapTrendData, () => props.rekapSantriId, activeMetric, activeTab], () => {
            if (activeTab.value === 'raport') {
                setTimeout(() => initChart(), 50);
            }
        }, { deep: true });

        onMounted(() => {
            if (activeTab.value === 'raport') initChart();
        });

        return {
            isJuzGridOpen, activeTab, activeMetric, totalWeight, tempSettings, isConfigOpen, configTab,
            isUploadingLogo, handleLogoUpload,
            isCalendarOpen, calendarViewDate, tempRange, calendars, formatDateShort, toYMD,
            rekapSelectedSantriName,
            handleDateClick, isDateInRange, isDateSelected, applyRange, moveMonth, activeShortcut,
            parsedJuzProgress,
            handleSave: async () => {
                if (totalWeight.value !== 100) return window.showAlert("Total bobot harus 100%", "Warning", "warning");
                Object.assign(props.rekapSettings, tempSettings);
                emit('save-settings');
                isConfigOpen.value = false;
            },
            deleteLogo: () => {
                tempSettings.raportMetadata.logo_url = "";
                window.showToast("Logo dihapus", "info");
            },
            handleMockupDownload: () => {
                emit('export-to-pdf-mockup', tempSettings);
            },
            openConfig: () => {
                Object.assign(tempSettings, JSON.parse(JSON.stringify(props.rekapSettings)));
                isConfigOpen.value = true;
            },
            toggleMetric: (m) => {
                if (activeMetric.value === m) activeMetric.value = 'all';
                else activeMetric.value = m;
            }
        };
    },
    template: `
    <div class="fade-in space-y-6 pb-24">
        <div class="px-2 flex justify-between items-start">
            <div>
                <h2 class="text-2xl font-bold text-slate-900">Rekap Laporan</h2>
                <p class="text-xs text-slate-500">Analisa perkembangan santri</p>
            </div>
            <button v-if="userSession?.role === 'admin'" @click="openConfig"
                class="size-10 bg-white border shadow-sm rounded-xl flex items-center justify-center text-slate-600 hover:text-primary transition">
                <span class="material-symbols-outlined">settings</span>
            </button>
        </div>

        <!-- Date Block Filter (Top) -->
        <div class="px-2 pt-2">
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div class="flex flex-col gap-4">
                    <!-- Custom Range Picker Trigger -->
                    <div @click="isCalendarOpen = true; tempRange.start = rekapStartDate; tempRange.end = rekapEndDate" 
                        class="flex items-center justify-center bg-white border border-slate-200 py-2 px-3 rounded-lg cursor-pointer hover:border-slate-300 transition-colors">
                        <div class="text-center">
                            <p class="text-sm font-bold text-slate-700">{{ formatDateShort(rekapStartDate) }} - {{ formatDateShort(rekapEndDate) }}</p>
                        </div>
                    </div>

                    <!-- Filters for Class & Gender -->
                    <div class="grid grid-cols-2 gap-3">
                        <div class="relative">
                            <select :value="rekapKelas" @change="$emit('update:rekapKelas', $event.target.value)" 
                                class="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
                                <option value="">Semua Kelas</option>
                                <option v-for="k in kelasOptions" :value="k.name">{{ k.name }}</option>
                            </select>
                        </div>
                        <div class="relative">
                            <select :value="rekapGender" @change="$emit('update:rekapGender', $event.target.value)" 
                                class="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
                                <option value="">Semua</option>
                                <option value="L">Putra</option>
                                <option value="P">Putri</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Santri Search Dropdown (Middle) -->
        <div class="px-2">
            <div class="relative">
                
                <!-- Trigger Button -->
                <button @click="$emit('update:isRekapSantriDropdownOpen', !isRekapSantriDropdownOpen)"
                    class="w-full p-3 border rounded-xl text-sm font-bold bg-white text-left flex justify-between items-center transition shadow-sm active:scale-[0.99]"
                    :class="isRekapSantriDropdownOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : 'border-slate-200'">
                    <span :class="rekapSantriId ? 'text-slate-900' : 'text-slate-400'">
                        {{ rekapSelectedSantriName }}
                    </span>
                    <span class="material-symbols-outlined text-slate-400 transition-transform" :class="{ 'rotate-180': isRekapSantriDropdownOpen }">expand_more</span>
                </button>

                <!-- Dropdown Content -->
                <div v-if="isRekapSantriDropdownOpen"
                    class="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    
                    <!-- Search Input Inside Dropdown -->
                    <div class="p-2 border-b border-slate-50 bg-slate-50/50">
                        <div class="flex items-center gap-2 p-2 rounded-xl border border-slate-200 shadow-sm bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                            <span class="material-symbols-outlined text-slate-400 ml-2">person_search</span>
                            <input type="text" 
                                :value="rekapSearch"
                                @input="$emit('update:rekapSearch', $event.target.value)"
                                placeholder="Cari nama santri..." 
                                class="bg-transparent w-full text-sm font-bold outline-none placeholder:text-slate-400"
                                @click.stop>
                            
                            <!-- Clear Filter Inside Search -->
                            <button v-if="rekapSantriId" 
                                @click.stop="selectRekapSantri({ santri_id: '' })"
                                class="size-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition mr-1">
                                <span class="material-symbols-outlined text-xs">close</span>
                            </button>
                        </div>
                    </div>

                    <!-- Live Results List -->
                    <div class="max-h-60 overflow-y-auto custom-scrollbar">
                        <!-- All Santri Option -->
                        <div v-if="!rekapSearch" @click="selectRekapSantri({ santri_id: '' })"
                            class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors group">
                            <p class="text-sm font-bold text-slate-400 group-hover:text-primary">-- Semua Santri --</p>
                        </div>

                        <div v-for="s in rekapFilteredSantriOptions" :key="s._id"
                            @click="selectRekapSantri(s)"
                            class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors group">
                            <p class="text-sm font-bold text-slate-800 group-hover:text-primary">{{ s.full_name }}</p>
                            <p class="text-[10px] text-slate-500">{{ s.santri_id }} &bull; {{ s.kelas || '-' }}</p>
                        </div>
                        
                        <!-- Empty State -->
                        <div v-if="rekapFilteredSantriOptions.length === 0"
                            class="p-4 text-center text-slate-400 text-xs italic">
                            Santri tidak ditemukan...
                        </div>
                    </div>
                </div>

                <!-- Backdrop to Close -->
                <div v-if="isRekapSantriDropdownOpen" 
                    @click="$emit('update:isRekapSantriDropdownOpen', false)" 
                    class="fixed inset-0 z-[90] cursor-default"></div>
            </div>
        </div>

        <!-- Shortcuts (Bottom of Filter Group) -->
        <div class="px-2 -mt-2">
            <div class="flex gap-2 pb-1 overflow-x-auto scrollbar-hide">
                <button v-for="tag in [
                    { id: 'bulan-ini', label: 'Bulan Ini' },
                    { id: 'realtime', label: 'Hari Ini' },
                    { id: 'kemarin', label: 'Kemarin' },
                    { id: '7hari', label: '7 Hari lalu' },
                    { id: '30hari', label: '30 Hari lalu' }
                ]" :key="tag.id"
                    @click="$emit('set-range-' + tag.id)"
                    class="px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border"
                    :class="activeShortcut === tag.id ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'">
                    {{ tag.label }}
                </button>
            </div>
        </div>

        <!-- Tabs Navigation (Above Content) -->
        <div class="px-2">
            <div class="flex gap-2 p-1 bg-slate-100/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm">
                <button @click="activeTab = 'data'" 
                    class="flex-1 py-2 px-4 rounded-lg font-bold text-xs transition-colors text-center tracking-wide"
                    :class="activeTab === 'data' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
                    Data Keseluruhan
                </button>
                <button @click="activeTab = 'raport'" 
                    class="flex-1 py-2 px-4 rounded-lg font-bold text-xs transition-colors text-center tracking-wide"
                    :class="activeTab === 'raport' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
                    Raport & Analitik
                </button>
            </div>
        </div>

        <!-- TAB: DATA (Tabel Keseluruhan) -->
        <div v-if="activeTab === 'data'" class="mx-2 space-y-4 fade-in">
            <div class="bg-white rounded-2xl border overflow-hidden">
                <div class="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h3 class="font-bold text-slate-700">Laporan Prestasi Santri</h3>
                    <div class="flex gap-2">
                        <button @click="$emit('export-to-excel')"
                            class="p-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200">
                            XLS
                        </button>
                        <button @click="$emit('export-to-pdf')"
                            class="p-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200">
                            PDF
                        </button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50 text-slate-500 uppercase">
                            <tr>
                                <th class="px-4 py-3">Nama</th>
                                <th v-if="rekapSettings.visibility.sabaq" class="px-4 py-3 text-center">Sabaq<br><span
                                        class="text-[9px]">(Hal)</span></th>
                                <th v-if="rekapSettings.visibility.manzil" class="px-4 py-3 text-center">Manzil<br><span
                                        class="text-[9px]">(Hal)</span></th>
                                <th v-if="rekapSettings.visibility.ujian" class="px-4 py-3 text-center">Ujian</th>
                                <th v-if="rekapSettings.visibility.tilawah" class="px-4 py-3 text-center">Tilawah<br><span
                                        class="text-[9px]">(Juz)</span></th>
                                <th class="px-4 py-3 text-center">Pelanggaran</th>
                                <th class="px-4 py-3 text-center">Nilai</th>
                                <th class="px-4 py-3 text-center">Predikat</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            <tr v-for="row in rekapHafalanData" :key="row.id">
                                <td class="px-4 py-3 font-medium text-slate-700">
                                    {{ row.nama }}<br>
                                    <span class="text-[10px] text-slate-400">{{ row.kelas }}</span>
                                </td>
                                <td v-if="row.show_sabaq" class="px-4 py-3 text-center">
                                    <div class="font-bold text-blue-600">{{ row.sabaq_act }} / {{
                                        row.sabaq_tgt }} <span class="text-[9px] font-normal">Hal</span></div>
                                </td>
                                <td v-if="row.show_manzil" class="px-4 py-3 text-center">
                                    <div class="font-bold text-emerald-600">{{ row.manzil_act }} / {{
                                        row.manzil_tgt }} <span class="text-[9px] font-normal">Hal</span></div>
                                </td>
                                <td v-if="row.show_ujian" class="px-4 py-3 text-center font-bold text-indigo-600">
                                    {{ row.ujian_avg }}
                                </td>
                                <td v-if="row.show_tilawah" class="px-4 py-3 text-center">
                                    <div class="font-bold text-amber-500">{{ row.tilawah_act }} / {{
                                        row.tilawah_tgt }} <span class="text-[9px] font-normal">Juz</span></div>
                                </td>
                                <td class="px-4 py-3 text-center text-red-500 font-bold">
                                    {{ row.pelanggaran_poin > 0 ? '-' + row.pelanggaran_poin : '0'
                                    }}
                                </td>
                                <td class="px-4 py-3 text-center font-bold text-slate-800">
                                    {{ row.nilai_akhir }}
                                </td>
                                <td class="px-4 py-3 text-center">
                                    <span class="px-2 py-1 rounded-full font-bold text-[10px] border" :class="{
                                        'bg-blue-50 text-blue-700 border-blue-100': row.predikat === 'A+' || row.predikat === 'A',
                                        'bg-emerald-50 text-emerald-700 border-emerald-100': row.predikat === 'B+' || row.predikat === 'B',
                                        'bg-amber-50 text-amber-700 border-amber-100': row.predikat === 'B-',
                                        'bg-red-50 text-red-700 border-red-100': row.predikat === 'C'
                                    }">
                                        {{ row.predikat }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!-- Empty State -->
                    <div v-if="!rekapHafalanData.length" class="p-8 text-center text-slate-400 text-xs">
                        Belum ada data untuk periode ini.
                    </div>
                </div>
            </div>
        </div>

        <!-- TAB: RAPORT & ANALITIK (Simple Dashboard Style) -->
        <div v-else-if="activeTab === 'raport'" @click="activeMetric = 'all'" class="mx-2 space-y-5 fade-in pb-10">
            <!-- Mode Global -->
            <div v-if="!rekapSantriId" class="space-y-5 px-1">
                <!-- Info Alert -->
                <div class="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3">
                    <span class="material-symbols-outlined text-blue-600">info</span>
                    <p class="text-xs font-bold text-blue-800 leading-tight">Pilih nama santri pada kolom pencarian di atas untuk melihat detail & mencetak Raport.</p>
                </div>

                <!-- Simple Metric Cards -->
                <div v-if="rekapGlobalStats" @click.stop class="grid grid-cols-2 gap-4">
                    <template v-for="m in ['sabaq', 'manzil', 'tilawah', 'ujian']" :key="m">
                        <div v-if="rekapSettings.visibility[m]"
                            @click="toggleMetric(m)"
                            class="bg-white p-4 rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-sm relative overflow-hidden"
                            :class="activeMetric === m ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'hover:border-slate-300'">
                            <div class="flex justify-between items-center mb-1">
                                <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ m }}</h4>
                                <div v-if="activeMetric === m" class="size-1.5 rounded-full bg-blue-500"></div>
                            </div>
                            <div class="flex items-baseline gap-1">
                                <span class="text-xl font-bold text-slate-800">{{ m === 'ujian' ? rekapGlobalStats.avg.ujian_avg : rekapGlobalStats.avg[m + '_act'] }}</span>
                                <span v-if="m !== 'ujian'" class="text-[10px] text-slate-400 font-medium">/ {{ rekapGlobalStats.avg[m + '_tgt'] }}</span>
                            </div>
                            <div class="flex items-center gap-1 mt-1 text-[9px] font-bold"
                                :class="rekapGlobalStats.comparison[m].status === 'up' ? 'text-emerald-500' : (rekapGlobalStats.comparison[m].status === 'down' ? 'text-red-500' : 'text-slate-400')">
                                <span class="material-symbols-outlined text-[10px]">{{ rekapGlobalStats.comparison[m].status === 'up' ? 'trending_up' : (rekapGlobalStats.comparison[m].status === 'down' ? 'trending_down' : 'remove') }}</span>
                                {{ Math.abs(rekapGlobalStats.comparison[m].percent) }}% vs bln lalu
                            </div>
                        </div>
                    </template>
                </div>

                <!-- Simple Chart -->
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
                    <div class="flex justify-between items-center">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left block">
                            {{ activeMetric === 'all' ? 'Tren Gabungan' : 'Tren ' + activeMetric }} (30 Hari)
                        </span>
                        <div class="size-2 rounded-full bg-blue-500/40"></div>
                    </div>
                    <div class="h-[180px] w-full mt-2 relative">
                        <canvas id="rekapTrendChartGlobal"></canvas>
                    </div>
                </div>

                <!-- Aligned Leaderboard (List Style) -->
                <div v-if="rekapGlobalStats" class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm">
                        <span class="material-symbols-outlined text-yellow-500">trophy</span>
                        Peringkat Seluruh Santri
                    </h3>
                    <div class="space-y-2 max-h-80 overflow-y-auto pr-1">
                        <div v-for="(s, idx) in rekapGlobalStats.top" :key="idx"
                            @click="selectRekapSantri({ _id: s.id, full_name: s.nama })"
                            class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 cursor-pointer transition-colors">
                            <div class="size-8 rounded-full flex items-center justify-center font-bold text-sm"
                                :class="idx < 3 ? 'bg-yellow-50 text-yellow-700' : 'bg-slate-100 text-slate-500'">
                                {{ idx + 1 }}
                            </div>
                            <div class="flex-1 min-w-0 text-left">
                                <p class="font-bold text-slate-800 text-sm truncate">{{ s.nama }}</p>
                                <p class="text-xs text-slate-500 font-medium">{{ s.kelas }}</p>
                            </div>
                            <div class="text-right">
                                <p class="font-black text-sm"
                                    :class="{
                                        'text-blue-600': (s.predikat || '').startsWith('A'),
                                        'text-emerald-600': (s.predikat || '') === 'B' || (s.predikat || '') === 'B+',
                                        'text-amber-500': (s.predikat || '') === 'B-',
                                        'text-red-500': (s.predikat || '') === 'C'
                                    }">{{ s.nilai_akhir }}</p>
                                <p class="text-[10px] text-slate-400 font-bold">POINTS</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mode Personal -->
            <div v-else-if="rekapHafalanData.length > 0" class="space-y-5 fade-in">
                <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <p class="text-[9px] font-bold text-primary uppercase tracking-widest mb-0.5">Laporan Perkembangan</p>
                        <h3 class="font-bold text-lg text-slate-800 tracking-tight">{{ rekapHafalanData[0].nama }}</h3>
                        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{{ rekapHafalanData[0].kelas ? (rekapHafalanData[0].kelas.toLowerCase().includes('kelas') ? '' : 'Kelas ') + rekapHafalanData[0].kelas : '-' }} • NIS {{ rekapHafalanData[0].nis }}</p>
                    </div>
                    <div @click="isJuzGridOpen = true" class="relative size-16 flex items-center justify-center flex-shrink-0 cursor-pointer hover:scale-105 transition active:scale-95">
                        <canvas id="juzProgressChartPersonal"></canvas>
                        <div class="absolute inset-0 flex flex-col items-center justify-center mt-0.5">
                            <span class="text-[12px] font-black text-blue-600 leading-none">{{ rekapHafalanData[0].juzCompleted }}</span>
                            <span class="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Juz</span>
                        </div>
                    </div>
                </div>

                <!-- Interactive Metric Cards for Santri -->
                <div @click.stop class="grid grid-cols-2 gap-4">
                    <template v-for="m in ['sabaq', 'manzil', 'tilawah', 'ujian']" :key="m">
                        <div v-if="rekapSettings.visibility[m]"
                            @click="toggleMetric(m)"
                            class="bg-white p-4 rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-sm relative overflow-hidden"
                            :class="activeMetric === m ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'hover:border-slate-300'">
                            <div class="flex justify-between items-center mb-1">
                                <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ m }}</h4>
                                <div v-if="activeMetric === m" class="size-1.5 rounded-full bg-blue-500"></div>
                            </div>
                            <div class="flex items-baseline gap-1">
                                <span class="text-xl font-bold text-slate-800">
                                    {{ m === 'ujian' ? rekapHafalanData[0].ujian_avg : rekapHafalanData[0][m + '_act'] }}
                                </span>
                                <span v-if="m !== 'ujian'" class="text-[10px] text-slate-400 font-medium">/ {{ rekapHafalanData[0][m + '_tgt'] }}</span>
                            </div>
                            <div v-if="rekapHafalanData[0].comparison && rekapHafalanData[0].comparison[m]" 
                                class="flex items-center gap-1 mt-1 text-[9px] font-bold"
                                :class="rekapHafalanData[0].comparison[m].status === 'up' ? 'text-emerald-500' : (rekapHafalanData[0].comparison[m].status === 'down' ? 'text-red-500' : 'text-slate-400')">
                                <span class="material-symbols-outlined text-[10px]">{{ rekapHafalanData[0].comparison[m].status === 'up' ? 'trending_up' : (rekapHafalanData[0].comparison[m].status === 'down' ? 'trending_down' : 'remove') }}</span>
                                {{ Math.abs(rekapHafalanData[0].comparison[m].percent) }}% vs bln lalu
                            </div>
                        </div>
                    </template>
                </div>

                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left block">
                        {{ activeMetric === 'all' ? 'Tren Gabungan' : 'Tren ' + activeMetric }} (30 Hari)
                    </span>
                    <div class="h-[160px] w-full mt-2 relative">
                        <canvas id="rekapTrendChartPersonal"></canvas>
                    </div>
                </div>
                
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="p-3 border-b bg-slate-50/50 flex items-center justify-between">
                        <h4 class="font-bold text-[10px] text-slate-500 uppercase tracking-widest">Detail Akademik</h4>
                        <span class="material-symbols-outlined text-slate-300 text-sm">list_alt</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-[11px]">
                            <thead class="bg-slate-50 text-slate-400 uppercase font-bold tracking-tighter">
                                <tr>
                                    <th class="px-5 py-2 border-b">Mapel</th>
                                    <th class="px-5 py-2 border-b text-center">Nilai</th>
                                    <th class="px-5 py-2 border-b">Terbilang</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                                <tr v-for="exam in rekapHafalanData[0].exam_details" :key="exam.detail">
                                    <td class="px-5 py-3 font-bold text-slate-700 truncate">{{ exam.detail }}</td>
                                    <td class="px-5 py-3 text-center font-bold text-primary">{{ exam.score }}</td>
                                    <td class="px-5 py-3 text-slate-400 italic text-[9px]">{{ exam.terbilang }}</td>
                                </tr>
                                <tr v-if="!rekapHafalanData[0].exam_details.length">
                                    <td colspan="3" class="px-5 py-6 text-center text-slate-400 italic font-medium">Belum ada data akademik.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Simplified Score Summary -->
                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Nilai Akhir & Predikat</p>
                        <div class="flex items-center gap-3">
                            <span class="text-3xl font-black tracking-tighter"
                                :class="{
                                    'text-blue-600': (rekapHafalanData[0].predikat || '').startsWith('A'),
                                    'text-emerald-600': (rekapHafalanData[0].predikat || '') === 'B' || (rekapHafalanData[0].predikat || '') === 'B+',
                                    'text-amber-500': (rekapHafalanData[0].predikat || '') === 'B-',
                                    'text-red-500': (rekapHafalanData[0].predikat || '') === 'C'
                                }">{{ rekapHafalanData[0].nilai_akhir }}</span>
                            <div class="h-6 w-px bg-slate-100"></div>
                            <span class="text-lg font-bold"
                                :class="{
                                    'text-blue-600': (rekapHafalanData[0].predikat || '').startsWith('A'),
                                    'text-emerald-600': (rekapHafalanData[0].predikat || '') === 'B' || (rekapHafalanData[0].predikat || '') === 'B+',
                                    'text-amber-500': (rekapHafalanData[0].predikat || '') === 'B-',
                                    'text-red-500': (rekapHafalanData[0].predikat || '') === 'C'
                                }">{{ rekapHafalanData[0].predikat }}</span>
                        </div>
                    </div>
                    <div class="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                            {{ rekapHafalanData[0].nilai_akhir >= 85 ? 'Sangat Baik' : 'Terus Semangat' }}
                        </p>
                    </div>
                </div>

                <!-- Final Action: Print -->
                <button @click="$emit('export-to-pdf-raport', rekapHafalanData[0])"
                    class="w-full py-3.5 bg-blue-600 text-white rounded-xl shadow-sm text-center hover:bg-blue-700 transition active:scale-95 mt-6 mb-2">
                    <span class="font-bold text-sm tracking-tight">Cetak Raport</span>
                </button>
            </div>
        </div>

        <!-- MODAL CONFIG -->
        <teleport to="body">
            <div v-if="isConfigOpen" @click.self="isConfigOpen = false" class="fixed inset-0 z-[999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div @click.stop class="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                    <div class="p-6 pb-2 flex justify-between items-center">
                        <h3 class="font-black text-slate-900 text-xl tracking-tight">Pengaturan</h3>
                        <button @click="isConfigOpen = false" class="text-slate-400 hover:text-slate-600 transition-colors">
                            <span class="material-symbols-outlined text-2xl">close</span>
                        </button>
                    </div>

                    <!-- Config Tabs -->
                    <div class="flex border-b border-slate-100 text-[13px] font-bold px-6 mt-2">
                        <button @click="configTab = 'weight'" 
                            class="mr-6 py-3 border-b-2 transition-all"
                            :class="configTab === 'weight' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'">
                            Bobot Nilai
                        </button>
                        <button @click="configTab = 'metadata'" 
                            class="py-3 border-b-2 transition-all"
                            :class="configTab === 'metadata' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'">
                            Kop & Data
                        </button>
                    </div>

                    <div class="flex-1 p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
                        <!-- TAB 1: Weight Config -->
                        <div v-if="configTab === 'weight'" class="space-y-2">
                            <div class="space-y-0 divide-y divide-slate-100">
                                <div v-for="(val, key) in tempSettings.visibility" :key="key" 
                                    class="flex items-center justify-between py-4 transition-all"
                                    :class="!val ? 'opacity-50 grayscale' : ''">
                                    <div class="flex items-center gap-4">
                                        <!-- Tailwind Toggle Switch -->
                                        <label class="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" v-model="tempSettings.visibility[key]" 
                                                @change="!tempSettings.visibility[key] ? tempSettings.weights[key] = 0 : null"
                                                class="sr-only peer">
                                            <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                        <span class="font-bold text-[13px] text-slate-800 capitalize">{{ key }}</span>
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <input type="number" v-model.number="tempSettings.weights[key]" :disabled="!val"
                                            class="w-12 text-right py-1 bg-transparent font-black text-sm focus:outline-none transition-all placeholder:text-slate-300"
                                            :class="!val ? 'text-slate-400' : 'text-slate-900'">
                                        <span class="font-bold text-slate-400 text-sm">%</span>
                                    </div>
                                </div>
                            </div>
                            <div class="pt-6 flex justify-between items-center">
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bobot</span>
                                <span class="text-xl font-black" :class="totalWeight === 100 ? 'text-slate-900' : 'text-red-500'">{{ totalWeight }}%</span>
                            </div>
                        </div>
                        <!-- TAB 2: Metadata Config -->
                        <div v-else class="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 pb-4">
                            <div class="space-y-5">
                                <div>
                                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Logo Lembaga (Opsional)</label>
                                    <div class="flex flex-col gap-3">
                                        <div class="flex items-center gap-4">
                                            <div class="size-16 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center bg-slate-50 flex-shrink-0 overflow-hidden relative">
                                                <img v-if="tempSettings.raportMetadata.logo_url" :src="tempSettings.raportMetadata.logo_url" class="w-full h-full object-contain p-2" />
                                                <span v-else class="text-[10px] font-bold text-slate-300">LOGO</span>
                                                <div v-if="isUploadingLogo" class="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                    <div class="size-5 border-2 border-primary border-t-transparent animate-spin rounded-full"></div>
                                                </div>
                                            </div>
                                            <div class="flex-1 flex gap-2">
                                                <input type="file" @change="handleLogoUpload" accept="image/*" class="hidden" id="logo-modal-upload">
                                                <label for="logo-modal-upload" class="flex-1 flex items-center justify-center py-2.5 bg-primary text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95">
                                                    {{ tempSettings.raportMetadata.logo_url ? 'Ganti Logo' : 'Upload Logo' }}
                                                </label>
                                                <button v-if="tempSettings.raportMetadata.logo_url" @click="deleteLogo" class="px-4 py-2.5 bg-red-50 text-red-500 rounded-xl font-bold transition-all hover:bg-red-100">
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <!-- Adjustment Sliders (Sesuaikan Logo) -->
                                        <div v-if="tempSettings.raportMetadata.logo_url" class="p-4 bg-slate-50 rounded-xl space-y-4">
                                            <div class="flex flex-col gap-1">
                                                <div class="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                    <span>Ukuran</span>
                                                    <span>{{ tempSettings.raportMetadata.logo_size || 18 }}mm</span>
                                                </div>
                                                <input type="range" v-model.number="tempSettings.raportMetadata.logo_size" min="10" max="30" step="1" class="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary">
                                            </div>
                                            <div class="flex flex-col gap-1">
                                                <div class="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                    <span>Posisi Vertikal (Y)</span>
                                                    <span>{{ tempSettings.raportMetadata.logo_y || 10 }}mm</span>
                                                </div>
                                                <input type="range" v-model.number="tempSettings.raportMetadata.logo_y" min="5" max="25" step="1" class="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="space-y-4">
                                    <div class="space-y-3">
                                        <input v-model="tempSettings.raportMetadata.institution" type="text" placeholder="Nama Lembaga"
                                            class="w-full py-2.5 px-0 border-b-2 border-slate-200 text-sm font-medium focus:border-primary outline-none transition-colors bg-transparent placeholder:text-slate-300">
                                            
                                        <input v-model="tempSettings.raportMetadata.address" type="text" placeholder="Alamat / Kop Surat"
                                            class="w-full py-2.5 px-0 border-b-2 border-slate-200 text-[13px] font-medium focus:border-primary outline-none transition-colors bg-transparent placeholder:text-slate-300">
                                            
                                        <input v-model="tempSettings.raportMetadata.report_title" type="text" placeholder="Judul Raport (Opsional)"
                                            class="w-full py-2.5 px-0 border-b-2 border-slate-200 text-sm font-medium focus:border-primary outline-none transition-colors bg-transparent placeholder:text-slate-300">
                                    </div>
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Semester</label>
                                            <select v-model="tempSettings.raportMetadata.semester"
                                                class="w-full py-2 px-0 border-b-2 border-slate-200 text-sm font-medium bg-transparent outline-none focus:border-primary">
                                                <option value="Ganjil">Ganjil</option>
                                                <option value="Genap">Genap</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tahun Ajaran</label>
                                            <input v-model="tempSettings.raportMetadata.tahun_ajaran" type="text"
                                                class="w-full py-2 px-0 border-b-2 border-slate-200 text-sm font-medium bg-transparent outline-none focus:border-primary">
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Kota / Ttd</label>
                                            <input v-model="tempSettings.raportMetadata.signature_place" type="text"
                                                class="w-full py-2 px-0 border-b-2 border-slate-200 text-sm font-medium bg-transparent outline-none focus:border-primary">
                                        </div>
                                        <div>
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Jabatan Ttd</label>
                                            <input v-model="tempSettings.raportMetadata.signature_label_right" type="text" placeholder="Musyrif / Wali Kelas"
                                                class="w-full py-2 px-0 border-b-2 border-slate-200 text-sm font-medium bg-transparent outline-none focus:border-primary">
                                        </div>
                                    </div>
                                    
                                    <!-- Mockup Download Button -->
                                    <button @click="handleMockupDownload"
                                        class="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3.5 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs hover:bg-blue-100 transition active:scale-95 border border-blue-200">
                                        Download Contoh Raport (PDF)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Bar -->
                    <div class="p-6 bg-white pt-2 border-t border-slate-100">
                        <button @click="handleSave" :disabled="totalWeight !== 100"
                            class="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                            :class="totalWeight === 100 ? 'bg-primary text-white shadow-lg shadow-blue-200 hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'">
                            Simpan Pengaturan
                        </button>
                    </div>
                </div>
            </div>
        </teleport>

        <!-- JUZ GRID MODAL -->
        <teleport to="body">
            <div v-if="isJuzGridOpen" @click.self="isJuzGridOpen = false" 
                class="fixed inset-0 z-[999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300">
                <div @click.stop class="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div class="p-4 border-b flex justify-between items-center bg-slate-50/50">
                        <div class="flex items-center gap-3">
                            <div class="size-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <span class="material-symbols-outlined text-lg">grid_view</span>
                            </div>
                            <h3 class="font-bold text-slate-800 text-sm">Progres Hafalan 30 Juz</h3>
                        </div>
                        <button @click="isJuzGridOpen = false" class="size-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">
                            <span class="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                    <div class="p-5">
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4 flex items-center justify-between">
                            <span>Status Hafalan Santri</span>
                            <span class="text-blue-600">{{ rekapHafalanData[0].juzCompleted }} / 30 Juz</span>
                        </p>
                        
                        <div class="grid grid-cols-5 gap-3 sm:gap-4 justify-items-center overflow-y-auto max-h-[60vh] pr-2 py-2">
                            <div v-for="j in 30" :key="j"
                                class="size-12 sm:size-14 rounded-full border-2 flex flex-col items-center justify-center transition-all shadow-md"
                                :class="[
                                    parsedJuzProgress[j] ? 
                                        (parsedJuzProgress[j] === 'Centang' ? 'bg-orange-400 text-white border-transparent shadow-orange-200' :
                                        ['A+','A'].includes(parsedJuzProgress[j]) ? 'bg-blue-500 text-white border-transparent shadow-blue-200' : 
                                        parsedJuzProgress[j] === 'C' ? 'bg-red-500 text-white border-transparent shadow-red-200' : 
                                        'bg-emerald-500 text-white border-transparent shadow-emerald-200') 
                                        : 'bg-slate-50 text-slate-400 border-slate-200'
                                ]">
                                <span v-if="parsedJuzProgress[j] === 'Centang'" class="material-symbols-outlined text-xl sm:text-2xl font-bold">check</span>
                                <span v-else class="text-sm sm:text-lg font-bold">{{ j }}</span>
                                <span v-if="parsedJuzProgress[j] && parsedJuzProgress[j] !== 'Centang'" class="text-[9px] font-black uppercase tracking-tighter opacity-90 mt-[-2px]">
                                    {{ parsedJuzProgress[j] }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </teleport>

        <!-- PREMIUM DATE RANGE PICKER MODAL -->
        <teleport to="body">
            <div v-if="isCalendarOpen" @click.self="isCalendarOpen = false" 
                class="fixed inset-0 z-[1000] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div @click.stop class="bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div class="p-6 md:flex gap-8 overflow-y-auto max-h-[80vh]">
                        <div v-for="(cal, calIdx) in calendars" :key="calIdx" class="flex-1 space-y-4">
                            <div class="flex justify-between items-center mb-4">
                                <button @click="moveMonth(-1)" class="p-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                                    <span class="material-symbols-outlined text-sm">chevron_left</span>
                                </button>
                                <h4 class="font-bold text-slate-700 text-sm">{{ cal.name }} {{ cal.year }}</h4>
                                <button @click="moveMonth(1)" class="p-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                                    <span class="material-symbols-outlined text-sm">chevron_right</span>
                                </button>
                            </div>

                            <div class="grid grid-cols-7 gap-y-2 gap-x-1">
                                <div v-for="dayName in ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']" :key="dayName"
                                    class="text-center text-[10px] font-bold text-slate-400 pb-2">
                                    {{ dayName }}
                                </div>
                                <div v-for="(day, dayIdx) in cal.days" :key="dayIdx"
                                    class="h-8 flex items-center justify-center text-xs font-semibold cursor-pointer transition-all relative"
                                    :class="[
                                        day ? 'hover:bg-blue-50' : 'pointer-events-none',
                                        isDateSelected(day) ? 'bg-blue-600 text-white rounded-lg z-10 hover:bg-blue-700' : 'text-slate-700',
                                        isDateInRange(day) ? 'bg-blue-50 text-blue-700' : '',
                                        !isDateSelected(day) && day ? 'rounded-lg' : ''
                                    ]"
                                    @click="handleDateClick(day)">
                                    {{ day ? day.getDate() : '' }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
                        <div class="text-xs font-medium text-slate-600 flex items-center gap-2">
                            {{ formatDateShort(tempRange.start) }} - {{ formatDateShort(tempRange.end || tempRange.start) }}
                        </div>
                        <div class="flex gap-2 w-full sm:w-auto">
                            <button @click="isCalendarOpen = false" class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition">
                                Batal
                            </button>
                            <button @click="applyRange" class="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition">
                                Terapkan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </teleport>

    </div>
    `
};
