const ProfileView = {
    props: {
        userSession: { type: Object, required: true },
        profileForm: { type: Object, required: true },
        saveProfile: { type: Function, required: true },
        logout: { type: Function, required: true },
        handleFileSelect: { type: Function, required: true },
        deletePhoto: { type: Function, required: true },
        isUploading: { type: Boolean, default: false },
        getInitials: { type: Function, required: true },
        appVersion: { type: String, default: '1.0.0' },
        // Wali Link Props
        linkedSantri: { type: Object },
        getLinkedSantri: { type: Function },
        linkSantri: { type: Function },
        unlinkSantri: { type: Function },
        // Child Selection Props
        activeChildId: { type: String },
        selectChild: { type: Function },
        activeSubMenu: { type: [String, Object], default: null },
        // App Settings Props
        appConfig: { type: Object },
        saveAppConfig: { type: Function },
        checkUpdate: { type: Function }
    },
    setup(props, { emit }) {
        const { ref, watch } = Vue;

        // Navigation State (now from props if available, otherwise local for standalone use if any)
        const activeSubMenu = ref(props.activeSubMenu);

        watch(() => props.activeSubMenu, (newVal) => {
            activeSubMenu.value = newVal;
        });

        watch(activeSubMenu, (newVal) => {
            emit('update:activeSubMenu', newVal);
        });

        const showPhotoMenu = ref(false);

        // Local NIS input (not from props)
        const localNisInput = ref('');

        // Local santri list (fetch directly)
        const santriList = ref([]);

        // Load santri list
        const loadSantriList = async () => {
            if (props.userSession?.role !== 'wali') return;
            try {
                const { data, error } = await sb.from('santri')
                    .select('*')
                    .eq('wali_id', props.userSession._id)
                    .or('_deleted.is.null,_deleted.eq.false');

                if (error) throw error;
                santriList.value = data || [];
            } catch (e) {
                console.error('Error loading santri:', e);
            }
        };

        const handleLink = async () => {
            if (!localNisInput.value) return;
            await props.linkSantri(localNisInput.value);
            localNisInput.value = '';
            await loadSantriList();
        };

        const handleUnlink = (santriId) => {
            props.unlinkSantri(santriId, (id) => {
                // Langsung hapus dari tampilan saat berhasil (tanpa tunggu re-fetch)
                santriList.value = santriList.value.filter(s => s._id !== id);
            });
        };

        const navigateToSub = (menu) => {
            activeSubMenu.value = menu;
            window.scrollTo(0, 0);
            // v37: Push history state for sub-menu back navigation
            window.history.pushState({ view: 'profile', sub: true }, '', '#profile-' + menu);
        };

        const goBack = () => {
            if (activeSubMenu.value && window.history.state && window.history.state.sub) {
                window.history.back();
            } else {
                activeSubMenu.value = null;
            }
        };

        const showPassword = ref(false);

        const isPushEnabled = ref(Notification.permission === 'granted');
        const expandedRole = ref(null); // Untuk accordion role notif

        const toggleExpandRole = (role) => {
            expandedRole.value = expandedRole.value === role ? null : role;
        };

        const togglePush = async () => {
            if (Notification.permission === 'granted') {
                if (window.PushService) await window.PushService.subscribeUser(props.userSession._id);
                window.showAlert('Notifikasi sudah aktif.', 'Info', 'info');
            } else {
                const ok = await window.PushService.requestPermission();
                if (ok) {
                    isPushEnabled.value = true;
                    window.showAlert('Notifikasi berhasil diaktifkan!', 'Sukses', 'info');
                } else {
                    window.showAlert('Gagal mengaktifkan notifikasi.', 'Error', 'danger');
                }
            }
        };

        // --- History Modal Support (v37) ---
        const isCalendarOpen = ref(false);
        const viewMonth = ref(new Date().getMonth());
        const viewYear = ref(new Date().getFullYear());
        const tempStart = ref('');
        const tempEnd = ref('');
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

        const formatDateShort = (d) => {
            if (!d) return '--/--/----';
            const parts = d.split('-');
            if (parts.length < 3) return d;
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        };

        const calendarWeeks = computed(() => {
            const firstDay = new Date(viewYear.value, viewMonth.value, 1).getDay();
            const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate();
            const todayStr = new Date().toISOString().split('T')[0];

            const weeks = [];
            for (let i = 0; i < firstDay; i++) weeks.push(null);
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                weeks.push({
                    day: d,
                    dateStr,
                    isToday: dateStr === todayStr,
                    isSelected: dateStr === tempStart.value || dateStr === tempEnd.value,
                    isInRange: tempStart.value && tempEnd.value && dateStr > tempStart.value && dateStr < tempEnd.value
                });
            }
            return weeks;
        });

        const moveCalendar = (delta) => {
            viewMonth.value += delta;
            if (viewMonth.value > 11) { viewMonth.value = 0; viewYear.value++; }
            if (viewMonth.value < 0) { viewMonth.value = 11; viewYear.value--; }
        };

        const selectCalendarDate = (dateStr) => {
            if (!tempStart.value || (tempStart.value && tempEnd.value)) {
                tempStart.value = dateStr;
                tempEnd.value = '';
            } else if (dateStr < tempStart.value) {
                tempEnd.value = tempStart.value;
                tempStart.value = dateStr;
            } else if (dateStr > tempStart.value) {
                tempEnd.value = dateStr;
            } else {
                tempStart.value = '';
            }
        };

        const applyCalendarRange = () => {
            props.saveAppConfig({
                holiday_start: tempStart.value,
                holiday_end: tempEnd.value
            });
            isCalendarOpen.value = false;
        };

        const openHolidayPicker = () => {
            tempStart.value = props.appConfig.holiday_start || '';
            tempEnd.value = props.appConfig.holiday_end || '';
            isCalendarOpen.value = true;
        };

        const handleCalendarPop = () => {
            if (isCalendarOpen.value) isCalendarOpen.value = false;
        };

        watch(isCalendarOpen, (newVal) => {
            if (newVal) {
                window.history.pushState({ modal: 'holiday-calendar' }, '');
                window.addEventListener('popstate', handleCalendarPop);
            } else {
                window.removeEventListener('popstate', handleCalendarPop);
                if (window.history.state && window.history.state.modal === 'holiday-calendar') {
                    window.history.back();
                }
            }
        });

        return {
            activeSubMenu,
            showPhotoMenu,
            showPassword,
            localNisInput,
            santriList,
            isPushEnabled,
            expandedRole,
            toggleExpandRole,
            loadSantriList,
            handleUnlink,
            navigateToSub,
            goBack,
            handleLink,
            togglePush,

            // Calendar Exports
            isCalendarOpen, viewMonth, viewYear, tempStart, tempEnd, monthNames,
            formatDateShort, calendarWeeks, moveCalendar, selectCalendarDate,
            applyCalendarRange, openHolidayPicker
        };
    },
    mounted() {
        if (this.userSession?.role === 'wali') {
            this.loadSantriList();
        }
    },
    template: `
    <div class="fade-in px-2 pt-2 pb-12">
        
        <!-- SINGLE UNIFIED CARD -->
        <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[460px] flex flex-col">
            
            <!-- SUB-MENU HEADER -->
            <div v-if="activeSubMenu" class="p-4 border-b border-slate-50 flex items-center gap-3">
                <button @click="goBack" class="size-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-600 transition active:scale-90">
                    <span class="material-symbols-outlined text-xl">arrow_back</span>
                </button>
                <h3 class="font-bold text-slate-800">{{ activeSubMenu === 'account' ? 'Akun & Keamanan' : activeSubMenu === 'config' ? 'Konfigurasi Aplikasi' : 'Sambungkan Santri' }}</h3>
            </div>

            <!-- MAIN VIEW (PROFIL + MENU) -->
            <div v-if="!activeSubMenu" class="flex-1">
                <!-- User Profile Intro -->
                <div class="p-6 border-b border-slate-50">
                    <div class="flex items-center gap-5">
                        <div class="relative">
                            <!-- PHOTO BULAT -->
                            <div v-if="userSession.photo_url" class="size-20 rounded-full shadow-md overflow-hidden border-2 border-white">
                                <img :src="userSession.photo_url" alt="Profile" class="w-full h-full object-cover">
                            </div>
                            <div v-else class="size-20 bg-blue-50 rounded-full flex items-center justify-center text-primary text-2xl font-black border border-blue-100">
                                {{ getInitials(userSession.full_name) }}
                            </div>
                            
                            <!-- 3 DOTS MENU -->
                            <div class="absolute -bottom-1 -right-2 z-10">
                                <button @click="showPhotoMenu = !showPhotoMenu" 
                                    class="bg-white text-slate-500 size-8 rounded-full shadow-lg flex items-center justify-center border border-slate-100 active:scale-95 transition">
                                    <span class="material-symbols-outlined text-lg">more_vert</span>
                                </button>
                                
                                <!-- Dropdown Backdrop -->
                                <div v-if="showPhotoMenu" class="fixed inset-0 z-[60]" @click="showPhotoMenu = false"></div>
                                
                                <!-- Dropdown Menu -->
                                <div v-if="showPhotoMenu" 
                                    class="absolute left-9 top-0 w-36 bg-white border border-slate-100 shadow-xl rounded-xl z-[70] py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                                    <label class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition">
                                        <input type="file" @change="(e) => { handleFileSelect(e); showPhotoMenu = false; }" accept="image/*" class="hidden">
                                        <span class="material-symbols-outlined text-base">photo_camera</span>
                                        <span>Ganti Foto</span>
                                    </label>
                                    <button v-if="userSession.photo_url" @click="deletePhoto(); showPhotoMenu = false;"
                                        class="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 transition border-t border-slate-50">
                                        <span class="material-symbols-outlined text-base">delete</span>
                                        <span>Hapus Foto</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="min-w-0">
                            <h3 class="font-bold text-lg text-slate-900 truncate tracking-tight">{{ userSession.full_name }}</h3>
                            <p class="text-[10px] font-bold text-slate-400 mt-0.5 tracking-[0.1em] uppercase flex items-center gap-1">
                                <span>{{ userSession.role === 'wali' ? 'Wali Santri' : userSession.role }}</span>
                                <span class="opacity-30">•</span>
                                {{ userSession.username }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Account & Settings List -->
                <div class="divide-y divide-slate-50">
                    <!-- Akun -->
                    <button @click="navigateToSub('account')" 
                        class="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition active:bg-slate-50">
                        <div class="flex items-center gap-4 text-slate-700">
                            <span class="material-symbols-outlined text-slate-400">manage_accounts</span>
                            <span class="font-bold text-sm">Akun & Keamanan</span>
                        </div>
                        <span class="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                    </button>

                    <!-- Wali Link -->
                    <button v-if="userSession.role === 'wali'" @click="navigateToSub('santri')" 
                        class="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition active:bg-slate-50">
                        <div class="flex items-center gap-4 text-slate-700">
                            <span class="material-symbols-outlined text-slate-400">family_restroom</span>
                            <span class="font-bold text-sm">Sambungkan Santri</span>
                        </div>
                        <span class="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                    </button>

                    <!-- Admin Config -->
                    <button v-if="userSession.role === 'admin'" @click="navigateToSub('config')" 
                        class="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition active:bg-slate-50">
                        <div class="flex items-center gap-4 text-slate-700">
                            <span class="material-symbols-outlined text-slate-400">settings_suggest</span>
                            <div class="text-left">
                                <p class="font-bold text-sm">Konfigurasi Aplikasi</p>
                                <p class="text-[10px] text-slate-400 font-medium">Holiday Mode & Notifikasi</p>
                            </div>
                        </div>
                        <span class="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                    </button>

                    <!-- Notifikasi Settings Toggle -->
                    <button @click="togglePush" 
                        class="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition active:bg-slate-50">
                        <div class="flex items-center gap-4 text-slate-700">
                            <span class="material-symbols-outlined" :class="isPushEnabled ? 'text-emerald-500' : 'text-slate-400'">
                                {{ isPushEnabled ? 'notifications_active' : 'notifications_off' }}
                            </span>
                            <div class="text-left">
                                <p class="font-bold text-sm">Notifikasi Sistem</p>
                                <p class="text-[10px] text-slate-400 font-medium">{{ isPushEnabled ? 'Aktif (Background)' : 'Klik untuk mengaktifkan' }}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                             <div v-if="isPushEnabled" class="size-2 bg-emerald-500 rounded-full animate-pulse"></div>
                             <span class="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                        </div>
                    </button>

                    <!-- Cek Update (v37 Standardized) -->
                    <button @click="checkUpdate" 
                        class="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition active:bg-slate-50">
                        <div class="flex items-center gap-4 text-slate-700">
                            <span class="material-symbols-outlined text-slate-400">system_update_alt</span>
                            <div class="text-left">
                                <p class="font-bold text-sm">Cek Pembaruan</p>
                                <p class="text-[10px] text-slate-400 font-medium">Versi Saat Ini: v{{ appVersion }}</p>
                            </div>
                        </div>
                        <span class="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                    </button>
                </div>

                <!-- Standalone Logout Button -->
                <div class="p-6">
                    <button @click="logout" 
                        class="w-full bg-red-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-95 transition flex items-center justify-center gap-2 text-sm tracking-wide">
                        <span class="material-symbols-outlined text-xl">logout</span>
                        Keluar
                    </button>
                </div>
            </div>

            <!-- ACCOUNT SUB-MENU -->
            <div v-if="activeSubMenu === 'account'" class="p-6 space-y-5 flex-1 animate-fade-in-right">
                <div class="space-y-4">
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nama Lengkap</label>
                        
                        <!-- v36: Lock name for Santri (User Request v36.2) -->
                        <div v-if="userSession.role === 'santri'" class="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 text-slate-500 font-bold text-sm flex items-center justify-between">
                            <span>{{ profileForm.full_name }}</span>
                            <span class="material-symbols-outlined text-slate-300 text-sm">lock</span>
                        </div>

                        <input v-else v-model="profileForm.full_name" type="text"
                            class="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50 text-slate-700 transition-all">
                    </div>

                    <div v-if="userSession.role !== 'wali'" class="mb-4">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">ID Resmi</label>
                        <div class="px-4 py-3 bg-slate-100 rounded-2xl text-slate-400 font-mono text-sm border border-slate-200 select-none">
                            {{ userSession.username || '-' }}
                        </div>
                        <p class="text-[9px] text-slate-400 mt-1 px-1">*ID resmi institusi, tidak dapat diubah</p>
                    </div>

                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Username Login (Alias)</label>
                        <input v-model="profileForm.username" type="text"
                            class="w-full px-4 py-3 border border-slate-200 bg-slate-50/50 rounded-2xl text-slate-700 focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-500/10 transition-all">
                    </div>

                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nomor WhatsApp {{ userSession.role === 'santri' ? '(Monitoring Wali)' : '' }}</label>
                        
                        <!-- v36: Lock phone for Santri -->
                        <template v-if="userSession.role === 'santri'">
                            <div class="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 text-slate-500 font-bold text-sm flex items-center justify-between">
                                <span>{{ profileForm.phone || 'Belum ada no tlp' }}</span>
                                <span class="material-symbols-outlined text-slate-300 text-sm">lock</span>
                            </div>
                            <p class="text-[9px] text-slate-400 mt-1.5 px-1">*Otomatis tersinkron dengan nomor Wali</p>
                        </template>
                        
                        <input v-else v-model="profileForm.phone" type="tel" placeholder="08xxxx"
                            class="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50 text-slate-700 transition-all placeholder:font-normal placeholder:text-slate-400">
                    </div>

                    <div v-if="userSession.role === 'guru'">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Jenis Kelamin</label>
                        <select v-model="profileForm.gender" 
                            class="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50 text-slate-700 transition-all appearance-none cursor-pointer">
                            <option value="">-- Pilih Jenis Kelamin --</option>
                            <option value="L">Putra (L)</option>
                            <option value="P">Putri (P)</option>
                        </select>
                    </div>

                    <div class="pt-4 border-t border-slate-50">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Password Baru</label>
                        <p class="text-[9px] text-slate-400 mb-2 px-1">*Kosongkan jika tidak ingin ganti</p>
                        <div class="relative group">
                            <input v-model="profileForm.password" :type="showPassword ? 'text' : 'password'"
                                class="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50 text-slate-700 transition-all placeholder:font-normal placeholder:text-slate-400 pr-12">
                            <button @click="showPassword = !showPassword" type="button" 
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition active:scale-90">
                                <span class="material-symbols-outlined text-[20px]">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                            </button>
                        </div>
                    </div>

                    <button @click="saveProfile().then(ok => { if(ok) goBack(); })"
                        class="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 active:scale-95 transition mt-2 text-sm tracking-wide">
                        Simpan Perubahan
                    </button>
                </div>
            </div>

            <!-- SANTRI LINK SUB-MENU -->
            <div v-if="activeSubMenu === 'santri'" class="p-6 space-y-6 flex-1 animate-fade-in-right">
                <!-- Add Form -->
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Tambah Santri (NIS)</label>
                    <div class="flex gap-2">
                        <input v-model="localNisInput" type="text" placeholder="Masukkan NIS..."
                            class="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50 text-slate-700 transition-all placeholder:font-normal placeholder:text-slate-400 text-sm">
                        <button @click="handleLink"
                            class="px-5 bg-primary text-white rounded-xl font-bold transition active:scale-90 flex items-center justify-center">
                            <span class="material-symbols-outlined">add</span>
                        </button>
                    </div>
                </div>

                <!-- Santri Select List -->
                <div class="space-y-3">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Daftar Santri Terhubung</label>
                    
                    <div v-if="santriList.length === 0" class="text-center py-8 text-slate-400 opacity-60 border-2 border-dashed border-slate-50 rounded-2xl">
                        <p class="text-xs font-bold uppercase tracking-wider">Belum ada santri</p>
                    </div>

                    <div v-for="santri in santriList" :key="santri._id"
                        @click="selectChild(santri._id || santri.santri_id)"
                        class="p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer group relative overflow-hidden"
                        :class="activeChildId === (santri._id || santri.santri_id) ? 'bg-primary border-primary shadow-md' : 'bg-slate-50/50 border-slate-100'">
                        
                        <div class="size-10 rounded-xl flex items-center justify-center font-bold text-xs"
                             :class="activeChildId === (santri._id || santri.santri_id) ? 'bg-white/20 text-white' : 'bg-white text-slate-400 border border-slate-100'">
                            {{ getInitials(santri.full_name) }}
                        </div>

                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <p class="font-bold text-sm truncate" :class="activeChildId === (santri._id || santri.santri_id) ? 'text-white' : 'text-slate-800'">
                                    {{ santri.full_name }}
                                </p>
                                <div v-if="activeChildId === (santri._id || santri.santri_id)" 
                                     class="size-1.5 bg-emerald-300 rounded-full animate-pulse shadow-[0_0_8px_rgba(110,231,183,1)]"></div>
                            </div>
                            <p class="text-[10px] font-semibold" :class="activeChildId === (santri._id || santri.santri_id) ? 'text-blue-100' : 'text-slate-400'">
                                {{ santri.kelas || 'N/A' }} • {{ santri.nis || santri.santri_id }}
                            </p>
                        </div>
                    </div>

                    <!-- Delete Selection -->
                    <button v-if="activeChildId && santriList.find(s => (s._id || s.santri_id) === activeChildId)" 
                        @click.stop="handleUnlink(activeChildId)"
                        class="w-full mt-2 py-2.5 border border-red-50 text-red-400 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:bg-red-50 transition">
                        <span class="material-symbols-outlined text-sm">link_off</span>
                        Hapus Santri Terpilih
                    </button>
                </div>
            </div>

            <!-- APP CONFIG SUB-MENU (Admin) -->
            <div v-if="activeSubMenu === 'config'" class="p-6 space-y-8 flex-1 animate-fade-in-right overflow-y-auto">
                <!-- Holiday Mode -->
                <div>
                    <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 px-1">Global Mode</h4>
                    <div @click="saveAppConfig({ isHolidayMode: !appConfig.isHolidayMode })" 
                        class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-all duration-300 cursor-pointer">
                        <div class="flex items-center gap-4">
                            <div class="size-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center transition-transform group-hover:rotate-12">
                                <span class="material-symbols-outlined text-2xl">beach_access</span>
                            </div>
                            <div class="min-w-0">
                                <p class="text-sm font-bold text-slate-800">Mode Liburan</p>
                                <p class="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">Wali & Santri diizinkan input mandiri</p>
                            </div>
                        </div>
                        <div class="w-14 h-8 rounded-full transition-all duration-500 relative p-1"
                            :class="appConfig.isHolidayMode ? 'bg-orange-500 shadow-lg shadow-orange-200' : 'bg-slate-200'">
                            <div class="size-6 bg-white rounded-full shadow-md transition-all duration-500 transform"
                                :class="appConfig.isHolidayMode ? 'translate-x-6' : 'translate-x-0'"></div>
                        </div>
                    </div>

                    <!-- Tanggal Libur (v37 Premium Range Picker) -->
                    <div @click="openHolidayPicker"
                        class="mt-4 p-4 bg-orange-50/30 rounded-2xl border border-orange-100/50 cursor-pointer hover:bg-orange-50 transition-colors group">
                        <div class="flex items-center justify-between">
                            <div class="space-y-1">
                                <label class="text-[9px] font-black text-orange-400 uppercase tracking-widest block">Rentang Tanggal Libur</label>
                                <div class="text-xs font-medium text-slate-600 flex items-center gap-2">
                                    <span>{{ formatDateShort(appConfig.holiday_start) }} — {{ formatDateShort(appConfig.holiday_end) }}</span>
                                </div>
                            </div>
                             <span class="material-symbols-outlined text-orange-300 text-sm group-hover:text-orange-400 transition">edit_calendar</span>
                        </div>
                        <p v-if="!appConfig.holiday_start" class="text-[10px] text-orange-400 font-medium italic mt-2">Klik untuk mengatur tanggal</p>
                    </div>
                </div>

                <!-- Holiday Calendar Modal -->
                <teleport to="body">
                    <transition name="modal-fade">
                        <div v-if="isCalendarOpen" 
                             @click.self="isCalendarOpen = false"
                             class="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in px-6">
                            
                            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-scale-in">
                                <div class="p-6">
                                    <div class="space-y-4">
                                        <!-- Calendar Header -->
                                        <div class="flex items-center justify-between mb-2">
                                            <button @click="moveCalendar(-1)" 
                                                class="p-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                                                <span class="material-symbols-outlined text-sm">chevron_left</span>
                                            </button>
                                            <div class="text-center flex-1">
                                                <h3 class="font-black text-slate-800 text-sm tracking-tight">
                                                    {{ monthNames[viewMonth] }} {{ viewYear }}
                                                </h3>
                                            </div>
                                            <button @click="moveCalendar(1)" 
                                                class="p-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                                                <span class="material-symbols-outlined text-sm">chevron_right</span>
                                            </button>
                                        </div>

                                        <!-- Calendar Grid -->
                                        <div class="grid grid-cols-7 gap-y-1 gap-x-1">
                                            <div v-for="d in ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']" :key="d"
                                                class="text-center text-[10px] font-bold text-slate-400 pb-2">{{ d }}</div>
                                            
                                            <div v-for="(day, idx) in calendarWeeks" :key="idx" 
                                                @click="day && selectCalendarDate(day.dateStr)"
                                                class="h-9 flex items-center justify-center text-xs font-semibold cursor-pointer transition-all relative rounded-lg border border-transparent"
                                                :class="{
                                                    'pointer-events-none opacity-0': !day,
                                                    'bg-orange-500 text-white shadow-lg z-10': day?.isSelected,
                                                    'bg-orange-50 text-orange-700 font-bold': day?.isInRange,
                                                    'hover:bg-slate-100 text-slate-700': day && !day.isSelected && !day.isInRange,
                                                    'border-orange-500/20': day?.isToday && !day.isSelected
                                                }">
                                                <span v-if="day">{{ day.day }}</span>
                                                <div v-if="day?.isToday" class="absolute bottom-1 size-1 rounded-full" 
                                                    :class="day.isSelected ? 'bg-white' : 'bg-orange-500'"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Footer -->
                                <div class="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
                                    <div class="text-[11px] font-black text-slate-700 flex flex-col items-center sm:items-start uppercase tracking-tight">
                                        <span>{{ formatDateShort(tempStart) }} — {{ formatDateShort(tempEnd) }}</span>
                                    </div>
                                    <div class="flex gap-2 w-full sm:w-auto">
                                        <button @click="isCalendarOpen = false"
                                            class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition">
                                            Batal
                                        </button>
                                        <button @click="applyCalendarRange"
                                            :disabled="!tempStart || !tempEnd"
                                            :class="(!tempStart || !tempEnd) ? 'opacity-50 cursor-not-allowed' : ''"
                                            class="flex-1 sm:flex-none px-4 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-xs hover:bg-orange-600 transition shadow-lg shadow-orange-200">
                                            Simpan
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </transition>
                </teleport>

                <!-- Notification Routing -->
                <div>
                    <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 px-1 text-center">Rute Notifikasi Otomatis</h4>
                    <div class="bg-slate-50/50 p-5 rounded-[2.5rem] border border-slate-100 space-y-4">
                        <!-- Global Toggle -->
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-600">Aktifkan Semua Notifikasi</span>
                            <button @click="saveAppConfig({ 'notifications.enabled': !appConfig.notifications.enabled })" 
                                class="w-12 h-6 rounded-full transition-all duration-300 relative p-1"
                                :class="appConfig.notifications.enabled ? 'bg-indigo-600' : 'bg-slate-300'">
                                <div class="size-4 bg-white rounded-full shadow-sm transition-all duration-300 transform"
                                    :class="appConfig.notifications.enabled ? 'translate-x-6' : 'translate-x-0'"></div>
                            </button>
                        </div>

                        <!-- Role Accordion -->
                        <div class="space-y-2">
                            <p class="text-[10px] text-slate-400 font-black uppercase text-center pb-1">Dikirim Kepada:</p>

                            <template v-for="roleDef in [
                                { role: 'admin', label: 'Admin', types: [
                                    { key: 'pelanggaran',  label: 'Pelanggaran',            icon: 'warning' },
                                    { key: 'uang_saku',    label: 'Riwayat Uang Saku',      icon: 'payments' },
                                    { key: 'pengumuman',   label: 'Pengumuman',              icon: 'campaign' },
                                    { key: 'alert_harian', label: 'Alert Harian (Otomatis)', icon: 'schedule' },
                                ]},
                                { role: 'guru', label: 'Guru', types: [
                                    { key: 'pelanggaran',  label: 'Pelanggaran',            icon: 'warning' },
                                    { key: 'uang_saku',    label: 'Riwayat Uang Saku',      icon: 'payments' },
                                    { key: 'pengumuman',   label: 'Pengumuman',              icon: 'campaign' },
                                    { key: 'alert_harian', label: 'Alert Harian (Otomatis)', icon: 'schedule' },
                                ]},
                                { role: 'wali', label: 'Wali', types: [
                                    { key: 'setoran',      label: 'Setoran Diterima',        icon: 'menu_book' },
                                    { key: 'ujian',        label: 'Ujian Selesai',           icon: 'assignment_turned_in' },
                                    { key: 'pelanggaran',  label: 'Pelanggaran',             icon: 'warning' },
                                    { key: 'uang_saku',    label: 'Uang Saku Ananda',        icon: 'payments' },
                                    { key: 'uang_saku_low', label: 'Saldo Menipis (Peringatan)', icon: 'error_outline' },
                                    { key: 'pengumuman',   label: 'Pengumuman',              icon: 'campaign' },
                                    { key: 'alert_harian', label: 'Alert Harian (Otomatis)', icon: 'schedule' },
                                ]},
                            ]" :key="roleDef.role">
                                <div class="rounded-2xl border overflow-hidden transition-all duration-300"
                                    :class="(appConfig.notifications.targets || []).includes(roleDef.role) ? 'border-primary/30 bg-white shadow-sm' : 'border-slate-100 bg-slate-50/50 opacity-60'">

                                    <!-- Role Header Row -->
                                    <div class="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                                        @click="toggleExpandRole(roleDef.role)">
                                        <!-- Avatar -->
                                        <div class="size-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
                                            :class="(appConfig.notifications.targets || []).includes(roleDef.role) ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'">
                                            {{ roleDef.role.charAt(0).toUpperCase() }}
                                        </div>
                                        <!-- Label -->
                                        <span class="text-sm font-bold text-slate-700 flex-1 capitalize">{{ roleDef.label }}</span>
                                        <!-- Active types count badge -->
                                        <span v-if="(appConfig.notifications.targets || []).includes(roleDef.role)"
                                            class="text-[9px] font-black text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">
                                            {{ roleDef.types.filter(t => (appConfig.notifications.types?.[t.key]?.targets || roleDef.types.map(x=>x.key)).includes(roleDef.role) && appConfig.notifications.types?.[t.key]?.enabled !== false).length }}/{{ roleDef.types.length }}
                                        </span>
                                        <!-- Expand Arrow -->
                                        <span class="material-symbols-outlined text-base text-slate-400 transition-transform duration-300"
                                            :class="expandedRole === roleDef.role ? 'rotate-180' : ''">
                                            expand_more
                                        </span>
                                    </div>

                                    <!-- Expanded: Notification Types -->
                                    <div v-if="expandedRole === roleDef.role"
                                        class="border-t border-slate-100 divide-y divide-slate-50">
                                        <div v-for="notifType in roleDef.types" :key="notifType.key">
                                            <div class="flex items-center justify-between px-4 py-2.5">
                                                <div class="flex items-center gap-2.5">
                                                    <span class="material-symbols-outlined text-sm"
                                                        :class="(appConfig.notifications.types?.[notifType.key]?.enabled !== false) && (appConfig.notifications.types?.[notifType.key]?.targets || roleDef.types.map(t=>t.key).concat([roleDef.role])).includes(roleDef.role) ? 'text-primary' : 'text-slate-300'">
                                                        {{ notifType.icon }}
                                                    </span>
                                                    <span class="text-xs font-semibold text-slate-600">{{ notifType.label }}</span>
                                                </div>
                                                <!-- Toggle: tambah/hapus role ini dari targets jenis notif -->
                                                <button @click.stop="() => {
                                                    const allDefaultRolesForType = notifType.key === 'setoran' || notifType.key === 'ujian' ? ['wali'] : ['wali','guru','admin'];
                                                    const current = appConfig.notifications.types?.[notifType.key]?.targets || allDefaultRolesForType;
                                                    const isOn = current.includes(roleDef.role);
                                                    const newTargets = isOn ? current.filter(r => r !== roleDef.role) : [...current, roleDef.role];
                                                    saveAppConfig({ ['notifications.types.' + notifType.key + '.targets']: newTargets });
                                                }"
                                                :disabled="!(appConfig.notifications.targets || []).includes(roleDef.role)"
                                                class="w-9 h-5 rounded-full transition-all duration-300 relative p-[3px] flex-shrink-0"
                                                :class="[
                                                    (() => {
                                                        const allDefaultRolesForType = notifType.key === 'setoran' || notifType.key === 'ujian' ? ['wali'] : ['wali','guru','admin'];
                                                        const current = appConfig.notifications.types?.[notifType.key]?.targets || allDefaultRolesForType;
                                                        return current.includes(roleDef.role) ? 'bg-primary' : 'bg-slate-200';
                                                    })(),
                                                    !(appConfig.notifications.targets || []).includes(roleDef.role) ? 'opacity-30 cursor-not-allowed' : ''
                                                ]">
                                                <div class="size-[13px] bg-white rounded-full shadow-sm transition-all duration-300 transform"
                                                    :class="(() => {
                                                        const allDefaultRolesForType = notifType.key === 'setoran' || notifType.key === 'ujian' ? ['wali'] : ['wali','guru','admin'];
                                                        const current = appConfig.notifications.types?.[notifType.key]?.targets || allDefaultRolesForType;
                                                        return current.includes(roleDef.role) ? 'translate-x-[16px]' : 'translate-x-0';
                                                    })()"></div>
                                                </button>
                                            </div>

                                            <!-- Setting Spesifik: Minimal Saldo (Formatted Label) -->
                                            <div v-if="notifType.key === 'uang_saku_low' && roleDef.role === 'wali' && (appConfig.notifications.targets || []).includes('wali')" 
                                                class="px-5 pb-3 flex items-center justify-end gap-1.5 text-right">
                                                <span class="text-[9px] font-bold text-slate-400">Batas minimal saldo Rp.</span>
                                                <input type="text" 
                                                    :value="new Intl.NumberFormat('id-ID').format(appConfig.notifications.types?.uang_saku_low?.min_balance_threshold || 10000)"
                                                    @input="(e) => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        saveAppConfig({ 'notifications.types.uang_saku_low.min_balance_threshold': parseInt(val) || 0 });
                                                    }"
                                                    class="w-20 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-600 focus:outline-none focus:border-primary text-center py-0.5"
                                                    placeholder="10.000">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>


            <!-- VERSION INFO (Always at bottom inside card) -->
            <div class="p-6 border-t border-slate-50 bg-slate-50/20 text-center mt-auto">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Versi Aplikasi {{ appVersion.replace('v', '') }}</p>
            </div>
        </div>

    </div>
    `
};
