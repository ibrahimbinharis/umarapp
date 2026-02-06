const { createApp, ref, reactive, computed, onMounted, watch, nextTick } = Vue;

const MENU_CONFIG = [
    { id: 'dashboard', label: "Home", icon: "home", roles: ['admin', 'guru', 'wali'], inBottom: true },
    { id: 'jadwal', label: "Jadwal", icon: "calendar_month", roles: ['admin', 'guru'], inBottom: true },
    { id: 'input', label: "Input", icon: "add", roles: ['admin', 'guru'], inBottom: true, highlight: true },
    { id: 'riwayat', label: "Riwayat", icon: "history", roles: ['admin', 'guru', 'wali'], inBottom: true },
    { id: 'absensi', label: "Absensi", icon: "event_available", roles: ['admin', 'guru'], inBottom: true },
    { id: 'santri', label: "Santri", icon: "group", roles: ['admin', 'guru'], inBottom: false },
    { id: 'hafalan', label: "Hafalan", icon: "menu_book", roles: ['admin', 'guru', 'wali'], inBottom: false },
    { id: 'ujian', label: "Ujian", icon: "assignment_turned_in", roles: ['admin', 'guru'], inBottom: false },
    { id: 'target', label: "Target", icon: "track_changes", roles: ['admin'], inBottom: false },
    { id: 'guru', label: "Guru", icon: "supervisor_account", roles: ['admin'], inBottom: false },
    { id: 'mapel', label: "Mapel", icon: "book_2", roles: ['admin'], inBottom: false },
    { id: 'kelas', label: "Kelas", icon: "meeting_room", roles: ['admin'], inBottom: false },
    { id: 'quran', label: "Al-Quran", icon: "auto_stories", roles: ['admin', 'guru', 'wali'], inBottom: false },
    { id: 'pelanggaran', label: "Pelanggaran", icon: "warning", roles: ['admin', 'guru', 'wali'], inBottom: false },
    { id: 'profile', label: "Profile", icon: "account_circle", roles: ['admin', 'guru', 'wali'], inBottom: false },
    { id: 'rekap', label: "Rekap", icon: "analytics", roles: ['admin', 'guru', 'wali'], inBottom: false },
];



