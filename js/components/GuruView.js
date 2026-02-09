const GuruView = {
    props: [
        'filteredGuru'
    ],
    emits: [
        'open-modal',
        'delete'
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
                <div class="flex items-center gap-1">
                    <button @click="$emit('open-modal', user)"
                        class="size-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition">
                        <span class="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button @click="$emit('delete', user._id)"
                        class="size-8 flex items-center justify-center rounded-full text-red-400 hover:bg-red-50 transition">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
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
