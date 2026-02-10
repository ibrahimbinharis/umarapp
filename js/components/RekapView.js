const RekapView = {
    props: [
        'rekapMonth',
        'rekapYear',
        'rekapKelas',
        'rekapGender',
        'monthNames',
        'kelasOptions',
        'rekapHafalanData'
    ],
    emits: [
        'update:rekapMonth',
        'update:rekapYear',
        'update:rekapKelas',
        'update:rekapGender',
        'export-to-excel',
        'export-to-pdf'
    ],
    template: `
    <div class="fade-in space-y-6 pb-24">
        <div class="px-2">
            <h2 class="text-2xl font-bold text-slate-900">Rekap Laporan</h2>
            <p class="text-xs text-slate-500">Analisa perkembangan santri</p>
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
                                <th class="px-4 py-3 text-center">Sabaq<br><span
                                        class="text-[9px]">(Act/Tgt)</span></th>
                                <th class="px-4 py-3 text-center">Manzil<br><span
                                        class="text-[9px]">(Act/Tgt)</span></th>
                                <th class="px-4 py-3 text-center">Ujian</th>
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
                                <td class="px-4 py-3 text-center">
                                    <div class="font-bold text-blue-600">{{ row.sabaq_act }} / {{
                                        row.sabaq_tgt }}</div>
                                </td>
                                <td class="px-4 py-3 text-center">
                                    <div class="font-bold text-purple-600">{{ row.manzil_act }} / {{
                                        row.manzil_tgt }}</div>
                                </td>
                                <td class="px-4 py-3 text-center font-bold">
                                    {{ row.ujian_avg }}
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
    </div>
    `
};
