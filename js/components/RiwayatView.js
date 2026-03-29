const RiwayatView = {
    props: {
        riwayatState: { type: Object, required: true },
        paginatedRiwayat: { type: Array, required: true },
        riwayatTotalPages: { type: Number, required: true },
        riwayatFilteredSantriOptions: { type: Array, required: true },
        riwayatSelectedSantriName: { type: String, required: true },
        filterCounts: { type: Object, default: () => ({}) }, // Optional
        activeFilterCount: { type: Number, default: 0 }, // Optional
        userSession: { type: Object, required: true },
        appConfig: { type: Object, required: true },
        santriByLetter: { type: Array, default: () => [] },

        // Methods passed as props
        formatDateLong: Function,
        formatTime: Function,
        getSantriName: Function,
        getJuzFromPage: Function,
        selectRiwayatSantri: Function,
        toggleSelect: Function,
        toggleSelectAll: Function,
        deleteSelected: Function,
        toggleActionMenu: Function,
        closeActionMenu: Function,
        editRiwayat: Function,
        deleteRiwayat: Function,
        setQuickDateFilter: Function,
        resetAllFilters: Function,
        removeFilter: Function,
        loading: { type: Boolean, default: false }
    },
    setup(props, { emit }) {
        const { ref, reactive, computed, watch } = Vue;
        const isCalendarOpen = ref(false);
        const calendarViewDate = ref(new Date());

        const tempRange = reactive({
            start: props.riwayatState.startDate,
            end: props.riwayatState.endDate
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

        const getDaysInMonth = (year, month) => {
            const date = new Date(year, month, 1);
            const days = [];
            while (date.getMonth() === month) {
                days.push(new Date(date));
                date.setDate(date.getDate() + 1);
            }
            return days;
        };

        const calendars = computed(() => {
            const leftMonth = calendarViewDate.value.getMonth();
            const leftYear = calendarViewDate.value.getFullYear();
            const createMonthData = (y, m) => {
                const days = getDaysInMonth(y, m);
                const firstDayIdx = days[0].getDay();
                const paddedDays = Array(firstDayIdx).fill(null).concat(days);
                return {
                    name: (window.monthNames || [])[m] || 'Month',
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
            props.riwayatState.startDate = tempRange.start;
            props.riwayatState.endDate = finalEnd;
            isCalendarOpen.value = false;
        };

        const moveMonth = (delta) => {
            const d = new Date(calendarViewDate.value);
            d.setMonth(d.getMonth() + delta);
            calendarViewDate.value = d;
        };

        // Watch for custom filter to open calendar
        watch(() => props.riwayatState.quickDateFilter, (newVal) => {
            if (newVal === 'custom') {
                tempRange.start = props.riwayatState.startDate;
                tempRange.end = props.riwayatState.endDate;
                isCalendarOpen.value = true;
            }
        });

        // --- Long Press / Bulk Selection Logic (Touch-friendly) ---
        let pressTimer = null;
        let startX = 0, startY = 0;
        const isLongPressTriggered = ref(false);

        const handleStart = (e, id) => {
            isLongPressTriggered.value = false;
            
            // Koordinat awal (Deteksi scroll vs click)
            if (e.type === 'touchstart') {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }

            // Mulai Timer Long Press jika belum dalam mode seleksi
            if (props.riwayatState.selectedIds.length === 0) {
                if (pressTimer) clearTimeout(pressTimer);
                pressTimer = setTimeout(() => {
                    isLongPressTriggered.value = true;
                    if (navigator.vibrate) navigator.vibrate(50);
                    props.toggleSelect(id);
                }, 600);
            }
        };

        const handleMove = (e) => {
            if (!pressTimer) return;
            let currentX, currentY;
            if (e.type === 'touchmove') {
                currentX = e.touches[0].clientX;
                currentY = e.touches[0].clientY;
            } else {
                currentX = e.clientX;
                currentY = e.clientY;
            }

            // Jika geser lebih dari 10px, anggap sedang scroll, batalkan long press
            const dist = Math.hypot(currentX - startX, currentY - startY);
            if (dist > 10) {
                if (pressTimer) clearTimeout(pressTimer);
            }
        };

        const handleEnd = (id) => {
            if (pressTimer) clearTimeout(pressTimer);
            
            // Jika dalam mode bulk, klik biasa (short) akan melakukan toggle
            if (props.riwayatState.selectedIds.length > 0) {
                if (!isLongPressTriggered.value) {
                    props.toggleSelect(id);
                }
            }
        };

        const handleCancel = () => {
            if (pressTimer) clearTimeout(pressTimer);
        };

        return {
            isCalendarOpen,
            calendarViewDate,
            tempRange,
            calendars,
            handleDateClick,
            isDateInRange,
            isDateSelected,
            applyRange,
            moveMonth,
            formatDateShort,
            // Long Press
            handleStart,
            handleEnd,
            handleCancel
        };
    },
    template: `
    <div class="fade-in space-y-4 pb-24">
        <div class="px-2 flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-bold text-slate-900">Riwayat</h2>
                <p class="text-xs text-slate-500">Murojaah, Ziyadah & Ujian</p>
            </div>
            <!-- Filter Icon Removed (v37) - Replaced by Capsules -->
        </div>

        <!-- Santri Search Dropdown (Like Setoran/Input) -->
        <div class="px-2">
            <div class="relative">
                <label class="text-[10px] font-bold text-slate-400 mb-1 block px-1 uppercase tracking-widest">Santri</label>
                
                <!-- Trigger Button -->
                <button @click="riwayatState.isSantriDropdownOpen = !riwayatState.isSantriDropdownOpen"
                    class="w-full p-3 border rounded-xl text-sm font-bold bg-white text-left flex justify-between items-center transition shadow-sm active:scale-[0.99]"
                    :class="riwayatState.isSantriDropdownOpen ? 'ring-2 ring-primary/20 border-primary' : 'border-slate-200'">
                    <span :class="riwayatState.santriId ? 'text-slate-900' : 'text-slate-400'">
                        {{ riwayatState.santriId ? riwayatSelectedSantriName : '-- Pilih Santri (Semua) --' }}
                    </span>
                    <span class="material-symbols-outlined text-slate-400 transition-transform" :class="{ 'rotate-180': riwayatState.isSantriDropdownOpen }">expand_more</span>
                </button>

                <!-- Dropdown Content -->
                <div v-if="riwayatState.isSantriDropdownOpen"
                    class="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    
                    <!-- Search Input Inside Dropdown -->
                    <div class="p-2 border-b border-slate-50 bg-slate-50/50">
                        <div class="flex items-center gap-2 p-2 rounded-xl border border-slate-200 shadow-sm bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                            <span class="material-symbols-outlined text-slate-400 ml-2">person_search</span>
                            <input type="text" 
                                v-model="riwayatState.santriSearch"
                                placeholder="Cari nama santri..." 
                                class="bg-transparent w-full text-sm font-bold outline-none placeholder:text-slate-400"
                                @click.stop>
                            
                            <!-- Clear Filter Inside Search -->
                            <button v-if="riwayatState.santriId" 
                                @click.stop="selectRiwayatSantri({ santri_id: '' })"
                                class="size-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition mr-1">
                                <span class="material-symbols-outlined text-xs">close</span>
                            </button>
                        </div>
                    </div>

                    <!-- Live Results List -->
                    <div class="max-h-60 overflow-y-auto custom-scrollbar">
                        <!-- All Santri Option -->
                        <div v-if="!riwayatState.santriSearch" @click="selectRiwayatSantri({ santri_id: '' })"
                            class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors group">
                            <p class="text-sm font-bold text-slate-400 group-hover:text-primary">-- Semua Santri --</p>
                        </div>

                        <div v-for="s in riwayatFilteredSantriOptions" :key="s._id"
                            @click="selectRiwayatSantri(s)"
                            class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors group">
                            <p class="text-sm font-bold text-slate-800 group-hover:text-primary">{{ s.full_name }}</p>
                            <p class="text-[10px] text-slate-500">{{ s.santri_id }} &bull; {{ s.kelas || '-' }}</p>
                        </div>
                        
                        <!-- Empty State -->
                        <div v-if="riwayatFilteredSantriOptions.length === 0"
                            class="p-4 text-center text-slate-400 text-xs italic">
                            Santri tidak ditemukan...
                        </div>
                    </div>
                </div>

                <!-- Backdrop to Close -->
                <div v-if="riwayatState.isSantriDropdownOpen" 
                    @click="riwayatState.isSantriDropdownOpen = false" 
                    class="fixed inset-0 z-[90] cursor-default"></div>
            </div>
        </div>
        
        <!-- Quick Period & Category Shortcuts (Capsules) -->
        <div class="px-2 pt-2 pb-2 mt-4 space-y-3">
            <!-- Row 1: Period -->
            <div class="flex gap-2 overflow-x-auto scrollbar-custom scroll-smooth pb-2">
                <button v-for="tag in [
                    { id: '', label: 'Semua' },
                    { id: 'today', label: 'Hari Ini' },
                    { id: 'yesterday', label: 'Kemarin' },
                    { id: 'last7', label: '7 Hari' },
                    { id: 'month', label: 'Bulan Ini' },
                    { id: 'last30', label: '30 Hari' },
                    { id: 'custom', label: 'Custom' }
                ]" :key="tag.id"
                    @click="tag.id === 'custom' ? isCalendarOpen = true : setQuickDateFilter(tag.id)"
                    class="px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border"
                    :class="riwayatState.quickDateFilter === tag.id ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'">
                    {{ tag.label }}
                </button>
            </div>

            <!-- Row 2: Category (Simplified, no more modal needed!) -->
            <div class="flex gap-2 overflow-x-auto scrollbar-custom scroll-smooth pb-2">
                <button v-for="cat in [
                    { id: '', label: 'Semua' },
                    { id: 'setoran', label: 'Setoran' },
                    { id: 'sabaq', label: 'Sabaq' },
                    { id: 'sabqi', label: 'Sabqi' },
                    { id: 'manzil', label: 'Manzil' },
                    { id: 'tilawah', label: 'Tilawah' },
                    { id: 'ujian', label: 'Ujian' },
                    { id: 'pelanggaran', label: 'Pelanggaran' }
                ]" :key="cat.id"
                    @click="riwayatState.category = cat.id"
                    class="px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border"
                    :class="riwayatState.category === cat.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'">
                    {{ cat.label }}
                </button>
            </div>
        </div>

        <!-- Active Filters Summary (Optional - shows when filters are active) -->
        <div v-if="activeFilterCount > 0" class="mx-2 text-xs text-slate-500 flex items-center gap-2">
            <span class="font-bold">Filter aktif:</span>
            <span v-if="riwayatState.category" class="text-slate-700">
                {{ 
                    riwayatState.category === 'setoran' ? 'Setoran' :
                    riwayatState.category === 'sabaq' ? 'Sabaq' :
                    riwayatState.category === 'sabqi' ? 'Sabqi' :
                    riwayatState.category === 'manzil' ? 'Manzil' :
                    riwayatState.category === 'tilawah' ? 'Tilawah' :
                    riwayatState.category === 'ujian' ? 'Ujian' : 'Pelanggaran'
                }}
            </span>
            <span v-if="riwayatState.quickDateFilter || riwayatState.startDate">
                <span v-if="riwayatState.quickDateFilter === 'today'">• Hari Ini</span>
                <span v-else-if="riwayatState.quickDateFilter === 'week'">• Minggu Ini</span>
                <span v-else-if="riwayatState.quickDateFilter === 'month'">• Bulan Ini</span>
                <span v-else>• {{ riwayatState.startDate }} - {{ riwayatState.endDate }}</span>
            </span>
            <span v-if="riwayatState.santriId" class="max-w-[120px] truncate">
                • {{ riwayatSelectedSantriName }}
            </span>
        </div>



        <div class="bg-white rounded-xl border shadow-sm overflow-hidden mb-20 mx-2">
            <!-- Bulk Action Bar (Strictly Admin/Guru) -->
            <div v-if="userSession && riwayatState.selectedIds.length > 0 && (userSession.role === 'admin' || userSession.role === 'guru')"
                class="p-2 pl-4 bg-red-50 border-b border-red-100 flex items-center gap-2 animate-fade-in">
                <button @click="deleteSelected"
                    class="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-700 transition flex items-center gap-1 shadow-sm">
                    <span class="material-symbols-outlined text-sm">delete</span>
                    Hapus ({{ riwayatState.selectedIds.length }})
                </button>
                <button @click="riwayatState.selectedIds = []"
                    class="text-xs bg-white text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-50 transition shadow-sm">
                    Batal
                </button>
            </div>
        </div>

        <!-- List Content (Skeleton or Data) -->
        <div v-if="loading" class="px-2 space-y-3">
            <div v-for="i in 5" :key="i" class="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 animate-pulse">
                <div class="skeleton size-10 rounded-xl"></div>
                <div class="flex-1 space-y-2">
                    <div class="skeleton-text w-3/4 h-3 bg-slate-100 rounded"></div>
                    <div class="skeleton-text w-1/2 h-2 bg-slate-50 rounded"></div>
                </div>
            </div>
        </div>

        <div v-else class="space-y-4">
            <!-- Table Container (Desktop Friendly / Responsive List) -->
            <div class="px-0 relative">
                <div class="px-2 space-y-3">
                    <div v-for="item in paginatedRiwayat" :key="item._id" 
                        class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all active:scale-[0.98] cursor-pointer touch-pan-y select-none"
                        :class="{
                            'z-40': riwayatState.activeActionId === item._id, 
                            'bg-blue-50/40 border-blue-200 shadow-md': riwayatState.selectedIds.includes(item._id)
                        }"
                        @mousedown="handleStart($event, item._id)"
                        @mouseup="handleEnd(item._id)"
                        @mouseleave="handleCancel"
                        @touchstart="handleStart($event, item._id)"
                        @touchmove="handleMove($event)"
                        @touchend="handleEnd(item._id)"
                        @touchcancel="handleCancel">
                        
                        <!-- Checkbox Indicator -->
                        <div v-if="riwayatState.selectedIds.includes(item._id)" class="absolute top-0 right-0 p-1.5 bg-blue-500 text-white rounded-bl-xl shadow-sm z-10 animate-in zoom-in duration-200">
                            <span class="material-symbols-outlined text-xs font-black">check</span>
                        </div>

                        <div class="flex items-center gap-4">
                            <!-- Category Icon -->
                            <div class="size-10 rounded-xl flex items-center justify-center border transition-colors shrink-0"
                                :class="[
                                    item.__cat === 'pelanggaran' ? 'bg-red-50 border-red-100 text-red-500' :
                                    item.__cat === 'ujian' ? 'bg-amber-50 border-amber-100 text-amber-500' :
                                    'bg-blue-50 border-blue-100 text-blue-500'
                                ]">
                                <span class="material-symbols-outlined text-xl">{{
                                    item.__cat === 'pelanggaran' ? 'warning' :
                                    item.__cat === 'ujian' ? 'assignment' :
                                    (item.setoran_type === 'Sabaq' ? 'menu_book' : (item.setoran_type === 'Manzil' ? 'auto_stories' : 'auto_graph'))
                                }}</span>
                            </div>

                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-start mb-0.5">
                                    <h4 class="text-sm font-black text-slate-800 truncate">{{ getSantriName(item.santri_id) }}</h4>
                                    <span class="text-[9px] font-bold text-slate-400 whitespace-nowrap ml-2">{{ formatDateLong(item.created_at || item.timestamp) }}</span>
                                </div>
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-[10px] font-black uppercase tracking-wider"
                                        :class="[
                                            item.__cat === 'pelanggaran' ? 'text-red-500' :
                                            item.__cat === 'ujian' ? 'text-amber-500' :
                                            'text-blue-500'
                                        ]">
                                        {{ item.__cat === 'pelanggaran' ? 'Pelanggaran' : (item.setoran_type || (item.type === 'hafalan_exam' ? 'Ujian H.' : 'Ujian')) }}
                                    </span>
                                    <span class="text-[10px] text-slate-300">•</span>
                                    <span class="text-[10px] font-bold text-slate-500">{{ formatTime(item.created_at || item.timestamp) }}</span>
                                </div>
                                
                                <p class="text-[11px] text-slate-500 leading-snug line-clamp-1">
                                    <template v-if="item.__cat === 'setoran'">
                                        {{ item.setoran_type === 'Sabaq' ? (item.surah_from_latin ? item.surah_from_latin.replace(/^\d+\.\s*/, '') : '-') + ' / ' + item.pages + ' Hal' : (item.setoran_type === 'Manzil' ? 'Hal ' + (item.page_from || '-') + ' - ' + (item.page_to || '-') : (item.tilawah_mode === 'juz' ? 'Juz ' + item.juz_from + '-' + item.juz_to : 'Hal ' + item.page_from + '-' + item.page_to)) }}
                                    </template>
                                    <template v-else-if="item.__cat === 'ujian'">
                                        {{ (item.detail || '-').replace('menyetorkan hafalan', 'selesai') }}
                                    </template>
                                    <template v-else-if="item.__cat === 'pelanggaran'">
                                        {{ item.description || '-' }}
                                    </template>
                                </p>
                            </div>

                            <div class="shrink-0 text-right ml-2 min-w-[3rem]">
                                <div v-if="item.__cat === 'setoran' && item.setoran_type !== 'Tilawah'" class="text-xs font-black"
                                    :class="[
                                        (item.grade === 'A+' || item.grade === 'A') ? 'text-blue-600' : 
                                        (item.grade === 'B+' || item.grade === 'B') ? 'text-emerald-600' : 
                                        (item.grade === 'B-') ? 'text-amber-500' :
                                        (item.grade === 'C') ? 'text-red-500' : 'text-slate-500'
                                    ]">
                                    Grade {{ item.grade }}
                                </div>
                                <div v-else-if="item.__cat === 'ujian'" class="text-xs font-black"
                                    :class="[
                                        (item.score >= 80) ? 'text-blue-600' : 
                                        (item.score >= 75) ? 'text-emerald-600' : 
                                        (item.score >= 70) ? 'text-amber-500' : 'text-red-500'
                                    ]">
                                    Nilai: {{ item.score }}
                                </div>
                                <div v-else-if="item.__cat === 'pelanggaran'" class="text-xs font-black text-red-600">
                                    -{{ item.points || 0 }} Poin
                                </div>
                            </div>
                            
                            <button v-if="userSession && (userSession.role === 'admin' || userSession.role === 'guru' || ((userSession.role === 'santri' || userSession.role === 'wali') && appConfig.isHolidayMode))" 
                                @click.stop="toggleActionMenu(item._id)"
                                class="size-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-50 hover:text-primary transition-all ml-1">
                                <span class="material-symbols-outlined text-lg">more_vert</span>
                            </button>
                        </div>

                        <!-- Action Popup -->
                        <div v-if="riwayatState.activeActionId === item._id"
                            class="absolute right-4 top-12 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 w-36 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <button @click="editRiwayat(item); closeActionMenu()"
                                class="px-4 py-3 hover:bg-blue-50 text-[11px] font-bold text-slate-700 flex items-center gap-2 w-full text-left transition-colors">
                                <span class="material-symbols-outlined text-base text-blue-500">edit</span> Edit Data
                            </button>
                            <button @click="deleteRiwayat(item); closeActionMenu()"
                                class="px-4 py-3 hover:bg-red-50 text-[11px] font-bold text-red-600 flex items-center gap-2 w-full text-left border-t border-slate-50 transition-colors">
                                <span class="material-symbols-outlined text-base text-red-400">delete</span> Hapus Data
                            </button>
                        </div>
                    </div>
                </div>

                <div v-if="paginatedRiwayat.length === 0" class="px-4 py-20 text-center">
                    <div class="flex flex-col items-center">
                        <span class="material-symbols-outlined text-slate-200 text-5xl mb-2">history</span>
                        <p class="text-slate-400 font-bold text-xs italic">Belum ada riwayat data...</p>
                    </div>
                </div>
            </div>

            <!-- Pagination -->
            <div class="p-4 flex flex-col items-center">
                <div class="flex items-center gap-4">
                    <button @click="riwayatState.page--" :disabled="riwayatState.page === 1"
                        class="size-8 rounded-lg border bg-white flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm active:scale-90">
                        <span class="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border border-slate-100 px-4 py-1.5 rounded-full shadow-sm">
                        Hal {{ riwayatState.page }} <span class="mx-1 opacity-30">/</span> {{ riwayatTotalPages || 1 }}
                    </span>
                    <button @click="riwayatState.page++" :disabled="riwayatState.page >= riwayatTotalPages"
                        class="size-8 rounded-lg border bg-white flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm active:scale-90">
                        <span class="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Date Range Picker Modal (Same as Rekap) -->
        <teleport to="body">
            <div v-if="isCalendarOpen" 
                class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
                style="z-index: 100;"
                @click.self="isCalendarOpen = false">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
                    <div class="p-6">
                        <div v-for="cal in calendars" :key="cal.name" class="space-y-4">
                            <div class="flex items-center justify-between mb-2">
                                <button @click="moveMonth(-1)" class="p-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                                    <span class="material-symbols-outlined text-sm">chevron_left</span>
                                </button>
                                <div class="text-center flex-1">
                                    <h3 class="font-black text-slate-800 text-sm tracking-tight">{{ cal.name }} {{ cal.year }}</h3>
                                </div>
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
