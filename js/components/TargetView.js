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
                (s.full_name || '').toLowerCase().includes(q)
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
        <!-- Header Removed -->

        <!-- Search -->
        <div class="bg-white p-3 rounded-xl border shadow-sm sticky top-0 z-20 mb-4">
            <input type="text" v-model="searchText" placeholder="Cari Santri..."
                class="w-full p-2 bg-slate-50 border rounded-lg text-sm font-bold focus:outline-none focus:border-primary transition">
        </div>

        <div class="space-y-3 pb-20">
            <!-- List -->
            <div v-for="s in filteredSantri" :key="s._id"
                class="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center group relative hover:border-blue-100 transition">
                <div>
                    <h4 class="font-bold text-slate-900">{{ s.full_name }}</h4>
                    <p class="text-xs text-slate-500 font-mono mb-2">{{ s.kelas || '-' }} &bull;
                        Hafalan: {{ s.hafalan_manual || '0 Juz' }}
                    </p>
                    <div class="flex gap-2 text-[10px] font-bold uppercase tracking-wider flex-wrap">
                        <span class="bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">
                            Sabaq: {{ s.view_sabaq }} Hal
                        </span>
                        <span class="bg-purple-50 text-purple-600 px-2 py-1 rounded border border-purple-100">
                            Manzil: {{ s.view_manzil }} Hal ({{ s.view_pct }}%)
                        </span>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="relative" v-if="userSession.role === 'guru' || userSession.role === 'admin'">
                    <button @click.stop="$emit('toggle-dropdown', s._id)"
                        class="size-8 flex items-center justify-center text-slate-300 hover:text-primary hover:bg-slate-50 rounded-full transition">
                        <span class="material-symbols-outlined text-lg">more_vert</span>
                    </button>

                    <!-- Backdrop -->
                    <div v-if="activeDropdown === s._id" class="fixed inset-0 z-10 cursor-default"
                        @click.stop="$emit('toggle-dropdown', null)"></div>

                    <!-- Dropdown Menu -->
                    <div v-if="activeDropdown === s._id"
                        class="absolute right-9 -top-1 w-40 bg-white border border-slate-100 shadow-xl rounded-xl z-20 flex flex-col py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                        <button @click="$emit('open-target-modal', s); $emit('toggle-dropdown', null)"
                            class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition text-left w-full">
                            <span class="material-symbols-outlined text-base">edit_square</span> Edit Target
                        </button>
                        <button @click="$emit('reset-target', s._id); $emit('toggle-dropdown', null)"
                            class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition text-left w-full">
                            <span class="material-symbols-outlined text-base">restart_alt</span> Reset Default
                        </button>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="filteredSantri.length === 0" class="text-center py-10 text-slate-400">
                <span class="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                <p class="text-xs font-bold">Tidak ada santri ditemukan</p>
            </div>
        </div>
    </div>
    `
};
