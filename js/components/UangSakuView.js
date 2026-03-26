const UangSakuView = {
    props: {
        uiData: Object,
        userSession: Object,
        // Using usActiveSantri passed directly or synced from app state
        usActiveSantri: String,
        isSantriDropdownOpen: Boolean,
        santriSearchQuery: String,
        
        listTab: String,
        isTxModalOpen: Boolean,
        txForm: Object,
        listSemua: Array,
        listMasuk: Array,
        listKeluar: Array,
        saldo: Number,
        formatRp: Function,
        isEditMode: Boolean,
        usActiveMenuId: String
    },
    emits: ['update:usActiveSantri', 'update:isSantriDropdownOpen', 'update:santriSearchQuery', 'update:listTab', 'select-santri', 'open-modal', 'edit-modal', 'close-modal', 'save-tx', 'delete-tx', 'toggle-menu', 'close-menus'],
    setup(props, { emit }) {
        const { computed, onMounted, onUnmounted } = Vue;

        // v37: Global Click outside handler (Standard professional way)
        const handleOutsideClick = () => {
            if (props.usActiveMenuId) emit('close-menus');
        };
        onMounted(() => document.addEventListener('click', handleOutsideClick));
        onUnmounted(() => document.removeEventListener('click', handleOutsideClick));

        const filteredSantriList = computed(() => {
            if (!props.uiData.santri) return [];
            let list = [...props.uiData.santri];

            // Gender Filter for UI (shared by admin/guru)

            if (props.usGenderFilter && (props.userSession.role === 'admin' || props.userSession.role === 'guru')) {
                list = list.filter(s => s.gender === props.usGenderFilter);
            }

            if (props.santriSearchQuery) {
                const q = props.santriSearchQuery.toLowerCase();
                list = list.filter(s => s.full_name?.toLowerCase().includes(q) || s.santri_id?.toLowerCase().includes(q));
            }
            return list.slice(0, 20); // Return top 20 for performance
        });

        const activeSantriObj = computed(() => {
            if (!props.usActiveSantri || !props.uiData.santri) return null;
            return props.uiData.santri.find(s => s._id === props.usActiveSantri || s.santri_id === props.usActiveSantri);
        });

        // Computed for formatting
        const formattedSaldo = computed(() => props.formatRp ? props.formatRp(props.saldo) : 'Rp 0');

        const genderFilter = Vue.ref('semua');

        // Calculate Global Summary based on local genderFilter
        const computedGlobalSummary = computed(() => {
            const santriList = (props.uiData.santri || []);
            const filteredSantri = genderFilter.value === 'semua'
                ? santriList
                : santriList.filter(s => s.gender === genderFilter.value);
            
            const filteredSantriIds = new Set(filteredSantri.map(s => s._id || s.santri_id));
            const txList = (props.uiData.uang_saku || []).filter(tx => !tx._deleted && filteredSantriIds.has(tx.santri_id));
            
            const totalIn = txList.filter(tx => tx.type === 'masuk').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0);
            const totalOut = txList.filter(tx => tx.type === 'keluar').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0);
            
            return {
                totalMasuk: totalIn,
                totalKeluar: totalOut,
                saldo: totalIn - totalOut
            };
        });

        const santriBalances = computed(() => {
            if (!props.uiData.santri) return [];
            let list = [...props.uiData.santri];

            if (genderFilter.value !== 'semua') {
                list = list.filter(s => s.gender === genderFilter.value);
            }

            if (props.santriSearchQuery) {
                const q = props.santriSearchQuery.toLowerCase();
                list = list.filter(s => s.full_name?.toLowerCase().includes(q) || s.santri_id?.toLowerCase().includes(q));
            }

            // Calculate saldo
            const allTx = props.uiData.uang_saku || [];
            return list.map(s => {
                const txs = allTx.filter(tx => tx.santri_id === (s._id || s.santri_id) && !tx._deleted);
                const masuk = txs.filter(tx => tx.type === 'masuk').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0);
                const keluar = txs.filter(tx => tx.type === 'keluar').reduce((acc, curr) => acc + (parseInt(curr.jumlah) || 0), 0);
                return {
                    ...s,
                    saldo: masuk - keluar
                };
            }).sort((a, b) => b.saldo - a.saldo);
        });

        return {
            filteredSantriList,
            activeSantriObj,
            formattedSaldo,
            genderFilter,
            computedGlobalSummary,
            santriBalances,
            
            clearActiveSantri: () => {
                // If we have a detail state in history, use back() to keep stack clean
                if (window.history.state && window.history.state.detail) {
                    window.history.back();
                } else {
                    emit('update:santriSearchQuery', '');
                    emit('update:usActiveSantri', '');
                }
            },
            
            toggleDropdown: () => {
                emit('update:isSantriDropdownOpen', !props.isSantriDropdownOpen);
            },
            closeDropdown: () => {
                emit('update:isSantriDropdownOpen', false);
            },
            selectSantri: (id) => {
                emit('update:usActiveSantri', id);
                emit('update:isSantriDropdownOpen', false);
            },
            updateSearch: (val) => emit('update:santriSearchQuery', val),
            
            handleTabChange: (tab) => emit('update:listTab', tab),
            openMasuk: () => emit('open-modal', 'masuk'),
            openKeluar: () => emit('open-modal', 'keluar'),
            openEdit: (item) => emit('edit-modal', item),
            closeModal: () => emit('close-modal'),
            toggleMenu: (id) => emit('toggle-menu', id),
            closeMenus: () => emit('close-menus'),
            saveTx: () => emit('save-tx'),
            delTx: (id) => emit('delete-tx', id),

            getInitials: (name) => {
                if (!name) return 'S';
                return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            },
            formatDateLocal: (iso) => {
                if (!iso) return '-';
                return window.DateUtils.formatDateFriendly(iso);
            },

            // Live formatting for Currency Input
            formatDisplayJumlah: (val) => {
                if (!val) return '';
                // Remove existing dots and non-digits
                let clean = String(val).replace(/[^0-9]/g, '');
                if (!clean) return '';
                // Add dots every 3 digits
                return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            },
            
            handleJumlahInput: (e) => {
                let raw = e.target.value.replace(/[^0-9]/g, '');
                props.txForm.jumlah = raw ? parseInt(raw) : 0;
            }
        };
    },
    template: `
    <div class="fade-in space-y-6 pb-24 pt-2">
        <!-- Unified Header & Filter Area (Show only if no santri selected) -->
        <div v-if="!activeSantriObj" class="px-2 flex flex-col gap-4">
            
            <!-- Global Balance Summary Card (Simplified) -->
            <div class="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm relative overflow-hidden group">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Saldo Dana Santri ({{ genderFilter === 'semua' ? 'Semua' : (genderFilter === 'L' ? 'Putra' : 'Putri') }})</p>
                        <h3 class="text-2xl font-black text-slate-900 tracking-tight">{{ formatRp(computedGlobalSummary.saldo) }}</h3>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] uppercase font-bold text-emerald-500 mb-0.5">Total Masuk</p>
                        <p class="text-xs font-bold text-slate-600">{{ formatRp(computedGlobalSummary.totalMasuk) }}</p>
                    </div>
                </div>
                
                <!-- Progress Line Style -->
                <div class="mt-4 h-1.2 w-full bg-slate-50 rounded-full overflow-hidden flex">
                    <div class="h-full bg-emerald-400/80" :style="{ width: (computedGlobalSummary.totalMasuk / (computedGlobalSummary.totalMasuk + computedGlobalSummary.totalKeluar || 1) * 100) + '%' }"></div>
                    <div class="h-full bg-rose-400/80" :style="{ width: (computedGlobalSummary.totalKeluar / (computedGlobalSummary.totalMasuk + computedGlobalSummary.totalKeluar || 1) * 100) + '%' }"></div>
                </div>
                
                <div class="mt-3 flex justify-between items-center text-[10px] font-bold">
                    <div class="flex items-center gap-1.5">
                        <div class="size-1.5 rounded-full bg-emerald-400"></div>
                        <span class="text-emerald-500">{{ formatRp(computedGlobalSummary.totalMasuk) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <div class="size-1.5 rounded-full bg-rose-400"></div>
                        <span class="text-rose-500">{{ formatRp(computedGlobalSummary.totalKeluar) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Active Santri Header / Clear Selection -->
        <div v-if="activeSantriObj" class="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-2">
            <div class="flex items-center gap-3">
                <div class="size-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {{ getInitials(activeSantriObj.full_name) }}
                </div>
                <div>
                    <p class="font-bold text-slate-800 text-sm mb-0.5">{{ activeSantriObj.full_name }}</p>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium">{{ activeSantriObj.santri_id }}</span>
                        <span class="text-[10px] text-slate-400">{{ activeSantriObj.kelas || '-' }}</span>
                    </div>
                </div>
            </div>
            <button @click="clearActiveSantri" class="size-8 bg-slate-50 rounded-full border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 transition flex items-center justify-center shadow-sm">
                <span class="material-symbols-outlined text-lg">close</span>
            </button>
        </div>

        <!-- Main Content (Show if Santri Selected) -->
        <div v-if="activeSantriObj" class="space-y-4 fade-in">
            <!-- Saldo Card -->
            <div class="bg-white p-6 rounded-3xl border border-slate-100 card-shadow flex items-center justify-between">
                <div>
                    <p class="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">Total Saldo</p>
                    <h3 class="text-2xl font-black text-slate-800">{{ formattedSaldo }}</h3>
                </div>
                
                <button v-if="userSession.role !== 'santri' && userSession.role !== 'wali'" 
                    @click="listTab === 'keluar' ? openKeluar() : openMasuk()"
                    class="h-[42px] px-4 rounded-xl flex items-center justify-center text-white font-bold transition shadow-sm gap-1"
                    :class="listTab === 'keluar' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'">
                    <span class="material-symbols-outlined text-sm">add</span>
                    <span class="text-xs">Input</span>
                </button>
                
                <div v-else class="size-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center shadow-inner">
                    <span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
                </div>
            </div>

            <!-- Tabs -->
            <div class="bg-white p-1 rounded-2xl flex border border-slate-100 shadow-sm mt-6">
                <!-- Tabs -->
                <button @click="handleTabChange('semua')" 
                    class="flex-1 py-2.5 text-xs font-bold rounded-xl transition-all"
                    :class="listTab === 'semua' ? 'bg-slate-100 text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'">
                    Semua
                </button>
                <button @click="handleTabChange('masuk')" 
                    class="flex-1 py-2.5 text-xs font-bold rounded-xl transition-all"
                    :class="listTab === 'masuk' ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'">
                    Pemasukan
                </button>
                <button @click="handleTabChange('keluar')" 
                    class="flex-1 py-2.5 text-xs font-bold rounded-xl transition-all"
                    :class="listTab === 'keluar' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'">
                    Pengeluaran
                </button>
            </div>

            <!-- List Semua -->
            <div v-if="listTab === 'semua'" class="space-y-3 mt-4 fade-in">
                <div v-for="item in listSemua" :key="item._id" 
                    class="bg-white border text-left border-slate-100 p-4 rounded-3xl shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
                    <div class="flex items-center gap-3">
                        <div class="size-11 rounded-2xl flex items-center justify-center font-bold"
                            :class="item.type === 'masuk' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'">
                            <span class="material-symbols-outlined text-xl">{{ item.type === 'masuk' ? 'south_west' : 'north_east' }}</span>
                        </div>
                        <div>
                            <p class="font-bold text-slate-800 text-sm mb-0.5">{{ item.keterangan }}</p>
                            <p class="text-[10px] font-medium text-slate-400">{{ formatDateLocal(item.tanggal) }}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 text-right">
                        <p class="font-black text-sm whitespace-nowrap"
                            :class="item.type === 'masuk' ? 'text-emerald-500' : 'text-red-500'">
                            {{ item.type === 'masuk' ? '+' : '-' }}{{ formatRp(item.jumlah) }}
                        </p>
                        
                        <div v-if="userSession.role !== 'santri' && userSession.role !== 'wali'" class="relative" :class="{'z-50': usActiveMenuId === item._id}">
                            <button @click.stop="toggleMenu(item._id)" class="size-8 flex items-center justify-center text-slate-300 hover:text-slate-600 rounded-full transition hover:bg-slate-100">
                                <span class="material-symbols-outlined text-lg">more_vert</span>
                            </button>
                            
                            <div v-if="usActiveMenuId === item._id" class="absolute right-0 top-9 w-32 bg-white border border-slate-100 shadow-2xl rounded-2xl z-20 flex flex-col py-1 overflow-hidden animate-scale-in origin-top-right">
                                <button @click.stop="openEdit(item); closeMenus()" class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition text-left">
                                    <span class="material-symbols-outlined text-base">edit</span> Edit
                                </button>
                                <button @click.stop="delTx(item._id); closeMenus()" class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition text-left">
                                    <span class="material-symbols-outlined text-base">delete</span> Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="!listSemua.length" class="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                    <span class="material-symbols-outlined text-4xl text-slate-200 mb-2">history</span>
                    <p class="text-xs font-medium text-slate-400">Belum ada riwayat transaksi</p>
                </div>
            </div>

            <!-- List Pemasukan -->
            <div v-if="listTab === 'masuk'" class="space-y-3 mt-4 fade-in">
                <div v-for="item in listMasuk" :key="item._id" class="bg-white border text-left border-slate-100 p-4 rounded-3xl shadow-sm flex items-center justify-between group hover:border-emerald-200 transition">
                    <div class="flex items-center gap-3">
                        <div class="size-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                            <span class="material-symbols-outlined">south_west</span>
                        </div>
                        <div>
                            <p class="font-bold text-slate-800 text-sm mb-0.5">{{ item.keterangan }}</p>
                            <p class="text-[10px] font-medium text-slate-400">{{ formatDateLocal(item.tanggal) }}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 text-right">
                        <p class="font-black text-emerald-500 text-sm whitespace-nowrap">+{{ formatRp(item.jumlah) }}</p>
                        
                        <div v-if="userSession.role !== 'santri' && userSession.role !== 'wali'" class="relative">
                            <button @click.stop="toggleMenu(item._id)" class="size-8 flex items-center justify-center text-slate-300 hover:text-slate-600 rounded-full transition hover:bg-slate-100">
                                <span class="material-symbols-outlined text-lg">more_vert</span>
                            </button>

                            <div v-if="usActiveMenuId === item._id" class="absolute right-0 top-9 w-32 bg-white border border-slate-100 shadow-2xl rounded-xl z-20 flex flex-col py-1 overflow-hidden animate-scale-in origin-top-right">
                                <button @click.stop="openEdit(item); closeMenus()" class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition text-left">
                                    <span class="material-symbols-outlined text-base">edit</span> Edit
                                </button>
                                <button @click.stop="delTx(item._id); closeMenus()" class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition text-left">
                                    <span class="material-symbols-outlined text-base">delete</span> Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="!listMasuk.length" class="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                    <span class="material-symbols-outlined text-4xl text-slate-300 mb-2">inbox</span>
                    <p class="text-sm font-medium text-slate-500">Belum ada pemasukan</p>
                </div>
            </div>

            <!-- List Pengeluaran -->
            <div v-if="listTab === 'keluar'" class="space-y-3 mt-4 fade-in">
                <div v-for="item in listKeluar" :key="item._id" class="bg-white border text-left border-slate-100 p-4 rounded-3xl shadow-sm flex items-center justify-between group hover:border-red-200 transition">
                    <div class="flex items-center gap-3">
                        <div class="size-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                            <span class="material-symbols-outlined">north_east</span>
                        </div>
                        <div>
                            <p class="font-bold text-slate-800 text-sm mb-0.5">{{ item.keterangan }}</p>
                            <p class="text-[10px] font-medium text-slate-400">{{ formatDateLocal(item.tanggal) }}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 text-right">
                        <p class="font-black text-red-500 text-sm whitespace-nowrap">-{{ formatRp(item.jumlah) }}</p>
                        
                        <div v-if="userSession.role !== 'santri' && userSession.role !== 'wali'" class="relative">
                            <button @click.stop="toggleMenu(item._id)" class="size-8 flex items-center justify-center text-slate-300 hover:text-slate-600 rounded-full transition hover:bg-slate-100">
                                <span class="material-symbols-outlined text-lg">more_vert</span>
                            </button>

                            <div v-if="usActiveMenuId === item._id" class="absolute right-0 top-9 w-32 bg-white border border-slate-100 shadow-2xl rounded-xl z-20 flex flex-col py-1 overflow-hidden animate-scale-in origin-top-right">
                                <button @click.stop="openEdit(item); closeMenus()" class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition text-left">
                                    <span class="material-symbols-outlined text-base">edit</span> Edit
                                </button>
                                <button @click.stop="delTx(item._id); closeMenus()" class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition text-left">
                                    <span class="material-symbols-outlined text-base">delete</span> Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="!listKeluar.length" class="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                    <span class="material-symbols-outlined text-4xl text-slate-300 mb-2">outbox</span>
                    <p class="text-sm font-medium text-slate-500">Belum ada pengeluaran</p>
                </div>
            </div>
        </div>

        <!-- Landing Page: Santri List -->
        <div v-else class="space-y-4 fade-in mt-2">
            <!-- Search -->
            <div class="relative">
                <span class="material-symbols-outlined absolute left-4 top-[14px] text-slate-400 text-lg">search</span>
                <input type="text" :value="santriSearchQuery" @input="updateSearch($event.target.value)" placeholder="Cari santri..." 
                    class="w-full bg-white pl-12 pr-4 py-3 rounded-2xl text-sm border border-slate-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium shadow-sm">
            </div>

            <!-- Filter Tabs -->
            <div class="bg-white p-1 rounded-2xl flex border border-slate-100 shadow-sm">
                <button @click="genderFilter = 'semua'" 
                    class="flex-1 py-3 text-xs font-bold rounded-xl transition-all"
                    :class="genderFilter === 'semua' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'">
                    Semua
                </button>
                <button @click="genderFilter = 'L'" 
                    class="flex-1 py-3 text-xs font-bold rounded-xl transition-all"
                    :class="genderFilter === 'L' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'">
                    Putra
                </button>
                <button @click="genderFilter = 'P'" 
                    class="flex-1 py-3 text-xs font-bold rounded-xl transition-all"
                    :class="genderFilter === 'P' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'">
                    Putri
                </button>
            </div>

            <!-- List -->
            <div class="space-y-3 mt-4">
                <div v-for="santri in santriBalances" :key="santri._id" @click="selectSantri(santri._id)" class="bg-white border text-left border-slate-100 p-4 rounded-3xl shadow-sm flex items-center justify-between group hover:border-primary transition cursor-pointer">
                    <div class="flex items-center gap-3">
                        <div class="size-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                            {{ getInitials(santri.full_name) }}
                        </div>
                        <div>
                            <p class="font-bold text-slate-800 text-sm mb-0.5">{{ santri.full_name }}</p>
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium">{{ santri.santri_id }}</span>
                                <span class="text-[10px] text-slate-400">{{ santri.kelas }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-black text-sm" :class="santri.saldo >= 0 ? 'text-slate-800' : 'text-red-500'">{{ formatRp(santri.saldo) }}</p>
                        <p class="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Saldo</p>
                    </div>
                </div>
                <div v-if="!santriBalances.length" class="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200">
                    <span class="material-symbols-outlined text-4xl text-slate-300 mb-2">group_off</span>
                    <p class="text-sm font-medium text-slate-500">Tidak ada santri ditemukan</p>
                </div>
            </div>
        </div>

        <!-- Add Transaction Modal -->
        <Teleport to="body">
            <transition name="fade">
                <div v-if="isTxModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeModal"></div>
                    <div class="bg-white w-full max-w-sm rounded-[24px] shadow-2xl relative z-10 overflow-hidden text-left flex flex-col max-h-[90vh] animate-scale-in">
                        
                        <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center transition-colors duration-300" :class="isEditMode ? 'bg-slate-800 text-white' : (txForm.type === 'masuk' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white')">
                            <h3 class="font-bold text-lg leading-none">
                                {{ isEditMode ? 'Edit Transaksi' : 'Input Transaksi' }}
                            </h3>
                            <button @click="closeModal" class="text-white hover:opacity-75 transition-opacity">
                                <span class="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        <div class="p-6 space-y-4 overflow-y-auto w-full text-left">
                            
                            <!-- Pilihan Jenis -->
                            <div class="bg-slate-100 p-1.5 rounded-2xl flex shadow-inner w-full mb-2">
                                <button @click="txForm.type = 'masuk'" 
                                    class="flex-1 py-2.5 text-xs font-bold rounded-xl transition-all"
                                    :class="txForm.type === 'masuk' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'">
                                    Pemasukan
                                </button>
                                <button @click="txForm.type = 'keluar'" 
                                    class="flex-1 py-2.5 text-xs font-bold rounded-xl transition-all"
                                    :class="txForm.type === 'keluar' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'">
                                    Pengeluaran
                                </button>
                            </div>

                            <div class="space-y-1 text-left w-full">
                                <label class="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Nama Santri</label>
                                <input type="text" disabled :value="activeSantriObj?.full_name" class="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 border border-slate-200">
                            </div>

                            <div class="space-y-1 text-left w-full">
                                <label class="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Tanggal</label>
                                <input type="date" v-model="txForm.tanggal" class="w-full bg-white rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 border border-slate-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
                            </div>

                            <div class="space-y-1 text-left w-full">
                                <label class="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Jumlah (Rp)</label>
                                <div class="relative">
                                    <span class="absolute left-4 top-2.5 text-slate-400 font-bold">Rp</span>
                                    <input type="text" 
                                        :value="formatDisplayJumlah(txForm.jumlah)"
                                        @input="handleJumlahInput"
                                        placeholder="0" 
                                        class="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-800 border border-slate-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
                                </div>
                            </div>

                            <div class="space-y-1 text-left w-full">
                                <label class="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Keterangan</label>
                                <textarea v-model="txForm.keterangan" rows="2" placeholder="Contoh: Beli Sabun / Kiriman Ortu" class="w-full bg-white rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 border border-slate-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"></textarea>
                            </div>
                        </div>

                        <div class="p-6 border-t border-slate-100 bg-slate-50/50">
                            <button @click="saveTx" class="w-full py-3 rounded-xl text-white font-bold tracking-wide shadow-md transition transform active:scale-[0.98] flex items-center justify-center gap-2" :class="isEditMode ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-900/30' : (txForm.type === 'masuk' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-red-500 hover:bg-red-600 shadow-red-500/30')">
                                {{ isEditMode ? 'Simpan Perubahan' : 'Simpan Transaksi' }}
                            </button>
                        </div>
                    </div>
                </div>
            </transition>
        </Teleport>

    </div>
    `
};
