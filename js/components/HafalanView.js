const HafalanView = {
    props: [
        'filteredSantri',
        'santriGenderFilter',
        'searchText',
        'userSession',
        'selectedSantriProgress',
        'activeSantriId',  // replaces ujianForm.santri_id check
        'activeSantriName',
    ],
    emits: [
        'update:santriGenderFilter',
        'update:searchText',
        'select-santri',
        'go-back',
        'select-juz',
    ],
    template: `
    <div class="fade-in pb-24">

        <!-- LIST VIEW: daftar santri -->
        <div v-if="!activeSantriId" class="px-4 pt-4 space-y-4">

            <!-- Search -->
            <div class="bg-white p-3 rounded-xl border shadow-sm">
                <input
                    :value="searchText"
                    @input="$emit('update:searchText', $event.target.value)"
                    type="text"
                    placeholder="Cari Nama Santri..."
                    class="w-full p-2 bg-slate-50 border rounded-lg text-sm font-bold focus:outline-none focus:border-primary"
                >
            </div>

            <!-- Gender Filter -->
            <div class="flex p-1 bg-slate-100 rounded-xl">
                <button
                    @click="$emit('update:santriGenderFilter', 'L')"
                    :class="santriGenderFilter === 'L' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'"
                    class="flex-1 py-2 text-xs rounded-lg transition-all"
                >Putra</button>
                <button
                    @click="$emit('update:santriGenderFilter', 'P')"
                    :class="santriGenderFilter === 'P' ? 'bg-white text-pink-500 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'"
                    class="flex-1 py-2 text-xs rounded-lg transition-all"
                >Putri</button>
            </div>

            <!-- Santri List -->
            <div class="space-y-3">
                <div
                    v-for="s in filteredSantri" :key="s._id"
                    @click="$emit('select-santri', s)"
                    class="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center cursor-pointer hover:bg-slate-50 transition group"
                >
                    <div class="flex items-center gap-4 flex-1 min-w-0">
                        <div class="size-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-200 flex-shrink-0">
                            {{ (s.hafalan_manual || '0 Juz').split(' ')[0] }}
                        </div>
                        <div class="min-w-0">
                            <h4 class="font-bold text-slate-900 group-hover:text-primary transition truncate">{{ s.full_name }}</h4>
                            <p class="text-xs text-slate-500 font-mono truncate">
                                {{ s.kelas || 'No Kelas' }} &bull; {{ s.hafalan_manual || '0 Juz' }}
                            </p>
                        </div>
                    </div>
                    <span class="material-symbols-outlined text-slate-300 flex-shrink-0">chevron_right</span>
                </div>

                <!-- Empty State -->
                <div v-if="filteredSantri.length === 0" class="text-center py-12">
                    <span class="material-symbols-outlined text-slate-200 text-5xl">search_off</span>
                    <p class="text-slate-400 text-sm mt-2">Tidak ada santri ditemukan.</p>
                </div>
            </div>
        </div>

        <!-- DETAIL VIEW: grid 30 juz -->
        <div v-else class="px-4 pt-4 space-y-4">
            <!-- Header -->
            <div class="flex items-center gap-3">
                <button
                    @click="$emit('go-back')"
                    class="size-10 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-slate-50 transition"
                >
                    <span class="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <h2 class="text-xl font-bold text-slate-900">{{ activeSantriName }}</h2>
                    <p class="text-xs text-slate-500">Progres 30 Juz</p>
                </div>
            </div>

            <!-- Juz Grid -->
            <div class="bg-white p-6 rounded-3xl border shadow-sm">
                <div class="grid grid-cols-5 gap-3 sm:gap-4 justify-items-center">
                    <button
                        v-for="j in 30" :key="j"
                        @click="!['wali','santri'].includes(userSession?.role) && $emit('select-juz', j)"
                        class="size-12 sm:size-14 rounded-full border-2 flex flex-col items-center justify-center transition-all bg-slate-50 text-slate-400 border-slate-200"
                        :class="{
                            'hover:scale-110 active:scale-95 hover:border-emerald-300 cursor-pointer': !['wali','santri'].includes(userSession?.role),
                            'cursor-default pointer-events-none': ['wali','santri'].includes(userSession?.role),
                            'bg-blue-500 text-white shadow-lg shadow-blue-200 border-transparent': selectedSantriProgress[j] && ['A+','A'].includes(selectedSantriProgress[j]),
                            'bg-emerald-500 text-white shadow-lg shadow-emerald-200 border-transparent': selectedSantriProgress[j] && ['B+','B'].includes(selectedSantriProgress[j]),
                            'bg-amber-400 text-white shadow-lg shadow-amber-200 border-transparent': selectedSantriProgress[j] === 'B-',
                            'bg-red-500 text-white shadow-lg shadow-red-200 border-transparent': selectedSantriProgress[j] === 'C',
                            'bg-orange-400 text-white shadow-lg shadow-orange-200 border-transparent': selectedSantriProgress[j] === 'Centang',
                        }"
                    >
                        <!-- Icon Centang -->
                        <span v-if="selectedSantriProgress[j] === 'Centang'" class="material-symbols-outlined text-2xl font-bold">check</span>

                        <!-- Nomor Juz -->
                        <span v-else class="text-sm sm:text-lg font-bold">{{ j }}</span>

                        <!-- Grade Label -->
                        <span
                            v-if="selectedSantriProgress[j] && selectedSantriProgress[j] !== 'Centang'"
                            class="text-[9px] font-black uppercase tracking-tighter opacity-90"
                        >{{ selectedSantriProgress[j] }}</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
    `
};
