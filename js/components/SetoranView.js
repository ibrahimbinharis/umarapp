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
        'isMenuOpen',
        'isClockRunning',
        'lastRecordForType',
        'santriTargetProgress',
        'setoranEditingId',
        'appConfig',
        'userSession',
        'surahSearch',
        'filteredSurahList'
    ],
    emits: [
        'update:setoranSantriSearch',
        'update:isSetoranSantriDropdownOpen',
        'update:isClockRunning',
        'select-setoran-santri',
        'change-setoran-type',
        'sync-surah',
        'validate-ayat',
        'toggle-manzil-mode',
        'toggle-tilawah-mode',
        'calc-pages-from-juz-range',
        'calc-pages-from-range',
        'adjust-value',
        'update-grade',
        'save-setoran',
        'edit-setoran',
        'delete-setoran',
        'toggle-menu',
        'reset-setoran',
        'cancel-edit',
        'update:surahSearch',
        'apply-last-record'
    ],
    setup(props, { emit }) {
        // Helper to emit search update
        const updateSearch = (e) => {
            emit('update:setoranSantriSearch', e.target.value);
        };

        const updateSurahSearch = (e) => {
            emit('update:surahSearch', e.target.value);
        };

        // Local UI states for Surah Search
        const isSurahFromOpen = ref(false);
        const isSurahToOpen = ref(false);

        const selectSurah = (target, surah) => {
            if (target === 'from') {
                props.setoranForm.surah_from = surah.no;
                emit('sync-surah');
                emit('validate-ayat', 'from');
                isSurahFromOpen.value = false;
            } else {
                props.setoranForm.surah_to = surah.no;
                emit('validate-ayat', 'to');
                isSurahToOpen.value = false;
            }
            emit('update:surahSearch', ''); // Reset search
        };

        // Get Surah Name helper
        const getSurahName = (no) => {
            const s = props.surahList.find(i => i.no === no);
            return s ? `${s.no}. ${s.latin}` : '-- Pilih Surat --';
        };

        return {
            updateSearch,
            updateSurahSearch,
            isSurahFromOpen,
            isSurahToOpen,
            selectSurah,
            getSurahName
        }
    },
    template: `
    <div class="fade-in pb-48">
        <!-- Holiday Mode Banner (Added v36) -->
        <div v-if="appConfig?.isHolidayMode" 
            class="mx-1 mb-6 p-4 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg relative overflow-hidden group">
            <div class="relative z-10 flex items-center gap-3">
                <div class="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined text-2xl">beach_access</span>
                </div>
                <div>
                    <h3 class="font-black text-xs uppercase tracking-widest leading-none mb-1">Mode Liburan Aktif</h3>
                    <p class="text-[9px] opacity-90 font-bold leading-tight max-w-[200px]">Input mandiri diperbolehkan. Gunakan fitur ini untuk tetap istiqomah!</p>
                </div>
            </div>
            <!-- Decorative Icon -->
            <span class="material-symbols-outlined absolute -right-4 -bottom-4 text-7xl opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700">sunny</span>
        </div>

        <div class="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
            <!-- Santri Custom Searchable Dropdown -->
            <div class="relative">
                <label class="text-xs font-bold text-slate-600 mb-1 block">Santri</label>

                <!-- Trigger Button (Locked for Santri) -->
                <button @click="userSession.role !== 'santri' ? $emit('update:isSetoranSantriDropdownOpen', !isSetoranSantriDropdownOpen) : null"
                    class="w-full p-3 border rounded-xl text-sm font-bold bg-white text-left flex justify-between items-center transition"
                    :class="[
                        isSetoranSantriDropdownOpen ? 'ring-2 ring-primary/20 border-primary' : 'border-slate-200',
                        userSession.role === 'santri' ? 'bg-slate-50 cursor-default' : ''
                    ]">
                    <span :class="setoranForm.santri_id ? 'text-slate-900' : 'text-slate-400'">
                        {{ setoranForm.santri_id ? setoranSelectedSantriName : '-- Pilih Santri --' }}
                    </span>
                    <div class="flex items-center gap-1">
                        <template v-if="userSession.role !== 'santri'">
                            <!-- Clear Selection Button -->
                            <span v-if="setoranForm.santri_id" @click.stop="$emit('reset-setoran')" 
                                class="material-symbols-outlined text-slate-300 hover:text-red-500 transition-colors p-1.5 -mr-1.5 text-lg"
                                title="Batal pilih santri">
                                cancel
                            </span>
                            <span class="material-symbols-outlined text-slate-400 transition-transform duration-200" 
                                :class="{ 'rotate-180': isSetoranSantriDropdownOpen }">expand_more</span>
                        </template>
                        <span v-else class="material-symbols-outlined text-slate-300 text-sm">lock</span>
                    </div>
                </button>

                <!-- Dropdown Content -->
                <div v-if="isSetoranSantriDropdownOpen"
                    class="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100">

                    <!-- Search Input -->
                    <div class="p-2 border-b border-slate-50">
                        <div class="flex items-center gap-2 p-2 rounded-xl border border-slate-200 transition focus-within:ring-2 focus-within:ring-primary/20 shadow-sm bg-white">
                            <span class="material-symbols-outlined text-slate-400 ml-2">search</span>
                            <input :value="setoranSantriSearch" @input="updateSearch"
                                type="text" placeholder="Cari berdasarkan nama atau NIS..."
                                class="bg-transparent w-full text-sm font-bold outline-none placeholder:text-slate-400"
                                @click.stop>
                            <!-- Search Clear Button -->
                            <button v-if="setoranSantriSearch" @click.stop="$emit('update:setoranSantriSearch', '')"
                                class="size-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors mr-1">
                                <span class="material-symbols-outlined text-lg">close</span>
                            </button>
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

            <!-- Last Record & Progress (New Section) -->
            <div v-if="setoranForm.santri_id" 
                class="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                
                <!-- Target Progress Stick -->
                <div v-if="santriTargetProgress.show" class="space-y-1.5">
                    <div class="flex justify-between items-end text-[10px] font-bold">
                        <span class="text-slate-400">TARGET BULAN INI</span>
                        <span class="text-primary uppercase tracking-wider">
                            <template v-if="santriTargetProgress.target === 0">Khatam</template>
                            <template v-else>{{ santriTargetProgress.current }} / {{ santriTargetProgress.target }} {{ santriTargetProgress.unit }}</template>
                        </span>
                    </div>
                    <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-inner flex">
                        <div class="h-full bg-primary transition-all duration-1000 relative" 
                            :style="{ width: santriTargetProgress.pct + '%' }">
                            <!-- Shine Effect -->
                            <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                    </div>
                    <div class="text-[9px] text-slate-400 font-medium text-right italic">
                        {{ santriTargetProgress.pct }}% tercapai
                    </div>
                </div>

                <!-- Last Record Mini Card (Simple v37) -->
                <div v-if="lastRecordForType" 
                    @click="['Sabaq', 'Manzil'].includes(setoranForm.setoran_type) ? $emit('apply-last-record') : null"
                    class="flex items-center gap-4 p-3 -m-1 rounded-2xl transition-all group/last border border-transparent"
                    :class="['Sabaq', 'Manzil'].includes(setoranForm.setoran_type) ? 'hover:bg-blue-50 hover:border-blue-100 cursor-pointer active:scale-[0.99]' : 'cursor-default'">
                    <div class="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex-shrink-0">
                        <span class="material-symbols-outlined text-primary text-xl">history</span>
                    </div>
                    <div class="flex-grow">
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                            {{ setoranForm.setoran_type === 'Sabqi' ? 'Riwayat Sabaq terakhir' : (setoranForm.setoran_type === 'Robt' ? 'Riwayat Sabqi terakhir' : 'Riwayat ' + setoranForm.setoran_type + ' Terakhir') }}
                        </p>
                        <p class="text-xs font-bold text-slate-800 leading-tight group-hover/last:text-primary transition-colors">
                            {{ lastRecordForType.detail }}
                        </p>
                        <p class="text-[9px] text-slate-400 mt-1">
                            {{ lastRecordForType.friendly_date }}
                        </p>
                    </div>
                    <!-- Right Arrow Indicator -->
                    <div v-if="['Sabaq', 'Manzil'].includes(setoranForm.setoran_type)" class="text-slate-300 group-hover/last:text-primary transition-colors">
                        <span class="material-symbols-outlined">chevron_right</span>
                    </div>
                </div>
                <!-- Empty Record State -->
                <div v-else class="flex items-center gap-2 py-1">
                    <span class="material-symbols-outlined text-slate-300 text-sm">info</span>
                    <p class="text-[10px] italic text-slate-400 font-medium tracking-tight">Belum ada catatan {{ setoranForm.setoran_type }} khusus bulan ini.</p>
                </div>
            </div>

            <!-- Type Tabs -->
            <div class="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <label v-for="type in ['Sabaq', 'Sabqi', 'Robt', 'Manzil', 'Tilawah']" :key="type"
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
                    <!-- Surah From Dropdown -->
                    <div class="relative">
                        <label class="text-xs font-bold text-slate-400">Dari Surat</label>
                        <button @click="isSurahFromOpen = !isSurahFromOpen; isSurahToOpen = false"
                            class="w-full p-2 border rounded-xl text-sm font-bold bg-white text-left flex justify-between items-center transition hover:border-blue-300">
                            <span class="truncate">{{ getSurahName(setoranForm.surah_from) }}</span>
                            <span class="material-symbols-outlined text-slate-400 text-sm transition-transform" :class="{'rotate-180': isSurahFromOpen}">expand_more</span>
                        </button>

                        <div v-if="isSurahFromOpen" class="absolute left-0 right-0 top-full mt-1 bg-white border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <!-- Local Search inside Dropdown -->
                            <div class="p-2 border-b">
                                <input :value="surahSearch" @input="updateSurahSearch" 
                                    class="w-full p-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-primary/10"
                                    placeholder="Cari surat..." @click.stop autofocus>
                            </div>
                            <div class="max-h-56 overflow-y-auto custom-scrollbar">
                                <div v-for="s in filteredSurahList" :key="s.no" 
                                    @click="selectSurah('from', s)"
                                    class="px-3 py-2 text-xs font-bold hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                    :class="setoranForm.surah_from === s.no ? 'text-primary bg-blue-50/50' : 'text-slate-700'">
                                    {{ s.no }}. {{ s.latin }}
                                </div>
                                <div v-if="filteredSurahList.length === 0" class="p-4 text-center text-slate-400 text-[10px] italic">Tidak ditemukan</div>
                            </div>
                        </div>
                        <!-- Backdrop -->
                        <div v-if="isSurahFromOpen" @click="isSurahFromOpen = false; $emit('update:surahSearch', '')" class="fixed inset-0 z-40"></div>
                    </div>

                    <!-- Surah To Dropdown -->
                    <div class="relative">
                        <label class="text-xs font-bold text-slate-400">Sampai Surat</label>
                        <button @click="isSurahToOpen = !isSurahToOpen; isSurahFromOpen = false"
                            class="w-full p-2 border rounded-xl text-sm font-bold bg-white text-left flex justify-between items-center transition hover:border-blue-300">
                            <span class="truncate">{{ getSurahName(setoranForm.surah_to) }}</span>
                            <span class="material-symbols-outlined text-slate-400 text-sm transition-transform" :class="{'rotate-180': isSurahToOpen}">expand_more</span>
                        </button>

                        <div v-if="isSurahToOpen" class="absolute left-0 right-0 top-full mt-1 bg-white border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <div class="p-2 border-b">
                                <input :value="surahSearch" @input="updateSurahSearch" 
                                    class="w-full p-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-primary/10"
                                    placeholder="Cari surat..." @click.stop autofocus>
                            </div>
                            <div class="max-h-56 overflow-y-auto custom-scrollbar">
                                <div v-for="s in filteredSurahList" :key="s.no" 
                                    @click="selectSurah('to', s)"
                                    class="px-3 py-2 text-xs font-bold hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                    :class="setoranForm.surah_to === s.no ? 'text-primary bg-blue-50/50' : 'text-slate-700'">
                                    {{ s.no }}. {{ s.latin }}
                                </div>
                                <div v-if="filteredSurahList.length === 0" class="p-4 text-center text-slate-400 text-[10px] italic">Tidak ditemukan</div>
                            </div>
                        </div>
                        <div v-if="isSurahToOpen" @click="isSurahToOpen = false; $emit('update:surahSearch', '')" class="fixed inset-0 z-40"></div>
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
                        class="w-full p-2 border rounded-xl font-bold">
                        <option v-for="i in 30" :key="i" :value="i">Juz {{ i }}</option>
                    </select>
                </div>

                <!-- Page Mode -->
                <div v-if="setoranForm.manzil_mode === 'page'" class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold text-slate-400">Dari Hal</label>
                        <input type="number" v-model.number="setoranForm.page_from"
                            @input="$emit('calc-pages-from-range')" min="1" max="604"
                            class="w-full p-2 border rounded-xl text-center font-bold">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-400">Sampai Hal</label>
                        <input type="number" v-model.number="setoranForm.page_to"
                            @input="$emit('calc-pages-from-range')" min="1" max="604"
                            class="w-full p-2 border rounded-xl text-center font-bold">
                    </div>
                </div>
            </div>

            <!-- FORM TILAWAH -->
            <div v-if="setoranForm.setoran_type === 'Tilawah'" class="space-y-3">
                <div>
                    <label class="text-xs font-bold text-slate-400">Opsi Input</label>
                    <select v-model="setoranForm.tilawah_mode" @change="$emit('toggle-tilawah-mode')"
                        class="w-full p-2 border rounded-xl font-bold">
                        <option value="juz">Per Juz</option>
                        <option value="page">Per Halaman</option>
                    </select>
                </div>

                <!-- Juz Mode -->
                <div v-if="setoranForm.tilawah_mode === 'juz'" class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold text-slate-400">Dari Juz</label>
                        <select v-model.number="setoranForm.juz_from"
                            @change="$emit('calc-pages-from-juz-range')"
                            class="w-full p-2 border rounded-xl font-bold">
                            <option v-for="i in 30" :key="i" :value="i">Juz {{ i }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-400">Sampai Juz</label>
                        <select v-model.number="setoranForm.juz_to"
                            @change="$emit('calc-pages-from-juz-range')"
                            class="w-full p-2 border rounded-xl font-bold">
                            <option v-for="i in 30" :key="i" :value="i">Juz {{ i }}</option>
                        </select>
                    </div>
                </div>

                <!-- Page Mode -->
                <div v-if="setoranForm.tilawah_mode === 'page'" class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold text-slate-400">Dari Hal</label>
                        <input type="number" v-model.number="setoranForm.page_from"
                            @input="$emit('calc-pages-from-range')" min="1" max="604"
                            class="w-full p-2 border rounded-xl text-center font-bold">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-400">Sampai Hal</label>
                        <input type="number" v-model.number="setoranForm.page_to"
                            @input="$emit('calc-pages-from-range')" min="1" max="604"
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
                <div class="grid gap-4" :class="setoranForm.setoran_type === 'Tilawah' ? 'grid-cols-1' : 'grid-cols-2'">
                    <!-- Pages -->
                    <div>
                        <label class="text-xs font-bold text-slate-400">
                            {{ setoranForm.setoran_type === 'Tilawah' ? 'Total Juz' : 'Total Halaman' }}
                        </label>
                        <div class="flex items-center gap-2">
                            <button @click="$emit('adjust-value', 'pages', -0.5)"
                                class="size-8 rounded-lg bg-white border shadow-sm font-bold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">
                                -
                            </button>
                            <div class="flex-1 text-center">
                                <input v-if="setoranForm.setoran_type === 'Tilawah'"
                                    type="text" 
                                    :value="(setoranForm.pages / 20).toFixed(1) + ' Juz'"
                                    readonly
                                    class="w-full bg-slate-50 p-2 border rounded-lg text-center font-bold text-slate-700">
                                <input v-else
                                    type="number" v-model.number="setoranForm.pages"
                                    @input="$emit('update-grade')"
                                    :readonly="setoranForm.setoran_type === 'Manzil' || setoranForm.setoran_type === 'Sabqi' || setoranForm.setoran_type === 'Robt'"
                                    class="w-full bg-white p-2 border rounded-lg text-center font-bold"
                                    :class="{ 'text-slate-400': setoranForm.setoran_type !== 'Sabaq' }">
                            </div>
                            <button @click="$emit('adjust-value', 'pages', 0.5)"
                                class="size-8 rounded-lg bg-white border shadow-sm font-bold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">
                                +
                            </button>
                        </div>
                    </div>

                    <!-- Errors -->
                    <div v-if="setoranForm.setoran_type !== 'Tilawah'">
                        <label class="text-xs font-bold text-slate-400">Salah</label>
                        <div class="flex items-center gap-2">
                            <button @click="$emit('adjust-value', 'errors', -1)"
                                class="size-8 rounded-lg bg-white border shadow-sm font-bold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">
                                -
                            </button>
                            <input type="number" v-model.number="setoranForm.errors"
                                @input="$emit('update-grade')"
                                class="w-full bg-white p-2 border rounded-lg text-center font-bold text-red-500">
                            <button @click="$emit('adjust-value', 'errors', 1)"
                                class="size-8 rounded-lg bg-white border shadow-sm font-bold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">
                                +
                            </button>
                        </div>
                    </div>
                </div>

                <!-- PREVIEW GRADE (Hidden for Tilawah) -->
                <div v-if="setoranForm.setoran_type !== 'Tilawah'" class="flex justify-between items-center pt-2 border-t">
                    <span class="text-xs font-bold text-slate-400">Nilai & Grade</span>
                    <div class="text-right">
                        <span :class="{
                                'text-blue-600': setoranForm.grade.startsWith('A'),
                                'text-emerald-600': setoranForm.grade === 'B' || setoranForm.grade === 'B+',
                                'text-amber-500': setoranForm.grade === 'B-',
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
                <div>
                    <label class="text-[10px] font-bold text-slate-400 block mb-1">Tanggal</label>
                    <input type="date" v-model="setoranForm.setoran_date"
                        @change="$emit('update:isClockRunning', false)"
                        @input="$emit('update:isClockRunning', false)"
                        class="w-full p-2 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none">
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 block mb-1">Waktu</label>
                    <div class="relative">
                        <input type="time" v-model="setoranForm.setoran_time"
                            @input="$emit('update:isClockRunning', false)"
                            @change="$emit('update:isClockRunning', false)"
                            @focus="$emit('update:isClockRunning', false)"
                            class="w-full p-2 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none bg-white">
                    </div>
                </div>
            </div>

            <!-- Actions (Restricted for Santri) -->
            <template v-if="userSession?.role === 'admin' || userSession?.role === 'guru' || appConfig?.isHolidayMode">
                <div class="flex gap-2">
                    <button v-if="setoranEditingId" @click="$emit('cancel-edit')"
                        class="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold shadow-sm text-sm hover:bg-slate-200 transition">
                        Batal
                    </button>
                    <button v-else @click="$emit('reset-setoran')"
                        class="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold shadow-sm text-sm hover:bg-slate-200 transition">
                        Reset
                    </button>
                    <button @click="$emit('save-setoran')"
                        class="flex-[2] bg-primary text-white py-3 rounded-xl font-bold shadow-lg text-base hover:bg-blue-800 transition">
                        {{ setoranEditingId ? 'Update Data' : 'Simpan Data' }}
                    </button>
                </div>
            </template>
            <div v-else-if="userSession?.role === 'santri'" class="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center gap-3">
                <span class="material-symbols-outlined text-amber-600">lock</span>
                <p class="text-[10px] font-bold text-amber-800 leading-tight">Input mandiri hanya aktif saat Masa Liburan. Silahkan hubungi Guru untuk update hari ini.</p>
            </div>
        </div>

        <!-- Recent History -->
        <div class="mt-6 mx-2 mb-20">
            <h3 class="font-bold text-slate-700 mb-2 px-1">Riwayat Setoran Terbaru</h3>
            <div class="max-h-[400px] overflow-y-auto pr-1 custom-scrollbar space-y-2">
                <!-- Recent Items -->
                    <div v-for="r in recentSetoran" :key="r._id"
                        class="bg-white p-3 rounded-xl border shadow-sm flex justify-between items-center transition hover:bg-slate-50 cursor-pointer active:scale-[0.98]"
                        :class="{ 'z-[100] border-blue-200 ring-2 ring-primary/10 shadow-2xl relative': isMenuOpen(r._id) }"
                        @click.stop="$emit('toggle-menu', r._id)">
                        <div class="overflow-hidden flex-1 pr-2">
                            <div class="font-bold text-slate-800 text-sm truncate">
                                {{ r.santri_name || 'Santri' }}
                            </div>
                            <div class="text-[10px] text-slate-500 font-medium truncate">
                                {{ r.category || r.setoran_type }} &bull; {{ r.detail || '-' }}
                            </div>
                        </div>
                        <div class="shrink-0 text-right flex flex-col items-end gap-1">
                            <div v-if="r.setoran_type !== 'Tilawah'" :class="{
                                    'text-blue-600': r.grade === 'A+' || r.grade === 'A',
                                    'text-emerald-600': r.grade === 'B' || r.grade === 'B+',
                                    'text-amber-500': r.grade === 'B-',
                                    'text-red-500': r.grade === 'C'
                                }" class="font-black text-sm">
                                <span v-if="r.grade && r.grade !== '-'">{{ r.grade }}/</span>{{ r.score }}
                            </div>
                            <div class="text-[8px] font-bold text-slate-400 leading-none">
                                {{ r.formatted_date || r.setoran_date }} <span v-if="r.setoran_time" class="opacity-70">&bull; {{ r.setoran_time }}</span>
                            </div>
                        </div>
                        <!-- 3 Dots Menu -->
                        <div class="relative ml-2">
                            <button @click.stop="$emit('toggle-menu', r._id)"
                                class="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
                                <span class="material-symbols-outlined text-lg">more_vert</span>
                            </button>

                            <!-- Backdrop for Menu Click-Outside -->
                            <div v-if="isMenuOpen(r._id)" @click.stop="$emit('toggle-menu', r._id)" class="fixed inset-0 z-40 bg-transparent cursor-default"></div>

                            <!-- Dropdown (Restricted for Santri/Wali except in Holiday Mode) -->
                            <div v-if="isMenuOpen(r._id) && (userSession.role === 'admin' || userSession.role === 'guru' || ((userSession.role === 'santri' || userSession.role === 'wali') && appConfig.isHolidayMode))" @click.stop
                                class="absolute right-0 top-10 bg-white rounded-xl shadow-lg border z-50 py-1 w-28 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                <button @click="$emit('edit-setoran', r); $emit('toggle-menu', r._id)"
                                    class="w-full px-3 py-2 text-left text-xs font-bold hover:bg-blue-50 text-slate-700 flex items-center gap-2 transition-colors">
                                    <span class="material-symbols-outlined text-base text-blue-500">edit</span>
                                    Edit
                                </button>
                                <button @click="$emit('delete-setoran', r._id); $emit('toggle-menu', r._id)"
                                    class="w-full px-3 py-2 text-left text-xs font-bold hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-slate-50 transition-colors">
                                    <span class="material-symbols-outlined text-base text-red-400">delete</span>
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
    `
};
