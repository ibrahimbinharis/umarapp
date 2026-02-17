const NotificationView = {
    props: ['notifications', 'unreadCount', 'uiData'],
    emits: ['mark-read', 'mark-all-read', 'navigate', 'back'],
    setup(props) {
        const { ref, computed } = Vue;
        const activeFilter = ref('all'); // all, unread, alert, info, success

        // Helper
        const formatDate = window.formatDate || ((d) => d);

        const filteredNotifications = computed(() => {
            let list = props.notifications;

            if (activeFilter.value === 'unread') {
                list = list.filter(n => !n.is_read);
            } else if (activeFilter.value === 'alert') {
                list = list.filter(n => n.type === 'alert' || n.type === 'warning' || n.type === 'pelanggaran');
            } else if (activeFilter.value === 'info') {
                list = list.filter(n => n.type === 'info');
            } else if (activeFilter.value === 'success') {
                list = list.filter(n => n.type === 'success');
            }

            return list;
        });

        const filters = [
            { id: 'all', label: 'Semua' },
            { id: 'unread', label: 'Belum Dibaca' },
            { id: 'alert', label: 'Penting' },
            { id: 'info', label: 'Info' },
            { id: 'success', label: 'Sukses' }
        ];

        return {
            activeFilter,
            filteredNotifications,
            filters,
            formatDate
        };
    },
    template: `
    <div class="view-container bg-white min-h-screen pb-24">
        <!-- Header -->
        <div class="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 safe-top">
            <div class="flex items-center justify-between px-4 py-3">
                <div class="flex items-center gap-3">
                    <button @click="$emit('back')" class="p-2 -ml-2 rounded-full hover:bg-slate-100 transition active:scale-95 text-slate-600">
                        <span class="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 class="font-bold text-lg text-slate-800">Notifikasi</h1>
                </div>
                <button @click="$emit('mark-all-read')" class="text-xs font-bold text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                    Baca Semua
                </button>
            </div>

            <!-- Filters -->
            <div class="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
                <button v-for="f in filters" :key="f.id"
                    @click="activeFilter = f.id"
                    class="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border"
                    :class="activeFilter === f.id 
                        ? 'bg-slate-800 text-white border-slate-800 shadow-sm' 
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'">
                    {{ f.label }}
                </button>
            </div>
        </div>

        <!-- Content -->
        <div class="p-4 space-y-3">
            <div v-if="filteredNotifications.length === 0" class="flex flex-col items-center justify-center py-20 text-slate-400">
                <div class="size-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                    <span class="material-symbols-outlined text-3xl opacity-30">notifications_off</span>
                </div>
                <p class="text-sm font-medium">Tidak ada notifikasi</p>
                <p class="text-xs opacity-70 mt-1">Belum ada aktivitas untuk filter ini</p>
            </div>

            <div v-else v-for="notif in filteredNotifications" :key="notif._id"
                class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
                :class="{'ring-1 ring-blue-100 bg-blue-50/20': !notif.is_read}"
                @click="$emit('mark-read', notif._id)">
                
                <!-- Unread Indicator Strip -->
                <div v-if="!notif.is_read" class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>

                <div class="flex gap-4">
                    <!-- Icon Box Removed -->

                    <!-- Text -->
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-1">
                            <h3 class="font-bold text-slate-800 text-sm leading-tight group-hover:text-blue-600 transition-colors"
                                :class="{'text-blue-700': !notif.is_read}">
                                {{ notif.title }}
                            </h3>
                            <span class="text-[10px] text-slate-400 whitespace-nowrap ml-2 bg-slate-50 px-1.5 py-0.5 rounded">
                                {{ formatDate(notif.created_at || notif.timestamp) }}
                            </span>
                        </div>
                        <p class="text-xs text-slate-600 leading-relaxed">{{ notif.message }}</p>
                        
                        <!-- Optional Actions or Meta -->
                        <div v-if="notif.santri_id" class="mt-2 text-[10px] font-bold text-slate-400 bg-slate-50 inline-block px-1.5 py-0.5 rounded border border-slate-100">
                            Santri: {{ uiData.santri.find(s => s._id === notif.santri_id || s.santri_id === notif.santri_id)?.full_name || 'Santri' }}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="text-center py-6">
                <p class="text-[10px] text-slate-300">Menampilkan riwayat 3 bulan terakhir</p>
            </div>
        </div>
    </div>
    `
};
