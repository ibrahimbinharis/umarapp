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
        userSession: { type: Object, default: null }
    },
    emits: ['update:genderFilter'],
    setup(props) {
        const { computed } = Vue;

        // Formatter Logic
        const displayDate = computed(() => {
            const dateStr = props.absensiState.dateFilter;
            if (!dateStr) return '';

            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            if (dateStr === todayStr) {
                return "Hari ini";
            }

            const date = new Date(dateStr);
            const dateFormatted = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            return `${props.absensiDayName}, ${dateFormatted}`;
        });

        // Set date to today
        const setToday = () => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            props.absensiState.dateFilter = `${year}-${month}-${day}`;
        };

        return {
            displayDate,
            setToday
        };
    },
    template: `
    <div class="space-y-4 pb-15 fade-in">
        <!-- Header & Date Nav -->
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4 sticky top-0 z-20">
            <!-- Header Removed -->

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

            <!-- Gender Filter -->
            <div class="flex p-1 bg-slate-100 rounded-lg">
                <button @click="$emit('update:genderFilter', 'L')"
                    :class="genderFilter === 'L' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'"
                    class="flex-1 py-1.5 text-xs rounded-md transition-all">
                    Putra
                </button>
                <button @click="$emit('update:genderFilter', 'P')"
                    :class="genderFilter === 'P' ? 'bg-white text-pink-500 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'"
                    class="flex-1 py-1.5 text-xs rounded-md transition-all">
                    Putri
                </button>
            </div>

            <!-- Today Button -->
            <button @click="setToday" 
                class="w-full py-2 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-primary transition active:scale-95 border border-slate-100">
                <span class="text-xs font-bold">Hari Ini</span>
            </button>
        </div>

        <!-- Schedule List -->
        <div class="space-y-3">
            <div v-for="item in dailyJadwal" :key="item._id"
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
                    <p class="text-xs text-slate-500">{{ item.class_name }} &bull; {{ item.teacher }}</p>
                </div>

                <div class="flex flex-col items-end gap-1">
                    <span class="material-symbols-outlined text-slate-300 group-hover:text-primary transition">chevron_right</span>
                    
                    <!-- Summary Badge if Exists -->
                    <div v-if="getAbsensiForJadwal(item._id) && getAbsensiForJadwal(item._id).details" 
                        class="flex gap-1 text-[9px] font-black uppercase">
                        <!-- Simple summary: just show total present? or H/S/I/A -->
                        <span class="bg-emerald-50 text-emerald-600 px-1 rounded">{{ getAbsensiSummary(getAbsensiForJadwal(item._id).details).H }}H</span>
                        <span class="bg-yellow-50 text-yellow-600 px-1 rounded">{{ getAbsensiSummary(getAbsensiForJadwal(item._id).details).S }}S</span>
                        <span class="bg-blue-50 text-blue-600 px-1 rounded">{{ getAbsensiSummary(getAbsensiForJadwal(item._id).details).I }}I</span>
                        <span class="bg-red-50 text-red-600 px-1 rounded">{{ getAbsensiSummary(getAbsensiForJadwal(item._id).details).A }}A</span>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="dailyJadwal.length === 0" class="py-12 text-center">
                <div class="bg-slate-50 size-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span class="material-symbols-outlined text-3xl text-slate-300">event_busy</span>
                </div>
                <p class="text-slate-400 font-bold text-sm">Tidak ada jadwal {{ genderFilter === 'L' ? 'Putra' : 'Putri' }} hari ini</p>
                <p class="text-slate-300 text-xs text-slate-300">Coba hari lain atau ubah filter</p>
            </div>
        </div>
    </div>
    `
};
