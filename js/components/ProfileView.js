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
        activeSubMenu: { type: [String, Object], default: null } // Added from composable
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

        // Handle unlink with refresh
        const handleUnlink = async (santriId) => {
            await props.unlinkSantri(santriId);
            loadSantriList();
        };

        const navigateToSub = (menu) => {
            activeSubMenu.value = menu;
            window.scrollTo(0, 0);
        };

        const goBack = () => {
            activeSubMenu.value = null;
        };

        const showPassword = ref(false);

        const isPushEnabled = ref(Notification.permission === 'granted');
        const checkPushStatus = () => {
            isPushEnabled.value = Notification.permission === 'granted';
        };

        const togglePush = async () => {
            if (Notification.permission === 'granted') {
                // Already granted, just re-sync token
                if (window.PushService) await window.PushService.subscribeUser(props.userSession._id);
                window.showAlert('Notifikasi sudah aktif.', 'Info', 'info');
            } else {
                const ok = await window.PushService.requestPermission();
                if (ok) {
                    isPushEnabled.value = true;
                    window.showAlert('Notifikasi berhasil diaktifkan!', 'Sukses', 'info');
                } else {
                    window.showAlert('Gagal mengaktifkan notifikasi. Pastikan Anda mengizinkan notifikasi di pengaturan browser.', 'Error', 'danger');
                }
            }
        };

        return {
            activeSubMenu,
            showPhotoMenu,
            showPassword,
            localNisInput,
            santriList,
            isPushEnabled,
            loadSantriList,
            handleUnlink,
            navigateToSub,
            goBack,
            handleLink,
            togglePush
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
                <h3 class="font-bold text-slate-800">{{ activeSubMenu === 'account' ? 'Akun & Keamanan' : 'Sambungkan Santri' }}</h3>
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
                        <input v-model="profileForm.full_name" type="text"
                            class="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50 text-slate-700 transition-all">
                    </div>

                    <div v-if="userSession.role !== 'wali'" class="mb-4">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">ID Resmi (NIG/NIP)</label>
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
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nomor WhatsApp</label>
                        <input v-model="profileForm.phone" type="tel" placeholder="08xxxx"
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

            <!-- VERSION INFO (Always at bottom inside card) -->
            <div class="p-6 border-t border-slate-50 bg-slate-50/20 text-center">
                <p class="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Tahfidz App v{{ appVersion }}</p>
            </div>
        </div>

    </div>
    `
};
