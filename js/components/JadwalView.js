const JadwalView = {
    props: {
        filteredJadwalList: { type: Array, required: true },
        dayFilter: { type: Object, required: true },
        setDayFilter: { type: Function, required: true },
        jadwalGenderFilter: { type: String, required: true },
        openJadwalModal: Function,
        deleteJadwal: Function,
        duplicateJadwal: Function,
        userSession: Object,
        activeDropdown: [String, Number, null],
        isModalOpen: Boolean,
        uiData: Object,
        isMyScheduleOnly: Boolean
    },
    emits: ['update:jadwalGenderFilter', 'toggle-dropdown', 'update:isMyScheduleOnly'],
    setup(props) {
        const { ref, watch } = Vue;
        const days = ['Semua', 'Hari Ini', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
        const DAY_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

        const getBookName = (mapelName) => {
            if (!props.uiData?.mapel) return null;
            const mapel = props.uiData.mapel.find(m => m.name === mapelName);
            return mapel?.book_name || null;
        };

        // FAB Click State
        const isFabClicked = ref(false);

        // Reset FAB state when modal closes
        watch(() => props.isModalOpen, (newVal) => {
            if (!newVal) {
                isFabClicked.value = false;
            }
        });

        const onJadwalFabClick = () => {
            isFabClicked.value = true;
        };

        const printToPDF = () => {
            const list = props.filteredJadwalList;
            const genderLabel = props.jadwalGenderFilter === 'L' ? 'Putra' : 'Putri';
            const dayLabel = props.dayFilter?.value || 'Semua';

            // Group by day
            const grouped = {};
            DAY_ORDER.forEach(d => { grouped[d] = []; });
            list.forEach(item => {
                if (!grouped[item.day]) grouped[item.day] = [];
                grouped[item.day].push(item);
            });

            let rows = '';
            DAY_ORDER.forEach(day => {
                const items = grouped[day];
                if (!items || items.length === 0) return;
                items.forEach((item, idx) => {
                    rows += `
                        <tr>
                            ${idx === 0 ? `<td rowspan="${items.length}" class="day-cell">${day}</td>` : ''}
                            <td>${item.time || '-'}</td>
                            <td><strong>${item.mapel || '-'}</strong>${item.book_name ? `<br><small>${item.book_name}</small>` : ''}</td>
                            <td>${item.class_name || '-'}</td>
                            <td>${item.teacher || '-'}</td>
                        </tr>`;
                });
            });

            const html = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Jadwal Pelajaran - ${genderLabel}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px 48px; color: #1e293b; font-size: 12px; line-height: 1.6; }
        
        .header { margin-bottom: 28px; }
        .header h1 { font-size: 18px; font-weight: 700; color: #0f172a; }
        .header-meta { display: flex; align-items: center; gap: 12px; margin-top: 4px; color: #64748b; font-size: 11px; }
        .header-meta .dot { width: 3px; height: 3px; border-radius: 50%; background: #cbd5e1; }
        .badge { display: inline-block; padding: 1px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; }
        .badge-l { background: #eff6ff; color: #2563eb; }
        .badge-p { background: #fdf2f8; color: #db2777; }

        table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        thead tr { border-bottom: 2px solid #0f172a; }
        th { padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; }
        td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; }
        .day-cell { font-weight: 700; color: #0f172a; font-size: 11px; white-space: nowrap; width: 80px; }
        .mapel-name { font-weight: 600; color: #0f172a; }
        .mapel-book { display: block; font-size: 10px; color: #94a3b8; margin-top: 1px; }
        
        .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; color: #94a3b8; font-size: 10px; }
        
        @media print { body { padding: 24px 32px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>Jadwal Pelajaran</h1>
        <div class="header-meta">
            <span class="badge ${props.jadwalGenderFilter === 'L' ? 'badge-l' : 'badge-p'}">${genderLabel}</span>
            <span class="dot"></span>
            <span>Hari: ${dayLabel}</span>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Hari</th>
                <th>Waktu</th>
                <th>Mata Pelajaran</th>
                <th>Kelas</th>
                <th>Pengajar</th>
            </tr>
        </thead>
        <tbody>
            ${rows || '<tr><td colspan="5" style="text-align:center;padding:24px;color:#94a3b8">Tidak ada data jadwal</td></tr>'}
        </tbody>
    </table>

    <div class="footer">
        <span>E-Umar — Sistem Manajemen Pesantren</span>
        <span>Dicetak: ${new Date().toLocaleString('id-ID')}</span>
    </div>
    <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

            const win = window.open('', '_blank');
            win.document.write(html);
            win.document.close();
        };

        return {
            days,
            isFabClicked,
            onJadwalFabClick,
            getBookName,
            printToPDF
        };
    },
    template: `
    <div class="space-y-4 pb-32">
        <!-- Header & Filters -->
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <!-- Print Button Row -->
            <div v-if="userSession.role === 'admin' || userSession.role === 'guru'" class="flex justify-end">
                <button @click="printToPDF"
                    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition border border-slate-200 hover:border-blue-200">
                    <span class="material-symbols-outlined text-base">print</span>
                    Cetak PDF
                </button>
            </div>
            <!-- Header Removed -->

            <!-- Gender Filter (UI Guard) -->
            <div class="flex p-1 bg-slate-100 rounded-lg" v-if="userSession.role === 'admin' || !userSession.gender">
                <button @click="$emit('update:jadwalGenderFilter', 'L')"
                    :class="jadwalGenderFilter === 'L' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'"
                    class="flex-1 py-1.5 text-xs rounded-md transition-all">
                    Putra
                </button>
                <button @click="$emit('update:jadwalGenderFilter', 'P')"
                    :class="jadwalGenderFilter === 'P' ? 'bg-white text-pink-500 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'"
                    class="flex-1 py-1.5 text-xs rounded-md transition-all">
                    Putri
                </button>
            </div>
            <!-- Simple Indicator for Fixed Gender Guru -->
            <div v-else class="text-left px-2">
                <span class="text-[10px] font-black uppercase tracking-widest"
                    :class="userSession.gender === 'L' ? 'text-blue-600' : 'text-pink-600'">
                    Jadwal {{ userSession.gender === 'L' ? 'Putra' : 'Putri' }}
                </span>
            </div>

            <!-- Day Filter (Scrollable) -->
            <div class="flex gap-2 overflow-x-auto pb-2 no-scrollbar custom-scrollbar items-center">
                <button @click="$emit('update:isMyScheduleOnly', !isMyScheduleOnly)" 
                    :class="isMyScheduleOnly ? 'bg-amber-500 text-white border-amber-500 shadow-amber-200' : 'bg-white text-slate-500 border-slate-100'"
                    class="shrink-0 px-4 py-1.5 rounded-full border text-[11px] font-bold transition active:scale-95 shadow-sm">
                    Jadwalku
                </button>
                <div class="w-px h-4 bg-slate-200 shrink-0 mx-1"></div>
                
                <button v-for="day in days" :key="day"
                    @click="setDayFilter(day)"
                    class="px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border"
                    :class="dayFilter.value === day ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'">
                    {{ day }}
                </button>
            </div>
        </div>

        <!-- Schedule List -->
        <div class="space-y-3 fade-in">
            <div v-for="item in filteredJadwalList" :key="item._id"
                class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-start group hover:border-blue-200 transition cursor-pointer active:scale-[0.98] text-left"
                @click.stop="(userSession.role === 'admin' || userSession.role === 'guru') ? $emit('toggle-dropdown', item._id) : null">
                
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                            :class="item.gender === 'L' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'">
                            {{ item.gender === 'L' ? 'Putra' : 'Putri' }}
                        </span>
                        <span class="text-[10px] font-bold text-slate-400">{{ item.day }}</span>
                    </div>
                    
                    <div class="flex flex-col text-left">
                        <h4 class="font-bold text-slate-800">{{ item.mapel }}</h4>
                        <p v-if="getBookName(item.mapel)" class="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                            <span class="material-symbols-outlined text-xs">auto_stories</span>
                            {{ getBookName(item.mapel) }}
                        </p>
                    </div>
                    
                    <div class="flex items-center gap-3 text-xs text-slate-500">
                        <div class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">schedule</span>
                            <span class="font-bold">{{ item.time }}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">meeting_room</span>
                            <span>{{ item.class_name }}</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-1 text-xs text-slate-500 italic pt-1">
                        <span class="material-symbols-outlined text-[14px]">person</span>
                        <span>{{ item.teacher }}</span>
                    </div>
                </div>

                <!-- Admin & Guru Actions -->
                <div v-if="userSession.role === 'admin' || userSession.role === 'guru'" class="relative">
                    <button @click.stop="$emit('toggle-dropdown', item._id)"
                        class="size-8 flex items-center justify-center text-slate-300 hover:text-primary hover:bg-slate-50 rounded-full transition">
                        <span class="material-symbols-outlined text-lg">more_vert</span>
                    </button>

                    <!-- Backdrop -->
                    <div v-if="activeDropdown === item._id" class="fixed inset-0 z-40 cursor-default"
                        @click.stop="$emit('toggle-dropdown', null)"></div>

                    <!-- Dropdown Menu -->
                    <div v-if="activeDropdown === item._id"
                        class="absolute right-9 -top-1 w-32 bg-white border border-slate-100 shadow-xl rounded-xl z-50 flex flex-col py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                        <button @click.stop="$emit('toggle-dropdown', null); duplicateJadwal(item)"
                            class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition text-left w-full border-b border-slate-50 last:border-0">
                            <span class="material-symbols-outlined text-base text-emerald-500">content_copy</span> Salin
                        </button>
                        <button @click.stop="$emit('toggle-dropdown', null); openJadwalModal(item)"
                            class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition text-left w-full border-b border-slate-50 last:border-0">
                            <span class="material-symbols-outlined text-base text-blue-500">edit</span> Edit
                        </button>
                        <button @click.stop="$emit('toggle-dropdown', null); deleteJadwal(item._id)"
                            class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition text-left w-full">
                            <span class="material-symbols-outlined text-base text-red-400">delete</span> Hapus
                        </button>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="filteredJadwalList.length === 0" class="py-12 text-center">
                <div class="bg-slate-50 size-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span class="material-symbols-outlined text-3xl text-slate-300">calendar_month</span>
                </div>
                <p class="text-slate-400 font-bold text-sm">Belum ada jadwal</p>
                <p class="text-slate-300 text-xs">Silakan tambah jadwal baru</p>
            </div>
        </div>
        <!-- Floating Action Button (Admin & Guru Only) -->
        <teleport to="body">
            <div class="fixed bottom-24 right-4 z-[9999]" v-if="(userSession.role === 'admin' || userSession.role === 'guru') && !isModalOpen">
                <button v-if="!isFabClicked" @click="onJadwalFabClick(); openJadwalModal(null)"
                    class="size-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center transition hover:scale-110 active:scale-95 hover:bg-blue-700">
                    <span class="material-symbols-outlined text-3xl">add</span>
                </button>
            </div>
        </teleport>
    </div>
    `
};
