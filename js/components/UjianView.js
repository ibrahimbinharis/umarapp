const UjianView = {
    props: [
        'userSession',
        'uiData',
        'loading',
        'ujianForm',
        'mapelList',
        'selectedSantriBulananStats',
        'selectedSantriProgress',
        'filteredUjian',
        'ujianEditingId',
        'activeDropdown'
    ],
    emits: [
        'start-bulanan-exam',
        'calc-bulanan-score',
        'calc-semester-score',
        'select-ujian-juz',
        'submit-ujian',
        'edit-ujian',
        'delete-ujian',
        'toggle-dropdown',
        'cancel-edit'
    ],
    setup(props) {
        const { ref, computed } = Vue;

        // --- Searchable Dropdown State ---
        const searchQuery = ref('');
        const isDropdownOpen = ref(false);

        // Filter Logic
        const filteredSantriList = computed(() => {
            if (!props.uiData.santri) return [];
            const q = searchQuery.value.toLowerCase();
            return props.uiData.santri.filter(s =>
                s.full_name.toLowerCase().includes(q)
            );
        });

        // Computed Label
        const selectedSantriLabel = computed(() => {
            const id = props.ujianForm.santri_id;
            if (!id) return 'Pilih Santri';
            const s = props.uiData.santri.find(x => x.santri_id === id);
            return s ? s.full_name : 'Santri tidak ditemukan';
        });

        const selectSantri = (s) => {
            props.ujianForm.santri_id = s.santri_id;
            isDropdownOpen.value = false;
            searchQuery.value = '';
        };

        // Local Helpers
        const getSantriName = (id) => {
            if (!id || !props.uiData.santri) return '-';
            const s = props.uiData.santri.find(x => x.santri_id === id || x._id === id);
            return s ? s.full_name : 'Unknown ID';
        };

        // Use global enhanced formatDate
        const formatDate = window.formatDate || ((iso) => {
            if (!iso) return '-';
            return iso.split('T')[0];
        });

        const clearSantri = () => {
            props.ujianForm.santri_id = '';
            isDropdownOpen.value = false;
            searchQuery.value = '';
        };

        const getBookName = (mapelName) => {
            if (!props.uiData?.mapel) return null;
            const mapel = props.uiData.mapel.find(m => m.name === mapelName);
            return mapel?.book_name || null;
        };

        // Mapel custom dropdown state
        const mapelDropdownOpen = ref(false);
        const mapelSearch = ref('');
        const mapelTarget = ref('b'); // 'b' for bulanan, 's' for semester

        // All mapel from uiData
        const allMapelOptions = Vue.computed(() => {
            return props.uiData?.mapel || [];
        });

        // Filtered based on search
        const filteredMapelOptions = Vue.computed(() => {
            const q = mapelSearch.value.toLowerCase();
            if (!q) return allMapelOptions.value;
            return allMapelOptions.value.filter(m =>
                m.name.toLowerCase().includes(q) ||
                (m.book_name || '').toLowerCase().includes(q)
            );
        });

        // Get currently selected mapel object for bulanan or semester
        const selectedMapelObj = Vue.computed(() => {
            const key = mapelTarget.value === 'b' ? props.ujianForm.b_mapel : props.ujianForm.s_mapel;
            return allMapelOptions.value.find(m => m.name === key) || null;
        });

        const openMapelDropdown = (target) => {
            mapelTarget.value = target;
            mapelSearch.value = '';
            mapelDropdownOpen.value = true;
        };

        const selectMapel = (m) => {
            if (mapelTarget.value === 'b') {
                props.ujianForm.b_mapel = m.name;
            } else {
                props.ujianForm.s_mapel = m.name;
            }
            mapelDropdownOpen.value = false;
            mapelSearch.value = '';
        };

        const clearMapel = (target) => {
            if (target === 'b') props.ujianForm.b_mapel = '';
            else props.ujianForm.s_mapel = '';
        };

        return {
            getSantriName,
            formatDate,
            searchQuery,
            isDropdownOpen,
            filteredSantriList,
            selectedSantriLabel,
            selectSantri,
            clearSantri,
            getBookName,
            mapelDropdownOpen,
            mapelSearch,
            mapelTarget,
            filteredMapelOptions,
            selectedMapelObj,
            openMapelDropdown,
            selectMapel,
            clearMapel
        };
    },
    template: `
    <div class="fade-in pb-32">
        <!-- Header Removed -->

        <!-- Tabs -->
        <div class="bg-white p-2 rounded-xl border border-slate-100 card-shadow flex gap-2 mb-6">
            <button @click="ujianForm.tab = 'bulanan'"
                :class="ujianForm.tab === 'bulanan' ? 'bg-primary text-white shadow' : 'text-slate-500 hover:bg-slate-50'"
                class="flex-1 py-3 rounded-xl text-sm font-bold transition-all">Ujian
                Bulanan</button>
            <button @click="ujianForm.tab = 'juz'"
                :class="ujianForm.tab === 'juz' ? 'bg-primary text-white shadow' : 'text-slate-500 hover:bg-slate-50'"
                class="flex-1 py-3 rounded-xl text-sm font-bold transition-all">Ujian
                Juz</button>
            <button @click="ujianForm.tab = 'semester'"
                :class="ujianForm.tab === 'semester' ? 'bg-primary text-white shadow' : 'text-slate-500 hover:bg-slate-50'"
                class="flex-1 py-3 rounded-xl text-sm font-bold transition-all">Ujian
                Semester</button>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
            <!-- Main Form (Restricted to Admin/Guru) -->
            <div v-if="userSession.role === 'admin' || userSession.role === 'guru'" class="md:col-span-2 space-y-4">
                <div class="bg-white p-5 rounded-2xl border border-slate-100 card-shadow space-y-4">
                    <h3 class="font-bold text-slate-800 border-b pb-2 mb-2">Form Input {{
                        ujianForm.tab === 'bulanan' ? 'Bulanan' : 'Semester' }}</h3>

                    <!-- Common Fields -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Jenis
                                Ujian</label>
                            <select
                                v-model="ujianForm[ujianForm.tab === 'bulanan' ? 'b_type' : 's_type']"
                                class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm focus:outline-none focus:border-primary">
                                <option value="quran">Ujian Al-Quran</option>
                                <option value="mapel">Ujian Pelajaran</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Santri</label>
                            <!-- Custom Searchable Dropdown (Setoran Style) -->
                            <div class="relative">
                                 <!-- Trigger Button (Locked for Santri) -->
                                 <button @click="userSession.role !== 'santri' ? isDropdownOpen = !isDropdownOpen : null"
                                      class="w-full px-4 py-3 rounded-xl border text-sm font-bold bg-white text-left flex justify-between items-center transition"
                                      :class="[
                                         isDropdownOpen ? 'ring-2 ring-primary/20 border-primary' : 'border-slate-200',
                                         userSession.role === 'santri' ? 'bg-slate-50 cursor-default' : ''
                                      ]">
                                     <span :class="!ujianForm.santri_id ? 'text-slate-400' : 'text-slate-900'" class="truncate flex-1">
                                         {{ selectedSantriLabel }}
                                     </span>
                                     <!-- Tombol X: muncul saat santri sudah dipilih -->
                                     <button v-if="ujianForm.santri_id && userSession.role !== 'santri'"
                                         @click.stop="clearSantri()"
                                         class="ml-1 size-5 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition flex-shrink-0"
                                         title="Hapus pilihan">
                                         <span class="material-symbols-outlined text-[14px]">close</span>
                                     </button>
                                     <span v-if="!ujianForm.santri_id && userSession.role !== 'santri'" class="material-symbols-outlined text-slate-400 flex-shrink-0">expand_more</span>
                                     <span v-if="userSession.role === 'santri'" class="material-symbols-outlined text-slate-300 text-sm flex-shrink-0">lock</span>
                                 </button>

                                <!-- Backdrop (Click Outside) -->
                                <div v-if="isDropdownOpen" @click="isDropdownOpen = false" class="fixed inset-0 z-40 bg-transparent cursor-default"></div>

                                <!-- Dropdown Body -->
                                 <div v-if="isDropdownOpen" 
                                      class="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                    
                                    <!-- Search Input -->
                                    <div class="p-2 border-b border-slate-50">
                                        <div class="flex items-center gap-2 bg-slate-50 pl-3 pr-1 py-1 rounded-lg border border-slate-100">
                                            <span class="material-symbols-outlined text-slate-400 text-lg">search</span>
                                            <input v-model="searchQuery" 
                                                   autofocus
                                                   placeholder="Cari nama..." 
                                                   class="bg-transparent w-full py-1 text-sm font-bold outline-none placeholder:font-normal text-slate-700"
                                                   @click.stop>
                                            <!-- Search Clear Button -->
                                            <button v-if="searchQuery" @click.stop="searchQuery = ''"
                                                class="size-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                                                <span class="material-symbols-outlined text-lg">close</span>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- List -->
                                    <div class="max-h-60 overflow-y-auto custom-scrollbar">
                                        <div v-for="s in filteredSantriList" :key="s.santri_id"
                                             @click="selectSantri(s)"
                                             class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors group">
                                            <p class="text-sm font-bold text-slate-800 group-hover:text-primary">{{ s.full_name }}</p>
                                            <p class="text-[10px] text-slate-500">{{ s.santri_id }} &bull; {{ s.kelas || '-' }}</p>
                                        </div>
                                        <div v-if="filteredSantriList.length === 0" class="p-4 text-center text-slate-400 text-xs italic">
                                            Tidak ditemukan "{{ searchQuery }}"
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- BULANAN FORM -->
                    <div v-if="ujianForm.tab === 'bulanan'" class="space-y-4 pt-2">
                        <!-- Bulanan Quran -->
                        <div v-if="ujianForm.b_type === 'quran'" class="space-y-4">
                            <!-- Simplified Sabaq Progress -->
                            <div v-if="selectedSantriBulananStats"
                                class="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div class="flex-1 min-w-0">
                                    <div class="flex justify-between items-center mb-2 px-0.5">
                                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Capaian Sabaq</span>
                                        <span class="text-[11px] font-black text-primary">
                                            {{ selectedSantriBulananStats.sabaq.current }} <span class="text-slate-300 font-medium">/ {{ selectedSantriBulananStats.sabaq.target }} Hal</span>
                                        </span>
                                    </div>
                                    <div class="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div class="h-full bg-primary rounded-full transition-all duration-700"
                                            :style="{ width: selectedSantriBulananStats.sabaq.percent + '%' }">
                                        </div>
                                    </div>
                                </div>
                                <button @click="$emit('start-bulanan-exam')"
                                    class="size-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-blue-800 transition-all active:scale-95 group"
                                    title="Mulai Ujian">
                                    <span class="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">play_arrow</span>
                                </button>
                            </div>
                            <p v-if="selectedSantriBulananStats" class="text-[10px] text-slate-400 mt-[-8px] ml-4 italic">
                                * Materi diambil dari awal setoran bulan ini
                            </p>

                            <div v-else
                                class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-400 italic text-center">
                                Pilih santri untuk melihat progress sabaq.
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-400 mb-1">JML
                                        SOAL</label>
                                    <input v-model="ujianForm.b_soal" @input="$emit('calc-bulanan-score')"
                                        type="number"
                                        class="w-full px-4 py-2 rounded-xl border border-slate-200 font-bold text-center">
                                </div>
                                <div>
                                    <label
                                        class="block text-xs font-bold text-slate-400 mb-1">SALAH</label>
                                    <input v-model="ujianForm.b_salah" @input="$emit('calc-bulanan-score')"
                                        type="number"
                                        class="w-full px-4 py-2 rounded-xl border border-slate-200 font-bold text-center text-red-500">
                                </div>
                            </div>
                        </div>
                        <!-- Bulanan Mapel -->
                        <div v-else class="relative">
                            <label class="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Mata Pelajaran</label>

                            <!-- Trigger Button -->
                            <button @click="openMapelDropdown('b')"
                                class="w-full px-4 py-3 rounded-xl border text-sm font-bold bg-white text-left flex justify-between items-center transition gap-2"
                                :class="ujianForm.b_mapel ? 'border-slate-200' : 'border-slate-200 text-slate-400'">
                                <div class="flex-1 min-w-0">
                                    <div class="truncate" :class="ujianForm.b_mapel ? 'text-slate-800' : 'text-slate-400'">
                                        {{ ujianForm.b_mapel || 'Pilih Mata Pelajaran...' }}
                                    </div>
                                    <div v-if="ujianForm.b_mapel && getBookName(ujianForm.b_mapel)" class="text-[10px] text-blue-500 font-medium flex items-center gap-1 mt-0.5">
                                        <span class="material-symbols-outlined text-[11px]">auto_stories</span>
                                        {{ getBookName(ujianForm.b_mapel) }}
                                    </div>
                                </div>
                                <div class="flex items-center gap-1 flex-shrink-0">
                                    <button v-if="ujianForm.b_mapel" @click.stop="clearMapel('b')"
                                        class="size-5 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition">
                                        <span class="material-symbols-outlined text-[13px]">close</span>
                                    </button>
                                    <span v-else class="material-symbols-outlined text-slate-400 text-lg">expand_more</span>
                                </div>
                            </button>
                        </div>

                        <!-- Score -->
                        <div class="flex items-center justify-between pt-4 border-t border-slate-100">
                            <span class="text-xs font-bold text-slate-500">NILAI AKHIR</span>
                            <input v-if="ujianForm.b_type === 'quran'" :value="ujianForm.b_score"
                                readonly
                                class="w-32 px-4 py-2 rounded-xl border border-slate-200 font-black text-2xl text-right bg-slate-50"
                                :class="{
                                    'text-blue-600': ujianForm.b_score >= 80,
                                    'text-emerald-600': ujianForm.b_score >= 75 && ujianForm.b_score < 80,
                                    'text-amber-500': ujianForm.b_score >= 70 && ujianForm.b_score < 75,
                                    'text-red-500': ujianForm.b_score < 70
                                }">
                            <input v-else v-model="ujianForm.b_score" type="number"
                                class="w-32 px-4 py-2 rounded-xl border border-slate-200 font-black text-2xl text-right"
                                :class="{
                                    'text-blue-600': ujianForm.b_score >= 80,
                                    'text-emerald-600': ujianForm.b_score >= 75 && ujianForm.b_score < 80,
                                    'text-amber-500': ujianForm.b_score >= 70 && ujianForm.b_score < 75,
                                    'text-red-500': ujianForm.b_score < 70
                                }">
                        </div>
                    </div>

                    <!-- UJIAN JUZ FORM -->
                    <div v-else-if="ujianForm.tab === 'juz'" class="space-y-4 pt-2">
                        <div v-if="!ujianForm.santri_id"
                            class="text-center py-8 text-slate-400 italic bg-slate-50 rounded-xl">
                            Pilih
                            Santri dahulu untuk melihat progres</div>
                        <div v-else class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div class="flex justify-between items-center mb-3">
                                <h4
                                    class="font-bold text-xs text-slate-500 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-sm">grid_view</span>
                                    Progress Kelulusan (Klik Juz untuk Ujian)
                                </h4>
                                <div v-if="ujianForm.s_juz" class="flex gap-2">
                                    <button
                                        @click="$emit('select-ujian-juz', ujianForm.s_juz, true)"
                                        class="size-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-blue-800 transition shadow-md"
                                        title="Mulai Ujian">
                                        <span
                                            class="material-symbols-outlined text-[20px]">play_arrow</span>
                                    </button>
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-2 justify-center">
                                <button v-for="j in 30" :key="j" @click="$emit('select-ujian-juz', j)"
                                    class="size-9 rounded-full text-xs font-bold flex flex-col items-center justify-center transition-all shadow-sm border"
                                    :class="[
                                            ujianForm.s_juz === j ? 'ring-2 ring-offset-1 ring-primary scale-110 z-10' : '',
                                            selectedSantriProgress[j] ? 
                                                (selectedSantriProgress[j] === 'Centang' ? 'bg-orange-500 text-white border-orange-500' :
                                                ['A+','A'].includes(selectedSantriProgress[j]) ? 'bg-blue-500 text-white border-blue-600' : 
                                                selectedSantriProgress[j] === 'C' ? 'bg-red-500 text-white border-red-600' : 
                                                selectedSantriProgress[j] === 'B-' ? 'bg-amber-400 text-white border-amber-500' :
                                                'bg-emerald-500 text-white border-emerald-600') 
                                                : 'bg-white text-slate-300 border-slate-200 hover:bg-slate-100'
                                        ]">
                                    <span v-if="selectedSantriProgress[j] === 'Centang'"
                                        class="material-symbols-outlined text-base">check_circle</span>
                                    <span v-else>{{ j }}</span>
                                    <span
                                        v-if="selectedSantriProgress[j] && selectedSantriProgress[j] !== 'Centang'"
                                        class="text-[8px] leading-none opacity-80 mt-[-2px]">{{
                                        selectedSantriProgress[j] }}</span>
                                </button>
                            </div>
                        </div>

                        <div v-if="ujianForm.s_juz"
                            class="animate-scale-in bg-white border border-blue-100 p-4 rounded-xl shadow-sm">
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-bold text-blue-800 text-sm">Penilaian Juz {{
                                    ujianForm.s_juz }}</span>
                            </div>
                            <div class="flex items-center gap-4">
                                <div class="flex-1">
                                    <label
                                        class="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Salah (Baris)</label>
                                    <input v-model="ujianForm.s_salah" @input="$emit('calc-semester-score')"
                                        type="number"
                                        class="w-full px-4 py-2 rounded-xl border border-slate-200 font-bold text-center text-red-500 bg-slate-50">
                                </div>
                                <div class="flex-1">
                                    <label
                                        class="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Nilai Akhir</label>
                                    <input :value="ujianForm.s_score" readonly
                                        class="w-full px-4 py-2 rounded-xl border border-slate-200 font-black text-xl text-center bg-slate-50"
                                        :class="{
                                            'text-blue-600': ujianForm.s_score >= 80,
                                            'text-emerald-600': ujianForm.s_score >= 75 && ujianForm.s_score < 80,
                                            'text-amber-500': ujianForm.s_score >= 70 && ujianForm.s_score < 75,
                                            'text-red-500': ujianForm.s_score < 70
                                        }">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- SEMESTER FORM -->
                    <div v-else class="space-y-4 pt-2">
                        <!-- Semester Quran (Grid) -->
                        <div v-if="ujianForm.s_type === 'quran'" class="space-y-4">
                            <div v-if="!ujianForm.santri_id"
                                class="text-center py-8 text-slate-400 italic bg-slate-50 rounded-xl">
                                Pilih
                                Santri dahulu untuk melihat progres</div>
                            <div v-else class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div class="flex justify-between items-center mb-3">
                                    <h4
                                        class="font-bold text-xs text-slate-500 flex items-center gap-2">
                                        <span class="material-symbols-outlined text-sm">grid_view</span>
                                        Hafalan (Klik Juz untuk Ujian)
                                    </h4>
                                    <button v-if="ujianForm.s_juz"
                                        @click="$emit('select-ujian-juz', ujianForm.s_juz, true)"
                                        class="size-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-blue-800 transition shadow-md"
                                        title="Mulai Ujian">
                                        <span
                                            class="material-symbols-outlined text-[20px]">play_arrow</span>
                                    </button>
                                </div>
                                <div class="flex flex-wrap gap-2 justify-center">
                                    <button v-for="j in 30" :key="j" @click="$emit('select-ujian-juz', j)"
                                        class="size-9 rounded-full text-xs font-bold flex flex-col items-center justify-center transition-all shadow-sm border"
                                        :class="[
                                              ujianForm.s_juz === j ? 'ring-2 ring-offset-1 ring-primary scale-110 z-10' : '',
                                              selectedSantriProgress[j] ? 
                                                 (selectedSantriProgress[j] === 'Centang' ? 'bg-orange-500 text-white border-orange-500' :
                                                  ['A+','A'].includes(selectedSantriProgress[j]) ? 'bg-blue-500 text-white border-blue-600' : 
                                                  selectedSantriProgress[j] === 'C' ? 'bg-red-500 text-white border-red-600' : 
                                                  selectedSantriProgress[j] === 'B-' ? 'bg-amber-400 text-white border-amber-500' :
                                                  'bg-emerald-500 text-white border-emerald-600') 
                                                 : 'bg-white text-slate-300 border-slate-200 hover:bg-slate-100'
                                          ]">
                                        <span v-if="selectedSantriProgress[j] === 'Centang'"
                                            class="material-symbols-outlined text-base">check_circle</span>
                                        <span v-else>{{ j }}</span>
                                        <span
                                            v-if="selectedSantriProgress[j] && selectedSantriProgress[j] !== 'Centang'"
                                            class="text-[8px] leading-none opacity-80 mt-[-2px]">{{
                                            selectedSantriProgress[j] }}</span>
                                    </button>
                                </div>
                            </div>

                            <div v-if="ujianForm.s_juz"
                                class="animate-scale-in bg-white border border-blue-100 p-4 rounded-xl shadow-sm">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="font-bold text-blue-800 text-sm">Penilaian Juz {{
                                        ujianForm.s_juz }}</span>
                                </div>
                                <div class="flex items-center gap-4">
                                    <div class="flex-1">
                                        <label
                                            class="block text-[10px] font-bold text-slate-400 mb-1">SALAH
                                            (BARIS)</label>
                                        <input v-model="ujianForm.s_salah" @input="$emit('calc-semester-score')"
                                            type="number"
                                            class="w-full px-4 py-2 rounded-xl border border-slate-200 font-bold text-center text-red-500 bg-slate-50">
                                    </div>
                                    <div class="flex-1">
                                        <label
                                            class="block text-[10px] font-bold text-slate-400 mb-1">NILAI
                                            AKHIR</label>
                                        <input :value="ujianForm.s_score" readonly
                                            class="w-full px-4 py-2 rounded-xl border border-slate-200 font-black text-xl text-center bg-slate-50"
                                            :class="{
                                                'text-blue-600': ujianForm.s_score >= 80,
                                                'text-emerald-600': ujianForm.s_score >= 75 && ujianForm.s_score < 80,
                                                'text-amber-500': ujianForm.s_score >= 70 && ujianForm.s_score < 75,
                                                'text-red-500': ujianForm.s_score < 70
                                            }">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Semester Mapel -->
                        <div v-else class="space-y-4">
                            <div class="relative">
                                <label class="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Mata Pelajaran</label>

                                <!-- Trigger Button -->
                                <button @click="openMapelDropdown('s')"
                                    class="w-full px-4 py-3 rounded-xl border text-sm font-bold bg-white text-left flex justify-between items-center transition gap-2"
                                    :class="ujianForm.s_mapel ? 'border-slate-200' : 'border-slate-200'">
                                    <div class="flex-1 min-w-0">
                                        <div class="truncate" :class="ujianForm.s_mapel ? 'text-slate-800' : 'text-slate-400'">
                                            {{ ujianForm.s_mapel || 'Pilih Mata Pelajaran...' }}
                                        </div>
                                        <div v-if="ujianForm.s_mapel && getBookName(ujianForm.s_mapel)" class="text-[10px] text-blue-500 font-medium flex items-center gap-1 mt-0.5">
                                            <span class="material-symbols-outlined text-[11px]">auto_stories</span>
                                            {{ getBookName(ujianForm.s_mapel) }}
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-1 flex-shrink-0">
                                        <button v-if="ujianForm.s_mapel" @click.stop="clearMapel('s')"
                                            class="size-5 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition">
                                            <span class="material-symbols-outlined text-[13px]">close</span>
                                        </button>
                                        <span v-else class="material-symbols-outlined text-slate-400 text-lg">expand_more</span>
                                    </div>
                                </button>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-1">NILAI
                                    AKHIR</label>
                                <input v-model="ujianForm.s_score" type="number"
                                    class="w-full px-4 py-3 rounded-xl border border-slate-200 font-black text-3xl text-right"
                                    :class="{
                                        'text-blue-600': ujianForm.s_score >= 80,
                                        'text-emerald-600': ujianForm.s_score >= 75 && ujianForm.s_score < 80,
                                        'text-amber-500': ujianForm.s_score >= 70 && ujianForm.s_score < 75,
                                        'text-red-500': ujianForm.s_score < 70
                                    }">
                            </div>
                        </div>
                    </div>

                    <div class="flex gap-2 mt-4">
                        <button v-if="ujianEditingId" @click="$emit('cancel-edit')"
                            class="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold shadow-sm text-sm hover:bg-slate-200 transition">
                            Batal
                        </button>
                        <button @click="$emit('submit-ujian')"
                            class="flex-[2] bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition active:scale-95 flex items-center justify-center">
                            {{ ujianEditingId ? 'Update Data' : 'Simpan Nilai ' + (ujianForm.tab === 'bulanan' ? 'Bulanan' : (ujianForm.tab === 'juz' ? 'Kelulusan' : 'Semester')) }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Lock Message for Santri/Wali -->
            <div v-else class="md:col-span-2 space-y-4">
                <div class="bg-white p-8 rounded-2xl border border-slate-100 card-shadow flex flex-col items-center text-center">
                    <div class="size-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                         <span class="material-symbols-outlined text-3xl">lock</span>
                    </div>
                    <h3 class="font-bold text-slate-800 mb-2">Akses Terbatas</h3>
                    <p class="text-xs text-slate-500 max-w-xs">Hanya Admin dan Guru yang dapat memasukkan nilai ujian. Anda dapat melihat riwayat ujian pada panel di samping.</p>
                </div>
            </div>

            <!-- Sidebar History -->
            <div class="md:col-span-1 bg-white p-4 rounded-2xl border border-slate-100 card-shadow h-fit">
                <h3
                    class="font-bold border-b border-slate-100 pb-3 mb-3 text-sm flex items-center gap-2">
                    <span class="material-symbols-outlined text-slate-400 text-sm">history</span>
                    Riwayat {{
                    ujianForm.tab === 'bulanan' ? 'Bulanan' : 'Semester' }}
                </h3>
                <div class="space-y-2 max-h-[480px] overflow-y-auto pr-1 pb-4 custom-scrollbar">
                    <div v-for="u in filteredUjian" :key="u._id"
                        class="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center transition hover:bg-slate-50 cursor-pointer active:scale-[0.98]"
                        @click.stop="$emit('toggle-dropdown', u._id)"
                        :class="{ 'z-50 border-blue-200 ring-2 ring-blue-50 relative': activeDropdown === u._id }">
                        
                        <div class="overflow-hidden flex-1 pr-2">
                            <div class="font-bold text-slate-800 text-xs truncate">
                                {{ getSantriName(u.santri_id) }}
                            </div>
                            <div class="flex flex-col gap-0.5">
                                <div class="text-[9px] text-slate-500 font-medium truncate">
                                    {{ u.detail || u.type }}
                                </div>
                                <div v-if="u.b_mapel || u.s_mapel" class="text-[8px] font-bold text-blue-400 flex items-center gap-1">
                                    <span class="material-symbols-outlined text-[10px]">auto_stories</span>
                                    {{ getBookName(u.b_mapel || u.s_mapel) }}
                                </div>
                            </div>
                        </div>

                        <div class="shrink-0 text-right flex flex-col items-end gap-1 pr-2">
                            <div :class="{
                                    'text-blue-600': u.score >= 80,
                                    'text-emerald-600': u.score >= 75 && u.score < 80,
                                    'text-amber-500': u.score >= 70 && u.score < 75,
                                    'text-red-500': u.score < 70
                                }" class="font-black text-sm">
                                <span v-if="u.grade">{{ u.grade }}/</span>{{ u.score }}
                            </div>
                            <div class="text-[8px] font-bold text-slate-400 leading-none">
                                {{ formatDate(u.date) }}
                            </div>
                        </div>

                        <!-- 3 Dots Menu -->
                        <div class="relative">
                            <button @click.stop="$emit('toggle-dropdown', u._id)"
                                class="size-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
                                <span class="material-symbols-outlined text-base">more_vert</span>
                            </button>

                            <!-- Backdrop for Menu Click-Outside -->
                            <div v-if="activeDropdown === u._id" @click.stop="$emit('toggle-dropdown', null)" class="fixed inset-0 z-40 bg-transparent cursor-default"></div>

                            <!-- Dropdown -->
                            <div v-if="activeDropdown === u._id" @click.stop
                                class="absolute right-0 top-8 bg-white rounded-xl shadow-lg border z-50 py-1 w-28 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                <button @click="$emit('edit-ujian', u); $emit('toggle-dropdown', null)"
                                    class="w-full px-3 py-2 text-left text-[10px] font-bold hover:bg-blue-50 text-slate-700 flex items-center gap-2 transition-colors">
                                    <span class="material-symbols-outlined text-sm text-blue-500">edit</span>
                                    Edit
                                </button>
                                <button @click="$emit('delete-ujian', u); $emit('toggle-dropdown', null)"
                                    class="w-full px-3 py-2 text-left text-[10px] font-bold hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-slate-50 transition-colors">
                                    <span class="material-symbols-outlined text-sm text-red-400">delete</span>
                                    Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                    <div v-if="filteredUjian.length === 0"
                        class="text-center py-4 text-slate-400 text-xs">
                        Belum ada data.
                    </div>
                </div>
            </div>

        </div>
    </div>

    <!-- ===== MAPEL DROPDOWN PANEL (Teleport - Bottom Sheet) ===== -->
    <Teleport to="body">
        <Transition name="backdrop-fade">
            <div v-if="mapelDropdownOpen" @click="mapelDropdownOpen = false"
                class="fixed inset-0 z-[400] bg-slate-900/30 backdrop-blur-[2px]"></div>
        </Transition>
        <Transition name="slide-up">
            <div v-if="mapelDropdownOpen"
                class="fixed bottom-0 left-0 right-0 z-[401] bg-white rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col pb-safe
                       md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-sm md:rounded-3xl md:max-h-[80vh]">

                <!-- Handle -->
                <div class="flex justify-center pt-3 pb-1 flex-shrink-0">
                    <div class="w-10 h-1.5 bg-slate-200 rounded-full"></div>
                </div>

                <!-- Header + Search -->
                <div class="px-5 pt-2 pb-3 border-b border-slate-50 flex-shrink-0">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pilih Mata Pelajaran</p>
                    <div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                        <span class="material-symbols-outlined text-slate-400 text-lg">search</span>
                        <input v-model="mapelSearch"
                            autofocus
                            placeholder="Cari mapel atau nama kitab..."
                            class="bg-transparent flex-1 text-sm font-medium outline-none placeholder:text-slate-300 text-slate-700">
                        <button v-if="mapelSearch" @click="mapelSearch = ''"
                            class="size-6 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                            <span class="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>
                </div>

                <!-- List -->
                <div class="flex-1 overflow-y-auto custom-scrollbar py-2">
                    <div v-for="m in filteredMapelOptions" :key="m._id || m.name"
                        @click="selectMapel(m)"
                        class="px-5 py-3 flex items-center gap-3 hover:bg-blue-50 active:bg-blue-100 cursor-pointer border-b border-slate-50 last:border-0 transition-colors group">
                        <!-- Icon -->
                        <div class="size-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition">
                            <span class="material-symbols-outlined text-primary text-lg">menu_book</span>
                        </div>
                        <!-- Text -->
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors truncate">{{ m.name }}</p>
                            <p v-if="m.book_name" class="text-[10px] text-blue-400 font-medium flex items-center gap-1 mt-0.5">
                                <span class="material-symbols-outlined text-[11px]">auto_stories</span>
                                {{ m.book_name }}
                            </p>
                            <p v-else class="text-[10px] text-slate-300 italic">Tidak ada nama kitab</p>
                        </div>
                        <!-- Active check -->
                        <span v-if="(mapelTarget === 'b' ? ujianForm.b_mapel : ujianForm.s_mapel) === m.name"
                            class="material-symbols-outlined text-primary text-xl flex-shrink-0">check_circle</span>
                    </div>
                    <div v-if="filteredMapelOptions.length === 0"
                        class="py-10 text-center text-slate-400 text-sm italic">
                        Tidak ditemukan "{{ mapelSearch }}"
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
    `
};
