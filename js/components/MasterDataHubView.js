const MasterDataHubView = {
    props: {
        userSession: Object,
        uiData: Object
    },
    emits: ['navigate'],
    setup(props) {
        const masterMenus = [
            { id: 'santri', name: 'Data Santri', icon: 'groups', desc: 'Kelola data seluruh santri' },
            { id: 'guru', name: 'Data Guru', icon: 'badge', desc: 'Kelola data pengajar' },
            { id: 'kelas', name: 'Data Kelas', icon: 'meeting_room', desc: 'Pengaturan rombel & wali' },
            { id: 'mapel', name: 'Mata Pelajaran', icon: 'book_5', desc: 'Daftar kurikulum akademik' },
            { id: 'target', name: 'Target Hafalan', icon: 'track_changes', desc: 'Setting pencapaian juz' }
        ];

        return { masterMenus };
    },
    template: `
        <div class="h-full flex flex-col pt-8 px-6 pb-24 overflow-y-auto no-scrollbar fade-in bg-white">
            <!-- Clean List Grid -->
            <div class="space-y-4">
                <div v-for="menu in masterMenus" :key="menu.id"
                    @click="$emit('navigate', menu.id)"
                    class="group flex items-center gap-5 p-5 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-blue-200 transition-all cursor-pointer active:scale-[0.98]">
                    
                    <!-- Clean Icon Wrapper -->
                    <div class="size-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                        <span class="material-symbols-outlined text-2xl font-light">{{ menu.icon }}</span>
                    </div>

                    <!-- Menu Info -->
                    <div class="flex-1">
                        <h3 class="font-semibold text-slate-800 text-sm group-hover:text-primary transition-colors">{{ menu.name }}</h3>
                        <p class="text-[11px] text-slate-400 mt-0.5">{{ menu.desc }}</p>
                    </div>

                    <!-- Minimalist Arrow -->
                    <span class="material-symbols-outlined text-slate-200 text-xl group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
                </div>
            </div>
        </div>
    `
};
