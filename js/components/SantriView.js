const SantriView = {
    props: [
        'userSession',
        'santriGenderFilter',
        'searchText',
        'filteredSantri',
        'activeDropdown',
        'uiData',
        'loading',
        'showTrash',
        'isModalOpen'
    ],
    emits: [
        'update:santriGenderFilter',
        'update:searchText',
        'open-modal',
        'delete',
        'toggle-dropdown',
        'toggle-trash',
        'restore'
    ],
    setup(props) {
        const { ref, computed } = Vue;

        const getInitials = window.getInitials || ((name) => name ? name.substring(0, 2).toUpperCase() : '??');
        const formatWANumber = window.formatWANumber || ((phone) => phone);

        const isFabClicked = ref(false);
        const { watch } = Vue;

        watch(() => props.isModalOpen, (newVal) => {
            if (!newVal) isFabClicked.value = false;
        });

        const onSantriFabClick = () => { isFabClicked.value = true; };

        // --- PDF FILTER STATE ---
        const pdfGender = ref('');    // '' = semua, 'L' = putra, 'P' = putri
        const pdfKelas = ref('');     // '' = semua kelas

        // Daftar kelas unik dari data santri
        const kelasList = computed(() => {
            const all = (props.uiData?.santri || [])
                .map(s => s.kelas)
                .filter(k => k && k.trim() !== '');
            return [...new Set(all)].sort();
        });

        // Santri yang akan diexport (filtered by pdfGender + pdfKelas, BUKAN filteredSantri dari parent)
        const santriForExport = computed(() => {
            return (props.uiData?.santri || [])
                .filter(s => !s._deleted)
                .filter(s => !pdfGender.value || s.gender === pdfGender.value)
                .filter(s => !pdfKelas.value || s.kelas === pdfKelas.value)
                .sort((a, b) => (a.kelas || '').localeCompare(b.kelas || '') || (a.full_name || '').localeCompare(b.full_name || ''));
        });

        // --- GENERATE PDF ---
        const exportSantriPDF = () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const now = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            const genderLabel = pdfGender.value === 'L' ? ' - Putra' : pdfGender.value === 'P' ? ' - Putri' : '';
            const kelasLabel = pdfKelas.value ? ` - Kelas ${pdfKelas.value}` : '';

            // --- TITLE ---
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 30, 30);
            doc.text(`Data Santri${genderLabel}${kelasLabel}`, 14, 14);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(120, 120, 120);
            doc.text(now, 14, 20);

            // --- TABLE ---
            const data = santriForExport.value.map((s, i) => [
                i + 1,
                s.full_name || '-',
                s.santri_id || '-',
                s.kelas || '-',
                s.gender === 'L' ? 'Putra' : s.gender === 'P' ? 'Putri' : '-'
            ]);

            doc.autoTable({
                startY: 24,
                head: [['No', 'Nama Santri', 'NIS', 'Kelas', 'Gender']],
                body: data,
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: {
                    fillColor: [30, 64, 175],
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 12 },
                    1: { cellWidth: 82 },
                    2: { halign: 'center', cellWidth: 32 },
                    3: { halign: 'center', cellWidth: 30 },
                    4: { halign: 'center', cellWidth: 26 }
                },
                alternateRowStyles: { fillColor: [245, 247, 255] },
                margin: { left: 14, right: 14 }
            });

            const filename = `data_santri${genderLabel}${kelasLabel}.pdf`.replace(/ /g, '_');
            doc.save(filename);
        };

        const showPdfSheet = ref(false);

        const openPdfSheet = () => {
            pdfGender.value = '';
            pdfKelas.value = '';
            showPdfSheet.value = true;
        };

        const doExport = () => {
            exportSantriPDF();
            showPdfSheet.value = false;
        };

        return {
            getInitials,
            formatWANumber,
            isFabClicked,
            onSantriFabClick,
            pdfGender,
            pdfKelas,
            kelasList,
            santriForExport,
            exportSantriPDF,
            showPdfSheet,
            openPdfSheet,
            doExport
        };
    },
    template: `
    <div class="fade-in pb-40">

        <!-- Floating Action Buttons -->
        <teleport to="body">
            <div class="fixed bottom-24 right-4 flex flex-col gap-3 z-[9999]" v-if="uiData.santri && !isModalOpen && (userSession.role === 'admin' || userSession.role === 'guru')">
                <button @click="$emit('toggle-trash')"
                    :class="showTrash ? 'bg-red-500 text-white shadow-xl' : 'bg-white text-slate-400 shadow-lg'"
                    class="size-12 rounded-full flex items-center justify-center transition hover:scale-110 active:scale-95 border border-slate-100">
                    <span class="material-symbols-outlined text-xl">{{ showTrash ? 'close' : 'restore_from_trash' }}</span>
                </button>
                <button v-if="!showTrash && !isFabClicked" @click="onSantriFabClick(); $emit('open-modal')"
                    class="size-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center transition hover:scale-110 active:scale-95 hover:bg-blue-700">
                    <span class="material-symbols-outlined text-3xl">add</span>
                </button>
            </div>
        </teleport>

        <!-- Search -->
        <div class="bg-white p-2 rounded-xl border border-slate-200 mb-2 flex items-center gap-2 transition focus-within:ring-2 focus-within:ring-primary/20 shadow-sm pr-1">
            <span class="material-symbols-outlined text-slate-400 ml-2">search</span>
            <input :value="searchText" @input="$emit('update:searchText', $event.target.value)" type="text" placeholder="Cari berdasarkan nama atau NIS..."
                class="w-full bg-transparent outline-none text-sm placeholder:text-slate-400 font-bold">
            <!-- Search Clear Button -->
            <button v-if="searchText" @click.stop="$emit('update:searchText', '')"
                class="size-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                <span class="material-symbols-outlined text-lg">close</span>
            </button>
        </div>

        <!-- Gender Filter Tabs -->
        <div class="flex p-1 bg-slate-100 rounded-xl mb-4">
            <button @click="$emit('update:santriGenderFilter', 'L')"
                :class="santriGenderFilter === 'L' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'"
                class="flex-1 py-2 text-sm rounded-lg transition-all">Putra</button>
            <button @click="$emit('update:santriGenderFilter', 'P')"
                :class="santriGenderFilter === 'P' ? 'bg-white text-pink-500 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'"
                class="flex-1 py-2 text-sm rounded-lg transition-all">Putri</button>
        </div>

        <!-- ===== EXPORT PDF BUTTON (Admin only) ===== -->
        <div v-if="!showTrash && userSession.role === 'admin'" class="mb-4">
            <button @click="openPdfSheet()"
                class="w-full py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 hover:border-primary hover:text-primary shadow-sm">
                <span class="material-symbols-outlined text-base">picture_as_pdf</span>
                Export PDF Data Santri
            </button>
        </div>

        <!-- ===== PDF FILTER BOTTOM SHEET ===== -->
        <teleport to="body">
            <transition name="fade">
                <div v-if="showPdfSheet" class="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm" @click="showPdfSheet = false"></div>
            </transition>
            <transition name="slide-up">
                <div v-if="showPdfSheet"
                    class="fixed bottom-0 left-0 right-0 z-[9999] bg-white rounded-t-3xl shadow-2xl p-6 pb-10 max-w-lg mx-auto">

                    <!-- Handle -->
                    <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5"></div>

                    <h3 class="text-sm font-black text-slate-800 mb-5">Download PDF Data Santri</h3>

                    <!-- Filter Gender -->
                    <div class="mb-4">
                        <p class="text-[10px] font-black text-slate-400 uppercase mb-2">Gender</p>
                        <div class="flex gap-2">
                            <button v-for="opt in [{ v: '', l: 'Semua' }, { v: 'L', l: 'Putra' }, { v: 'P', l: 'Putri' }]" :key="opt.v"
                                @click="pdfGender = opt.v"
                                class="flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-150"
                                :class="pdfGender === opt.v
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white text-slate-500 border-slate-100'">
                                {{ opt.l }}
                            </button>
                        </div>
                    </div>

                    <!-- Filter Kelas -->
                    <div class="mb-6">
                        <p class="text-[10px] font-black text-slate-400 uppercase mb-2">Kelas</p>
                        <div class="flex gap-2 flex-wrap">
                            <button @click="pdfKelas = ''"
                                class="px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all duration-150"
                                :class="pdfKelas === '' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-100'">
                                Semua
                            </button>
                            <button v-for="k in kelasList" :key="k" @click="pdfKelas = k"
                                class="px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all duration-150"
                                :class="pdfKelas === k ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-100'">
                                {{ k }}
                            </button>
                        </div>
                    </div>

                    <!-- Total & Download -->
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-xs text-slate-400 font-semibold">{{ santriForExport.length }} santri akan diexport</span>
                    </div>
                    <button @click="doExport()"
                        :disabled="santriForExport.length === 0"
                        class="w-full py-3 bg-primary text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20">
                        <span class="material-symbols-outlined text-base">download</span>
                        Download PDF ({{ santriForExport.length }} Santri)
                    </button>
                </div>
            </transition>
        </teleport>

        <!-- List -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
            <div v-for="item in filteredSantri" :key="item._id"
                class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center hover:border-blue-100 transition group cursor-pointer active:scale-[0.98]"
                :class="{
                    'opacity-75 border-red-100': showTrash,
                    'z-[100] border-blue-200 ring-2 ring-primary/10 shadow-2xl relative': activeDropdown === item._id
                }"
                @click.stop="$emit('toggle-dropdown', item._id)">
                <div class="flex gap-3 items-center">
                    <div class="size-10 bg-blue-50 text-primary rounded-full flex items-center justify-center font-bold text-sm"
                        :class="{'bg-red-50 text-red-500': showTrash}">
                        {{ getInitials(item.full_name) }}</div>
                    <div>
                        <p class="font-bold text-slate-900 group-hover:text-primary transition"
                           :class="{'line-through text-slate-400': showTrash}">
                            {{ item.full_name }}
                        </p>
                        <p class="text-xs text-slate-500">{{ item.santri_id }} <span class="mx-1">&bull;</span> {{ item.kelas || '-' }}</p>
                    </div>
                </div>
                <div class="relative">
                    <button @click.stop="$emit('toggle-dropdown', item._id)"
                        class="size-8 flex items-center justify-center text-slate-300 hover:text-primary hover:bg-slate-50 rounded-full transition">
                        <span class="material-symbols-outlined">more_vert</span>
                    </button>
                    <div v-if="activeDropdown === item._id" class="fixed inset-0 z-40 cursor-default"
                        @click.stop="$emit('toggle-dropdown', null)"></div>
                    <div v-if="activeDropdown === item._id"
                        class="absolute right-9 -top-1 w-32 bg-white border border-slate-100 shadow-xl rounded-xl z-50 flex flex-col py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                        <template v-if="!showTrash">
                            <a v-if="item.phone" :href="'https://wa.me/' + formatWANumber(item.phone)"
                                target="_blank"
                                @click="$emit('toggle-dropdown', null)"
                                class="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-green-50 hover:text-green-600 transition text-left">
                                <span class="material-symbols-outlined text-base font-bold">chat</span> WhatsApp
                            </a>
                            <template v-if="userSession.role === 'admin' || userSession.role === 'guru'">
                                <button @click.stop="$emit('toggle-dropdown', null); $emit('open-modal', item)"
                                    class="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition text-left w-full">
                                    <span class="material-symbols-outlined text-base">edit</span> Edit
                                </button>
                                <button @click.stop="$emit('toggle-dropdown', null); $emit('delete', item)"
                                    class="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition text-left w-full">
                                    <span class="material-symbols-outlined text-base">delete</span> Hapus
                                </button>
                            </template>
                        </template>
                        <template v-else>
                            <button @click.stop="$emit('toggle-dropdown', null); $emit('restore', item)"
                                class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-green-50 hover:text-green-600 transition text-left w-full">
                                <span class="material-symbols-outlined text-base">restore_from_trash</span> Pulihkan
                            </button>
                        </template>
                    </div>
                </div>
            </div>
            <!-- Empty State -->
            <div v-if="filteredSantri.length === 0" class="text-center py-10 col-span-full">
                <span class="material-symbols-outlined text-slate-300 text-4xl mb-2">{{ showTrash ? 'delete_outline' : 'search_off' }}</span>
                <p class="text-slate-400 text-sm">{{ showTrash ? 'Tong sampah kosong.' : 'Tidak ada data santri ditemukan.' }}</p>
            </div>
        </div>
    </div>
    `
};

