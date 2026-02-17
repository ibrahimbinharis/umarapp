const ExamCounter = {
    props: ['ujianForm', 'showExamControls'],
    emits: ['update-salah', 'finish-exam'],
    setup(props, { emit }) {
        const updateSalah = (delta) => {
            emit('update-salah', delta);
        };

        const finishExam = () => {
            emit('finish-exam');
        };

        return {
            updateSalah,
            finishExam
        };
    },
    template: `
    <div v-if="showExamControls"
        class="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-full shadow-2xl border border-slate-200 flex items-center justify-between px-1.5 py-1.5 gap-2 transition-all animate-in slide-in-from-bottom duration-300 w-auto min-w-[200px] max-w-sm">

        <!-- Counter Section -->
        <div class="flex items-center gap-1.5 bg-slate-50 rounded-full px-1.5 py-0.5 border border-slate-100">
            <button @click="updateSalah(-1)"
                class="size-8 rounded-full bg-white text-slate-600 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition shadow-sm border border-slate-100">
                <span class="material-symbols-outlined text-base">remove</span>
            </button>
            
            <div class="flex flex-col items-center min-w-[40px]">
                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Salah</span>
                <span class="text-xl font-black text-red-500 leading-none">{{
                    ujianForm.tab === 'bulanan' ? ujianForm.b_salah : ujianForm.s_salah
                    }}</span>
            </div>

            <button @click="updateSalah(1)"
                class="size-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 active:scale-95 transition shadow-sm border border-red-100">
                <span class="material-symbols-outlined text-base">add</span>
            </button>
        </div>

        <!-- Divider -->
        <div class="h-6 w-px bg-slate-200"></div>

        <!-- Finish Button -->
        <button @click="finishExam"
            class="flex-1 py-1.5 px-3 bg-emerald-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition active:scale-95 shadow-lg shadow-emerald-200">
            <span class="material-symbols-outlined text-base">check_circle</span>
            <span>Selesai</span>
        </button>
    </div>
    `
};
