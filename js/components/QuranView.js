const QuranView = {
    props: {
        uiData: Object,
        quranState: Object,
        quranImageSrc: String,
        currentSurahName: String,
        currentJuz: Number,
        // Methods
        nextQPage: Function,
        prevQPage: Function,
        goToSurah: Function,
        jumpToSurahStart: Function,
        jumpToPage: Function,
        goToJuz: Function,
        jumpToAyat: Function,
        handleTouchStart: Function,
        handleTouchMove: Function,
        handleTouchEnd: Function,
        // Exam specific
        ujianForm: Object,
        showExamControls: Boolean,
        updateSalah: Function,
        finishExam: Function,
        filteredSurahList: Array,
        filteredJuzList: Array,
        rightPageImageUrl: String,
        leftPageImageUrl: String,
        isDesktop: Boolean,
        rightPage: Number,
        leftPage: Number
    },
    components: {
        ExamCounter
    },
    data() {
        return {
            wakeLock: null
        }
    },
    async mounted() {
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock is active - Screen will not sleep');
                document.addEventListener('visibilitychange', this.handleVisibilityChange);
            } catch (err) {
                console.error(`Wake Lock error: ${err.name}, ${err.message}`);
            }
        }
    },
    async unmounted() {
        if (this.wakeLock !== null) {
            await this.wakeLock.release();
            this.wakeLock = null;
            console.log('Wake Lock released');
        }
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    },
    methods: {
        async handleVisibilityChange() {
            if (this.wakeLock !== null && document.visibilityState === 'visible') {
                try {
                    this.wakeLock = await navigator.wakeLock.request('screen');
                } catch (err) {
                    console.error(`Wake Lock re-activation error: ${err.name}, ${err.message}`);
                }
            }
        }
    },
    template: `
    <div class="fixed top-16 md:top-0 bottom-0 left-0 md:left-64 right-0 flex flex-col bg-slate-50 pb-24 md:pb-0 z-10 animate-fade-in shadow-xl">
        <!-- Header (Mobile only) Removed as per request, using global header -->

        <!-- Quran Info Bar (Top) -->
        <div class="w-full h-10 bg-white border-b border-slate-200 px-4 flex justify-between items-center shadow-sm z-40 sticky top-0">
            <span class="font-bold text-slate-500 text-xs w-1/3 text-left">Juz {{ currentJuz }}</span>
            <div class="w-1/3 flex justify-center">
                <span v-if="!isDesktop" class="font-bold text-slate-900 text-sm bg-slate-100 rounded-md px-4 py-1">
                    {{ quranState.page }}
                </span>
                <div v-else class="flex items-center gap-20 bg-slate-100 rounded-lg px-8 py-1">
                    <span class="font-bold text-slate-900 text-sm">{{ leftPage || '' }}</span>
                    <span class="font-bold text-slate-900 text-sm">{{ rightPage }}</span>
                </div>
            </div>
            <div class="w-1/3 flex justify-end items-center gap-3">
                <span class="font-bold text-primary text-xs truncate">{{ currentSurahName }}</span>
                <!-- Unified Drawer Toggle Button (Toggle Open & Close) -->
                <button @click="quranState.showDrawer = !quranState.showDrawer"
                    class="flex size-7 items-center justify-center rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-primary transition active:scale-95"
                    title="Menu Quran">
                    <span class="material-symbols-outlined text-sm">menu</span>
                </button>
            </div>
        </div>

        <!-- Main Viewer Area -->
        <div class="flex-1 relative overflow-y-auto overflow-x-hidden bg-[#fdfaf7] block">
            <div @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd"
                class="w-full min-h-full flex items-start justify-center relative p-0 md:p-6">
                <!-- SINGLE PAGE (Mobile only) -->
                <div v-if="!isDesktop" class="w-full flex justify-center flex-1">
                    <img :src="quranImageSrc"
                        class="w-full max-w-lg h-auto shadow-lg transition-opacity duration-200 select-none border border-[#f0e6d2] mt-0 block"
                        alt="Halaman Quran">
                </div>

                <!-- DUAL PAGE (Desktop Spread) -->
                <div v-else class="hidden md:flex flex-row items-start justify-center w-full max-w-6xl gap-0 bg-white shadow-2xl flex-1">
                    <!-- LEFT PAGE (Even) -->
                    <div class="w-1/2 flex justify-end">
                        <img v-if="leftPageImageUrl" :src="leftPageImageUrl"
                            class="w-full h-auto select-none border border-[#f0e6d2] block"
                            alt="Halaman Kiri">
                    </div>
                    <!-- RIGHT PAGE (Odd) -->
                    <div class="w-1/2 flex justify-start">
                        <img v-if="rightPageImageUrl" :src="rightPageImageUrl"
                            class="w-full h-auto select-none border-y border-r border-t border-[#f0e6d2] block"
                            alt="Halaman Kanan">
                    </div>
                </div>

                <!-- Click Areas for Nav (Invisible) -->
                <div class="absolute inset-0 flex">
                    <div @click="nextQPage"
                        class="w-1/2 h-full z-10 cursor-pointer active:bg-black/5 transition"
                        title="Lanjut (Next)"></div>
                    <div @click="prevQPage"
                        class="w-1/2 h-full z-10 cursor-pointer active:bg-black/5 transition"
                        title="Kembali (Prev)"></div>
                </div>

            </div>
        </div>

        <!-- Draggable Exam Controls (REPLACED by Fixed Bottom Pill) -->
        <!-- Exam Counter Component -->
        <exam-counter v-if="ujianForm" :ujian-form="ujianForm" :show-exam-controls="showExamControls"
            @update-salah="updateSalah" @finish-exam="finishExam">
        </exam-counter>

        <!-- Drawer (Jump) -->
        <div v-if="quranState.showDrawer" class="absolute inset-x-0 bottom-0 top-10 bg-transparent z-30" @click.self="quranState.showDrawer=false">
            <div class="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-[-15px_0_30px_-5px_rgba(0,0,0,0.1)] border-l border-slate-100 flex flex-col animate-slide-in-right">
                <div class="px-4 h-12 border-b flex items-center bg-slate-50 shadow-sm z-10">
                    <span class="text-xs font-bold text-slate-400 tracking-wider">NAVIGASI PENCARIAN</span>
                </div>
                <div class="p-4 space-y-6 overflow-y-auto flex-1 h-full pb-20">
                    <!-- 1. Jump Page -->
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Loncat ke Halaman</label>
                        <div class="flex gap-2">
                            <input v-model="quranState.jumpPage" type="number"
                                class="w-full border rounded-lg px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:border-primary"
                                min="1" max="604" placeholder="1 - 604">
                            <button @click="jumpToPage" class="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm">Go</button>
                        </div>
                    </div>

                    <!-- 2. Loncat Ayat -->
                    <div class="space-y-2 pt-4 border-t border-dashed">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Loncat ke Ayat (Surat Saat ini)</label>
                        <div class="flex gap-2">
                            <input v-model="quranState.jumpAyat" type="number"
                                class="w-full border rounded-lg px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:border-primary"
                                placeholder="Ayat No.">
                            <button @click="jumpToAyat" class="bg-primary hover:bg-blue-700 transition active:scale-95 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm">Cari</button>
                        </div>
                    </div>

                    <!-- 3. Indeks Juz -->
                    <div class="space-y-2 pt-4 border-t border-dashed">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Indeks & Pencarian Juz</label>
                        <div class="relative">
                            <div class="flex items-center border rounded-lg bg-white px-3 py-2 focus-within:border-primary transition shadow-sm cursor-pointer"
                                @click="quranState.isJuzDropdownOpen = !quranState.isJuzDropdownOpen">
                                <span class="material-symbols-outlined text-slate-400 text-sm mr-2">search</span>
                                <input type="text" v-model="quranState.jumpJuzSearch" 
                                    placeholder="Cari Juz (1-30)..."
                                    class="flex-1 bg-transparent outline-none text-sm font-bold"
                                    @focus="quranState.isJuzDropdownOpen = true"
                                    @click.stop>
                                <!-- Clear Button -->
                                <button v-if="quranState.jumpJuzSearch" 
                                    @click.stop="quranState.jumpJuzSearch = ''"
                                    class="flex-none text-slate-400 hover:text-red-500 transition ml-2 flex items-center">
                                    <span class="material-symbols-outlined text-base">close</span>
                                </button>
                            </div>
                            
                            <!-- Backdrop for Click Outside -->
                            <div v-if="quranState.isJuzDropdownOpen" 
                                class="fixed inset-0 z-40" 
                                @click.stop="quranState.isJuzDropdownOpen = false"></div>
                                
                            <!-- Dropdown List -->
                            <div v-if="quranState.isJuzDropdownOpen" 
                                class="absolute left-0 right-0 top-11 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto animate-scale-in">
                                <div v-for="j in filteredJuzList" :key="j"
                                    @click="goToJuz(j); quranState.jumpJuzSearch = 'Juz ' + j; quranState.isJuzDropdownOpen = false"
                                    class="px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-primary cursor-pointer border-b border-slate-50 last:border-0 text-left">
                                    Juz {{ j }}
                                </div>
                                <div v-if="filteredJuzList.length === 0" class="p-4 text-center text-xs text-slate-400 font-bold">
                                    Juz tidak ditemukan
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 4. Indeks Surat & Pencarian -->
                    <div class="space-y-3 pt-4 border-t border-dashed">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Cari & Indeks Surat</label>
                        
                        <!-- Search Box for Surah -->
                        <div class="relative">
                            <div class="flex items-center border rounded-lg bg-slate-50 px-3 py-2 focus-within:border-primary transition shadow-inner">
                                <span class="material-symbols-outlined text-slate-400 text-sm mr-2">search</span>
                                <input type="text" v-model="quranState.jumpSurahSearch" 
                                    placeholder="Ketik nama surat..."
                                    class="flex-1 bg-transparent outline-none text-sm font-bold">
                                <!-- Clear Button -->
                                <button v-if="quranState.jumpSurahSearch" 
                                    @click="quranState.jumpSurahSearch = ''"
                                    class="flex-none text-slate-400 hover:text-red-500 transition ml-2 flex items-center">
                                    <span class="material-symbols-outlined text-base">close</span>
                                </button>
                            </div>
                        </div>

                        <!-- Flat List Directly Below -->
                        <div class="space-y-1 max-h-96 overflow-y-auto pr-1">
                            <button v-for="s in filteredSurahList" :key="s.no" @click="goToSurah(s.no)"
                                class="w-full text-left p-3 rounded-xl hover:bg-blue-50 flex items-center gap-3 border border-transparent hover:border-blue-100 transition group shadow-sm bg-white">
                                <span class="font-bold text-xs bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-primary size-7 rounded-full flex items-center justify-center shrink-0 transition">{{ s.no }}</span>
                                <div class="flex-1">
                                    <p class="font-bold text-sm text-slate-800 group-hover:text-primary transition">{{ s.latin }}</p>
                                    <p class="text-[10px] text-slate-400 italic">{{ s.arti }} &bull; {{ s.ayat }} Ayat</p>
                                </div>
                            </button>
                            <div v-if="filteredSurahList.length === 0" class="py-6 text-center text-xs text-slate-400 font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                Surat tidak ditemukan
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
    `
};
