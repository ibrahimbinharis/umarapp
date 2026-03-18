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
        removeFilter: Function
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
            formatDateShort
        };
    },
    template: `
    <div class="fade-in space-y-4 pb-24">
        <div class="px-2 flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-bold text-slate-900">Riwayat</h2>
                <p class="text-xs text-slate-500">Murojaah, Ziyadah & Ujian</p>
            </div>
            <!-- Filter Icon Button -->
            <button @click="riwayatState.isFilterOpen = !riwayatState.isFilterOpen"
                class="relative size-10 rounded-full flex items-center justify-center transition text-slate-600 hover:opacity-70">
                <span class="material-symbols-outlined">tune</span>
                <span v-if="activeFilterCount > 0" 
                    class="absolute -top-1 -right-1 size-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {{ activeFilterCount }}
                </span>
            </button>
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

        <!-- Filter Popup/Modal - Teleported to body -->
        <teleport to="body">
            <div v-if="riwayatState.isFilterOpen" 
                class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 animate-in fade-in duration-200"
                style="z-index: 9999;"
                @click.self="riwayatState.isFilterOpen = false">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mt-20 animate-in slide-in-from-top-4 duration-200" @click.stop>
                    <!-- Header -->
                    <div class="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 class="font-bold text-slate-900">Filter Riwayat</h3>
                        <button @click="riwayatState.isFilterOpen = false"
                            class="size-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition">
                            <span class="material-symbols-outlined text-slate-400">close</span>
                        </button>
                    </div>

                    <!-- Filter Content -->
                    <div class="p-4 space-y-4" style="max-height: 60vh; overflow-y: visible;">
                        <!-- Category Dropdown -->
                        <div>
                            <label class="text-xs font-bold text-slate-600 mb-2 block">Kategori</label>
                            <select v-model="riwayatState.category"
                                class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none">
                                <option value="">Semua ({{ filterCounts.all }})</option>
                                <option value="setoran">Setoran ({{ filterCounts.setoran }})</option>
                                <option value="sabaq">Sabaq ({{ filterCounts.sabaq }})</option>
                                <option value="sabqi">Sabqi ({{ filterCounts.sabqi }})</option>
                                <option value="manzil">Manzil ({{ filterCounts.manzil }})</option>
                                <option value="tilawah">Tilawah ({{ filterCounts.tilawah }})</option>
                                <option value="ujian">Ujian ({{ filterCounts.ujian }})</option>
                                <option value="pelanggaran">Pelanggaran ({{ filterCounts.pelanggaran }})</option>
                            </select>
                        </div>

                        <!-- Date Range Dropdown -->
                        <div>
                            <label class="text-xs font-bold text-slate-600 mb-2 block">Periode</label>
                            <select v-model="riwayatState.quickDateFilter" @change="setQuickDateFilter(riwayatState.quickDateFilter)"
                                class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none">
                                <option value="">Semua Waktu</option>
                                <option value="today">Hari Ini</option>
                                <option value="week">Minggu Ini</option>
                                <option value="month">Bulan Ini</option>
                                <option value="custom">Pilih Tanggal...</option>
                            </select>
                        </div>

                        <!-- Custom Date Range Display (Trigger for Calendar) -->
                        <div v-if="riwayatState.quickDateFilter === 'custom'" 
                            @click="isCalendarOpen = true; tempRange.start = riwayatState.startDate; tempRange.end = riwayatState.endDate"
                            class="bg-white border border-slate-200 px-3 py-2 rounded-lg cursor-pointer hover:border-slate-300 transition animate-in fade-in slide-in-from-top-2 duration-200">
                            <div class="text-sm font-bold text-slate-700 text-center">
                                {{ formatDateShort(riwayatState.startDate) }} - {{ formatDateShort(riwayatState.endDate || riwayatState.startDate) }}
                            </div>
                        </div>

                        <!-- Santri Dropdown -->
                        <div>
                            <label class="text-xs font-bold text-slate-600 mb-2 block">Santri</label>
                            <div class="relative" style="z-index: 100;">
                                <button
                                    @click.stop="riwayatState.isSantriDropdownOpen = !riwayatState.isSantriDropdownOpen"
                                    class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white text-left flex justify-between items-center transition hover:border-slate-300">
                                    <span :class="riwayatState.santriId ? 'text-slate-900' : 'text-slate-400'">
                                        {{ riwayatState.santriId ? riwayatSelectedSantriName : 'Semua Santri' }}
                                    </span>
                                    <span class="material-symbols-outlined text-slate-400 text-lg">expand_more</span>
                                </button>

                                <!-- Santri Dropdown -->
                                <div v-if="riwayatState.isSantriDropdownOpen"
                                    class="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                                    style="z-index: 9999;">
                                    <div class="p-2 border-b border-slate-50">
                                        <div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                                            <span class="material-symbols-outlined text-slate-400 text-lg">search</span>
                                            <input v-model="riwayatState.santriSearch" type="text"
                                                placeholder="Cari nama..."
                                                class="bg-transparent w-full text-sm font-bold outline-none placeholder:font-normal text-slate-700"
                                                @click.stop>
                                        </div>
                                    </div>
                                    <div class="max-h-48 overflow-y-auto custom-scrollbar">
                                        <div @click="selectRiwayatSantri({ santri_id: '' })"
                                            class="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors">
                                            <p class="text-sm font-bold text-slate-500 italic">Semua Santri</p>
                                        </div>
                                        <div v-for="s in riwayatFilteredSantriOptions" :key="s._id"
                                            @click="selectRiwayatSantri(s)"
                                            class="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
                                            <p class="text-sm font-bold text-slate-800">{{ s.full_name }}</p>
                                            <p class="text-[10px] text-slate-500">{{ s.santri_id }} &bull; {{ s.kelas || '-' }}</p>
                                        </div>
                                        <div v-if="riwayatFilteredSantriOptions.length === 0"
                                            class="p-4 text-center text-slate-400 text-xs italic">
                                            Tidak ditemukan
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Actions -->
                    <div class="p-4 border-t border-slate-100 flex gap-2">
                        <button @click="resetAllFilters"
                            class="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition">
                            Reset
                        </button>
                        <button @click="riwayatState.isFilterOpen = false"
                            class="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition">
                            Terapkan
                        </button>
                    </div>
                </div>
            </div>
        </teleport>

        <div class="bg-white rounded-xl border shadow-sm overflow-hidden mb-20 mx-2">
            <!-- Bulk Action Bar (Strictly Admin/Guru) -->
            <div v-if="riwayatState.selectedIds.length > 0 && (userSession.role === 'admin' || userSession.role === 'guru')"
                class="p-2 pl-4 bg-red-50 border-b border-red-100 flex items-center animate-fade-in">
                <button @click="deleteSelected"
                    class="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-700 transition flex items-center gap-1 shadow-sm">
                    <span class="material-symbols-outlined text-sm">delete</span>
                    {{ riwayatState.selectedIds.length }} Data
                </button>
            </div>
            
            <div class="overflow-x-auto no-scrollbar">
                <table class="w-full text-left border-collapse min-w-[600px]">
                    <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-100">
                        <tr>
                             <th v-if="userSession.role === 'admin' || userSession.role === 'guru'" class="px-4 py-4 w-12 text-center">
                                <input type="checkbox" @change="toggleSelectAll(paginatedRiwayat)"
                                    :checked="paginatedRiwayat.length > 0 && paginatedRiwayat.every(i => riwayatState.selectedIds.includes(i._id))"
                                    class="rounded border-slate-300 text-primary focus:ring-primary size-4">
                            </th>
                            <th class="px-4 py-4 w-24">Waktu</th>
                            <th class="px-4 py-4">Santri</th>
                            <th class="px-4 py-4 w-32 text-center">Kategori</th>
                            <th class="px-4 py-4">Keterangan</th>
                            <th class="px-4 py-4 w-20 text-center">Hasil</th>
                            <th v-if="userSession.role === 'admin' || userSession.role === 'guru' || ((userSession.role === 'santri' || userSession.role === 'wali') && appConfig.isHolidayMode)" class="px-4 py-4 w-12 text-center font-bold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        <tr v-for="item in paginatedRiwayat" :key="item._id"
                            class="hover:bg-slate-50/80 transition-colors group"
                            :class="item.__cat === 'pelanggaran' ? 'bg-red-50/20' : ''">
                            
                            <!-- Checkbox (Strictly Admin/Guru) -->
                            <td v-if="userSession.role === 'admin' || userSession.role === 'guru'" class="px-4 py-4 text-center">
                                <input type="checkbox"
                                    :checked="riwayatState.selectedIds.includes(item._id)"
                                    @change="toggleSelect(item._id)"
                                    class="rounded border-slate-300 text-primary focus:ring-primary size-4">
                            </td>

                            <!-- Waktu -->
                            <td class="px-4 py-4">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{{ formatDateLong(item.date).split('<br>')[0] }}</p>
                                <p class="text-xs font-bold text-slate-700 mt-0.5">{{ formatTime(item.time) }}</p>
                            </td>

                            <!-- Santri -->
                            <td class="px-4 py-4">
                                <div class="flex flex-col">
                                    <span class="font-bold text-slate-800 text-xs uppercase tracking-tight line-clamp-1">
                                        {{ getSantriName(item.santri_id) }}
                                    </span>
                                    <span class="text-[10px] text-slate-400 font-medium">ID: {{ item.santri_id }}</span>
                                </div>
                            </td>

                            <!-- Jenis / Kategori Badge -->
                            <td class="px-4 py-4 text-center">
                                <span :class="[
                                    'text-[10px] font-black uppercase tracking-wider',
                                    item.__cat === 'pelanggaran' ? 'text-red-600' :
                                    item.__cat === 'ujian' ? 'text-amber-600' :
                                    'text-blue-600'
                                ]">
                                    <div class="flex flex-col items-center">
                                        <span>{{
                                            item.__cat === 'pelanggaran' ? 'Pelanggaran' :
                                            item.__cat === 'ujian' ? (item.type === 'hafalan_exam' ? 'Ujian H.' : 'Ujian') :
                                            (item.category || item.setoran_type || 'Setoran')
                                        }}</span>
                                        <span v-if="item.is_holiday && !(item.category && item.category.includes('(Mandiri)'))" 
                                            class="text-[7px] opacity-70 mt-0.5">(Liburan)</span>
                                    </div>
                                </span>
                            </td>

                            <!-- Detail / Keterangan -->
                            <td class="px-4 py-4">
                                <div class="text-xs text-slate-600 leading-relaxed">
                                    <div v-if="item.__cat === 'setoran'">
                                        <template v-if="item.setoran_type === 'Sabaq'">
                                            <span class="font-bold text-slate-800">{{ item.surah_from_latin ? item.surah_from_latin.replace(/^\d+\.\s*/, '') : '-' }}</span>
                                            <span class="mx-1 text-slate-300">/</span>
                                            <span class="text-slate-500">{{ item.pages }} Hal</span>
                                        </template>
                                        <template v-else-if="item.setoran_type === 'Manzil'">
                                            <span class="font-bold text-slate-800">Hal {{ item.page_from || '-' }} - {{ item.page_to || '-' }}</span>
                                            <div class="text-[10px] text-slate-400">Juz {{ getJuzFromPage(item.page_from) }} - {{ getJuzFromPage(item.page_to) }}</div>
                                        </template>
                                        <template v-else-if="item.setoran_type === 'Tilawah'">
                                            <span class="font-bold text-slate-800">
                                                {{ item.tilawah_mode === 'juz' ? 'Juz ' + item.juz_from + '-' + item.juz_to : 'Hal ' + item.page_from + '-' + item.page_to }}
                                            </span>
                                        </template>
                                        <template v-else>
                                            <span class="font-bold text-slate-800">{{ item.pages }} Halaman</span>
                                        </template>
                                    </div>
                                    <div v-else-if="item.__cat === 'ujian'">
                                        <div class="font-bold text-slate-800 truncate">{{ item.type === 'hafalan_exam' ? 'Ujian Hafalan' : item.type }}</div>
                                        <div class="text-[10px] text-slate-400 italic">{{ (item.detail || '-').replace('menyetorkan hafalan', 'selesai') }}</div>
                                    </div>
                                    <div v-else-if="item.__cat === 'pelanggaran'">
                                        <div class="font-bold text-red-600 text-[11px]">{{ item.description || '-' }}</div>
                                    </div>
                                </div>
                            </td>

                            <!-- Nilai / Hasil -->
                            <td class="px-4 py-4 text-center">
                                <div v-if="item.__cat === 'setoran'" 
                                    class="inline-flex items-center justify-center font-black text-sm"
                                    :class="[
                                        (item.grade === 'A+' || item.grade === 'A') ? 'text-blue-600' : 
                                        (item.grade === 'B+' || item.grade === 'B') ? 'text-emerald-600' : 
                                        (item.grade === 'B-') ? 'text-amber-500' :
                                        (item.grade === 'C') ? 'text-red-500' : 
                                        'text-slate-500'
                                    ]">
                                    {{ (item.category === 'Tilawah' || item.setoran_type === 'Tilawah') ? '-' : item.grade }}
                                </div>
                                <div v-else-if="item.__cat === 'ujian'" 
                                    class="inline-flex items-center justify-center font-black text-sm"
                                    :class="[
                                        (item.score >= 80) ? 'text-blue-600' : 
                                        (item.score >= 75) ? 'text-emerald-600' : 
                                        (item.score >= 70) ? 'text-amber-500' :
                                        'text-red-500'
                                    ]">
                                    {{ item.score }}
                                </div>
                                <div v-else-if="item.__cat === 'pelanggaran'" 
                                    class="inline-flex items-center justify-center font-black text-sm text-red-700">
                                    -{{ item.points || item.poin || 0 }}
                                </div>
                            </td>

                            <!-- Aksi (Strictly Admin/Guru or Santri/Wali in Holiday Mode) -->
                            <td v-if="userSession.role === 'admin' || userSession.role === 'guru' || ((userSession.role === 'santri' || userSession.role === 'wali') && appConfig.isHolidayMode)" class="px-4 py-4 text-center relative">
                                <button @click.stop="toggleActionMenu(item._id)"
                                    class="size-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-primary hover:shadow-sm border border-transparent hover:border-slate-100 transition-all active:scale-90 shadow-none">
                                    <span class="material-symbols-outlined text-lg">more_vert</span>
                                </button>
                                
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
                            </td>
                        </tr>
                        <tr v-if="paginatedRiwayat.length === 0">
                            <td :colspan="userSession?.role === 'wali' ? 5 : 7" class="px-4 py-20 text-center">
                                <div class="flex flex-col items-center">
                                    <span class="material-symbols-outlined text-slate-200 text-5xl mb-2">history</span>
                                    <p class="text-slate-400 font-bold text-xs italic">Belum ada riwayat data...</p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="p-3 border-t border-slate-50 bg-slate-50/30 flex flex-col items-center">
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
                style="z-index: 10000;"
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
