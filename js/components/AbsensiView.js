const AbsensiView = {
    props: {
        absensiState: { type: Object, required: true },
        dailyJadwal: { type: Array, required: true },
        genderFilter: { type: String, required: true },
        absensiDayName: { type: String, required: true },
        getAbsensiForJadwal: { type: Function, required: true },
        getAbsensiSummary: { type: Function, required: true },
        changeAbsensiDate: { type: Function, required: true },
        openAbsensiPage: { type: Function, required: true },
        deleteAbsensi: { type: Function, required: true },
        jurnalList: { type: Array, required: true },
        userSession: { type: Object, default: null },
        setQuickJurnalFilter: { type: Function, required: true },
        moveCalendar: { type: Function, required: true },
        selectCalendarDate: { type: Function, required: true },
        applyCustomRange: { type: Function, required: true },
        calendarWeeks: { type: Array, required: true },
        monthNames: { type: Array, required: true },
        formatDate: { type: Function, required: true },
        uiData: { type: Object, required: true }
    },
    emits: ['update:genderFilter'],
    setup(props) {
        const { computed } = Vue;

        const getBookName = (mapelName) => {
            if (!props.uiData?.mapel) return null;
            const mapel = props.uiData.mapel.find(m => m.name === mapelName);
            return mapel?.book_name || null;
        };

        // Formatter Logic
        const displayDate = computed(() => {
            const dateStr = props.absensiState.dateFilter;
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const dateFormatted = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            return `${props.absensiDayName}, ${dateFormatted}`;
        });

        const formatDateLong = (dateStr) => {
            if(!dateStr) return '';
            
            const d = new Date(dateStr);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            
            const isSameDay = (date1, date2) => {
                return date1.getFullYear() === date2.getFullYear() &&
                       date1.getMonth() === date2.getMonth() &&
                       date1.getDate() === date2.getDate();
            };

            if (isSameDay(d, today)) {
                return 'Hari ini';
            } else if (isSameDay(d, yesterday)) {
                return 'Kemarin';
            }

            return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        };

        const formatDateShort = (dateStr) => {
            if (!dateStr) return '...';
            const [y, m, d] = dateStr.split('-');
            return `${d}/${m}/${y}`;
        };

        const isMyScheduleOnly = Vue.ref(false);

        const setRelativeDate = (offset) => {
            const date = new Date(props.absensiState.dateFilter);
            date.setDate(date.getDate() + offset);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            props.absensiState.dateFilter = `${year}-${month}-${day}`;
        };

        const displayedJadwal = computed(() => {
            if (!isMyScheduleOnly.value) return props.dailyJadwal;
            const myUsername = props.userSession?.username;
            const myFullName = props.userSession?.full_name;
            if (!myUsername) return props.dailyJadwal;

            return props.dailyJadwal.filter(j => {
                return (j.username && j.username === myUsername) || 
                       (!j.username && j.teacher === myFullName);
            });
        });

        const isToday = computed(() => {
            const dateStr = props.absensiState.dateFilter;
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            return dateStr === todayStr;
        });

        const isYesterday = computed(() => {
            const dateStr = props.absensiState.dateFilter;
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
            return dateStr === yesterdayStr;
        });

        const isTomorrow = computed(() => {
            const dateStr = props.absensiState.dateFilter;
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
            return dateStr === tomorrowStr;
        });

        const setYesterday = () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            props.absensiState.dateFilter = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        };

        const setTomorrow = () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            props.absensiState.dateFilter = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
        };

        const setToday = () => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            props.absensiState.dateFilter = `${year}-${month}-${day}`;
        };

        // --- Back Navigation for Modal (v37) ---
        const handlePopState = (e) => {
            if (props.absensiState.isCalendarOpen) {
                props.absensiState.isCalendarOpen = false;
                props.absensiState.quickJurnalFilter = 'all'; 
            }
        };

        Vue.watch(() => props.absensiState.isCalendarOpen, (newVal) => {
            if (newVal) {
                window.history.pushState({ modal: 'calendar' }, '');
                window.addEventListener('popstate', handlePopState);
            } else {
                window.removeEventListener('popstate', handlePopState);
                // If closed manually (not via popstate), we might need to go back 
                // but checking the state is tricky. Usually, if we're here and 
                // it wasVAL was true, we manually back if history state matches.
                if (window.history.state && window.history.state.modal === 'calendar') {
                    window.history.back();
                }
            }
        });

        Vue.onUnmounted(() => {
            window.removeEventListener('popstate', handlePopState);
        });

        return {
            displayDate,
            setRelativeDate,
            setToday,
            setYesterday,
            setTomorrow,
            formatDateLong,
            isMyScheduleOnly,
            formatDateShort,
            displayedJadwal,
            isToday,
            isYesterday,
            isTomorrow,
            getBookName
        };
    },
    template: `
    <div class="space-y-4 pb-15 fade-in">
        
        <!-- Tabs -->
        <div class="flex p-1 bg-slate-100 rounded-xl mt-4 mx-4 shadow-sm relative z-30">
            <button @click="absensiState.absensiTab = 'absensi'"
                :class="absensiState.absensiTab === 'absensi' ? 'bg-white text-primary shadow font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'"
                class="flex-1 py-2 text-sm rounded-lg transition-all flex justify-center items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">how_to_reg</span> Absensi
            </button>
            <button @click="absensiState.absensiTab = 'jurnal'"
                :class="absensiState.absensiTab === 'jurnal' ? 'bg-white text-primary shadow font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'"
                class="flex-1 py-2 text-sm rounded-lg transition-all flex justify-center items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">menu_book</span> Jurnal
            </button>
        </div>

        <!-- SHARED GENDER FILTER (v37) -->
        <div class="px-4">
            <div class="flex p-1 bg-slate-200/50 rounded-xl border border-slate-100 shadow-sm">
                <button @click="$emit('update:genderFilter', 'L')"
                    :class="genderFilter === 'L' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-600'"
                    class="flex-1 py-2 text-xs rounded-lg transition-all flex items-center justify-center gap-2">
                    Putra
                </button>
                <button @click="$emit('update:genderFilter', 'P')"
                    :class="genderFilter === 'P' ? 'bg-white text-pink-500 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-600'"
                    class="flex-1 py-2 text-xs rounded-lg transition-all flex items-center justify-center gap-2">
                    Putri
                </button>
            </div>
        </div>

        <!-- ABSENSI TAB CONTENT -->
        <div v-if="absensiState.absensiTab === 'absensi'" class="px-4">
            <!-- Header & Date Nav (Refactored for Desktop) -->
            <div class="md:sticky md:top-[-1px] md:z-[50] md:bg-slate-50 md:pb-4">
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
                    <!-- Date Navigator -->
                    <div class="flex items-center justify-between bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <button @click="changeAbsensiDate(-1)" 
                            class="size-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-500 hover:bg-white hover:text-primary transition active:scale-95">
                            <span class="material-symbols-outlined">chevron_left</span>
                        </button>
                        
                        <div class="text-center flex-1">
                            <span class="font-bold text-slate-800 text-sm block">{{ displayDate }}</span>
                        </div>

                        <button @click="changeAbsensiDate(1)" 
                            class="size-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-500 hover:bg-white hover:text-primary transition active:scale-95">
                            <span class="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>

                    <!-- Quick Filters (Capsule Style) -->
                    <div class="flex items-center lg:justify-center gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
                        <button @click="isMyScheduleOnly = !isMyScheduleOnly" 
                            :class="isMyScheduleOnly ? 'bg-amber-500 text-white border-amber-500 shadow-amber-200' : 'bg-white text-slate-500 border-slate-100'"
                            class="shrink-0 px-4 py-1.5 rounded-full border text-[11px] font-bold transition active:scale-95 shadow-sm">
                            Jadwalku
                        </button>
                        <div class="w-px h-4 bg-slate-200 shrink-0 mx-1"></div>
                        <button @click="setToday" 
                            :class="isToday ? 'bg-primary text-white border-primary shadow-blue-200' : 'bg-white text-slate-500 border-slate-100'"
                            class="shrink-0 px-4 py-1.5 rounded-full border text-[11px] font-bold transition active:scale-95 shadow-sm">
                            Hari Ini
                        </button>
                        <button @click="setTomorrow" 
                            :class="isTomorrow ? 'bg-primary text-white border-primary shadow-blue-200' : 'bg-white text-slate-500 border-slate-100'"
                            class="shrink-0 px-4 py-1.5 rounded-full border text-[11px] font-bold transition active:scale-95 shadow-sm">
                            Besok
                        </button>
                        <button @click="setYesterday" 
                            :class="isYesterday ? 'bg-primary text-white border-primary shadow-blue-200' : 'bg-white text-slate-500 border-slate-100'"
                            class="shrink-0 px-4 py-1.5 rounded-full border text-[11px] font-bold transition active:scale-95 shadow-sm">
                            Kemarin
                        </button>
                    </div>
                </div>
            </div>

            <div class="space-y-4 pt-4">
                <!-- Schedule List -->
                <div v-if="displayedJadwal.length > 0" class="lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 space-y-3 lg:space-y-0 text-left">
                    <div v-for="item in displayedJadwal" :key="item._id"
                        @click="openAbsensiPage(item)"
                        class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-blue-200 cursor-pointer transition relative overflow-hidden">
                        
                        <!-- Status Indicator Strip -->
                        <div class="absolute left-0 top-0 bottom-0 w-1"
                            :class="getAbsensiForJadwal(item._id) ? 'bg-emerald-500' : 'bg-slate-200'"></div>

                        <div class="pl-3 space-y-1">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-bold text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded">{{ item.time }}</span>
                                <span v-if="getAbsensiForJadwal(item._id)" class="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                                    <span class="material-symbols-outlined text-[12px]">check_circle</span> Sudah
                                </span>
                            </div>
                            
                            <h4 class="font-bold text-slate-800 text-sm">{{ item.mapel }}</h4>
                            <div class="flex flex-col gap-0.5 mt-0.5">
                                <p v-if="getBookName(item.mapel)" class="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                    <span class="material-symbols-outlined text-[12px]">auto_stories</span>
                                    {{ getBookName(item.mapel) }}
                                </p>
                                <p class="text-[10px] text-slate-500">{{ item.class_name }} &bull; {{ item.teacher }}</p>
                            </div>
                        </div>

                        <div class="flex flex-col items-end gap-1">
                            <span class="material-symbols-outlined text-slate-300 group-hover:text-primary transition">chevron_right</span>
                            
                            <!-- Summary Badge if Exists -->
                            <div v-if="getAbsensiForJadwal(item._id) && getAbsensiForJadwal(item._id).details" 
                                class="flex gap-1 text-[9px] font-black uppercase">
                                <span class="bg-emerald-50 text-emerald-600 px-1 rounded">{{ getAbsensiSummary(getAbsensiForJadwal(item._id).details).H }}H</span>
                                <span class="bg-yellow-50 text-yellow-600 px-1 rounded">{{ getAbsensiSummary(getAbsensiForJadwal(item._id).details).S }}S</span>
                                <span class="bg-blue-50 text-blue-600 px-1 rounded">{{ getAbsensiSummary(getAbsensiForJadwal(item._id).details).I }}I</span>
                                <span class="bg-red-50 text-red-600 px-1 rounded">{{ getAbsensiSummary(getAbsensiForJadwal(item._id).details).A }}A</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-if="dailyJadwal.length === 0" class="py-12 text-center">
                    <div class="bg-slate-50 size-16 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span class="material-symbols-outlined text-3xl text-slate-300">event_busy</span>
                    </div>
                    <p class="text-slate-400 font-bold text-sm">Tidak ada jadwal {{ genderFilter === 'L' ? 'Putra' : 'Putri' }} hari ini</p>
                    <p class="text-[11px] text-slate-400 mt-1">Coba hari lain atau ubah filter gender.</p>
                </div>
            </div>
        </div>

        <!-- JURNAL TAB CONTENT (TIMELINE) -->
        <div v-else-if="absensiState.absensiTab === 'jurnal'" class="px-2 md:px-6">
            
            <!-- Jurnal Filters (Capsules) -->
            <div class="mb-6 pt-4">
                <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 px-2">
                    <button v-for="f in [
                        {id: 'month', label: 'Bulan Ini'},
                        {id: 'today', label: 'Hari Ini'},
                        {id: 'yesterday', label: 'Kemarin'},
                        {id: 'last7', label: '7 Hari'},
                        {id: 'last30', label: '30 Hari'},
                        {id: 'all', label: 'Semua'},
                        {id: 'custom', label: 'Custom'}
                    ]" :key="f.id"
                        @click="setQuickJurnalFilter(f.id)"
                        :class="absensiState.quickJurnalFilter === f.id ? 'bg-primary text-white border-primary shadow-blue-200' : 'bg-white text-slate-500 border-slate-100'"
                        class="shrink-0 px-4 py-1.5 rounded-full border text-[11px] font-bold transition active:scale-95 shadow-sm">
                        {{ f.label }}
                    </button>
                </div>

                <!-- Custom Calendar Picker (Modal Popup) -->
                <teleport to="body">
                    <transition name="modal-fade">
                        <div v-if="absensiState.quickJurnalFilter === 'custom' && absensiState.isCalendarOpen" 
                             @click.self="absensiState.quickJurnalFilter = 'all'; absensiState.isCalendarOpen = false"
                             class="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in px-6">
                            
                            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-scale-in">
                                <div class="p-6">
                                    <div class="space-y-4">
                                        <!-- Calendar Header -->
                                        <div class="flex items-center justify-between mb-2">
                                            <button @click="moveCalendar(-1)" 
                                                class="p-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                                                <span class="material-symbols-outlined text-sm">chevron_left</span>
                                            </button>
                                            <div class="text-center flex-1">
                                                <h3 class="font-black text-slate-800 text-sm tracking-tight">
                                                    {{ monthNames[absensiState.viewMonth] }} {{ absensiState.viewYear }}
                                                </h3>
                                            </div>
                                            <button @click="moveCalendar(1)" 
                                                class="p-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                                                <span class="material-symbols-outlined text-sm">chevron_right</span>
                                            </button>
                                        </div>

                                        <!-- Calendar Grid -->
                                        <div class="grid grid-cols-7 gap-y-1 gap-x-1">
                                            <!-- Weekdays -->
                                            <div v-for="d in ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']" :key="d"
                                                class="text-center text-[10px] font-bold text-slate-400 pb-2">{{ d }}</div>
                                            
                                            <!-- Month Days -->
                                            <div v-for="(day, idx) in calendarWeeks" :key="idx" 
                                                @click="day && selectCalendarDate(day.dateStr)"
                                                class="h-9 flex items-center justify-center text-xs font-semibold cursor-pointer transition-all relative rounded-lg border border-transparent"
                                                :class="{
                                                    'pointer-events-none opacity-0': !day,
                                                    'bg-primary text-white shadow-lg z-10': day?.isSelected,
                                                    'bg-blue-50 text-blue-700 font-bold': day?.isInRange,
                                                    'hover:bg-slate-100 text-slate-700': day && !day.isSelected && !day.isInRange,
                                                    'border-primary/20': day?.isToday && !day.isSelected
                                                }">
                                                <span v-if="day">{{ day.day }}</span>
                                                <!-- Today Indicator Dot -->
                                                <div v-if="day?.isToday" class="absolute bottom-1 size-1 rounded-full" 
                                                    :class="day.isSelected ? 'bg-white' : 'bg-primary'"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
                                    <div class="text-[11px] font-black text-slate-700 flex flex-col items-center sm:items-start uppercase tracking-tight">
                                        <span>{{ formatDateShort(absensiState.tempStart) }} — {{ formatDateShort(absensiState.tempEnd) }}</span>
                                    </div>
                                    <div class="flex gap-2 w-full sm:w-auto">
                                        <button @click="absensiState.quickJurnalFilter = 'all'; absensiState.isCalendarOpen = false"
                                            class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition">
                                            Batal
                                        </button>
                                        <button @click="applyCustomRange"
                                            :disabled="!absensiState.tempStart || !absensiState.tempEnd"
                                            :class="(!absensiState.tempStart || !absensiState.tempEnd) ? 'opacity-50 cursor-not-allowed' : ''"
                                            class="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                                            Terapkan
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </transition>
                </teleport>
            </div>

            <div v-if="jurnalList.length > 0" class="relative">
                <!-- Vertical Line -->
                <div class="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200"></div>

                <div class="space-y-6 pt-4 pb-24">
                    <div v-for="j in jurnalList" :key="j._id" class="relative flex flex-col group">
                        
                        <!-- Date Badge -->
                        <div class="w-full shrink-0 flex justify-start z-10 pl-2 pb-2 bg-transparent">
                            <div class="bg-primary text-white text-[9px] md:text-xs font-black px-2.5 py-1 rounded-full shadow-md z-10 text-center whitespace-nowrap">
                                {{ formatDateLong(j.date) }}
                            </div>
                        </div>

                        <!-- Card Content -->
                        <div class="flex-1 pl-12 pr-2 w-full">
                            <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition hover:shadow-md hover:border-blue-100">
                                
                                <!-- Card Header -->
                                <div class="flex flex-col mb-3">
                                    <h4 class="font-black text-slate-800 text-sm md:text-base tracking-tight leading-none mb-1">
                                        {{ j.class_name }} - {{ j.mapel }}
                                    </h4>
                                    <p v-if="getBookName(j.mapel)" class="text-[10px] font-bold text-blue-400 flex items-center gap-1 mb-2">
                                        <span class="material-symbols-outlined text-xs">auto_stories</span>
                                        {{ getBookName(j.mapel) }}
                                    </p>
                                    <div class="flex items-center text-[10px] md:text-xs text-slate-400 gap-2">
                                        <span>Guru: {{ j.teacher_name }}</span>
                                        <span class="material-symbols-outlined text-[4px] mx-1 opacity-50">circle</span>
                                        <span>Oleh: {{ j.input_by_name || j.input_by || 'Sistem' }}</span>
                                    </div>
                                </div>

                                <!-- Jurnal Payloads -->
                                <div class="space-y-2 mb-4 bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                                    <div v-if="j.jurnal_materi" class="flex gap-2 items-start">
                                        <span class="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase shrink-0">Materi</span>
                                        <p class="text-sm text-slate-700 whitespace-pre-wrap leading-tight break-words">{{ j.jurnal_materi }}</p>
                                    </div>
                                    <div v-if="j.jurnal_catatan" class="flex gap-2 items-start">
                                        <span class="text-[9px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded uppercase shrink-0">Catatan</span>
                                        <p class="text-sm text-slate-600 italic whitespace-pre-wrap leading-tight break-words">{{ j.jurnal_catatan }}</p>
                                    </div>
                                </div>

                                <!-- Absensi Badges -->
                                <div v-if="j.details" class="flex flex-wrap gap-2 text-[10px] font-bold uppercase">
                                    <span v-if="getAbsensiSummary(j.details).H > 0" class="bg-emerald-500 text-white px-2 py-1 rounded-md shadow-sm">
                                        H {{ getAbsensiSummary(j.details).H }}
                                    </span>
                                    <span v-if="getAbsensiSummary(j.details).I > 0" class="bg-blue-500 text-white px-2 py-1 rounded-md shadow-sm">
                                        I {{ getAbsensiSummary(j.details).I }}
                                    </span>
                                    <span v-if="getAbsensiSummary(j.details).S > 0" class="bg-amber-500 text-white px-2 py-1 rounded-md shadow-sm">
                                        S {{ getAbsensiSummary(j.details).S }}
                                    </span>
                                    <span v-if="getAbsensiSummary(j.details).A > 0" class="bg-red-500 text-white px-2 py-1 rounded-md shadow-sm">
                                        A {{ getAbsensiSummary(j.details).A }}
                                    </span>
                                </div>

                                <!-- Card Footer Actions -->
                                <div class="mt-4 pt-3 border-t border-slate-50 flex items-center justify-end gap-3">
                                    <button v-if="j.jadwalObj" @click="changeAbsensiDate((new Date(j.date) - new Date(absensiState.dateFilter)) / (1000 * 60 * 60 * 24)); absensiState.absensiTab='absensi'; openAbsensiPage(j.jadwalObj)" 
                                        class="text-[10px] sm:text-xs font-bold text-slate-400 hover:text-blue-500 flex items-center gap-1 transition">
                                        <span class="material-symbols-outlined text-[14px]">edit</span> Perbarui
                                    </button>
                                    <button @click="deleteAbsensi(j._id)" class="text-[10px] sm:text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition">
                                        <span class="material-symbols-outlined text-[14px]">delete</span> Hapus
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- Empty State for Jurnal -->
            <div v-else class="py-20 text-center">
                <div class="bg-slate-100 size-20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                    <span class="material-symbols-outlined text-4xl text-slate-300">menu_book</span>
                </div>
                <h3 class="text-slate-800 font-bold mb-1">Riwayat Jurnal Kosong</h3>
                <p class="text-xs text-slate-400">Jurnal harian yang Anda tulis akan membentuk<br>susunan kronologi di sini.</p>
            </div>
        </div>
    </div>
    `
};
