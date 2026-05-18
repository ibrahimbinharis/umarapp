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
        class="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md rounded-full shadow-2xl border border-slate-200/80 flex items-center px-1.5 py-1.5 gap-2 transition-all animate-in slide-in-from-bottom duration-300 w-auto">

        <!-- Counter Section -->
        <div class="flex items-center gap-1.5 bg-slate-50 rounded-full px-1.5 py-0.5 border border-slate-100">
            <button @click="updateSalah(-1)"
                class="size-8 rounded-full bg-white text-slate-600 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition shadow-sm border border-slate-100">
                <span class="material-symbols-outlined text-base">remove</span>
            </button>
            
            <div class="flex items-center justify-center min-w-[32px]">
                <span class="text-lg font-black text-red-500 leading-none">{{
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

        <!-- Finish Button (Minimalist Checkmark) -->
        <button @click="finishExam"
            class="size-8 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 active:scale-95 transition shadow-md shadow-emerald-100 shrink-0"
            title="Selesai Ujian">
            <span class="material-symbols-outlined text-base font-bold">check</span>
        </button>
    </div>
    `
};
