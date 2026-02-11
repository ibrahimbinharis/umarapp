const SantriView = {
    props: [
        'userSession',
        'santriGenderFilter',
        'searchText',
        'filteredSantri',
        'activeDropdown',
        'uiData',
        'loading',
        'showTrash', // New Prop
        'isModalOpen' // New Prop
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
        const { ref, watch } = Vue;
        // Helpers
        const getInitials = window.getInitials || ((name) => name ? name.substring(0, 2).toUpperCase() : '??');
        const formatWANumber = window.formatWANumber || ((phone) => phone);

        // FAB Click State
        const isFabClicked = ref(false);

        // Reset FAB state when modal closes
        watch(() => props.isModalOpen, (newVal) => {
            if (!newVal) {
                isFabClicked.value = false;
            }
        });

        const onSantriFabClick = () => {
            isFabClicked.value = true;
        };

        return {
            getInitials,
            formatWANumber,
            isFabClicked,
            onSantriFabClick
        };
    },
    template: `
    <div class="fade-in">
        <!-- Header Removed -->

        <!-- Floating Action Buttons -->
        <teleport to="body">
            <div class="fixed bottom-24 right-4 flex flex-col gap-3 z-[9999]" v-if="uiData.santri && !isModalOpen"> <!-- Hide when modal is open -->
                <!-- Trash Toggle (Restore Mode) -->
                <button @click="$emit('toggle-trash')"
                    :class="showTrash ? 'bg-red-500 text-white shadow-xl' : 'bg-white text-slate-400 shadow-lg'"
                    class="size-12 rounded-full flex items-center justify-center transition hover:scale-110 active:scale-95 border border-slate-100"
                    :title="showTrash ? 'Keluar Mode Sampah' : 'Lihat Sampah'">
                    <span class="material-symbols-outlined text-xl">{{ showTrash ? 'close' : 'restore_from_trash' }}</span>
                </button>

                <!-- Add Button (Main FAB) -->
                <button v-if="!showTrash && !isFabClicked" @click="onSantriFabClick(); $emit('open-modal')"
                    class="size-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center transition hover:scale-110 active:scale-95 hover:bg-blue-700">
                    <span class="material-symbols-outlined text-3xl">add</span>
                </button>
            </div>
        </teleport>

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
