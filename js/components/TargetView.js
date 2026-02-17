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
        }
    },
    emits: ['open-target-modal', 'reset-target', 'toggle-dropdown'],
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
        <!-- Search -->
        <div class="bg-white p-2 rounded-xl border border-slate-200 sticky top-0 z-20 mb-4 flex items-center gap-2 transition focus-within:ring-2 focus-within:ring-primary/20 shadow-sm">
            <span class="material-symbols-outlined text-slate-400 ml-2">search</span>
            <input type="text" v-model="searchText" placeholder="Cari berdasarkan nama atau NIS..."
                class="w-full bg-transparent outline-none text-sm placeholder:text-slate-400 font-bold">
        </div>

        <div class="space-y-3 pb-20">
            <!-- List -->
            <div v-for="s in filteredSantri" :key="s._id"
                class="bg-white p-3 rounded-xl border shadow-sm flex items-center justify-between group hover:border-blue-100 transition">
                
                <div class="flex items-center gap-3 overflow-hidden">
                    <!-- Initials -->
                    <div class="size-10 rounded-full bg-slate-100 flex-none flex items-center justify-center text-slate-500 font-bold text-sm">
                        {{ getInitials(s.full_name) }}
                    </div>

                    <!-- Info -->
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <h4 class="font-bold text-slate-800 text-sm truncate">{{ s.full_name }}</h4>
                            <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ s.kelas || '-' }}</span>
                            <span v-if="s.nis" class="text-[10px] font-mono text-slate-400 border border-slate-100 px-1 rounded">{{ s.nis }}</span>
                        </div>
                        
                        <!-- Mini Badges -->
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold">
                                S: {{ s.view_sabaq }}
                            </span>
                            <span class="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100 font-bold">
                                M: {{ s.view_manzil }}
                            </span>
                             <span class="text-[10px] text-slate-400 font-bold pl-1 border-l border-slate-200">
                                {{ s.hafalan_manual || '0 Juz' }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="relative flex-none" v-if="userSession.role === 'guru' || userSession.role === 'admin'">
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
    </div>
    `
};
