const GuruView = {
    props: [
        'filteredGuru',
        'activeDropdown'
    ],
    emits: [
        'open-modal',
        'delete',
        'toggle-dropdown'
    ],
    template: `
    <div class="fade-in space-y-4 pb-32">
        <div class="flex justify-between items-center px-2">
            <h2 class="text-2xl font-bold text-slate-900">Data Guru</h2>
            <button @click="$emit('open-modal')"
                class="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow flex items-center gap-2 hover:bg-blue-800 transition">
                <span class="material-symbols-outlined text-lg">add</span> Tambah
            </button>
        </div>

        <!-- Guru List -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
            <div v-for="user in filteredGuru" :key="user._id"
                class="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-start group hover:border-blue-100 transition">
                <div>
                    <p class="font-bold text-slate-900">{{ user.full_name }}</p>
                    <p class="text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                        {{ user.username }}
                        <span v-if="user.custom_username" class="text-blue-600"> &bull; {{
                            user.custom_username }}</span>
                        &bull; {{ user.role }}
                    </p>
                </div>
                <div class="relative">
                    <button @click.stop="$emit('toggle-dropdown', user._id)"
                        class="size-8 flex items-center justify-center text-slate-300 hover:text-primary hover:bg-slate-50 rounded-full transition">
                        <span class="material-symbols-outlined text-lg">more_vert</span>
                    </button>

                    <!-- Backdrop -->
                    <div v-if="activeDropdown === user._id" class="fixed inset-0 z-10 cursor-default"
                        @click.stop="$emit('toggle-dropdown', null)"></div>

                    <!-- Dropdown Menu -->
                    <div v-if="activeDropdown === user._id"
                        class="absolute right-9 -top-1 w-32 bg-white border border-slate-100 shadow-xl rounded-xl z-20 flex flex-col py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                        <button @click="$emit('open-modal', user); $emit('toggle-dropdown', null)"
                            class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition text-left w-full">
                            <span class="material-symbols-outlined text-base">edit</span> Edit
                        </button>
                        <button @click="$emit('delete', user._id); $emit('toggle-dropdown', null)"
                            class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition text-left w-full">
                            <span class="material-symbols-outlined text-base">delete</span> Hapus
                        </button>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="!filteredGuru || filteredGuru.length === 0"
                class="bg-white p-8 rounded-xl border text-center">
                <span class="material-symbols-outlined text-5xl text-slate-300 mb-2">groups</span>
                <p class="text-slate-400 text-sm">Belum ada data guru</p>
            </div>
        </div>
    </div>
    `
};
