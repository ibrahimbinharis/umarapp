const BaseDropdown = {
    props: {
        modelValue: {
            type: [String, Number, Object, null],
            default: null
        },
        options: {
            type: Array,
            default: () => []
        },
        placeholder: {
            type: String,
            default: '-- Pilih --'
        },
        searchable: {
            type: Boolean,
            default: false
        },
        searchPlaceholder: {
            type: String,
            default: 'Cari...'
        },
        clearable: {
            type: Boolean,
            default: true
        }
    },
    emits: ['update:modelValue', 'change', 'clear'],
    setup(props, { emit }) {
        const { ref, computed, watch, nextTick, onUnmounted } = Vue;

        const isOpen = ref(false);
        const searchQuery = ref('');
        const searchInput = ref(null);

        // Unique ID for this dropdown instance
        const instanceId = 'dropdown_' + Math.random().toString(36).substr(2, 9);

        // Close dropdown on back button (popstate)
        const handlePopState = (e) => {
            if (isOpen.value) {
                isOpen.value = false;
            }
        };

        // Toggle drop visibility
        const toggleDropdown = () => {
            isOpen.value = !isOpen.value;
        };

        // Helper to extract option properties
        const getOptionValue = (opt) => {
            if (opt && typeof opt === 'object') {
                return opt.value !== undefined ? opt.value : opt._id;
            }
            return opt;
        };

        const getOptionLabel = (opt) => {
            if (opt && typeof opt === 'object') {
                return opt.label || opt.name || opt.full_name || opt.title || '';
            }
            return opt;
        };

        const getOptionSubtitle = (opt) => {
            if (opt && typeof opt === 'object') {
                return opt.subtitle || opt.desc || opt.nis || opt.book_name || null;
            }
            return null;
        };

        // Search options
        const filteredOptions = computed(() => {
            if (!searchQuery.value.trim()) return props.options;
            const query = searchQuery.value.toLowerCase().trim();
            return props.options.filter(opt => {
                const label = String(getOptionLabel(opt)).toLowerCase();
                const subtitle = String(getOptionSubtitle(opt) || '').toLowerCase();
                return label.includes(query) || subtitle.includes(query);
            });
        });

        // Determine currently selected label
        const selectedLabel = computed(() => {
            if (props.modelValue === null || props.modelValue === undefined) return '';
            
            const found = props.options.find(opt => {
                const optVal = getOptionValue(opt);
                return optVal === props.modelValue;
            });

            return found ? getOptionLabel(found) : '';
        });

        // Selection actions
        const selectOption = (opt) => {
            const val = getOptionValue(opt);
            emit('update:modelValue', val);
            emit('change', val);
            isOpen.value = false;
        };

        const clearSelection = () => {
            emit('update:modelValue', null);
            emit('clear');
            emit('change', null);
            isOpen.value = false;
        };

        const isSelected = (opt) => {
            return getOptionValue(opt) === props.modelValue;
        };

        // Handle dropdown opening, focus, and history state
        watch(isOpen, (newVal) => {
            if (newVal) {
                // Push standard state so browser back button closes dropdown
                window.history.pushState({ baseDropdownId: instanceId }, '');
                window.addEventListener('popstate', handlePopState);

                searchQuery.value = '';
                if (props.searchable) {
                    nextTick(() => {
                        if (searchInput.value) {
                            searchInput.value.focus();
                        }
                    });
                }
            } else {
                window.removeEventListener('popstate', handlePopState);
                // If closed via click (not back button), clean up history state cleanly
                if (window.history.state && window.history.state.baseDropdownId === instanceId) {
                    window.history.back();
                }
            }
        });

        // Cleanup on unmount
        onUnmounted(() => {
            window.removeEventListener('popstate', handlePopState);
        });

        return {
            isOpen,
            searchQuery,
            searchInput,
            toggleDropdown,
            filteredOptions,
            selectedLabel,
            selectOption,
            clearSelection,
            isSelected,
            getOptionLabel,
            getOptionSubtitle
        };
    },
    template: `
    <div class="relative w-full text-left">
        <!-- Trigger Button -->
        <button @click="toggleDropdown" type="button"
            class="w-full h-8 px-2.5 border rounded-lg text-[11px] font-bold bg-white text-left flex justify-between items-center transition duration-200"
            :class="isOpen ? 'border-primary ring-2 ring-primary/20 bg-blue-50/5' : 'border-slate-200 hover:border-slate-300'">
            
            <!-- Label Display -->
            <span v-if="selectedLabel" class="text-slate-800 font-bold truncate pr-2 leading-none">
                {{ selectedLabel }}
            </span>
            <span v-else class="text-slate-400 font-normal truncate leading-none">
                {{ placeholder }}
            </span>
            
            <!-- Right Icons Group -->
            <div class="flex items-center gap-1.5 shrink-0">
                <!-- Clear Button -->
                <button v-if="clearable && modelValue !== null && modelValue !== undefined && modelValue !== ''" @click.stop="clearSelection" type="button"
                    class="size-4 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition active:scale-95">
                    <span class="material-symbols-outlined text-[10px] leading-none">close</span>
                </button>
                <!-- Dropdown Chevron -->
                <span class="material-symbols-outlined text-slate-400 text-sm leading-none transition-transform duration-200"
                    :class="{ 'rotate-180 text-primary': isOpen }">
                    expand_more
                </span>
            </div>
        </button>

        <!-- Dropdown Menu -->
        <div v-if="isOpen" 
            class="absolute left-0 right-0 mt-1 bg-white border border-slate-200 shadow-2xl rounded-xl z-[1000] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-64">
            
            <!-- Search Input -->
            <div v-if="searchable" class="p-2 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div class="relative">
                    <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
                    <input v-model="searchQuery" ref="searchInput" type="text" :placeholder="searchPlaceholder"
                        class="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
                    <button v-if="searchQuery" @click="searchQuery = ''" type="button"
                        class="absolute right-2 top-1/2 -translate-y-1/2 size-4.5 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
                        <span class="material-symbols-outlined text-[10px]">close</span>
                    </button>
                </div>
            </div>

            <!-- Options List -->
            <div class="flex-1 overflow-y-auto py-1 custom-scrollbar">
                <template v-if="filteredOptions.length > 0">
                    <button v-for="(opt, idx) in filteredOptions" :key="idx" @click="selectOption(opt)" type="button"
                        class="w-full px-3 py-1.5 hover:bg-slate-50 cursor-pointer flex flex-col text-left transition-colors border-b border-slate-50 last:border-0"
                        :class="isSelected(opt) ? 'bg-blue-50/40' : ''">
                        
                        <span class="text-[11px] font-bold transition-colors"
                            :class="isSelected(opt) ? 'text-primary font-black' : 'text-slate-700'">
                            {{ getOptionLabel(opt) }}
                        </span>
                        
                        <span v-if="getOptionSubtitle(opt)" class="text-[9px] text-slate-400 mt-0.5 font-medium leading-none">
                            {{ getOptionSubtitle(opt) }}
                        </span>
                    </button>
                </template>
                <div v-else class="px-4 py-6 text-xs text-slate-400 text-center italic">
                    Data tidak ditemukan
                </div>
            </div>
        </div>
        
        <!-- Backdrop Overlay (for easy click-outside close) -->
        <div v-if="isOpen" class="fixed inset-0 z-[999] cursor-default" @click="isOpen = false"></div>
    </div>
    `
};

window.BaseDropdown = BaseDropdown;
