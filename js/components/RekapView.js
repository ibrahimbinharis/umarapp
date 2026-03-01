const RekapView = {
    props: [
        'rekapMonth',
        'rekapYear',
        'rekapKelas',
        'rekapGender',
        'monthNames',
        'kelasOptions',
        'rekapHafalanData',
        'rekapSettings',
        'userSession',
        'rekapSearch',
        'rekapSantriId',
        'isRekapSantriDropdownOpen',
        'rekapFilteredSantriOptions',
        'selectRekapSantri'
    ],
    emits: [
        'update:rekapMonth',
        'update:rekapYear',
        'update:rekapKelas',
        'update:rekapGender',
        'update:rekapSearch',
        'update:rekapSantriId',
        'update:isRekapSantriDropdownOpen',
        'export-to-excel',
        'export-to-pdf',
        'save-settings'
    ],
    setup(props, { emit }) {
        const isConfigOpen = Vue.ref(false);
        const tempSettings = Vue.reactive(JSON.parse(JSON.stringify(props.rekapSettings)));

        const totalWeight = Vue.computed(() => {
            return Object.values(tempSettings.weights).reduce((a, b) => a + b, 0);
        });

        const handleSave = async () => {
            if (totalWeight.value !== 100) {
                alert("Total bobot harus tepat 100%");
                return;
            }
            // Propagate tempSettings to parent via proxy-like object or just let rekapSettings be updated
            Object.assign(props.rekapSettings, tempSettings);
            emit('save-settings');
            isConfigOpen.value = false;
        };

        const openConfig = () => {
            Object.assign(tempSettings, JSON.parse(JSON.stringify(props.rekapSettings)));
            isConfigOpen.value = true;
        };

        return { isConfigOpen, tempSettings, totalWeight, handleSave, openConfig };
    },
    template: `
    <div class="fade-in space-y-6 pb-24">
        <div class="px-2 flex justify-between items-start">
            <div>
                <h2 class="text-2xl font-bold text-slate-900">Rekap Laporan</h2>
                <p class="text-xs text-slate-500">Analisa perkembangan santri</p>
            </div>
            <button v-if="userSession?.role === 'admin'" @click="openConfig"
                class="size-10 bg-white border shadow-sm rounded-xl flex items-center justify-center text-slate-600 hover:text-primary transition">
                <span class="material-symbols-outlined">settings</span>
            </button>
        </div>

        <!-- Santri Quick Search Bar (New Implementation) -->
        <div class="px-2">
            <div class="relative">
                <div class="flex items-center gap-2 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                    <span class="material-symbols-outlined text-slate-400 ml-1">person_search</span>
                    <input type="text" 
                        :value="rekapSearch"
                        @input="$emit('update:rekapSearch', $event.target.value)"
                        @focus="$emit('update:isRekapSantriDropdownOpen', true)"
                        placeholder="Cari nama santri..." 
                        class="bg-transparent w-full text-sm font-bold outline-none placeholder:text-slate-400">
                    
                    <!-- Clear Filter Button -->
                    <button v-if="rekapSantriId" 
                        @click="selectRekapSantri({ santri_id: '' })"
                        class="size-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition">
                        <span class="material-symbols-outlined text-xs">close</span>
                    </button>
                    <!-- Loading/Icon if needed -->
                    <span v-else class="material-symbols-outlined text-slate-300 text-sm mr-1">keyboard_arrow_down</span>
                </div>

                <!-- Live Results Dropdown -->
                <div v-if="isRekapSantriDropdownOpen && rekapSearch" 
                    class="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div class="max-h-60 overflow-y-auto custom-scrollbar">
                        <div v-for="s in rekapFilteredSantriOptions" :key="s._id"
                            @click="selectRekapSantri(s)"
                            class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors group">
                            <p class="text-sm font-bold text-slate-800 group-hover:text-primary">{{ s.full_name }}</p>
                            <p class="text-[10px] text-slate-500">{{ s.santri_id }} &bull; {{ s.kelas || '-' }}</p>
                        </div>
                        <div v-if="rekapFilteredSantriOptions.length === 0"
                            class="p-4 text-center text-slate-400 text-xs italic">
                            Santri tidak ditemukan...
                        </div>
                    </div>
                </div>

                <!-- Backdrop to Close Dropdown -->
                <div v-if="isRekapSantriDropdownOpen" 
                    @click="$emit('update:isRekapSantriDropdownOpen', false)" 
                    class="fixed inset-0 z-[90] cursor-default"></div>
            </div>
        </div>

        <!-- Filter Control -->
        <div class="bg-white p-4 rounded-2xl border shadow-sm mx-2 space-y-3">
            <div class="flex gap-2">
                <select :value="rekapMonth" @change="$emit('update:rekapMonth', $event.target.value)" 
                    class="bg-slate-50 border p-2 rounded-lg text-sm flex-1">
                    <option v-for="(m, i) in monthNames" :value="i">{{ m }}</option>
                </select>
                <select :value="rekapYear" @change="$emit('update:rekapYear', $event.target.value)" 
                    class="bg-slate-50 border p-2 rounded-lg text-sm w-24">
                    <option :value="2025">2025</option>
                    <option :value="2026">2026</option>
                </select>
            </div>
            <div class="flex gap-2">
                <select :value="rekapKelas" @change="$emit('update:rekapKelas', $event.target.value)" 
                    class="bg-slate-50 border p-2 rounded-lg text-sm flex-1">
                    <option value="">Semua Kelas</option>
                    <option v-for="k in kelasOptions" :value="k.name">{{ k.name }}
                    </option>
                </select>
                <select :value="rekapGender" @change="$emit('update:rekapGender', $event.target.value)" 
                    class="bg-slate-50 border p-2 rounded-lg text-sm w-32">
                    <option value="">Semua</option>
                    <option value="L">Putra</option>
                    <option value="P">Putri</option>
                </select>
            </div>
        </div>

        <!-- Content: Laporan Prestasi -->
        <div class="mx-2 space-y-4">
            <div class="bg-white rounded-2xl border overflow-hidden">
                <div class="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h3 class="font-bold text-slate-700">Laporan Prestasi Santri</h3>
                    <div class="flex gap-2">
                        <button @click="$emit('export-to-excel')"
                            class="p-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200">
                            XLS
                        </button>
                        <button @click="$emit('export-to-pdf')"
                            class="p-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200">
                            PDF
                        </button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50 text-slate-500 uppercase">
                            <tr>
                                <th class="px-4 py-3">Nama</th>
                                <th v-if="rekapSettings.visibility.sabaq" class="px-4 py-3 text-center">Sabaq<br><span
                                        class="text-[9px]">(Hal)</span></th>
                                <th v-if="rekapSettings.visibility.manzil" class="px-4 py-3 text-center">Manzil<br><span
                                        class="text-[9px]">(Hal)</span></th>
                                <th v-if="rekapSettings.visibility.ujian" class="px-4 py-3 text-center">Ujian</th>
                                <th v-if="rekapSettings.visibility.tilawah" class="px-4 py-3 text-center">Tilawah<br><span
                                        class="text-[9px]">(Juz)</span></th>
                                <th class="px-4 py-3 text-center">Pelanggaran</th>
                                <th class="px-4 py-3 text-center">Nilai</th>
                                <th class="px-4 py-3 text-center">Predikat</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            <tr v-for="row in rekapHafalanData" :key="row.id">
                                <td class="px-4 py-3 font-medium text-slate-700">
                                    {{ row.nama }}<br>
                                    <span class="text-[10px] text-slate-400">{{ row.kelas }}</span>
                                </td>
                                <td v-if="row.show_sabaq" class="px-4 py-3 text-center">
                                    <div class="font-bold text-blue-600">{{ row.sabaq_act }} / {{
                                        row.sabaq_tgt }} <span class="text-[9px] font-normal">Hal</span></div>
                                </td>
                                <td v-if="row.show_manzil" class="px-4 py-3 text-center">
                                    <div class="font-bold text-purple-600">{{ row.manzil_act }} / {{
                                        row.manzil_tgt }} <span class="text-[9px] font-normal">Hal</span></div>
                                </td>
                                <td v-if="row.show_ujian" class="px-4 py-3 text-center font-bold">
                                    {{ row.ujian_avg }}
                                </td>
                                <td v-if="row.show_tilawah" class="px-4 py-3 text-center">
                                    <div class="font-bold text-emerald-600">{{ row.tilawah_act }} / {{
                                        row.tilawah_tgt }} <span class="text-[9px] font-normal">Juz</span></div>
                                </td>
                                <td class="px-4 py-3 text-center text-red-500 font-bold">
                                    {{ row.pelanggaran_poin > 0 ? '-' + row.pelanggaran_poin : '0'
                                    }}
                                </td>
                                <td class="px-4 py-3 text-center font-bold text-slate-800">
                                    {{ row.nilai_akhir }}
                                </td>
                                <td class="px-4 py-3 text-center">
                                    <span class="px-2 py-1 rounded-full font-bold text-[10px]" :class="{
                                                'bg-green-100 text-green-700': row.predikat === 'A+' || row.predikat === 'A',
                                                'bg-blue-100 text-blue-700': row.predikat === 'B+' || row.predikat === 'B' || row.predikat === 'B-',
                                                'bg-red-100 text-red-700': row.predikat === 'C'
                                            }">
                                        {{ row.predikat }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!-- Empty State -->
                    <div v-if="!rekapHafalanData.length" class="p-8 text-center text-slate-400 text-xs">
                        Belum ada data untuk periode ini.
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL CONFIG -->
        <teleport to="body">
            <div v-if="isConfigOpen" @click.self="isConfigOpen = false" class="fixed inset-0 z-[999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300">
                <div @click.stop class="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div class="p-4 border-b flex justify-between items-center bg-slate-50/50">
                        <h3 class="font-bold text-slate-800">Pengaturan Bobot Nilai</h3>
                        <button @click="isConfigOpen = false" class="size-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">
                            <span class="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                    <div class="p-6 space-y-4">
                        <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Pilih data & Atur Bobot (%)</p>
                        
                        <div class="space-y-3">
                            <div v-for="(val, key) in tempSettings.visibility" :key="key" 
                                class="flex items-center justify-between p-3 rounded-2xl border transition-all"
                                :class="val ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-60'">
                                <div class="flex items-center gap-3">
                                    <input type="checkbox" v-model="tempSettings.visibility[key]" 
                                        @change="!tempSettings.visibility[key] ? tempSettings.weights[key] = 0 : null"
                                        class="size-5 rounded-lg accent-primary cursor-pointer">
                                    <span class="font-bold text-sm text-slate-700 capitalize">{{ key }}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <input type="number" v-model.number="tempSettings.weights[key]" :disabled="!val"
                                        class="w-16 p-2 text-center rounded-lg border font-bold text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                                        :class="!val ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-primary border-blue-200'">
                                    <span class="text-xs font-bold text-slate-400">%</span>
                                </div>
                            </div>
                        </div>

                        <div class="pt-4 border-t">
                            <div class="flex justify-between items-center mb-4">
                                <span class="text-xs font-bold text-slate-500">Total Bobot</span>
                                <span class="text-lg font-black" :class="totalWeight === 100 ? 'text-emerald-500' : 'text-red-500'">{{ totalWeight }}%</span>
                            </div>
                            <button @click="handleSave" :disabled="totalWeight !== 100"
                                class="w-full py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                :class="totalWeight === 100 ? 'bg-primary text-white shadow-blue-500/20 hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'">
                                <span class="material-symbols-outlined text-lg">check_circle</span>
                                Simpan Pengaturan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </teleport>
    </div>
    `

};
