const RiwayatView = {
    props: {
        riwayatState: { type: Object, required: true },
        paginatedRiwayat: { type: Array, required: true },
        riwayatTotalPages: { type: Number, required: true },
        riwayatFilteredSantriOptions: { type: Array, required: true },
        riwayatSelectedSantriName: { type: String, required: true },
        filterCounts: { type: Object, default: () => ({}) }, // Optional
        activeFilterCount: { type: Number, default: 0 }, // Optional
        userSession: { type: Object, required: true },

        // Methods passed as props
        formatDateLong: Function,
        formatTime: Function,
        getSantriName: Function,
        getJuzFromPage: Function,
        selectRiwayatSantri: Function,
        toggleSelect: Function,
        toggleSelectAll: Function,
        deleteSelected: Function,
        toggleActionMenu: Function,
        closeActionMenu: Function,
        editRiwayat: Function,
        deleteRiwayat: Function,
        setQuickDateFilter: Function,
        resetAllFilters: Function,
        removeFilter: Function
    },
    template: `
    <div class="fade-in space-y-4 pb-24">
        <!-- Header with Filter Icon -->
        <div class="px-2 flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-bold text-slate-900">Riwayat</h2>
                <p class="text-xs text-slate-500">Murojaah, Ziyadah & Ujian</p>
            </div>
            <!-- Filter Icon Button -->
            <button @click="riwayatState.isFilterOpen = !riwayatState.isFilterOpen"
                class="relative size-10 rounded-full flex items-center justify-center transition text-slate-600 hover:opacity-70">
                <span class="material-symbols-outlined">tune</span>
                <span v-if="activeFilterCount > 0" 
                    class="absolute -top-1 -right-1 size-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {{ activeFilterCount }}
                </span>
            </button>
        </div>

        <!-- Active Filters Summary (Optional - shows when filters are active) -->
        <div v-if="activeFilterCount > 0" class="mx-2 text-xs text-slate-500 flex items-center gap-2">
            <span class="font-bold">Filter aktif:</span>
            <span v-if="riwayatState.category" class="text-slate-700">
                {{ 
                    riwayatState.category === 'setoran' ? 'Setoran' :
                    riwayatState.category === 'sabaq' ? 'Sabaq' :
                    riwayatState.category === 'sabqi' ? 'Sabqi' :
                    riwayatState.category === 'manzil' ? 'Manzil' :
                    riwayatState.category === 'ujian' ? 'Ujian' : 'Pelanggaran'
                }}
            </span>
            <span v-if="riwayatState.quickDateFilter || riwayatState.startDate">
                <span v-if="riwayatState.quickDateFilter === 'today'">• Hari Ini</span>
                <span v-else-if="riwayatState.quickDateFilter === 'week'">• Minggu Ini</span>
                <span v-else-if="riwayatState.quickDateFilter === 'month'">• Bulan Ini</span>
                <span v-else>• {{ riwayatState.startDate }} - {{ riwayatState.endDate }}</span>
            </span>
            <span v-if="riwayatState.santriId" class="max-w-[120px] truncate">
                • {{ riwayatSelectedSantriName }}
            </span>
        </div>

        <!-- Filter Popup/Modal - Teleported to body -->
        <teleport to="body">
            <div v-if="riwayatState.isFilterOpen" 
                class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 animate-in fade-in duration-200"
                style="z-index: 9999;"
                @click.self="riwayatState.isFilterOpen = false">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mt-20 animate-in slide-in-from-top-4 duration-200" @click.stop>
                    <!-- Header -->
                    <div class="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 class="font-bold text-slate-900">Filter Riwayat</h3>
                        <button @click="riwayatState.isFilterOpen = false"
                            class="size-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition">
                            <span class="material-symbols-outlined text-slate-400">close</span>
                        </button>
                    </div>

                    <!-- Filter Content -->
                    <div class="p-4 space-y-4" style="max-height: 60vh; overflow-y: visible;">
                        <!-- Category Dropdown -->
                        <div>
                            <label class="text-xs font-bold text-slate-600 mb-2 block">Kategori</label>
                            <select v-model="riwayatState.category"
                                class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none">
                                <option value="">Semua ({{ filterCounts.all }})</option>
                                <option value="setoran">Setoran ({{ filterCounts.setoran }})</option>
                                <option value="sabaq">Sabaq ({{ filterCounts.sabaq }})</option>
                                <option value="sabqi">Sabqi ({{ filterCounts.sabqi }})</option>
                                <option value="manzil">Manzil ({{ filterCounts.manzil }})</option>
                                <option value="ujian">Ujian ({{ filterCounts.ujian }})</option>
                                <option value="pelanggaran">Pelanggaran ({{ filterCounts.pelanggaran }})</option>
                            </select>
                        </div>

                        <!-- Date Range Dropdown -->
                        <div>
                            <label class="text-xs font-bold text-slate-600 mb-2 block">Periode</label>
                            <select v-model="riwayatState.quickDateFilter" @change="setQuickDateFilter(riwayatState.quickDateFilter)"
                                class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none">
                                <option value="">Semua Waktu</option>
                                <option value="today">Hari Ini</option>
                                <option value="week">Minggu Ini</option>
                                <option value="month">Bulan Ini</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>

                        <!-- Custom Date Range (Show when custom selected) -->
                        <div v-if="riwayatState.quickDateFilter === 'custom'" 
                            class="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div>
                                <label class="text-xs font-bold text-slate-600 mb-1 block">Dari Tanggal</label>
                                <input type="date" v-model="riwayatState.startDate"
                                    class="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold text-slate-600 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-600 mb-1 block">Sampai Tanggal</label>
                                <input type="date" v-model="riwayatState.endDate"
                                    class="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold text-slate-600 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none">
                            </div>
                        </div>

                        <!-- Santri Dropdown -->
                        <div>
                            <label class="text-xs font-bold text-slate-600 mb-2 block">Santri</label>
                            <div class="relative" style="z-index: 100;">
                                <button
                                    @click.stop="riwayatState.isSantriDropdownOpen = !riwayatState.isSantriDropdownOpen"
                                    class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white text-left flex justify-between items-center transition hover:border-slate-300">
                                    <span :class="riwayatState.santriId ? 'text-slate-900' : 'text-slate-400'">
                                        {{ riwayatState.santriId ? riwayatSelectedSantriName : 'Semua Santri' }}
                                    </span>
                                    <span class="material-symbols-outlined text-slate-400 text-lg">expand_more</span>
                                </button>

                                <!-- Santri Dropdown -->
                                <div v-if="riwayatState.isSantriDropdownOpen"
                                    class="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                                    style="z-index: 9999;">
                                    <div class="p-2 border-b border-slate-50">
                                        <div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                                            <span class="material-symbols-outlined text-slate-400 text-lg">search</span>
                                            <input v-model="riwayatState.santriSearch" type="text"
                                                placeholder="Cari nama..."
                                                class="bg-transparent w-full text-sm font-bold outline-none placeholder:font-normal text-slate-700"
                                                @click.stop>
                                        </div>
                                    </div>
                                    <div class="max-h-48 overflow-y-auto custom-scrollbar">
                                        <div @click="selectRiwayatSantri({ santri_id: '' })"
                                            class="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors">
                                            <p class="text-sm font-bold text-slate-500 italic">Semua Santri</p>
                                        </div>
                                        <div v-for="s in riwayatFilteredSantriOptions" :key="s._id"
                                            @click="selectRiwayatSantri(s)"
                                            class="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
                                            <p class="text-sm font-bold text-slate-800">{{ s.full_name }}</p>
                                            <p class="text-[10px] text-slate-500">{{ s.santri_id }} &bull; {{ s.kelas || '-' }}</p>
                                        </div>
                                        <div v-if="riwayatFilteredSantriOptions.length === 0"
                                            class="p-4 text-center text-slate-400 text-xs italic">
                                            Tidak ditemukan
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Actions -->
                    <div class="p-4 border-t border-slate-100 flex gap-2">
                        <button @click="resetAllFilters"
                            class="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition">
                            Reset
                        </button>
                        <button @click="riwayatState.isFilterOpen = false"
                            class="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition">
                            Terapkan
                        </button>
                    </div>
                </div>
            </div>
        </teleport>

        <div class="bg-white rounded-xl border shadow-sm overflow-hidden mb-20 mx-2">
            <!-- Bulk Action Bar -->
            <div v-if="riwayatState.selectedIds.length > 0"
                class="p-2 pl-4 bg-red-50 border-b border-red-100 flex items-center animate-fade-in">
                <button @click="deleteSelected"
                    class="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-700 transition flex items-center gap-1 shadow-sm">
                    <span class="material-symbols-outlined text-sm">delete</span>
                    {{ riwayatState.selectedIds.length }} Data
                </button>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b">
                        <tr>
                            <th class="px-4 py-3 w-10 text-center">
                                <input type="checkbox" @change="toggleSelectAll(paginatedRiwayat)"
                                    :checked="paginatedRiwayat.length > 0 && paginatedRiwayat.every(i => riwayatState.selectedIds.includes(i._id))"
                                    class="rounded border-slate-300 text-primary focus:ring-primary">
                            </th>
                            <th class="px-4 py-3 whitespace-nowrap">Waktu</th>
                            <th class="px-4 py-3 whitespace-nowrap">Santri</th>
                            <th class="px-4 py-3 whitespace-nowrap">Jenis</th>
                            <th class="px-4 py-3 whitespace-nowrap">Detail</th>
                            <th class="px-4 py-3 whitespace-nowrap text-center">Nilai/Poin</th>
                            <th class="px-4 py-3 whitespace-nowrap text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="item in paginatedRiwayat" :key="item._id"
                            class="hover:bg-slate-50 transition"
                            :class="item.__cat === 'pelanggaran' ? 'bg-red-50/30 hover:bg-red-50' : ''">
                            
                            <!-- Checkbox -->
                            <td class="px-4 py-3 text-center">
                                <input type="checkbox"
                                    :checked="riwayatState.selectedIds.includes(item._id)"
                                    @change="toggleSelect(item._id)"
                                    class="rounded border-slate-300 text-primary focus:ring-primary">
                            </td>

                            <!-- Waktu -->
                            <td class="px-4 py-3 whitespace-nowrap">
                                <p class="text-xs text-slate-400 mb-0.5">{{ formatDateLong(item.date) }}</p>
                                <p class="text-xs font-bold text-slate-700">{{ formatTime(item.time) }}</p>
                            </td>

                            <!-- Santri -->
                            <td class="px-4 py-3 whitespace-nowrap">
                                <div class="font-bold text-xs truncate max-w-[150px]">{{ getSantriName(item.santri_id) }}</div>
                            </td>

                            <!-- Jenis -->
                            <td class="px-4 py-3 whitespace-nowrap">
                                <span class="text-[10px] font-bold uppercase"
                                    :class="item.__cat === 'pelanggaran' ? 'text-red-500' : 'text-slate-500'">
                                    {{ item.__cat === 'pelanggaran' ? 'PELANGGARAN' : item.setoran_type || (item.type === 'hafalan_exam' ? 'UJIAN HAFALAN' : item.type) || 'UJIAN' }}
                                </span>
                            </td>

                            <!-- Detail -->
                            <td class="px-4 py-3">
                                <div v-if="item.__cat === 'setoran'">
                                    <div v-if="item.setoran_type === 'Sabaq'">
                                        <div class="font-bold text-slate-700 text-xs truncate max-w-[150px]">
                                            {{ item.surah_from_latin ? item.surah_from_latin.replace(/^\d+\.\s*/, '') : '-' }}
                                        </div>
                                        <div class="text-[10px] text-slate-500">{{ item.pages }} Hal</div>
                                    </div>
                                    <div v-else-if="item.setoran_type === 'Manzil'">
                                        <div class="font-bold text-slate-700 text-xs">
                                            {{ item.page_from || '-' }} - {{ item.page_to || '-' }}
                                        </div>
                                        <div class="text-[10px] text-slate-500">
                                            Juz {{ getJuzFromPage(item.page_from) }} - Juz {{ getJuzFromPage(item.page_to) }}
                                        </div>
                                    </div>
                                    <div v-else>
                                        <div class="font-bold text-slate-700 text-xs">{{ item.pages }} Hal</div>
                                    </div>
                                </div>
                                <div v-else-if="item.__cat === 'ujian'">
                                    <div v-if="item.type && item.type.toLowerCase().includes('al-qur')">
                                        <div class="font-bold text-slate-700 text-xs">{{ item.type }}</div>
                                        <div class="text-[10px] text-slate-500">
                                            Juz {{ item.juz || (item.detail ? item.detail.replace(/[^\d]/g, '') : '-') }}
                                        </div>
                                    </div>
                                    <div v-else>
                                        <div class="font-bold text-slate-700 text-xs">
                                            {{ item.type === 'hafalan_exam' ? 'Ujian Hafalan' : item.type }}
                                        </div>
                                        <div class="text-[10px] text-slate-500 truncate max-w-[150px]">
                                            {{ (item.detail || '-').replace('menyetorkan hafalan', 'selesai') }}
                                        </div>
                                    </div>
                                </div>
                                <div v-else-if="item.__cat === 'pelanggaran'">
                                    <div class="font-bold text-red-600 text-xs truncate max-w-[150px]">
                                        {{ item.description || '-' }}
                                    </div>
                                </div>
                            </td>

                            <!-- Nilai -->
                            <td class="px-4 py-3 text-center">
                                <span v-if="item.__cat === 'setoran'"
                                    class="px-2 py-1 rounded text-xs font-black"
                                    :class="item.grade === 'A+' ? 'text-emerald-600 bg-emerald-50' : item.grade === 'C' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'">
                                    {{ item.grade }}
                                </span>
                                <span v-else-if="item.__cat === 'ujian'"
                                    class="px-2 py-1 rounded text-xs font-black"
                                    :class="(item.score >= 80) ? 'text-emerald-600 bg-emerald-50' : (item.score < 70) ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'">
                                    {{ item.score }}
                                </span>
                                <span v-else-if="item.__cat === 'pelanggaran'"
                                    class="px-2 py-1 rounded text-xs font-black text-red-600 bg-red-100">
                                    -{{ item.points || item.poin || 0 }}
                                </span>
                            </td>

                            <!-- Aksi -->
                            <td class="px-4 py-3 text-center relative">
                                <button @click.stop="toggleActionMenu(item._id)"
                                    class="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition">
                                    <span class="material-symbols-outlined">more_vert</span>
                                </button>
                                <div v-if="riwayatState.activeActionId === item._id"
                                    class="absolute right-8 top-2 bg-white rounded-lg shadow-xl border border-slate-100 z-50 w-32 overflow-hidden text-left animate-fade-in flex flex-col">
                                    <button @click="editRiwayat(item); closeActionMenu()"
                                        class="px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-2 w-full text-left">
                                        <span class="material-symbols-outlined text-sm">edit</span> Edit
                                    </button>
                                    <button @click="deleteRiwayat(item); closeActionMenu()"
                                        class="px-4 py-2 hover:bg-red-50 text-xs font-bold text-red-600 flex items-center gap-2 w-full text-left border-t border-slate-50">
                                        <span class="material-symbols-outlined text-sm">delete</span> Hapus
                                    </button>
                                </div>
                                <div v-if="riwayatState.activeActionId === item._id" @click="closeActionMenu()" class="fixed inset-0 z-40 cursor-default"></div>
                            </td>
                        </tr>
                        <tr v-if="paginatedRiwayat.length === 0">
                            <td colspan="7" class="px-4 py-8 text-center text-slate-400 font-bold text-xs">
                                Belum ada riwayat setoran/ujian.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="p-4 border-t border-slate-50 flex flex-col items-center gap-2">
                <div class="flex gap-2">
                    <button @click="riwayatState.page--" :disabled="riwayatState.page === 1"
                        class="px-3 py-1 rounded border hover:bg-slate-50 disabled:opacity-50 text-xs font-bold">
                        Prev
                    </button>
                    <span class="px-3 py-1 text-xs font-bold text-slate-600">
                        Hal {{ riwayatState.page }} / {{ riwayatTotalPages || 1 }}
                    </span>
                    <button @click="riwayatState.page++" :disabled="riwayatState.page >= riwayatTotalPages"
                        class="px-3 py-1 rounded border hover:bg-slate-50 disabled:opacity-50 text-xs font-bold">
                        Next
                    </button>
                </div>
            </div>
        </div>
    </div>
    `
};