createApp({
    setup() {
        // --- STATE ---
        const loading = ref(true);
        const appName = ref(APP_CONFIG.appName);
        const appVersion = ref(APP_CONFIG.version);
        const currentView = ref('login');

        // --- AUTH (v34 Refactor) ---
        const { userSession, loginForm, handleLogin, logout, checkSession } = useAuth(currentView, loading);
        const syncStatus = reactive({ status: 'idle', message: '', icon: 'sync' });
        const dataStats = computed(() => ({
            total: window.allData ? window.allData.length : 0,
            users: window.allData ? window.allData.filter(d => d.__type === 'user').length : 0,
            santri: uiData.santri.length
        }));



        // Santri Module State
        const searchText = ref('');
        const modalState = reactive({ isOpen: false, view: '', title: '', isEdit: false });

        // santriForm moved to useSantri


        // Global Data (Reactive Wrapper for UI lists)
        const uiData = reactive({
            santri: [],
            guru: [], // Master Data
            mapel: [], // Master Data
            kelas: [],
            jadwal: [], // Academic
            absensi: [], // Academic
            setoran: [],
            ujian: [],
            pelanggaran: [], // added
            master_pelanggaran: [], // added
            surahList: [] // For dropdowns
        });

        // Initialize Pelanggaran Composable
        const pelanggaran = usePelanggaran(uiData, DB, refreshData);

        // Initialize Santri Composable
        const santri = useSantri(uiData, DB, userSession, modalState, refreshData, searchText);

        // Initialize Users Composable
        const guru = useGuru(uiData, DB, modalState);

        // Initialize Mapel Composable
        const mapel = useMapel(uiData, DB);

        // Initialize Kelas Composable
        const kelas = useKelas(uiData, DB);

        // Initialize Jadwal Composable
        const jadwal = useJadwal(uiData, DB, modalState);

        // Initialize Absensi Composable
        const absensi = useAbsensi(uiData, DB, modalState);

        // Initialize Target Composable
        const target = useTarget(uiData, DB);

        // Initialize Setoran Composable
        const setoran = useSetoran(uiData, DB, refreshData);

        // Initialize Quran Composable (Moved up for dependency injection)
        const quran = useQuran(uiData);

        // Initialize Ujian Composable
        // Initialize Ujian Composable
        const quranControls = {
            goToJuz: quran.goToJuz,
            setPage: (p) => {
                quran.quranState.page = p;
                quran.quranState.showDrawer = false;
            }
        };
        const ujian = useUjian(uiData, DB, userSession, refreshData, quranControls, currentView, modalState);

        // Initialize Riwayat Composable
        const riwayat = useRiwayat(uiData, DB, refreshData, { setoran, ujian, pelanggaran }, currentView);


        // Initialize Dashboard Composable
        const { dashboardStats, calculateStats, initCharts, activityFilter, filteredActivities } = useDashboard(uiData, userSession);

        // Initialize Profile Composable
        const profile = useProfile(uiData, DB, userSession, refreshData);

        // --- PAGE CALC Caches (Non-reactive for performance) ---
        const surahPageCache = {};
        const pageDensityCache = {};




        const mapelList = ['Fiqih', 'Aqidah Akhlaq', 'Bahasa Arab', 'Hadits', 'Sirah Nabawiyah', 'Tajwid', 'Matematika', 'B. Indonesia', 'B. Inggris'];

        // --- SYNC STATE ---
        const syncState = reactive({
            status: 'idle', // idle, uploading, saved, error
            message: ''
        });

        // Expose updateSyncUI to global window for core.js to call
        window.updateSyncUI = (status, message) => {
            syncState.status = status;
            syncState.message = message;
            if (status === 'success' || status === 'saved') {
                setTimeout(() => {
                    syncState.status = 'idle';
                    syncState.message = '';
                }, 3000);
            }
        };

        // --- PELANGGARAN (Now using composable) ---
        // See pelanggaran composable initialized after uiData



        // --- CROPPER STATE & METHODS ---
        const cropModal = reactive({
            isOpen: false,
            imageSrc: null
        });
        const cropperImage = ref(null);
        let cropperInstance = null;

        // --- EXAM FLOATING CONTROLS ---
        const examControlPos = reactive({ x: window.innerWidth - 180, y: window.innerHeight - 200 }); // Default position
        const isDraggingControl = ref(false);
        const dragOffset = reactive({ x: 0, y: 0 });
        const showExamControls = ref(false);

        const startDragExamControl = (e) => {
            isDraggingControl.value = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            dragOffset.x = clientX - examControlPos.x;
            dragOffset.y = clientY - examControlPos.y;
        };

        const dragExamControl = (e) => {
            if (!isDraggingControl.value) return;
            // Prevent default scroll if needed, but 'passive' in template handles it. 
            // Here just calc position
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            examControlPos.x = clientX - dragOffset.x;
            examControlPos.y = clientY - dragOffset.y;
        };

        const endDragExamControl = () => {
            isDraggingControl.value = false;
        };

        const updateSalah = (delta) => {
            if (ujian.ujianForm.tab === 'bulanan') {
                const newVal = (ujian.ujianForm.b_salah || 0) + delta;
                ujian.ujianForm.b_salah = Math.max(0, newVal);
            } else {
                const newVal = (ujian.ujianForm.s_salah || 0) + delta;
                ujian.ujianForm.s_salah = Math.max(0, newVal);
            }
        };

        const finishExam = () => {
            // Recalculate score
            if (ujian.ujianForm.tab === 'bulanan') {
                ujian.calcBulananScore();
            } else {
                ujian.calcSemesterScore();
            }
            // Go back to Ujian View
            currentView.value = 'ujian';
            showExamControls.value = false;
        };

        const handleFileSelect = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                cropModal.imageSrc = e.target.result;
                cropModal.isOpen = true;

                // Init Cropper after DOM update
                nextTick(() => {
                    if (cropperInstance) cropperInstance.destroy();

                    if (!cropperImage.value) {
                        return;
                    }

                    try {
                        cropperInstance = new Cropper(cropperImage.value, {
                            aspectRatio: 1,
                            viewMode: 1,
                            dragMode: 'move',
                            autoCropArea: 0.8,
                            guides: false,
                            background: false
                        });
                    } catch (err) {
                        console.error("Cropper init error:", err);
                    }
                });
            };
            reader.readAsDataURL(file);

            // Reset input so same file can be selected again
            event.target.value = '';
        };

        const cancelCrop = () => {
            cropModal.isOpen = false;
            cropModal.imageSrc = null;
            if (cropperInstance) {
                cropperInstance.destroy();
                cropperInstance = null;
            }
        };

        const saveCrop = () => {
            console.log("saveCrop clicked");
            if (!cropperInstance) {
                console.error("No cropper instance found!");
                return;
            }

            try {
                // Get cropped canvas
                const canvas = cropperInstance.getCroppedCanvas({
                    width: 800,
                    height: 800,
                    fillColor: '#fff',
                    imageSmoothingEnabled: true,
                    imageSmoothingQuality: 'high',
                });

                if (!canvas) {
                    console.error("Failed to create canvas");
                    return;
                }

                console.log("Canvas created, converting to base64...");

                // Convert to base64
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                console.log("Base64 generated, length:", base64.length);

                // Call useProfile upload
                if (profile && profile.uploadPhoto) {
                    profile.uploadPhoto(base64);
                } else {
                    console.error("profile.uploadPhoto not found!", profile);
                }

                // Close modal
                cancelCrop();
            } catch (err) {
                console.error("Error in saveCrop:", err);
                alert("Terjadi kesalahan saat memproses gambar: " + err.message);
            }
        };






        // Computed for Absensi View
        const guruOptions = computed(() => {
            return uiData.guru.map(g => g.full_name);
        });

        // Computed for Absensi View
        const absensiDayName = computed(() => {
            const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            return days[new Date(absensiState.dateFilter).getDay()];
        });

        const dailyJadwal = computed(() => {
            // Filter jadwal by current day name
            return uiData.jadwal.filter(j => j.day === absensiDayName.value).sort((a, b) => a.time.localeCompare(b.time));
        });

        const filteredJadwalList = computed(() => {
            if (absensiState.dayFilter === 'Semua') return uiData.jadwal;
            return uiData.jadwal.filter(j => j.day === absensiState.dayFilter);
        });

        // Computed for Target View
        const santriWithTarget = computed(() => {
            return uiData.santri.map(s => {
                const defaults = getTargetDefaults(s);
                return {
                    ...s,
                    view_sabaq: s.target_sabaq || defaults.sabaq,
                    view_manzil: s.target_manzil || defaults.manzil,
                    view_pct: s.target_manzil_pct || 20,
                    defaults
                };
            }).sort((a, b) => a.full_name.localeCompare(b.full_name));
        });


        // --- WATCHERS FOR PAGE CALCULATION & VALIDATION ---

        // 1. Validate Ayat Max


        // --- METHODS ---
        // ... (Master Data Methods - Guru, Mapel, Kelas kept as is, inserting new ones below)

        // 4. JADWAL MANAGEMENT
        const openJadwalModal = (jadwal = null) => {
            if (jadwal) {
                const [start, end] = jadwal.time.split(' - ');
                jadwalForm.id = jadwal._id;
                jadwalForm.day = jadwal.day;
                jadwalForm.mapel = jadwal.mapel;
                jadwalForm.time_start = start || '07:00';
                jadwalForm.time_end = end || '08:00';
                jadwalForm.class_name = jadwal.class_name;
                jadwalForm.teacher = jadwal.teacher;
                modalState.title = 'Edit Jadwal';
                modalState.isEdit = true;
            } else {
                jadwalForm.id = null;
                jadwalForm.day = 'Senin';
                jadwalForm.mapel = '';
                jadwalForm.time_start = '07:00';
                jadwalForm.time_end = '08:00';
                jadwalForm.class_name = '';
                jadwalForm.teacher = '';
                modalState.title = 'Tambah Jadwal';
                modalState.isEdit = false;
            }
            modalState.view = 'jadwal';
            modalState.isOpen = true;
        };

        const saveJadwal = async () => {
            if (!jadwalForm.mapel || !jadwalForm.class_name || !jadwalForm.teacher) return alert("Lengkapi data jadwal");
            const payload = {
                day: jadwalForm.day,
                mapel: jadwalForm.mapel,
                time: `${jadwalForm.time_start} - ${jadwalForm.time_end}`,
                class_name: jadwalForm.class_name,
                teacher: jadwalForm.teacher,
                __type: 'jadwal' // Explicit type for create
            };
            if (jadwalForm.id) await DB.update(jadwalForm.id, payload);
            else await DB.create('jadwal', payload);

            closeModal();
            refreshData();
        };

        const deleteJadwal = async (id) => {
            if (confirm('Hapus jadwal ini?')) {
                await DB.delete(id, 'jadwal'); // Ensure collection is passed if generic delete needs it, mostly id is enough
                refreshData();
            }
        };



        // --- GURU METHODS (Now in useUsers composable) ---



        // --- NAVIGATION STATE ---
        const myMenus = computed(() => {
            if (!userSession.value) return [];
            return MENU_CONFIG.filter(m => m.roles.includes(userSession.value.role));
        });

        const bottomMenus = computed(() => {
            // if (currentView.value === 'quran') return []; // Show bottom nav on Quran too
            return myMenus.value.filter(m => m.inBottom).slice(0, 5);
        });

        const isSidebarVisible = computed(() => !!userSession.value && currentView.value !== 'login');
        const isHeaderVisible = computed(() => !!userSession.value && currentView.value !== 'login');





        // Helper: Fetch Page Map


        // Ujian Computed
        const filteredUjian = computed(() => {
            // Filter recent exams based on active tab
            const isSemester = ujianForm.tab === 'semester';
            const list = uiData.ujian.filter(u => {
                const type = (u.type || '').toLowerCase();
                return isSemester ? type.includes('semester') : !type.includes('semester');
            });
            return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
        });

        const filteredPelanggaran = computed(() => {
            return uiData.pelanggaran.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
        });

        const selectedSantriProgress = computed(() => {
            if (!ujianForm.santri_id) return {};
            const s = uiData.santri.find(x => x.santri_id === ujianForm.santri_id);
            if (!s || !s.hafalan_progress) return {};
            // Parse if string
            try {
                return typeof s.hafalan_progress === 'string' ? JSON.parse(s.hafalan_progress) : s.hafalan_progress;
            } catch (e) { return {}; }
        });

        // --- ACTIONS ---
        const navigateTo = (view) => {
            if (view === 'logout') {
                logout();
                return;
            }

            // Hijack Input button during Exam (Quran View + Santri Selected)
            if (view === 'input' && currentView.value === 'quran' && ujian.ujianForm.santri_id) {
                showExamControls.value = !showExamControls.value;
                return;
            }

            currentView.value = view;

            // PWA History Push
            window.history.pushState({ view: view }, '', '#' + view);

            // Sync profile form when navigating to profile
            if (view === 'profile') {
                profile.initProfileForm();
            }

            window.scrollTo(0, 0); // Reset scroll
        };

        // --- AUTH LOGIC Moved to useAuth.js --- 





        const forceSync = async () => {
            // v36: Supabase Sync

            loading.value = true;
            syncStatus.status = 'loading';
            syncStatus.message = 'Memperbarui...';

            try {
                await DB.syncFromCloud();
                loadData();
                syncStatus.status = 'success';
                syncStatus.message = 'Terhubung';
            } catch (e) {
                syncStatus.status = 'error';
                syncStatus.message = 'Offline';
            } finally {
                loading.value = false;
            }
        };



        // --- SETORAN ACTIONS ---



        const loadData = () => {
            const rawData = DB.getAll();
            window.allData = rawData;
            buildIndexes();

            // Update UI Lists (Filter out Soft Deleted items)
            const activeData = rawData.filter(d => !d._deleted);

            uiData.santri = activeData.filter(d => d.__type === 'santri');
            uiData.guru = activeData.filter(d => d.__type === 'user' && d.role === 'guru');
            uiData.mapel = activeData.filter(d => d.__type === 'mapel');
            uiData.kelas = activeData.filter(d => d.__type === 'kelas');
            uiData.jadwal = activeData.filter(d => d.__type === 'jadwal');
            uiData.absensi = activeData.filter(d => d.__type === 'absensi');

            uiData.setoran = activeData.filter(d => d.__type === 'setoran');
            uiData.ujian = activeData.filter(d => d.__type === 'ujian');
            uiData.pelanggaran = activeData.filter(d => d.__type === 'pelanggaran');
            uiData.master_pelanggaran = activeData.filter(d => d.__type === 'pelanggaran_type');

            calculateStats();
        };

        function refreshData() {
            loadData();
            if (currentView.value === 'dashboard') {
                nextTick(initCharts);
            }
        };

        // Expose to global for composables to use
        window.refreshData = refreshData;
        window.loadData = loadData; // Fix for core.js silent sync calling loadData()

        // Create Ujian Composable


        // --- UJIAN LOGIC REMOVED (Moved to useUjian) ---



        // --- PELANGGARAN ACTIONS (Moved to usePelanggaran.js) ---

        // --- SANTRI ACTIONS (Moved to useSantri.js) ---


        const closeModal = () => {
            modalState.isOpen = false;
            modalState.view = '';
            modalState.data = null;
        };

        // --- HELPER --
        const getSantriName = (id) => {
            if (!id) return '-';
            // Search by santri_id OR _id (legacy support)
            const s = uiData.santri.find(x => x.santri_id === id || x._id === id);
            return s ? s.full_name : 'Unknown ID';
        };

        const formatDate = (iso) => {
            // Simple formatter for list
            if (!iso) return '-';
            return iso.split('T')[0];
        };

        const getInitials = (name) => {
            if (!name) return '?';
            return name.charAt(0).toUpperCase();
        };

        // --- WATCHERS ---
        watch(currentView, (newVal) => {
            if (newVal === 'dashboard') {
                calculateStats();
                nextTick(initCharts);
            }
            if (newVal === 'santri') {
                // reset search
                searchText.value = '';
            }
        });

        // --- DATA REPAIR WATCHER ---
        // Automatically parse 'details' JSON string if it comes from raw DB/Sheet
        watch(() => uiData.absensi, (newVal) => {
            if (newVal && newVal.length > 0) {
                newVal.forEach(item => {
                    if (typeof item.details === 'string') {
                        // Detect corrupted Google Script object references
                        if (item.details.startsWith('[Ljava') || item.details.includes('java.lang')) {
                            item.details = []; // Reset corrupted data
                            return;
                        }

                        try {
                            const parsed = JSON.parse(item.details);
                            item.details = parsed; // Auto-fix in place
                        } catch (e) {
                            // Only warn if it's NOT a known corruption
                            console.warn("Failed to auto-parse absensi details:", item.details);
                            item.details = [];
                        }
                    }
                });
            }
        }, { deep: true });

        // Fix Ujian Meta
        watch(() => uiData.ujian, (newVal) => {
            if (newVal && newVal.length > 0) {
                newVal.forEach(item => {
                    if (typeof item.meta === 'string') {
                        try {
                            // Detect corrupted Google Script object references
                            if (item.meta.startsWith('[Ljava') || item.meta.includes('java.lang')) {
                                item.meta = {};
                                return;
                            }
                            item.meta = JSON.parse(item.meta);
                        } catch (e) {
                            item.meta = {};
                        }
                    }
                });
            }
        }, { deep: true });

        // Fix Santri Hafalan Progress
        watch(() => uiData.santri, (newVal) => {
            if (newVal && newVal.length > 0) {
                newVal.forEach(item => {
                    if (typeof item.hafalan_progress === 'string') {
                        try {
                            if (item.hafalan_progress.startsWith('[Ljava') || item.hafalan_progress.includes('java.lang')) {
                                item.hafalan_progress = {};
                                return;
                            }
                            item.hafalan_progress = JSON.parse(item.hafalan_progress);
                        } catch (e) {
                            item.hafalan_progress = {};
                        }
                    }
                });
            }
        }, { deep: true });

        // --- LIFECYCLE ---
        const exitAttempt = ref(false); // Double back state

        onMounted(async () => {
            // 1. PWA History Listener
            window.addEventListener('popstate', (event) => {
                // Special handling for Double Back on Dashboard
                if (currentView.value === 'dashboard') {
                    if (!exitAttempt.value) {
                        // First attempt: Cancel 'back' by pushing state again
                        window.history.pushState({ view: 'dashboard' }, '', '#dashboard');
                        exitAttempt.value = true;

                        // Show Toast (Native-like)
                        const toast = document.createElement('div');
                        toast.textContent = "Tekan sekali lagi untuk keluar";
                        toast.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background-color:rgba(0,0,0,0.7);color:white;padding:12px 24px;border-radius:50px;font-size:14px;z-index:9999;backdrop-filter:blur(4px);pointer-events:none;animation:fadeIn 0.2s ease-out;";
                        document.body.appendChild(toast);

                        setTimeout(() => {
                            toast.style.opacity = '0';
                            toast.style.transition = 'opacity 0.5s';
                            setTimeout(() => toast.remove(), 500);
                            exitAttempt.value = false;
                        }, 2000);
                        return;
                    } else {
                        // Second attempt: Let it go (Exit)
                        return;
                    }
                }

                // Normal Navigation
                if (event.state && event.state.view) {
                    currentView.value = event.state.view;
                } else if (window.location.hash) {
                    const view = window.location.hash.replace('#', '');
                    if (view) currentView.value = view;
                }
            });

            // Ensure initial history state
            if (!window.history.state) {
                window.history.replaceState({ view: 'login' }, '', '#login');
            }

            loading.value = true;
            try {
                await initSurahData();
                // Populate Surah List after Init
                if (window.surahList) uiData.surahList = window.surahList;

                loadData();
                checkSession();

                // Ensure Default Admin if no users
                // Ensure Default Admin if no users
                // Ensure Default Admin if no users
                const ensureDefaultAdmin = async () => {
                    // Check directly in memory (Source of Truth)
                    // Checks for both legacy 'user' and table 'users' just in case
                    const hasAdmin = window.allData.some(u =>
                        (u.__type === 'user' || u.__type === 'users') &&
                        (u.username === 'admin' || u._id === 'U-ADMIN-001')
                    );

                    if (hasAdmin) {
                        console.log("Admin found. Skipping creation.");
                        return;
                    }

                    console.log("No admin user found. Creating default stable admin...");

                    // We use a manual object instead of DB.create to ensure ID stability across browsers
                    const newAdmin = {
                        _id: 'U-ADMIN-001',
                        __type: 'user',
                        username: 'admin',
                        password: await hashPassword('123'),
                        full_name: 'Administrator',
                        role: 'admin',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    window.allData.unshift(newAdmin);
                    DB.saveAll(window.allData);
                    loadData();
                };

                // v36: Supabase Init (Always connect)
                syncStatus.status = 'loading';
                syncStatus.message = 'Menghubungkan ke Cloud...';

                // Parallel Init: Sync & Surah
                const p1 = DB.syncFromCloud().catch(e => {
                    console.error("Sync failed", e);
                    syncStatus.status = 'error';
                    syncStatus.message = 'Offline';
                    return { success: false };
                });
                const p2 = initSurahData();

                await Promise.allSettled([p1, p2]);

                // Update UI
                syncStatus.status = 'success';
                syncStatus.message = 'Terhubung';

                loadData();
                uiData.surahList = window.surahList;
                await ensureDefaultAdmin();
            } catch (e) {
                console.error("Init failed", e);
            } finally {
                loading.value = false;
            }
        });

        const formatWANumber = (phone) => {
            if (!phone) return '';
            let p = String(phone).replace(/\D/g, '');
            if (p.startsWith('0')) p = '62' + p.slice(1);
            return p;
        };

        // --- EXPORT TO TEMPLATE ---
        return {
            formatWANumber,
            loading, appName, appVersion, currentView, userSession, loginForm,
            dashboardStats, searchText, modalState, uiData,
            examControlPos, startDragExamControl, dragExamControl, endDragExamControl, showExamControls, // Exam Controls
            updateSalah, finishExam,
            cropModal, cropperImage, handleFileSelect, cancelCrop, saveCrop, // Cropper Exports
            mapelList, syncState,
            myMenus, bottomMenus, isSidebarVisible, isHeaderVisible,
            navigateTo, handleLogin, logout, getInitials, refreshData, forceSync,
            syncStatus, dataStats,
            closeModal,
            // Composables (expose all methods & state)
            ...ujian,
            ...pelanggaran,
            ...santri,
            ...guru,
            ...mapel,
            ...kelas,
            ...jadwal,
            ...absensi,
            ...target,
            ...setoran,
            getSantriName, formatDate,
            // Quran
            ...quran,
            ...profile,
            // Riwayat
            ...riwayat,
            ...useRekap(), // ADD REKAP
            // Dashboard
            initCharts, activityFilter, filteredActivities
        };
    }
}).mount('#app');

