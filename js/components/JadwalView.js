const JadwalView = {
    props: {
        filteredJadwalList: { type: Array, required: true },
        dayFilter: { type: Object, required: true },
        setDayFilter: { type: Function, required: true },
        jadwalGenderFilter: { type: String, required: true },
        // openJadwalModal: { type: Function, required: true }, // We might need to emit or pass prop. useJadwal returns openJadwalModal
        openJadwalModal: Function,
        deleteJadwal: Function,
        userSession: Object,
        activeDropdown: [String, Number, null],
        isModalOpen: Boolean // New Prop
    },
    emits: ['update:jadwalGenderFilter', 'toggle-dropdown'],
    setup(props) {
        const { ref, watch } = Vue;
        const days = ['Semua', 'Hari Ini', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

        // FAB Click State
        const isFabClicked = ref(false);

        // Reset FAB state when modal closes
        watch(() => props.isModalOpen, (newVal) => {
            if (!newVal) {
                isFabClicked.value = false;
            }
        });

        const onJadwalFabClick = () => {
            isFabClicked.value = true;
        };

        return {
            days,
            isFabClicked,
            onJadwalFabClick
        };
    },
    template: `
    <div class="space-y-4 pb-15">
        <!-- Header & Filters -->
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <!-- Header Removed -->

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
                    class="px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border"
                    :class="dayFilter.value === day ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'">
                    {{ day }}
                </button>
            </div>
        </div>

        <!-- Schedule List -->
        <div class="space-y-3 fade-in">
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
                <div v-if="userSession.role === 'admin'" class="relative">
                    <button @click.stop="$emit('toggle-dropdown', item._id)"
                        class="size-8 flex items-center justify-center text-slate-300 hover:text-primary hover:bg-slate-50 rounded-full transition">
                        <span class="material-symbols-outlined text-lg">more_vert</span>
                    </button>

                    <!-- Backdrop -->
                    <div v-if="activeDropdown === item._id" class="fixed inset-0 z-10 cursor-default"
                        @click.stop="$emit('toggle-dropdown', null)"></div>

                    <!-- Dropdown Menu -->
                    <div v-if="activeDropdown === item._id"
                        class="absolute right-9 -top-1 w-32 bg-white border border-slate-100 shadow-xl rounded-xl z-20 flex flex-col py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                        <button @click="openJadwalModal(item); $emit('toggle-dropdown', null)"
                            class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition text-left w-full">
                            <span class="material-symbols-outlined text-base">edit</span> Edit
                        </button>
                        <button @click="deleteJadwal(item._id); $emit('toggle-dropdown', null)"
                            class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition text-left w-full">
                            <span class="material-symbols-outlined text-base">delete</span> Hapus
                        </button>
                    </div>
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
        <!-- Floating Action Button (Admin Only) -->
        <teleport to="body">
            <div class="fixed bottom-24 right-4 z-[9999]" v-if="userSession.role === 'admin' && !isModalOpen">
                <button v-if="!isFabClicked" @click="onJadwalFabClick(); openJadwalModal(null)"
                    class="size-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center transition hover:scale-110 active:scale-95 hover:bg-blue-700">
                    <span class="material-symbols-outlined text-3xl">add</span>
                </button>
            </div>
        </teleport>
    </div>
    `
};
