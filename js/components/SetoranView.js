const SetoranView = {
    props: [
        'setoranForm',
        'setoranSantriSearch',
        'isSetoranSantriDropdownOpen',
        'setoranFilteredSantriOptions',
        'setoranSelectedSantriName',
        'surahList',
        'surahHints',
        'autoCalcInfo',
        'recentSetoran',
        'isMenuOpen' // Function passed as prop? No, likely just use the function directly if passed, or emit
    ],
    emits: [
        'update:setoranSantriSearch',
        'update:isSetoranSantriDropdownOpen',
        'select-setoran-santri',
        'change-setoran-type',
        'sync-surah',
        'validate-ayat',
        'toggle-manzil-mode',
        'calc-pages-from-range',
        'adjust-value',
        'update-grade',
        'save-setoran',
        'edit-setoran',
        'delete-setoran',
        'toggle-menu'
    ],
    setup(props, { emit }) {
        // Helper to emit search update
        const updateSearch = (e) => {
            emit('update:setoranSantriSearch', e.target.value);
        };

        return {
            updateSearch
        }
    },
    template: `
    <div class="fade-in pb-48">
        <h2 class="text-2xl font-bold mb-5">Input Setoran</h2>

        <div class="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
            <!-- Santri Custom Searchable Dropdown -->
            <div class="relative">
                <label class="text-xs font-bold text-slate-600 mb-1 block">Santri</label>

                <!-- Trigger Button -->
                <button @click="$emit('update:isSetoranSantriDropdownOpen', !isSetoranSantriDropdownOpen)"
                    class="w-full p-3 border rounded-xl text-sm font-bold bg-white text-left flex justify-between items-center transition"
                    :class="isSetoranSantriDropdownOpen ? 'ring-2 ring-primary/20 border-primary' : 'border-slate-200'">
                    <span :class="setoranForm.santri_id ? 'text-slate-900' : 'text-slate-400'">
                        {{ setoranForm.santri_id ? setoranSelectedSantriName : '-- Pilih Santri --' }}
                    </span>
                    <span class="material-symbols-outlined text-slate-400">expand_more</span>
                </button>

                <!-- Dropdown Content -->
                <div v-if="isSetoranSantriDropdownOpen"
                    class="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100">

                    <!-- Search Input -->
                    <div class="p-2 border-b border-slate-50">
                        <div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            <span class="material-symbols-outlined text-slate-400 text-lg">search</span>
                            <input :value="setoranSantriSearch" @input="updateSearch"
                                type="text" placeholder="Cari nama..."
                                class="bg-transparent w-full text-sm font-bold outline-none placeholder:font-normal text-slate-700"
                                @click.stop>
                        </div>
                    </div>

                    <!-- Lists -->
                    <div class="max-h-60 overflow-y-auto custom-scrollbar">
                        <div v-for="s in setoranFilteredSantriOptions" :key="s._id"
                            @click="$emit('select-setoran-santri', s)"
                            class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors group">
                            <p class="text-sm font-bold text-slate-800 group-hover:text-primary">{{ s.full_name }}</p>
                            <p class="text-[10px] text-slate-500">{{ s.santri_id }} &bull; {{ s.kelas || '-' }}</p>
                        </div>

                        <!-- Empty State -->
                        <div v-if="setoranFilteredSantriOptions.length === 0"
                            class="p-4 text-center text-slate-400 text-xs italic">
                            Tidak ditemukan
                        </div>
                    </div>
                </div>

                <!-- Backdrop -->
                <div v-if="isSetoranSantriDropdownOpen"
                    @click="$emit('update:isSetoranSantriDropdownOpen', false)"
                    class="fixed inset-0 z-20 cursor-default"></div>
            </div>

            <!-- Type Tabs -->
            <div class="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <label v-for="type in ['Sabaq', 'Sabqi', 'Robt', 'Manzil']" :key="type"
                    class="flex-1 min-w-[70px]">
                    <input type="radio" :value="type" v-model="setoranForm.setoran_type"
                        @change="$emit('change-setoran-type', type)" class="peer hidden">
                    <div
                        class="py-2 text-center rounded-lg border text-sm font-bold text-slate-500 peer-checked:bg-primary peer-checked:text-white transition cursor-pointer">
                        {{ type }}
                    </div>
                </label>
            </div>

            <!-- FORM SABAQ -->
            <div v-if="setoranForm.setoran_type === 'Sabaq'" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold text-slate-400">Dari Surat</label>
                        <select v-model.number="setoranForm.surah_from"
                            @change="$emit('sync-surah'); $emit('validate-ayat', 'from')"
                            class="w-full p-2 border rounded-xl text-sm">
                            <option v-for="s in surahList" :key="s.no" :value="s.no">
                                {{ s.no }}. {{ s.latin }}
                            </option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-400">Sampai Surat</label>
                        <select v-model.number="setoranForm.surah_to" @change="$emit('validate-ayat', 'to')"
                            class="w-full p-2 border rounded-xl text-sm">
                            <option v-for="s in surahList" :key="s.no" :value="s.no">
                                {{ s.no }}. {{ s.latin }}
                            </option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold text-slate-400">Dari Ayat</label>
                        <input type="number" v-model.number="setoranForm.ayat_from"
                            @input="$emit('validate-ayat', 'from')"
                            class="w-full p-2 border rounded-xl text-center font-bold" placeholder="1">
                        <p v-if="surahHints.from.visible"
                            class="text-[10px] text-slate-400 mt-1 text-center">
                            {{ surahHints.from.text }}
                        </p>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-400">Sampai Ayat</label>
                        <input type="number" v-model.number="setoranForm.ayat_to"
                            @input="$emit('validate-ayat', 'to')"
                            class="w-full p-2 border rounded-xl text-center font-bold" placeholder="10">
                        <p v-if="surahHints.to.visible"
                            class="text-[10px] text-slate-400 mt-1 text-center">
                            {{ surahHints.to.text }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- FORM MANZIL -->
            <div v-if="setoranForm.setoran_type === 'Manzil'" class="space-y-3">
                <div>
                    <label class="text-xs font-bold text-slate-400">Opsi Input</label>
                    <select v-model="setoranForm.manzil_mode" @change="$emit('toggle-manzil-mode')"
                        class="w-full p-2 border rounded-xl font-bold">
                        <option value="juz">Per Juz</option>
                        <option value="page">Per Halaman</option>
                    </select>
                </div>

                <!-- Juz Mode -->
                <div v-if="setoranForm.manzil_mode === 'juz'">
                    <label class="text-xs font-bold text-slate-400">Juz</label>
                    <select v-model.number="setoranForm.juz"
                        @change="setoranForm.pages = 20; $emit('update-grade')"
                        class="w-full p-2 border rounded-xl font-bold">
                        <option v-for="i in 30" :key="i" :value="i">Juz {{ i }}</option>
                    </select>
                </div>

                <!-- Page Mode -->
                <div v-if="setoranForm.manzil_mode === 'page'" class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold text-slate-400">Dari Hal</label>
                        <input type="number" v-model.number="setoranForm.page_from"
                            @input="$emit('calc-pages-from-range')"
                            class="w-full p-2 border rounded-xl text-center font-bold">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-400">Sampai Hal</label>
                        <input type="number" v-model.number="setoranForm.page_to"
                            @input="$emit('calc-pages-from-range')"
                            class="w-full p-2 border rounded-xl text-center font-bold">
                    </div>
                </div>
            </div>

            <!-- AUTO INFO -->
            <div v-if="autoCalcInfo.visible"
                class="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-2">
                <span class="material-symbols-outlined text-blue-600">info</span>
                <p class="text-xs text-blue-800 font-medium" v-html="autoCalcInfo.text"></p>
            </div>

            <!-- SCORING -->
            <div class="bg-slate-50 p-4 rounded-xl border space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <!-- Pages -->
                    <div>
                        <label class="text-xs font-bold text-slate-400">Halaman</label>
                        <div class="flex items-center gap-2">
                            <button @click="$emit('adjust-value', 'pages', -0.5)"
                                class="size-8 rounded-lg bg-white border shadow-sm font-bold text-slate-500">
                                -
                            </button>
                            <input type="number" v-model.number="setoranForm.pages"
                                @input="$emit('update-grade')"
                                :readonly="setoranForm.setoran_type === 'Manzil' || setoranForm.setoran_type === 'Sabqi' || setoranForm.setoran_type === 'Robt'"
                                class="w-full bg-white p-2 border rounded-lg text-center font-bold"
                                :class="{ 'text-gray-400': setoranForm.setoran_type === 'Manzil' || setoranForm.setoran_type === 'Sabqi' || setoranForm.setoran_type === 'Robt' }">
                            <button @click="$emit('adjust-value', 'pages', 0.5)"
                                class="size-8 rounded-lg bg-white border shadow-sm font-bold text-slate-500">
                                +
                            </button>
                        </div>
                    </div>

                    <!-- Errors -->
                    <div>
                        <label class="text-xs font-bold text-slate-400">Salah</label>
                        <div class="flex items-center gap-2">
                            <button @click="$emit('adjust-value', 'errors', -1)"
                                class="size-8 rounded-lg bg-white border shadow-sm font-bold text-slate-500">
                                -
                            </button>
                            <input type="number" v-model.number="setoranForm.errors"
                                @input="$emit('update-grade')"
                                class="w-full bg-white p-2 border rounded-lg text-center font-bold text-red-500">
                            <button @click="$emit('adjust-value', 'errors', 1)"
                                class="size-8 rounded-lg bg-white border shadow-sm font-bold text-slate-500">
                                +
                            </button>
                        </div>
                    </div>
                </div>

                <!-- PREVIEW GRADE -->
                <div class="flex justify-between items-center pt-2 border-t">
                    <span class="text-xs font-bold text-slate-400">Nilai & Grade</span>
                    <div class="text-right">
                        <span :class="{
                                'text-emerald-600': setoranForm.grade.startsWith('A'),
                                'text-blue-600': setoranForm.grade === 'B',
                                'text-red-600': setoranForm.grade === 'C'
                            }" class="text-3xl font-black">
                            {{ setoranForm.grade }}
                        </span>
                        <span class="text-xs font-mono text-slate-400 block">
                            {{ setoranForm.score.toFixed(1) }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- META (Date/Time) -->
            <div class="grid grid-cols-2 gap-3">
                <input type="date" v-model="setoranForm.setoran_date"
                    class="w-full p-2 border rounded-xl text-xs font-bold">
                <input type="time" v-model="setoranForm.setoran_time"
                    class="w-full p-2 border rounded-xl text-xs font-bold">
            </div>

            <!-- Save Button -->
            <button @click="$emit('save-setoran')"
                class="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg text-lg hover:bg-blue-800 transition">
                Simpan Setoran
            </button>
        </div>

        <!-- Recent History -->
        <div class="mt-6 mx-2">
            <h3 class="font-bold text-slate-700 mb-2 px-1">Riwayat Setoran Terbaru</h3>
            <div class="space-y-2">
                <!-- Recent Items -->
                <div v-for="r in recentSetoran" :key="r._id"
                    class="bg-white p-3 rounded-xl border shadow-sm flex justify-between items-center">
                    <div class="overflow-hidden flex-1">
                        <div class="text-xs text-slate-400 font-bold mb-0.5">
                            {{ r.setoran_date }} <span v-if="r.setoran_time">&bull; {{ r.setoran_time }}</span>
                        </div>
                        <div class="font-bold text-slate-800 text-sm truncate">
                            {{ r.santri_name || 'Santri' }}
                        </div>
                        <div class="text-xs text-slate-500 font-medium truncate">
                            {{ r.setoran_type }} &bull; {{ r.detail || '-' }}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <div :class="{
                                'text-emerald-600': r.grade === 'A+' || r.grade === 'A',
                                'text-blue-600': r.grade === 'B' || r.grade === 'B+',
                                'text-red-500': r.grade === 'C'
                            }" class="font-black text-sm">
                            {{ r.grade }}
                        </div>
                        <!-- 3 Dots Menu -->
                        <div class="relative">
                            <button @click.stop="$emit('toggle-menu', r._id)"
                                class="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
                                <span class="material-symbols-outlined text-lg">more_vert</span>
                            </button>
                            <!-- Dropdown -->
                            <div v-if="isMenuOpen(r._id)" @click.stop
                                class="absolute right-0 top-10 bg-white rounded-xl shadow-lg border z-50 py-1 min-w-[120px]">
                                <button @click="$emit('edit-setoran', r); $emit('toggle-menu', r._id)"
                                    class="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 text-blue-600 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-lg">edit</span>
                                    Edit
                                </button>
                                <button @click="$emit('delete-setoran', r._id); $emit('toggle-menu', r._id)"
                                    class="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-500 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-lg">delete</span>
                                    Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <p v-if="!recentSetoran || recentSetoran.length === 0"
                    class="text-center text-slate-400 text-xs py-4">
                    Belum ada data setoran {{ setoranForm.setoran_type }} terbaru
                </p>
            </div>
        </div>
    </div>
    `
};
