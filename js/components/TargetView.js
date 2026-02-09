const TargetView = {
    props: {
        santriData: {
            type: Array,
            required: true
        },
        userSession: {
            type: Object,
            required: true
        }
    },
    emits: ['open-target-modal', 'reset-target'],
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
        <div class="flex justify-between items-center mb-6">
            <div>
                <h2 class="text-2xl font-bold">Target Bulanan</h2>
                <p class="text-xs text-slate-500">Atur target hafalan baru & murojaah.</p>
            </div>
        </div>

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
                <div class="flex gap-1" v-if="userSession.role === 'guru' || userSession.role === 'admin'">
                    <button @click="$emit('open-target-modal', s)"
                        class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit Target">
                        <span class="material-symbols-outlined text-lg">edit_square</span>
                    </button>
                    <button @click="$emit('reset-target', s._id)"
                        class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Reset Default">
                        <span class="material-symbols-outlined text-lg">restart_alt</span>
                    </button>
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
