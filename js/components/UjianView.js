const UjianView = {
    props: [
        'userSession',
        'uiData',
        'loading',
        'ujianForm',
        'mapelList',
        'selectedSantriBulananStats',
        'selectedSantriProgress',
        'filteredUjian'
    ],
    emits: [
        'start-bulanan-exam',
        'calc-bulanan-score',
        'calc-semester-score',
        'select-ujian-juz',
        'submit-ujian'
    ],
    setup(props) {
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

        return {
            getSantriName,
            formatDate
        };
    },
    template: `
    <div class="fade-in">
        <h2 class="text-2xl font-bold mb-4">Ujian & Evaluasi</h2>

        <!-- Tabs -->
        <div class="bg-white p-2 rounded-xl border border-slate-100 card-shadow flex gap-2 mb-6">
            <button @click="ujianForm.tab = 'bulanan'"
                :class="ujianForm.tab === 'bulanan' ? 'bg-primary text-white shadow' : 'text-slate-500 hover:bg-slate-50'"
                class="flex-1 py-3 rounded-xl text-sm font-bold transition-all">Ujian
                Bulanan</button>
            <button @click="ujianForm.tab = 'semester'"
                :class="ujianForm.tab === 'semester' ? 'bg-primary text-white shadow' : 'text-slate-500 hover:bg-slate-50'"
                class="flex-1 py-3 rounded-xl text-sm font-bold transition-all">Ujian
                Semester</button>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
            <!-- Main Form -->
            <div class="md:col-span-2 space-y-4">
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
                            <select v-model="ujianForm.santri_id"
                                class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm focus:outline-none focus:border-primary">
                                <option value="">Pilih Santri</option>
                                <option v-for="s in uiData.santri" :value="s.santri_id">{{
                                    s.full_name
                                    }}
                                </option>
                            </select>
                        </div>
                    </div>

                    <!-- BULANAN FORM -->
                    <div v-if="ujianForm.tab === 'bulanan'" class="space-y-4 pt-2">
                        <!-- Bulanan Quran -->
                        <div v-if="ujianForm.b_type === 'quran'" class="space-y-4">
                            <div v-if="selectedSantriBulananStats"
                                class="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                <div class="flex justify-between items-end mb-2">
                                    <div>
                                        <p
                                            class="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                                            Capaian Sabaq Bulan Ini</p>
                                        <p class="text-2xl font-black text-blue-700 leading-none mt-1">
                                            {{ selectedSantriBulananStats.sabaq.current }} <span
                                                class="text-sm font-bold text-blue-400">/ {{
                                                selectedSantriBulananStats.sabaq.target }}
                                                Hal</span>
                                        </p>
                                    </div>
                                    <button @click="$emit('start-bulanan-exam')"
                                        class="size-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition">
                                        <span class="material-symbols-outlined">play_arrow</span>
                                    </button>
                                </div>
                                <!-- Progress Bar -->
                                <div class="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                                    <div class="bg-blue-600 h-full rounded-full transition-all duration-500"
                                        :style="{ width: selectedSantriBulananStats.sabaq.percent + '%' }">
                                    </div>
                                </div>
                                <p class="text-[10px] text-blue-400 mt-2 italic text-center">
                                    Materi ujian diambil dari awal setoran bulan ini
                                </p>
                            </div>

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
                        <div v-else>
                            <label class="block text-xs font-bold text-slate-400 mb-1">MATA
                                PELAJARAN</label>
                            <select v-model="ujianForm.b_mapel"
                                class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm">
                                <option v-for="m in mapelList" :value="m">{{ m }}</option>
                            </select>
                        </div>

                        <!-- Score -->
                        <div class="flex items-center justify-between pt-4 border-t border-slate-100">
                            <span class="text-xs font-bold text-slate-500">NILAI AKHIR</span>
                            <input v-if="ujianForm.b_type === 'quran'" :value="ujianForm.b_score"
                                readonly
                                class="w-32 px-4 py-2 rounded-xl border border-slate-200 font-black text-2xl text-right text-emerald-600 bg-slate-50">
                            <input v-else v-model="ujianForm.b_score" type="number"
                                class="w-32 px-4 py-2 rounded-xl border border-slate-200 font-black text-2xl text-right text-emerald-600">
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
                                                  selectedSantriProgress[j] === 'C' ? 'bg-red-500 text-white border-red-600' : 'bg-emerald-500 text-white border-emerald-600') 
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
                                            class="w-full px-4 py-2 rounded-xl border border-slate-200 font-black text-xl text-center text-emerald-600 bg-slate-50">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Semester Mapel -->
                        <div v-else class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-1">MATA
                                    PELAJARAN</label>
                                <select v-model="ujianForm.s_mapel"
                                    class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm">
                                    <option v-for="m in mapelList" :value="m">{{ m }}</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-1">NILAI
                                    AKHIR</label>
                                <input v-model="ujianForm.s_score" type="number"
                                    class="w-full px-4 py-3 rounded-xl border border-slate-200 font-black text-3xl text-right text-emerald-600">
                            </div>
                        </div>
                    </div>

                    <button @click="$emit('submit-ujian')"
                        class="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition active:scale-95 flex items-center justify-center gap-2 mt-4">
                        <span class="material-symbols-outlined">save</span> Simpan Nilai {{
                        ujianForm.tab ===
                        'bulanan' ? 'Bulanan' : 'Semester' }}
                    </button>
                </div>
            </div>

            <!-- Sidebar History -->
            <div class="bg-white p-4 rounded-2xl border border-slate-100 card-shadow h-fit">
                <h3
                    class="font-bold border-b border-slate-100 pb-3 mb-3 text-sm flex items-center gap-2">
                    <span class="material-symbols-outlined text-slate-400 text-sm">history</span>
                    Riwayat {{
                    ujianForm.tab === 'bulanan' ? 'Bulanan' : 'Semester' }}
                </h3>
                <div class="space-y-3">
                    <div v-for="u in filteredUjian" :key="u._id"
                        class="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0 hover:bg-slate-50 p-1 rounded transition">
                        <div>
                            <p class="font-bold text-slate-800 text-xs">{{
                                getSantriName(u.santri_id) }}
                            </p>
                            <p class="text-[10px] text-slate-500">{{ formatDate(u.date) }} &bull; {{
                                u.detail
                                ||
                                u.type }}</p>
                        </div>
                        <div class="text-right">
                            <div class="font-bold"
                                :class="u.score >= 60 ? 'text-emerald-600' : 'text-red-500'">
                                {{ u.score }}</div>
                            <div v-if="u.grade"
                                class="text-[10px] font-bold bg-slate-100 px-1 rounded text-slate-600 inline-block">
                                {{ u.grade }}</div>
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
    `
};
