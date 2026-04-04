const PelanggaranView = {
    props: [
        'pelanggaranForm',
        'pelanggaranSantriSearch',
        'pelanggaranFilteredSantriOptions',
        'isPelanggaranSantriDropdownOpen',
        'pelanggaranSelectedSantriName',
        'uiData',
        'pelanggaranEditingId',
        'filteredPelanggaran',
        'activeDropdown',
        'userSession'
    ],
    emits: [
        'update:pelanggaranForm',
        'update:pelanggaranSantriSearch',
        'update:isPelanggaranSantriDropdownOpen',
        'select-santri',
        'toggle-dropdown',
        'edit-pelanggaran',
        'delete-pelanggaran',
        'submit-pelanggaran',
        'cancel-edit',
        'update-points', // function call
        'open-master-modal',
        'delete-master'
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


        <!-- TABS (Hide for Wali) -->
        <div v-if="userSession?.role !== 'wali'" class="p-2 bg-slate-100 m-2 rounded-xl flex border border-slate-200 relative z-10">
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
            <!-- Input Form (Hide for Wali) -->
            <div v-if="userSession?.role !== 'wali'" class="bg-white p-5 rounded-3xl border shadow-sm mx-2 space-y-4">
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
                        <div class="flex items-center gap-1">
                            <!-- Clear Selection Button -->
                            <span v-if="pelanggaranForm.santri_id" @click.stop="$emit('update:pelanggaranForm', { ...pelanggaranForm, santri_id: '' })" 
                                class="material-symbols-outlined text-slate-300 hover:text-red-500 transition-colors p-1.5 -mr-1.5 text-lg"
                                title="Batal pilih santri">
                                cancel
                            </span>
                            <span class="material-symbols-outlined text-slate-400 transition-transform duration-200" 
                                :class="{ 'rotate-180': isPelanggaranSantriDropdownOpen }">expand_more</span>
                        </div>
                    </button>

                    <!-- Dropdown Content -->
                    <div v-if="isPelanggaranSantriDropdownOpen"
                        class="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">

                        <!-- Search Input -->
                        <div class="p-2 border-b border-slate-50">
                        <div class="flex items-center gap-2 bg-slate-50 pl-3 pr-1 py-1 rounded-lg border border-slate-100 shadow-inner">
                            <span class="material-symbols-outlined text-slate-400 text-lg">search</span>
                            <input 
                                :value="pelanggaranSantriSearch"
                                @input="$emit('update:pelanggaranSantriSearch', $event.target.value)"
                                type="text"
                                placeholder="Cari nama..."
                                class="bg-transparent w-full py-1 text-sm font-bold outline-none placeholder:font-normal text-slate-700"
                                @click.stop>
                            <!-- Search Clear Button -->
                            <button v-if="pelanggaranSantriSearch" @click.stop="$emit('update:pelanggaranSantriSearch', '')"
                                class="size-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                                <span class="material-symbols-outlined text-lg">close</span>
                            </button>
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
                        @change="$emit('update:pelanggaranForm', { ...pelanggaranForm, description: $event.target.value }); $emit('update-points')" 
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
                    <button v-if="pelanggaranEditingId" @click="$emit('cancel-edit')"
                        class="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Batal</button>
                    <button @click="$emit('submit-pelanggaran')"
                        class="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200 active:scale-95 transition">
                        {{ pelanggaranEditingId ? 'Update Data' : 'Simpan Data' }}
                    </button>
                </div>
            </div>

            <!-- History List -->
            <div class="px-2 space-y-3">
                <h3 class="font-bold text-slate-800 px-1">Riwayat Terbaru</h3>
                <div v-for="p in filteredPelanggaran" :key="p._id"
                    class="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-start relative cursor-pointer active:scale-[0.98] transition"
                    @click.stop="$emit('toggle-dropdown', p._id)">
                    <div class="flex-1 flex justify-between items-start gap-3">
                        <div class="min-w-0">
                            <p class="font-bold text-slate-900 leading-tight">{{ getSantriName(p.santri_id) }}</p>
                            <p class="text-xs text-red-500 mt-0.5">{{ p.description }}</p>
                            <p class="text-[10px] text-slate-400 font-bold mt-2">{{ formatDate(p.date) }}</p>
                        </div>
                        
                        <div class="shrink-0 flex flex-col items-end gap-2">
                             <!-- Points -->
                            <span class="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-xs font-black shrink-0">-{{ p.points }}</span>
                            
                            <!-- Inline Actions (Shown on Click) -->
                            <div v-if="activeDropdown === p._id" class="flex gap-2 animate-in slide-in-from-right-2 fade-in duration-300">
                                <button @click.stop="$emit('edit-pelanggaran', p); $emit('toggle-dropdown', null)" 
                                    class="size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 shadow-sm transition active:scale-90">
                                    <span class="material-symbols-outlined text-sm">edit</span>
                                </button>
                                <button @click.stop="$emit('delete-pelanggaran', p._id); $emit('toggle-dropdown', null)" 
                                    class="size-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 shadow-sm transition active:scale-90">
                                    <span class="material-symbols-outlined text-sm">delete</span>
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
                        <button @click.stop="$emit('toggle-dropdown', m._id)"
                            class="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
                            <span class="material-symbols-outlined text-xl">more_vert</span>
                        </button>

                        <!-- Backdrop -->
                        <div v-if="activeDropdown === m._id" class="fixed inset-0 z-40 cursor-default"
                            @click.stop="$emit('toggle-dropdown', null)"></div>

                        <!-- Dropdown Menu -->
                        <div v-if="activeDropdown === m._id"
                            class="absolute right-9 -top-1 w-32 bg-white border border-slate-100 shadow-xl rounded-xl z-50 flex flex-col py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <button @click="$emit('open-master-modal', m); $emit('toggle-dropdown', null)"
                                class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition text-left w-full">
                                <span class="material-symbols-outlined text-base">edit</span> Edit
                            </button>
                            <button @click="$emit('delete-master', m._id); $emit('toggle-dropdown', null)"
                                class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition text-left w-full">
                                <span class="material-symbols-outlined text-base">delete</span> Hapus
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
