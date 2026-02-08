const JadwalView = {
    props: {
        filteredJadwalList: { type: Array, required: true },
        dayFilter: { type: Object, required: true },
        setDayFilter: { type: Function, required: true },
        jadwalGenderFilter: { type: String, required: true },
        // openJadwalModal: { type: Function, required: true }, // We might need to emit or pass prop. useJadwal returns openJadwalModal
        openJadwalModal: Function,
        deleteJadwal: Function,
        userSession: Object
    },
    emits: ['update:jadwalGenderFilter'],
    setup(props) {
        const days = ['Semua', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

        return {
            days
        };
    },
    template: `
    <div class="space-y-4 pb-24 fade-in">
        <!-- Header & Filters -->
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4 sticky top-0 z-20">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-slate-800">Jadwal KBM</h2>
                    <p class="text-xs text-slate-500">Jadwal Kegiatan Belajar Mengajar</p>
                </div>
                
                <!-- Add Button (FAB-like in header for desktop/mobile consistency) -->
                <button v-if="userSession.role === 'admin'" 
                    @click="openJadwalModal(null)"
                    class="bg-primary text-white size-10 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/20 active:scale-95 transition">
                    <span class="material-symbols-outlined">add</span>
                </button>
            </div>

            <!-- Gender Filter -->
            <div class="flex p-1 bg-slate-100 rounded-lg">
                <button @click="$emit('update:jadwalGenderFilter', 'L')"
                    :class="jadwalGenderFilter === 'L' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'"
                    class="flex-1 py-1.5 text-xs rounded-md transition-all">
                    Putra
                </button>
                <button @click="$emit('update:jadwalGenderFilter', 'P')"
                    :class="jadwalGenderFilter === 'P' ? 'bg-white text-pink-500 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'"
                    class="flex-1 py-1.5 text-xs rounded-md transition-all">
                    Putri
                </button>
            </div>

            <!-- Day Filter (Scrollable) -->
            <div class="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                <button v-for="day in days" :key="day"
                    @click="setDayFilter(day)"
                    class="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border"
                    :class="dayFilter.value === day ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'">
                    {{ day }}
                </button>
            </div>
        </div>

        <!-- Schedule List -->
        <div class="space-y-3">
            <div v-for="item in filteredJadwalList" :key="item._id"
                class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-start group hover:border-blue-200 transition">
                
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                            :class="item.gender === 'L' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'">
                            {{ item.gender === 'L' ? 'Putra' : 'Putri' }}
                        </span>
                        <span class="text-[10px] font-bold text-slate-400">{{ item.day }}</span>
                    </div>
                    
                    <h4 class="font-bold text-slate-800">{{ item.mapel }}</h4>
                    
                    <div class="flex items-center gap-3 text-xs text-slate-500">
                        <div class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">schedule</span>
                            <span class="font-bold">{{ item.time }}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">meeting_room</span>
                            <span>{{ item.class_name }}</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-1 text-xs text-slate-500 italic pt-1">
                        <span class="material-symbols-outlined text-[14px]">person</span>
                        <span>{{ item.teacher }}</span>
                    </div>
                </div>

                <!-- Admin Actions -->
                <div v-if="userSession.role === 'admin'" class="flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                    <button @click="openJadwalModal(item)"
                        class="size-8 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button @click="deleteJadwal(item._id)"
                        class="size-8 rounded-lg bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="filteredJadwalList.length === 0" class="py-12 text-center">
                <div class="bg-slate-50 size-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span class="material-symbols-outlined text-3xl text-slate-300">calendar_month</span>
                </div>
                <p class="text-slate-400 font-bold text-sm">Belum ada jadwal</p>
                <p class="text-slate-300 text-xs">Silakan tambah jadwal baru</p>
            </div>
        </div>
    </div>
    `
};
