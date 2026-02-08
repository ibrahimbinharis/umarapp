const PelanggaranView = {
    props: [
        'pelanggaranForm',
        'pelanggaranSantriSearch',
        'pelanggaranFilteredSantriOptions',
        'isPelanggaranSantriDropdownOpen',
        'pelanggaranSelectedSantriName',
        'uiData',
        'editingId',
        'filteredPelanggaran',
        // Functions being passed as props or events? 
        // Based on usage in HTML, these are likely methods in setup() or global mixins.
        // We will emit events for actions or accept function props.
    ],
    emits: [
        'update:pelanggaranForm',
        'update:pelanggaranSantriSearch',
        'update:isPelanggaranSantriDropdownOpen',
        'select-santri',
        'toggle-menu',
        'is-menu-open',
        'edit-pelanggaran',
        'delete-pelanggaran',
        'submit-pelanggaran',
        'cancel-edit',
        'update-points', // function call
        'open-master-modal',
        'delete-master',
        'toggle-master-menu',
        'is-master-menu-open'
    ],
    setup(props, { emit }) {
        // Helper to formatting date (using global or injected)
        const formatDate = window.formatDate || ((d) => d);
        const getSantriName = window.getSantriName || ((id) => id);

        return {
            formatDate,
            getSantriName
        }
    },
    template: `
    <div class="h-full flex flex-col bg-slate-50">
        <!-- Header -->
        <div class="p-4 bg-white border-b border-slate-200 sticky top-0 z-10">
            <h2 class="font-bold text-xl text-slate-800">Pelanggaran</h2>
            <p class="text-xs text-slate-500">Catat dan kelola pelanggaran santri</p>
        </div>

        <!-- TABS -->
        <div class="p-2 bg-slate-100 m-2 rounded-xl flex p-1 border border-slate-200">
            <button @click="$emit('update:pelanggaranForm', { ...pelanggaranForm, tab: 'input' })"
                :class="pelanggaranForm.tab === 'input' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'"
                class="flex-1 py-2 text-xs rounded-lg transition-all">
                Input / Riwayat
            </button>
            <button @click="$emit('update:pelanggaranForm', { ...pelanggaranForm, tab: 'jenis' })"
                :class="pelanggaranForm.tab === 'jenis' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'"
                class="flex-1 py-2 text-xs rounded-lg transition-all">
                Jenis Pelanggaran
            </button>
        </div>

        <!-- TAB 1: INPUT & RIWAYAT -->
        <div v-if="pelanggaranForm.tab === 'input'" class="space-y-6 pb-24">
            <!-- Input Form -->
            <div class="bg-white p-5 rounded-3xl border shadow-sm mx-2 space-y-4">
                <h3 class="font-bold text-slate-800 border-b pb-2">Catat Pelanggaran</h3>

                <!-- 1. Select Santri -->
                <div class="space-y-1 relative">
                    <label class="text-xs font-bold text-slate-500 uppercase">Santri</label>

                    <!-- Trigger Button -->
                    <button
                        @click="$emit('update:isPelanggaranSantriDropdownOpen', !isPelanggaranSantriDropdownOpen)"
                        class="w-full p-3 border rounded-xl text-sm font-bold bg-white text-left flex justify-between items-center transition"
                        :class="isPelanggaranSantriDropdownOpen ? 'ring-2 ring-primary/20 border-primary' : 'border-slate-200'">
                        <span class="truncate block"
                            :class="pelanggaranForm.santri_id ? 'text-slate-900' : 'text-slate-400'">
                            {{ pelanggaranForm.santri_id ? pelanggaranSelectedSantriName : '-- Pilih Santri --' }}
                        </span>
                        <span class="material-symbols-outlined text-slate-400">expand_more</span>
                    </button>

                    <!-- Dropdown Content -->
                    <div v-if="isPelanggaranSantriDropdownOpen"
                        class="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100">

                        <!-- Search Input -->
                        <div class="p-2 border-b border-slate-50">
                            <div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                <span class="material-symbols-outlined text-slate-400 text-lg">search</span>
                                <input 
                                    :value="pelanggaranSantriSearch"
                                    @input="$emit('update:pelanggaranSantriSearch', $event.target.value)"
                                    type="text"
                                    placeholder="Cari nama..."
                                    class="bg-transparent w-full text-sm font-bold outline-none placeholder:font-normal text-slate-700"
                                    @click.stop>
                            </div>
                        </div>

                        <!-- Lists -->
                        <div class="max-h-60 overflow-y-auto custom-scrollbar">
                            <div v-for="s in pelanggaranFilteredSantriOptions" :key="s._id"
                                @click="$emit('select-santri', s)"
                                class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors group">
                                <p class="text-sm font-bold text-slate-800 group-hover:text-primary">
                                    {{ s.full_name }}
                                </p>
                                <p class="text-[10px] text-slate-500">{{ s.santri_id }} &bull; {{ s.kelas || '-' }}</p>
                            </div>

                            <!-- Empty State -->
                            <div v-if="pelanggaranFilteredSantriOptions.length === 0"
                                class="p-4 text-center text-slate-400 text-xs italic">
                                Tidak ditemukan
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. Select Jenis -->
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase">Jenis Pelanggaran</label>
                    <select 
                        :value="pelanggaranForm.description" 
                        @change="$emit('update-points', $event)" 
                        class="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border focus:outline-none focus:border-primary">
                        <option value="">Pilih Pelanggaran...</option>
                        <option v-for="m in uiData.master_pelanggaran" :key="m._id" :value="m.name">
                            {{ m.name }} ({{ m.points }} Poin)
                        </option>
                    </select>
                </div>

                <!-- 3. Points & Date -->
                <div class="flex gap-3">
                    <div class="flex-1 space-y-1">
                        <label class="text-xs font-bold text-slate-500 uppercase">Poin</label>
                        <input 
                            :value="pelanggaranForm.points" 
                            @input="$emit('update:pelanggaranForm', { ...pelanggaranForm, points: $event.target.value })"
                            type="number"
                            class="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border focus:outline-none focus:border-primary">
                    </div>
                    <div class="flex-1 space-y-1">
                        <label class="text-xs font-bold text-slate-500 uppercase">Tanggal</label>
                        <input 
                            :value="pelanggaranForm.date"
                            @input="$emit('update:pelanggaranForm', { ...pelanggaranForm, date: $event.target.value })"
                            type="date"
                            class="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border focus:outline-none focus:border-primary">
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex gap-2 pt-2">
                    <button v-if="editingId" @click="$emit('cancel-edit')"
                        class="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Batal</button>
                    <button @click="$emit('submit-pelanggaran')"
                        class="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200 active:scale-95 transition">
                        {{ editingId ? 'Update Data' : 'Simpan Data' }}
                    </button>
                </div>
            </div>

            <!-- History List -->
            <div class="px-2 space-y-3">
                <h3 class="font-bold text-slate-800 px-1">Riwayat Terbaru</h3>
                <div v-for="p in filteredPelanggaran" :key="p._id"
                    class="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-start relative">
                    <div class="flex-1">
                        <p class="text-xs text-slate-400 font-bold mb-1">{{ formatDate(p.date) }}</p>
                        <p class="font-bold text-slate-900">{{ getSantriName(p.santri_id) }}</p>
                        <p class="text-sm text-red-500">{{ p.description }}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-xs font-black">-{{ p.points }}</span>

                        <!-- 3-Dot Menu -->
                        <div class="relative">
                            <button @click.stop="$emit('toggle-menu', p._id)"
                                class="size-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                                <span class="material-symbols-outlined">more_vert</span>
                            </button>

                            <!-- Dropdown Menu -->
                            <div v-if="$attrs.isMenuOpen && $attrs.isMenuOpen(p._id)" @click.stop
                                class="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 min-w-[140px] animate-in fade-in zoom-in-95 duration-100">
                                <button @click="$emit('edit-pelanggaran', p); $emit('toggle-menu', p._id)"
                                    class="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-blue-50 text-blue-600 transition text-sm font-bold">
                                    <span class="material-symbols-outlined text-lg">edit</span>
                                    Edit
                                </button>
                                <button @click="$emit('delete-pelanggaran', p._id); $emit('toggle-menu', p._id)"
                                    class="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-red-50 text-red-600 transition text-sm font-bold border-t border-slate-100">
                                    <span class="material-symbols-outlined text-lg">delete</span>
                                    Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-if="filteredPelanggaran.length === 0" class="text-center py-8 text-slate-400">
                    <span class="material-symbols-outlined text-4xl opacity-30">history</span>
                    <p class="text-xs mt-2">Belum ada data pelanggaran</p>
                </div>
            </div>
        </div>

        <!-- TAB 2: MASTER DATA (JENIS) -->
        <div v-if="pelanggaranForm.tab === 'jenis'" class="px-2 space-y-4 pb-24">
            <button @click="$emit('open-master-modal', null)"
                class="w-full py-3 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 active:scale-95 transition shadow-lg shadow-red-200">
                <span class="material-symbols-outlined text-lg">add</span> Tambah Jenis Pelanggaran
            </button>

            <div class="space-y-3">
                <div v-for="m in uiData.master_pelanggaran" :key="m._id"
                    class="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center relative">
                    <div class="flex-1">
                        <p class="font-bold text-slate-900">{{ m.name }}</p>
                        <p class="text-xs text-slate-500">Poin Pengurang: <span class="text-red-500 font-bold">{{ m.points }}</span></p>
                    </div>

                    <!-- 3-Dot Menu -->
                    <div class="relative">
                        <button @click.stop="$emit('toggle-master-menu', m._id)"
                            class="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
                            <span class="material-symbols-outlined text-xl">more_vert</span>
                        </button>

                        <!-- Dropdown Menu -->
                        <div v-if="$attrs.isMasterMenuOpen && $attrs.isMasterMenuOpen(m._id)" @click.stop
                            class="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 min-w-[140px] animate-in fade-in zoom-in-95 duration-100">
                            <button @click="$emit('open-master-modal', m); $emit('toggle-master-menu', m._id)"
                                class="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-blue-50 text-blue-600 transition text-sm font-bold">
                                <span class="material-symbols-outlined text-lg">edit</span>
                                Edit
                            </button>
                            <button @click="$emit('delete-master', m._id); $emit('toggle-master-menu', m._id)"
                                class="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-red-50 text-red-600 transition text-sm font-bold border-t border-slate-100">
                                <span class="material-symbols-outlined text-lg">delete</span>
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-if="!uiData.master_pelanggaran || uiData.master_pelanggaran.length === 0"
                    class="text-center py-10 text-slate-400">
                    <p class="text-sm">Belum ada jenis pelanggaran.</p>
                </div>
            </div>
        </div>
    </div>
    `
};
