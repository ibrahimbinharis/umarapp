const SantriView = {
    props: [
        'userSession',
        'santriGenderFilter',
        'searchText',
        'filteredSantri',
        'activeDropdown',
        'uiData', // for 'add' button context if needed, but openSantriModal handles it
        'loading'
    ],
    emits: [
        'update:santriGenderFilter',
        'update:searchText',
        'open-modal',    // openSantriModal
        'delete',        // deleteSantri
        'toggle-dropdown' // toggleDropdown
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
            <h2 class="text-2xl font-bold">Data Santri</h2>
            <button @click="$emit('open-modal')"
                class="bg-primary text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition">
                <span class="material-symbols-outlined text-lg">add</span> Tambah
            </button>
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
                class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center hover:border-blue-100 transition group">
                <div class="flex gap-3 items-center">
                    <div
                        class="size-10 bg-blue-50 text-primary rounded-full flex items-center justify-center font-bold text-sm">
                        {{ getInitials(item.full_name) }}</div>
                    <div>
                        <p class="font-bold text-slate-900 group-hover:text-primary transition">{{
                            item.full_name }}</p>
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
                        class="absolute right-0 top-8 w-32 bg-white border border-slate-100 shadow-xl rounded-xl z-20 flex flex-col py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">

                        <a v-if="item.no_hp" :href="'https://wa.me/' + formatWANumber(item.no_hp)"
                            target="_blank"
                            class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-green-50 hover:text-green-600 transition text-left">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                fill="currentColor" class="bi bi-whatsapp text-green-500"
                                viewBox="0 0 16 16">
                                <path
                                    d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
                            </svg> WhatsApp
                        </a>

                        <button @click="$emit('open-modal', item); $emit('toggle-dropdown', null)"
                            class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition text-left w-full">
                            <span class="material-symbols-outlined text-base">edit</span> Edit
                        </button>

                        <button @click="$emit('delete', item); $emit('toggle-dropdown', null)"
                            class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition text-left w-full">
                            <span class="material-symbols-outlined text-base">delete</span> Hapus
                        </button>
                    </div>
                </div>
            </div>
            <!-- Empty State -->
            <div v-if="filteredSantri.length === 0" class="text-center py-10">
                <span class="material-symbols-outlined text-slate-300 text-4xl mb-2">search_off</span>
                <p class="text-slate-400 text-sm">Tidak ada data santri ditemukan.</p>
            </div>
        </div>
    </div>
    `
};
