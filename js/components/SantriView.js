const SantriView = {
    props: [
        'userSession',
        'santriGenderFilter',
        'searchText',
        'filteredSantri',
        'activeDropdown',
        'uiData',
        'loading',
        'showTrash' // New Prop
    ],
    emits: [
        'update:santriGenderFilter',
        'update:searchText',
        'open-modal',
        'delete',
        'toggle-dropdown',
        'toggle-trash', // New Emit
        'restore'       // New Emit
    ],
    setup(props) {
        // Helpers
        const getInitials = window.getInitials || ((name) => name ? name.substring(0, 2).toUpperCase() : '??');
        const formatWANumber = window.formatWANumber || ((phone) => phone);

        return {
            getInitials,
            formatWANumber
        };
    },
    template: `
    <div class="fade-in">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold flex items-center gap-2">
                Data Santri 
                <span v-if="showTrash" class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Sampah</span>
            </h2>
            <div class="flex gap-2">
                <!-- Trash Toggle -->
                <button @click="$emit('toggle-trash')"
                    :class="showTrash ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'"
                    class="size-10 flex items-center justify-center rounded-xl border shadow-sm transition"
                    title="Tong Sampah">
                    <span class="material-symbols-outlined">{{ showTrash ? 'delete_forever' : 'delete' }}</span>
                </button>

                <!-- Add Button (Hidden in Trash Mode) -->
                <button v-if="!showTrash" @click="$emit('open-modal')"
                    class="bg-primary text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition">
                    <span class="material-symbols-outlined text-lg">add</span> Tambah
                </button>
            </div>
        </div>

        <!-- Search -->
        <div
            class="bg-white p-2 rounded-xl border border-slate-200 mb-2 flex items-center gap-2 transition focus-within:ring-2 focus-within:ring-primary/20 shadow-sm">
            <span class="material-symbols-outlined text-slate-400 ml-2">search</span>
            <input :value="searchText" @input="$emit('update:searchText', $event.target.value)" type="text" placeholder="Cari berdasarkan nama atau NIS..."
                class="w-full bg-transparent outline-none text-sm placeholder:text-slate-400">
        </div>

        <!-- Gender Filter Tabs -->
        <div class="flex p-1 bg-slate-100 rounded-xl mb-4">
            <button @click="$emit('update:santriGenderFilter', 'L')"
                :class="santriGenderFilter === 'L' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'"
                class="flex-1 py-2 text-sm rounded-lg transition-all">
                Putra
            </button>
            <button @click="$emit('update:santriGenderFilter', 'P')"
                :class="santriGenderFilter === 'P' ? 'bg-white text-pink-500 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'"
                class="flex-1 py-2 text-sm rounded-lg transition-all">
                Putri
            </button>
        </div>

        <!-- List -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
            <div v-for="item in filteredSantri" :key="item._id"
                class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center hover:border-blue-100 transition group"
                :class="{'opacity-75 border-red-100': showTrash}"> <!-- Visual cue for trash items -->
                
                <div class="flex gap-3 items-center">
                    <div
                        class="size-10 bg-blue-50 text-primary rounded-full flex items-center justify-center font-bold text-sm"
                        :class="{'bg-red-50 text-red-500': showTrash}">
                        {{ getInitials(item.full_name) }}</div>
                    <div>
                        <p class="font-bold text-slate-900 group-hover:text-primary transition" 
                           :class="{'line-through text-slate-400': showTrash}">
                            {{ item.full_name }}
                        </p>
                        <p class="text-xs text-slate-500">{{ item.santri_id }} <span
                                class="mx-1">&bull;</span> {{
                            item.kelas || '-' }}</p>
                    </div>
                </div>
                <div class="relative">
                    <button @click.stop="$emit('toggle-dropdown', item._id)"
                        class="size-8 flex items-center justify-center text-slate-300 hover:text-primary hover:bg-slate-50 rounded-full transition">
                        <span class="material-symbols-outlined">more_vert</span>
                    </button>

                    <!-- Backdrop for click outside -->
                    <div v-if="activeDropdown === item._id" class="fixed inset-0 z-10 cursor-default"
                        @click.stop="$emit('toggle-dropdown', null)"></div>

                    <!-- Dropdown Menu -->
                    <div v-if="activeDropdown === item._id"
                        class="absolute right-9 -top-1 w-32 bg-white border border-slate-100 shadow-xl rounded-xl z-20 flex flex-col py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">

                        <!-- Normal Actions -->
                        <template v-if="!showTrash">
                            <a v-if="item.no_hp" :href="'https://wa.me/' + formatWANumber(item.no_hp)"
                                target="_blank"
                                class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-green-50 hover:text-green-600 transition text-left">
                                <span class="material-symbols-outlined text-base">chat</span> WhatsApp
                            </a>

                            <button @click="$emit('open-modal', item); $emit('toggle-dropdown', null)"
                                class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition text-left w-full">
                                <span class="material-symbols-outlined text-base">edit</span> Edit
                            </button>

                            <button @click="$emit('delete', item); $emit('toggle-dropdown', null)"
                                class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition text-left w-full">
                                <span class="material-symbols-outlined text-base">delete</span> Hapus
                            </button>
                        </template>

                        <!-- Trash Actions -->
                        <template v-else>
                            <button @click="$emit('restore', item); $emit('toggle-dropdown', null)"
                                class="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-green-50 hover:text-green-600 transition text-left w-full">
                                <span class="material-symbols-outlined text-base">restore_from_trash</span> Pulihkan
                            </button>
                        </template>
                    </div>
                </div>
            </div>
            <!-- Empty State -->
            <div v-if="filteredSantri.length === 0" class="text-center py-10 col-span-full">
                <span class="material-symbols-outlined text-slate-300 text-4xl mb-2">{{ showTrash ? 'delete_outline' : 'search_off' }}</span>
                <p class="text-slate-400 text-sm">{{ showTrash ? 'Tong sampah kosong.' : 'Tidak ada data santri ditemukan.' }}</p>
            </div>
        </div>
    </div>
    `
};
