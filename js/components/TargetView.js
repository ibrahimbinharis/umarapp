const TargetView = {
    props: {
        santriData: {
            type: Array,
            required: true
        },
        userSession: {
            type: Object,
            required: true
        },
        activeDropdown: {
            type: [String, Number, null]
        },
        selectionMode: {
            type: Boolean,
            default: false
        },
        selectedSantriIds: {
            type: Array,
            default: () => []
        }
    },
    emits: ['open-target-modal', 'reset-target', 'toggle-dropdown', 'toggle-selection-mode', 'toggle-santri-selection', 'select-all-santri', 'open-bulk-target-modal'],
    setup(props) {
        const { ref, computed } = Vue;
        const searchText = ref('');

        const filteredSantri = computed(() => {
            if (!searchText.value) return props.santriData;
            const q = searchText.value.toLowerCase();
            return props.santriData.filter(s =>
                (s.full_name || '').toLowerCase().includes(q) ||
                (s.nis || '').toString().includes(q)
            );
        });

        // Computed initial helper (if needed, but simpler to just use full_name)
        const getInitials = (name) => {
            if (!name) return '';
            return name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
        };

        return {
            searchText,
            filteredSantri,
            getInitials
        };
    },
    template: `
    <div class="fade-in">
        <!-- Header -->
        <div class="px-2 mb-4 flex justify-between items-center">
            <h2 class="text-xl font-bold text-slate-900">Target Hafalan</h2>
            <button v-if="userSession.role === 'admin'" @click="$emit('toggle-selection-mode')"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                :class="selectionMode ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-white border text-slate-600 hover:text-primary'">
                <span class="material-symbols-outlined text-sm">{{ selectionMode ? 'close' : 'checklist' }}</span>
                {{ selectionMode ? 'Batal' : 'Edit Massal' }}
            </button>
        </div>

        <!-- Search & Select All -->
        <div class="space-y-3 sticky top-0 z-20 bg-slate-50/80 backdrop-blur-sm pb-3">
            <div class="bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-2 transition focus-within:ring-2 focus-within:ring-primary/20 shadow-sm">
                <span class="material-symbols-outlined text-slate-400 ml-2">search</span>
                <input type="text" v-model="searchText" placeholder="Cari berdasarkan nama atau NIS..."
                    class="w-full bg-transparent outline-none text-sm placeholder:text-slate-400 font-bold">
            </div>

            <div v-if="selectionMode" class="flex justify-between items-center px-2">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {{ selectedSantriIds.length }} Terpilih
                </p>
                <button @click="$emit('select-all-santri', filteredSantri.map(s => s._id))"
                    class="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">
                    {{ selectedSantriIds.length === filteredSantri.length ? 'Batal Semua' : 'Pilih Semua' }}
                </button>
            </div>
        </div>

        <div class="space-y-3 pb-32">
            <!-- List -->
            <div v-for="s in filteredSantri" :key="s._id"
                @click="selectionMode ? $emit('toggle-santri-selection', s._id) : null"
                class="bg-white p-3 rounded-xl border shadow-sm flex items-center justify-between group transition"
                :class="[
                    selectionMode ? 'cursor-pointer hover:bg-slate-50' : 'hover:border-blue-100',
                    selectedSantriIds.includes(s._id) ? 'border-primary ring-1 ring-primary/10 bg-blue-50/10' : ''
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
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <h4 class="font-bold text-slate-800 text-sm truncate">{{ s.full_name }}</h4>
                            <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ s.kelas || '-' }}</span>
                        </div>
                        
                        <!-- Mini Badges -->
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold">
                                S: {{ s.view_sabaq }}
                            </span>
                            <span class="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100 font-bold">
                                M: {{ s.view_manzil }}
                            </span>
                            <span class="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 font-bold">
                                T: {{ s.view_tilawah }}
                            </span>
                             <span class="text-[10px] text-slate-400 font-bold pl-1 border-l border-slate-200">
                                {{ s.hafalan_manual || '0 Juz' }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="relative flex-none" v-if="!selectionMode && (userSession.role === 'guru' || userSession.role === 'admin')">
                    <button @click.stop="$emit('toggle-dropdown', s._id)"
                        class="size-8 flex items-center justify-center text-slate-300 hover:text-primary hover:bg-slate-50 rounded-full transition">
                        <span class="material-symbols-outlined text-lg">more_vert</span>
                    </button>

                    <!-- Backdrop -->
                    <div v-if="activeDropdown === s._id" class="fixed inset-0 z-10 cursor-default"
                        @click.stop="$emit('toggle-dropdown', null)"></div>

                    <!-- Dropdown Menu -->
                    <div v-if="activeDropdown === s._id"
                        class="absolute right-0 top-8 w-40 bg-white border border-slate-100 shadow-xl rounded-xl z-20 flex flex-col py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                        <button @click="$emit('open-target-modal', s); $emit('toggle-dropdown', null)"
                            class="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary transition text-left w-full border-b border-slate-50 last:border-0">
                            <span class="material-symbols-outlined text-sm text-slate-400">edit_square</span> Edit Target
                        </button>
                        <button @click="$emit('reset-target', s._id); $emit('toggle-dropdown', null)"
                            class="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition text-left w-full">
                            <span class="material-symbols-outlined text-sm text-slate-400">restart_alt</span> Reset Default
                        </button>
                    </div>
                </div>

            </div>

            <!-- Empty State -->
            <div v-if="filteredSantri.length === 0" class="text-center py-10">
                <div class="bg-slate-50 size-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span class="material-symbols-outlined text-3xl text-slate-300">search_off</span>
                </div>
                <p class="text-xs font-bold text-slate-400">Tidak ada santri ditemukan</p>
            </div>
        </div>

        <!-- Floating Bulk Bar -->
        <teleport to="body">
            <div v-if="selectionMode" 
                class="fixed bottom-24 left-4 right-4 z-[100] bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-white/10 animate-in slide-in-from-bottom-5 duration-300">
                <div class="min-w-0">
                    <p class="font-bold text-sm">{{ selectedSantriIds.length }} Santri Terpilih</p>
                    <p class="text-[10px] text-slate-400 uppercase font-black">Edit Massal</p>
                </div>
                <div class="flex gap-2">
                    <button @click="$emit('toggle-selection-mode')"
                        class="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition">
                        Batal
                    </button>
                    <button @click="$emit('open-bulk-target-modal')" :disabled="selectedSantriIds.length === 0"
                        class="px-5 py-2 rounded-xl text-xs font-black bg-white text-slate-900 shadow-xl shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 transition">
                        Atur Target ({{ selectedSantriIds.length }})
                    </button>
                </div>
            </div>
        </teleport>
    </div>
    `
};
