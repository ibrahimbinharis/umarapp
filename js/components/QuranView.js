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
        finishExam: Function
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
    <div class="fixed top-16 bottom-0 left-0 right-0 flex flex-col bg-slate-50 pb-24 md:static md:pb-0 md:h-[calc(100vh-4rem)] z-0">
        <!-- Header (Mobile only) Removed as per request, using global header -->

        <!-- Quran Info Bar (Top) -->
        <div class="w-full bg-white border-b border-slate-200 px-4 py-2 flex justify-between items-center shadow-sm z-10 sticky top-0">
            <span class="font-bold text-slate-500 text-xs w-1/3 text-left">Juz {{ currentJuz }}</span>
            <span class="font-bold text-slate-900 text-sm w-1/3 text-center bg-slate-100 rounded-md py-1">{{ quranState.page }}</span>
            <span class="font-bold text-primary text-xs w-1/3 text-right truncate">{{ currentSurahName }}</span>
        </div>

        <!-- Main Viewer Area -->
        <div class="flex-1 relative overflow-y-auto overflow-x-hidden bg-[#fdfaf7] flex flex-col items-center justify-start">
            <div @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd"
                class="w-full min-h-full flex items-start justify-center relative p-0 md:p-0 md:h-full">
                <img :src="quranImageSrc"
                    class="w-full h-auto shadow-lg transition-opacity duration-200 select-none border border-[#f0e6d2] md:max-h-full md:max-w-full md:object-contain md:h-full md:w-auto mt-0"
                    alt="Halaman Quran">

                <!-- Click Areas for Nav (Invisible) -->
                <div class="absolute inset-0 flex">
                    <div @click="nextQPage"
                        class="w-1/2 h-full z-10 cursor-pointer active:bg-black/5 transition"
                        title="Lanjut (Next)"></div>
                    <div @click="prevQPage"
                        class="w-1/2 h-full z-10 cursor-pointer active:bg-black/5 transition"
                        title="Kembali (Prev)"></div>
                </div>

                <!-- Desktop Drawer Toggle Only -->
                <button @click="quranState.showDrawer = true"
                    class="hidden md:flex absolute top-4 right-4 size-10 bg-white/50 hover:bg-white rounded-full items-center justify-center shadow z-20 text-slate-700 hover:text-primary transition"
                    title="Menu Quran">
                    <span class="material-symbols-outlined">menu</span>
                </button>
            </div>
        </div>

        <!-- Draggable Exam Controls (REPLACED by Fixed Bottom Pill) -->
        <!-- Exam Counter Component -->
        <exam-counter v-if="ujianForm" :ujian-form="ujianForm" :show-exam-controls="showExamControls"
            @update-salah="updateSalah" @finish-exam="finishExam">
        </exam-counter>

        <!-- Drawer (Jump) -->
        <div v-if="quranState.showDrawer" class="absolute inset-0 bg-black/50 z-30" @click.self="quranState.showDrawer=false">
            <div class="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl flex flex-col animate-slide-in-right">
                <div class="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 class="font-bold text-slate-800">Navigasi Quran</h3>
                    <button @click="quranState.showDrawer=false"
                        class="size-8 flex items-center justify-center hover:bg-slate-200 rounded-full">
                        <span class="material-symbols-outlined">close</span>
                    </button>
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

                    <!-- 2. Cari Surat & Ayat -->
                    <div class="space-y-3 pt-4 border-t border-dashed">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Cari Surat & Ayat</label>
                        <select v-model="quranState.jumpSurah" class="w-full border rounded-lg px-3 py-2 text-sm font-bold bg-white mb-2">
                            <option value="">Pilih Surat...</option>
                            <option v-for="s in uiData.surahList" :value="s.no">{{ s.no }}. {{ s.latin }}</option>
                        </select>
                        <div class="flex gap-2">
                            <input v-model="quranState.jumpAyat" type="number"
                                class="w-full border rounded-lg px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:border-primary"
                                placeholder="Ayat No.">
                            <button @click="jumpToAyat" class="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm">Cari</button>
                        </div>
                    </div>

                    <!-- 3. Indeks Juz -->
                    <div class="space-y-2 pt-4 border-t border-dashed">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Indeks Juz</label>
                        <select @change="goToJuz($event.target.value)" class="w-full border rounded-lg px-3 py-2 text-sm font-bold bg-white mb-2">
                            <option value="">Pilih Juz...</option>
                            <option v-for="j in 30" :key="j" :value="j">Juz {{ j }}</option>
                        </select>
                    </div>

                    <!-- 4. Indeks Surat -->
                    <div class="space-y-2 pt-4 border-t border-dashed">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Indeks Surat</label>
                        <div class="space-y-1">
                            <button v-for="s in uiData.surahList" :key="s.no" @click="goToSurah(s.no)"
                                class="w-full text-left p-2 rounded hover:bg-slate-50 flex items-center gap-3 border-b border-transparent hover:border-slate-100 transition group">
                                <span class="font-bold text-xs text-slate-400 group-hover:text-primary w-6">{{ s.no }}</span>
                                <div class="flex-1">
                                    <p class="font-bold text-sm text-slate-800">{{ s.latin }}</p>
                                    <p class="text-[10px] text-slate-400 italic">{{ s.arti }} &bull; {{ s.ayat }} Ayat</p>
                                </div>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
    `
};
