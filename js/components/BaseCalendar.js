const BaseCalendar = {
    props: {
        isOpen: {
            type: Boolean,
            required: true
        },
        mode: {
            type: String,
            default: 'range' // 'single' | 'range' | 'month'
        },
        modelValue: {
            type: String,
            default: '' // Used for 'single' mode (YYYY-MM-DD)
        },
        startDate: {
            type: String,
            default: '' // Used for 'range' / 'month' mode (YYYY-MM-DD)
        },
        endDate: {
            type: String,
            default: '' // Used for 'range' / 'month' mode (YYYY-MM-DD)
        },
        title: {
            type: String,
            default: 'Pilih Periode'
        }
    },
    emits: ['update:modelValue', 'update:startDate', 'update:endDate', 'close', 'apply'],
    setup(props, { emit }) {
        const { ref, reactive, computed, watch, onMounted, onUnmounted } = Vue;

        const monthNames = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];

        const todayStr = new Date().toISOString().split('T')[0];

        // Active calendar viewing month/year
        const viewMonth = ref(new Date().getMonth());
        const viewYear = ref(new Date().getFullYear());

        // Temporary selection states to commit on "Apply"
        const tempStart = ref('');
        const tempEnd = ref('');
        const tempSingle = ref('');

        const instanceId = 'calendar_' + Math.random().toString(36).substr(2, 9);

        // Sync view month/year to props when opened
        const initCalendarView = () => {
            let refDate = todayStr;
            if (props.mode === 'single' && props.modelValue) {
                refDate = props.modelValue;
            } else if ((props.mode === 'range' || props.mode === 'month') && props.startDate) {
                refDate = props.startDate;
            }

            const parts = refDate.split('-');
            if (parts.length === 3) {
                viewYear.value = parseInt(parts[0]);
                viewMonth.value = parseInt(parts[1]) - 1;
            }

            tempStart.value = props.startDate;
            tempEnd.value = props.endDate;
            tempSingle.value = props.modelValue;
        };

        watch(() => props.isOpen, (newVal) => {
            if (newVal) {
                initCalendarView();
                window.history.pushState({ baseCalendarId: instanceId }, '');
                window.addEventListener('popstate', handlePopState);
            } else {
                window.removeEventListener('popstate', handlePopState);
                if (window.history.state && window.history.state.baseCalendarId === instanceId) {
                    window.history.back();
                }
            }
        });

        const handlePopState = () => {
            if (props.isOpen) {
                emit('close');
            }
        };

        onUnmounted(() => {
            window.removeEventListener('popstate', handlePopState);
        });

        // Navigation
        const prevMonth = () => {
            if (props.mode === 'month') {
                viewYear.value--;
            } else {
                if (viewMonth.value === 0) {
                    viewMonth.value = 11;
                    viewYear.value--;
                } else {
                    viewMonth.value--;
                }
            }
        };

        const nextMonth = () => {
            if (props.mode === 'month') {
                viewYear.value++;
            } else {
                if (viewMonth.value === 11) {
                    viewMonth.value = 0;
                    viewYear.value++;
                } else {
                    viewMonth.value++;
                }
            }
        };

        // Helpers
        const toYMD = (year, month, day) => {
            const m = String(month + 1).padStart(2, '0');
            const d = String(day).padStart(2, '0');
            return `${year}-${m}-${d}`;
        };

        const formatDateIndo = (ymd) => {
            if (!ymd) return '';
            return ymd.split('-').reverse().join('/');
        };

        // Grid Generation (Days)
        const calendarWeeks = computed(() => {
            if (props.mode === 'month') return [];
            const firstDay = new Date(viewYear.value, viewMonth.value, 1).getDay();
            const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate();

            const items = [];
            // Pre-spacers
            for (let i = 0; i < firstDay; i++) {
                items.push(null);
            }
            // Days
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = toYMD(viewYear.value, viewMonth.value, d);
                items.push({
                    day: d,
                    dateStr,
                    isToday: dateStr === todayStr
                });
            }
            return items;
        });

        // Month Selection Actions
        const selectMonth = (mIdx) => {
            const year = viewYear.value;
            const startStr = `${year}-${String(mIdx + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(year, mIdx + 1, 0).getDate();
            const endStr = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            tempStart.value = startStr;
            tempEnd.value = endStr;
        };

        const isMonthSelected = (mIdx) => {
            if (!tempStart.value) return false;
            const parts = tempStart.value.split('-');
            return parseInt(parts[0]) === viewYear.value && (parseInt(parts[1]) - 1) === mIdx;
        };

        // Selection Actions (Days)
        const handleDayClick = (dateStr) => {
            if (props.mode === 'single') {
                tempSingle.value = dateStr;
            } else {
                // Range Selection Logic
                if (!tempStart.value || (tempStart.value && tempEnd.value)) {
                    tempStart.value = dateStr;
                    tempEnd.value = '';
                } else if (tempStart.value && !tempEnd.value) {
                    if (dateStr < tempStart.value) {
                        tempStart.value = dateStr;
                    } else {
                        tempEnd.value = dateStr;
                    }
                }
            }
        };

        const isDaySelected = (dateStr) => {
            if (props.mode === 'single') {
                return tempSingle.value === dateStr;
            }
            return tempStart.value === dateStr || tempEnd.value === dateStr;
        };

        const isDayInRange = (dateStr) => {
            if (props.mode === 'single' || !tempStart.value || !tempEnd.value) return false;
            return dateStr > tempStart.value && dateStr < tempEnd.value;
        };

        // Commit Selection
        const applySelection = () => {
            if (props.mode === 'single') {
                emit('update:modelValue', tempSingle.value);
                emit('apply', tempSingle.value);
            } else {
                // Ensure proper bounds
                const start = tempStart.value;
                const end = tempEnd.value || tempStart.value; // Fallback if only start is selected
                emit('update:startDate', start);
                emit('update:endDate', end);
                emit('apply', { start, end });
            }
            emit('close');
        };

        const cancelSelection = () => {
            emit('close');
        };

        const formattedActiveRange = computed(() => {
            if (props.mode === 'month') {
                if (tempStart.value) {
                    const parts = tempStart.value.split('-');
                    const mName = monthNames[parseInt(parts[1]) - 1];
                    return `${mName} ${parts[0]}`;
                }
                return 'Pilih Bulan';
            }
            if (props.mode === 'single') {
                return tempSingle.value ? formatDateIndo(tempSingle.value) : 'Pilih Tanggal';
            }
            if (tempStart.value && tempEnd.value) {
                return `${formatDateIndo(tempStart.value)} — ${formatDateIndo(tempEnd.value)}`;
            }
            if (tempStart.value) {
                return `${formatDateIndo(tempStart.value)} — ...`;
            }
            return 'Pilih Periode';
        });

        return {
            monthNames,
            viewMonth,
            viewYear,
            calendarWeeks,
            formattedActiveRange,
            prevMonth,
            nextMonth,
            handleDayClick,
            isDaySelected,
            isDayInRange,
            selectMonth,
            isMonthSelected,
            applySelection,
            cancelSelection
        };
    },
    template: `
    <Teleport to="body">
        <Transition name="backdrop-fade">
            <div v-if="isOpen" @click="cancelSelection"
                class="fixed inset-0 z-[500] bg-slate-900/40 backdrop-blur-[3px] flex items-center justify-center p-4">
                
                <!-- Card Container -->
                <div @click.stop
                    class="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-scale-in flex flex-col transition-all duration-200">
                    
                    <div class="p-6 pb-4">
                        <div class="space-y-4">
                            <!-- Calendar Header -->
                            <div class="flex items-center justify-between mb-2">
                                <button @click="prevMonth" type="button"
                                    class="p-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                                    <span class="material-symbols-outlined text-sm">chevron_left</span>
                                </button>
                                <div class="text-center flex-1">
                                    <h3 class="font-black text-slate-800 text-sm tracking-tight">
                                        <span v-if="mode === 'month'">Tahun {{ viewYear }}</span>
                                        <span v-else>{{ monthNames[viewMonth] }} {{ viewYear }}</span>
                                    </h3>
                                </div>
                                <button @click="nextMonth" type="button"
                                    class="p-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                                    <span class="material-symbols-outlined text-sm">chevron_right</span>
                                </button>
                            </div>

                            <!-- Mode Month Picker View -->
                            <div v-if="mode === 'month'" class="grid grid-cols-3 gap-2.5 py-1">
                                <button v-for="(mName, mIdx) in monthNames" :key="mIdx"
                                    @click="selectMonth(mIdx)"
                                    type="button"
                                    class="py-3.5 rounded-2xl text-xs font-black transition-all border text-center active:scale-95"
                                    :class="[
                                        isMonthSelected(mIdx)
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                                            : 'bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100 hover:border-slate-300'
                                    ]">
                                    {{ mName.substring(0, 3) }}
                                </button>
                            </div>

                            <!-- Mode standard (Days) View -->
                            <div v-else class="grid grid-cols-7 gap-y-1 gap-x-1">
                                <!-- Week Day Titles -->
                                <div class="text-center text-[10px] font-bold text-slate-400 pb-2">Min</div>
                                <div class="text-center text-[10px] font-bold text-slate-400 pb-2">Sen</div>
                                <div class="text-center text-[10px] font-bold text-slate-400 pb-2">Sel</div>
                                <div class="text-center text-[10px] font-bold text-slate-400 pb-2">Rab</div>
                                <div class="text-center text-[10px] font-bold text-slate-400 pb-2">Kam</div>
                                <div class="text-center text-[10px] font-bold text-slate-400 pb-2">Jum</div>
                                <div class="text-center text-[10px] font-bold text-slate-400 pb-2">Sab</div>

                                <!-- Days Loop -->
                                <template v-for="(dayObj, idx) in calendarWeeks" :key="idx">
                                    <!-- Spacer Empty Cell -->
                                    <div v-if="!dayObj" 
                                        class="h-9 flex items-center justify-center text-xs font-semibold pointer-events-none opacity-0">
                                    </div>
                                    
                                    <!-- Active Day Cell -->
                                    <div v-else @click="handleDayClick(dayObj.dateStr)"
                                        class="h-9 flex items-center justify-center text-xs font-semibold cursor-pointer transition-all relative rounded-lg"
                                        :class="[
                                            isDaySelected(dayObj.dateStr) 
                                                ? 'bg-blue-600 text-white shadow-lg z-10 font-bold' 
                                                : isDayInRange(dayObj.dateStr)
                                                    ? 'bg-blue-50 text-blue-700 font-bold'
                                                    : 'hover:bg-slate-100 text-slate-700'
                                        ]">
                                        <span>{{ dayObj.day }}</span>
                                        
                                        <!-- Today Indicator Dot -->
                                        <div v-if="dayObj.isToday" 
                                            class="absolute bottom-1 size-1 rounded-full"
                                            :class="isDaySelected(dayObj.dateStr) ? 'bg-white' : 'bg-blue-500'">
                                        </div>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
                        <div class="text-[11px] font-black text-slate-700 flex flex-col items-center sm:items-start uppercase tracking-tight">
                            <span>{{ formattedActiveRange }}</span>
                        </div>
                        <div class="flex gap-2 w-full sm:w-auto">
                            <button @click="cancelSelection" type="button"
                                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition active:scale-95">
                                Batal
                            </button>
                            <button @click="applySelection" type="button"
                                class="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition shadow-md shadow-blue-200 active:scale-95">
                                Terapkan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
    `
};

window.BaseCalendar = BaseCalendar;
