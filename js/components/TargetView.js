const TargetView = {
    props: {
        santriData: { type: Array, required: true },
        userSession: { type: Object, required: true },
        activeDropdown: { type: [String, Number, null] },
        selectionMode: { type: Boolean, default: false },
        selectedSantriIds: { type: Array, default: () => [] },
        targetFilterGender: { type: String, default: 'all' },
        targetFilterKelas: { type: String, default: 'all' },
        kelasOptions: { type: Array, default: () => [] },
        bulkTargetForm: { type: Object, default: () => ({}) },
        isBulkSaving: { type: Boolean, default: false }
    },
    emits: [
        'open-target-modal', 'reset-target', 'toggle-dropdown', 'toggle-selection-mode', 
        'toggle-santri-selection', 'select-all-santri', 'open-bulk-target-modal',
        'update:targetFilterGender', 'update:targetFilterKelas', 'apply-bulk-target'
    ],
    setup(props, { emit }) {
        const { ref, computed } = Vue;
        const searchText = ref('');

        const setGenderFilter = (val) => emit('update:targetFilterGender', val);
        const setKelasFilter = (val) => emit('update:targetFilterKelas', val);

        const filteredSantri = computed(() => {
            let list = props.santriData || [];
            if (!searchText.value) return list;
            const q = searchText.value.toLowerCase();
            return list.filter(s =>
                (s.full_name || '').toLowerCase().includes(q) ||
                (s.nis || '').toString().includes(q)
            );
        });

        const getInitials = (name) => {
            if (!name) return '';
            return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        };

        return {
            searchText,
            filteredSantri,
            getInitials,
            setGenderFilter,
            setKelasFilter
        };
    },
    template: `
    <div class="fade-in">
        <!-- Unified Static Header Area -->
        <div class="pb-6 pt-2 px-2">
            <!-- Header Title -->
            <div class="mb-6 flex justify-between items-center text-left">
                <h2 class="text-2xl font-bold text-slate-900 px-1">Target Hafalan</h2>
                <button v-if="userSession.role === 'admin'" @click="$emit('toggle-selection-mode')"
                    class="px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                    :class="selectionMode ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white border text-slate-600 hover:text-primary'">
                    <span class="material-symbols-outlined text-sm">{{ selectionMode ? 'close' : 'checklist' }}</span>
                    {{ selectionMode ? 'Batal' : 'Edit Massal' }}
                </button>
            </div>

            <!-- Search & Filter Capsules -->
            <div class="space-y-4">
                <!-- Search -->
                <div class="bg-white p-2.5 rounded-2xl border border-slate-200 flex items-center gap-2 transition focus-within:ring-2 focus-within:ring-primary/20 shadow-sm text-left">
                    <span class="material-symbols-outlined text-slate-400 ml-2">search</span>
                    <input type="text" v-model="searchText" placeholder="Cari santri..."
                        class="w-full bg-transparent outline-none text-sm font-bold">
                </div>

                <div class="flex flex-wrap gap-x-6 gap-y-3">
                    <!-- Gender Capsules -->
                    <div class="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        <button v-for="tag in [{id:'all', label:'Semua'}, {id:'L', label:'Putra'}, {id:'P', label:'Putri'}]"
                            @click="setGenderFilter(tag.id)"
                            class="px-5 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border"
                            :class="targetFilterGender === tag.id ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'">
                            {{ tag.label }}
                        </button>
                    </div>

                    <!-- Class Capsules -->
                    <div class="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        <button @click="setKelasFilter('all')"
                            class="px-5 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border"
                            :class="targetFilterKelas === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'">
                            Semua
                        </button>
                        <button v-for="k in kelasOptions" :key="k.name"
                            @click="setKelasFilter(k.name)"
                            class="px-5 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border"
                            :class="targetFilterKelas === k.name ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'">
                            {{ k.name }}
                        </button>
                    </div>
                </div>

                <div v-if="selectionMode" class="flex justify-between items-center pt-3 border-t border-slate-100 text-left">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {{ selectedSantriIds.length }} Terpilih
                    </p>
                    <button @click="$emit('select-all-santri', filteredSantri.map(s => s._id))"
                        class="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">
                        {{ selectedSantriIds.length === filteredSantri.length ? 'Batal Semua' : 'Pilih Semua' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- List -->
        <div class="space-y-3 px-2" :class="selectedSantriIds.length > 0 ? 'pb-96' : 'pb-32'">
            <!-- List -->
            <div v-for="s in filteredSantri" :key="s._id"
                @click.stop="selectionMode ? $emit('toggle-santri-selection', s._id) : ((userSession.role === 'admin' || userSession.role === 'guru') ? $emit('toggle-dropdown', s._id) : null)"
                class="bg-white p-3 rounded-xl border shadow-sm flex items-center justify-between group transition active:scale-[0.98] cursor-pointer text-left"
                :class="[
                    selectionMode ? 'hover:bg-slate-50' : 'hover:border-blue-100',
                    selectedSantriIds.includes(s._id) ? 'border-primary ring-1 ring-primary/10 bg-blue-50/10' : '',
                    activeDropdown === s._id ? 'z-[100] border-blue-200 ring-2 ring-primary/10 shadow-2xl relative' : ''
                ]">
                
                <div class="flex items-center gap-3 overflow-hidden">
                    <!-- Checkbox (Selection Mode) -->
                    <div v-if="selectionMode" class="flex-none">
                        <div class="size-5 rounded-lg border-2 flex items-center justify-center transition-all"
                            :class="selectedSantriIds.includes(s._id) ? 'bg-primary border-primary text-white' : 'border-slate-200 bg-white'">
                            <span v-if="selectedSantriIds.includes(s._id)" class="material-symbols-outlined text-sm font-black">check</span>
                        </div>
                    </div>

                    <!-- Initials -->
                    <div class="size-10 rounded-full bg-slate-100 flex-none flex items-center justify-center text-slate-500 font-bold text-sm">
                        {{ getInitials(s.full_name) }}
                    </div>

                    <!-- Info -->
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <h4 class="font-bold text-slate-800 text-sm truncate">{{ s.full_name }}</h4>
                            <div class="flex items-center gap-1 shrink-0">
                                <span class="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ s.kelas || '-' }}</span>
                                <span v-if="s.hafalan_manual" class="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{{ s.hafalan_manual }}</span>
                            </div>
                        </div>
                        
                        <!-- Progress Bar (v37) -->
                        <div class="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                            <template v-if="s.isKhatam">
                                <div class="h-full bg-amber-400 transition-all duration-500" :style="{ width: '100%' }"></div>
                            </template>
                            <template v-else>
                                <div class="h-full bg-blue-500 transition-all duration-500" :style="{ width: s.prog_sabaq + '%' }"></div>
                                <div class="h-full bg-purple-500 transition-all duration-500" :style="{ width: s.prog_manzil + '%' }"></div>
                            </template>
                        </div>

                        <!-- Mini Badges & Progress -->
                        <div class="flex items-center gap-1.5 flex-wrap mt-2">
                            <span v-if="s.isKhatam" class="text-[9px] px-1.5 py-0.5 rounded-md font-black border bg-amber-500 text-white border-amber-400 flex items-center gap-1">
                                <span class="material-symbols-outlined text-[10px]">workspace_premium</span> KHATAM
                            </span>
                            <span v-else class="text-[9px] px-1.5 py-0.5 rounded-md font-black border transition-colors"
                                :class="s.prog_sabaq >= 100 ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-blue-50 text-blue-600 border-blue-100'">
                                S: {{ s.ach_sabaq }}/{{ s.view_sabaq }}
                            </span>

                            <span class="text-[9px] px-1.5 py-0.5 rounded-md font-black border transition-colors"
                                :class="s.prog_manzil >= 100 ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-purple-50 text-purple-600 border-purple-100'">
                                M: {{ s.ach_manzil }}/{{ s.view_manzil }}
                            </span>

                            <span class="text-[9px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded-md border border-slate-100 font-black">
                                T: {{ s.ach_tilawah }}/{{ s.view_tilawah }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Dropdown Info trigger (role guru/admin only) -->
                <div v-if="!selectionMode && (userSession.role === 'admin' || userSession.role === 'guru')" class="relative flex-none">
                    <button @click.stop="$emit('toggle-dropdown', s._id)"
                        class="size-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-50 hover:text-primary transition">
                        <span class="material-symbols-outlined">more_vert</span>
                    </button>
                    
                    <!-- Dropdown Menu -->
                    <div v-if="activeDropdown === s._id"
                        class="absolute right-0 top-10 w-44 bg-white border border-slate-100 shadow-2xl rounded-2xl z-50 flex flex-col py-1 overflow-hidden animate-scale-in origin-top-right">
                        <button @click.stop="$emit('open-target-modal', s); $emit('toggle-dropdown', null)"
                            class="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition text-left">
                            <span class="material-symbols-outlined text-base">edit</span> Edit Target
                        </button>
                        <button @click.stop="$emit('reset-target', s._id); $emit('toggle-dropdown', null)"
                            class="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition text-left">
                            <span class="material-symbols-outlined text-base">refresh</span> Reset Target
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="!filteredSantri.length" class="text-center py-20">
                <span class="material-symbols-outlined text-5xl text-slate-200">group_off</span>
                <p class="mt-2 text-sm text-slate-400 font-bold">Tidak ada santri ditemukan</p>
            </div>
        </div>

        <!-- Unified Target Botom Sheet -->
        <Teleport to="body">
            <Transition name="slide-up">
                <div v-if="selectedSantriIds.length > 0"
                    class="fixed z-[300] bg-white shadow-2xl overflow-visible bottom-0 left-0 right-0 rounded-t-[32px] border-t border-slate-100 md:bottom-6 md:top-auto md:left-1/2 md:-translate-x-1/2 md:translate-y-0 md:w-full md:max-w-xl md:rounded-3xl md:border pb-safe">
                    
                    <!-- Handle to Close -->
                    <div @click="$emit('select-all-santri', [])" class="flex justify-center pt-3 pb-2 cursor-pointer hover:opacity-75">
                        <div class="w-12 h-1.5 bg-slate-300 rounded-full"></div>
                    </div>

                    <div class="px-6 pb-8 space-y-4 pt-2 text-left">
                        <div v-if="selectedSantriIds.length > 1" class="flex items-center gap-2 mb-1">
                            <span class="bg-red-500 text-white min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-black shadow-sm">
                                {{ selectedSantriIds.length }}
                            </span>
                        </div>
                        <div v-else-if="selectedSantriIds.length === 1" class="mb-1">
                            <h4 class="text-sm font-bold text-slate-800">{{ santriData.find(s => s._id === selectedSantriIds[0])?.full_name }}</h4>
                        </div>

                        <div class="grid grid-cols-2 gap-x-4 gap-y-3">
                            <div class="space-y-1">
                                <label class="text-[10px] font-bold text-slate-400 ml-1">Sabaq (Hal/Bulan)</label>
                                <input type="number" v-model.number="bulkTargetForm.sabaq" 
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary transition-all">
                            </div>
                            <div class="space-y-1">
                                <label class="text-[10px] font-bold text-slate-400 ml-1">Manzil (Hal/Bulan)</label>
                                <input type="number" v-model.number="bulkTargetForm.manzil" 
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-purple-500 transition-all">
                            </div>
                            <div class="space-y-1">
                                <label class="text-[10px] font-bold text-slate-400 ml-1">Tilawah (Hal/Bulan)</label>
                                <input type="number" v-model.number="bulkTargetForm.tilawah" 
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-500 transition-all">
                            </div>
                            <div class="space-y-1">
                                <label class="text-[10px] font-bold text-slate-400 ml-1">Manzil (Persen %)</label>
                                <input type="number" v-model.number="bulkTargetForm.pct" 
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-amber-500 transition-all">
                            </div>
                        </div>

                        <button @click="$emit('apply-bulk-target')" :disabled="isBulkSaving"
                            class="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3 disabled:opacity-50">
                            <span v-if="isBulkSaving" class="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            {{ isBulkSaving ? 'Menyimpan...' : (selectedSantriIds.length > 1 ? 'Simpan Target Masal' : 'Simpan Perubahan') }}
                        </button>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
    `
};
