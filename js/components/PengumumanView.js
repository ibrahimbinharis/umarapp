const PengumumanView = {
    props: ['userSession', 'pengumumanList', 'paginatedList', 'currentPage', 'totalPages',
        'isLoading', 'showFormModal', 'showDetailModal', 'detailItem', 'form', 'PAGE_SIZE', 'fileUpload', 'searchQuery', 'currentView'],
    emits: [
        'load', 'open-add', 'open-edit', 'save', 'delete', 'open-detail',
        'go-page', 'close-form', 'close-detail', 'handle-file', 'remove-file',
        'update:form-judul', 'update:form-isi', 'update:form-kategori', 'update:form-target',
        'upload-inline-image', 'update:search-query'
    ],
    setup(props, { emit }) {
        const { ref, computed, watch, nextTick, onMounted } = Vue;

        // Rich text editor ref
        const editorRef = ref(null);

        const execCmd = (cmd, value = null) => {
            document.execCommand(cmd, false, value);
            editorRef.value?.focus();
            syncIsi();
        };

        const syncIsi = () => {
            if (editorRef.value) {
                emit('update:form-isi', editorRef.value.innerHTML);
            }
        };

        const insertImageAtCursor = (url) => {
            if (!editorRef.value) return;
            editorRef.value.focus();

            // Modern way to insert HTML at cursor
            const imgHtml = `<img src="${url}" class="max-w-full h-auto rounded-xl my-3 shadow-md inline-block" />`;
            document.execCommand('insertHTML', false, imgHtml);

            // Add a new line after image for easier typing
            document.execCommand('insertHTML', false, '<p><br></p>');
            syncIsi();
        };

        const handleInlineImage = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // Emit to parent (app_vue -> usePengumuman) to handle upload
            emit('upload-inline-image', {
                file,
                callback: (url) => insertImageAtCursor(url)
            });

            // Reset input
            event.target.value = '';
        };

        const onEditorInput = () => syncIsi();

        // When form modal opens, init editor content
        watch(() => props.showFormModal, (val) => {
            if (val) {
                nextTick(() => {
                    if (editorRef.value) {
                        editorRef.value.innerHTML = props.form?.isi || '';
                        editorRef.value.focus();
                    }
                });
            }
        });

        // Pagination pages
        const pageNumbers = computed(() => {
            const pages = [];
            const total = props.totalPages;
            const cur = props.currentPage;
            if (total <= 1) return pages;
            for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) {
                pages.push(i);
            }
            return pages;
        });

        // Helper
        const formatDate = (d) => {
            if (window.formatDateLong) return window.formatDateLong(d);
            return d ? d.split('T')[0] : '-';
        };

        const getPlainText = (html) => {
            if (!html) return '';
            // Replace block-level tags and line breaks with space to prevent words sticking together
            const processedHtml = html
                .replace(/<\/p>/g, ' ')
                .replace(/<\/div>/g, ' ')
                .replace(/<br\s*\/?>/g, ' ')
                .replace(/<\/li>/g, ' ');

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = processedHtml;
            const text = (tempDiv.textContent || tempDiv.innerText || "").replace(/\s+/g, ' ').trim();
            return text.substring(0, 140) + (text.length > 140 ? '...' : '');
        };

        // Simple XSS Mitigation: Remove script tags and inline handlers
        const sanitizeHtml = (html) => {
            if (!html) return '';
            return html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
                       .replace(/on\w+="[^"]*"/gim, "") 
                       .replace(/on\w+='[^']*'/gim, "");
        };

        onMounted(() => emit('load'));

        return { editorRef, execCmd, syncIsi, onEditorInput, pageNumbers, formatDate, getPlainText, handleInlineImage, insertImageAtCursor, sanitizeHtml };
    },
    template: `
    <div class="fade-in pb-32 relative">

        <!-- Desktop Header with action button -->
        <div class="hidden md:flex items-center justify-between mb-6">
            <div>
                <h2 class="text-xl font-black text-slate-800">Pengumuman</h2>
                <p class="text-xs text-slate-400 mt-0.5">{{ userSession?.role === 'admin' ? 'Kelola pengumuman untuk civitas pesantren' : 'Informasi terbaru dari pesantren' }}</p>
            </div>
            <div class="flex items-center gap-3">
                <!-- Search Input Desktop -->
                <div class="relative w-64">
                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input :value="searchQuery" @input="$emit('update:search-query', $event.target.value)"
                        placeholder="Cari pengumuman..."
                        class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition bg-white" />
                </div>
                <button v-if="userSession?.role === 'admin'" @click="$emit('open-add')"
                    class="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 hover:bg-blue-800 active:scale-95 transition">
                    <span class="material-symbols-outlined text-base">add</span>
                    Buat Baru
                </button>
            </div>
        </div>

        <!-- Mobile Header -->
        <div class="md:hidden mb-5">
            <h2 class="text-xl font-black text-slate-800">Pengumuman</h2>
            <p class="text-xs text-slate-400 mt-0.5 mb-4">Informasi terbaru pesantren</p>
            
            <!-- Search Input Mobile -->
            <div class="relative w-full mb-4">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                <input :value="searchQuery" @input="$emit('update:search-query', $event.target.value)"
                    placeholder="Cari pengumuman..."
                    class="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-primary transition bg-white" />
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex justify-center py-20">
            <div class="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>

        <!-- Empty State -->
        <div v-else-if="pengumumanList.length === 0 || (searchQuery && paginatedList.length === 0)"
            class="bg-white rounded-3xl border border-slate-100 card-shadow p-16 flex flex-col items-center justify-center text-center">
            <div class="size-20 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                <span class="material-symbols-outlined text-4xl text-slate-300">{{ searchQuery ? 'search_off' : 'campaign' }}</span>
            </div>
            <h3 class="font-bold text-slate-600 mb-1">{{ searchQuery ? 'Tidak ada hasil' : 'Belum ada pengumuman' }}</h3>
            <p class="text-xs text-slate-400 mb-6">{{ searchQuery ? 'Coba gunakan kata kunci lain' : (userSession?.role === 'admin' ? 'Buat pengumuman pertama untuk dikirim ke pengguna' : 'Silakan hubungi admin jika ada pengumuman yang belum muncul') }}</p>
            <button v-if="userSession?.role === 'admin' && !searchQuery" @click="$emit('open-add')"
                class="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-blue-800 active:scale-95 transition">
                <span class="material-symbols-outlined text-base">add</span>
                Buat Pengumuman
            </button>
        </div>

        <!-- Announcement List -->
        <div v-else class="space-y-4">
            <div v-for="item in paginatedList" :key="item._id"
                class="bg-white rounded-2xl border border-slate-100 card-shadow overflow-hidden group hover:shadow-md transition-all duration-200">

                <!-- Card Body -->
                <div class="p-5 cursor-pointer" @click="$emit('open-detail', item)">
                    <div class="flex items-start justify-between gap-3 mb-3">
                        <div class="flex flex-wrap gap-1.5">
                            <!-- Kategori Badge -->
                            <span :class="[
                                'inline-flex items-center text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider',
                                item.kategori === 'darurat' ? 'bg-red-50 text-red-600 border border-red-100' :
                                item.kategori === 'penting' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                'bg-blue-50 text-blue-600 border border-blue-100'
                            ]">
                                {{ item.kategori === 'darurat' ? 'Darurat' : item.kategori === 'penting' ? 'Penting' : 'Info' }}
                            </span>
                            <!-- Target Badge -->
                            <span class="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100 uppercase tracking-wider">
                                {{ item.target === 'semua' ? 'Semua' : item.target === 'guru' ? 'Guru' : 'Wali' }}
                            </span>
                        </div>
                        <!-- Date -->
                        <span class="text-[10px] text-slate-400 whitespace-nowrap shrink-0 mt-0.5" v-html="formatDate(item.created_at)"></span>
                    </div>

                    <!-- Title -->
                    <h3 class="font-bold text-slate-800 mb-2 leading-snug text-sm group-hover:text-primary transition-colors">
                        {{ item.judul }}
                    </h3>

                    <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {{ getPlainText(item.isi) }}
                    </p>

                    <!-- Attachment indicator in list -->
                    <div v-if="item.file_url" class="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <span class="material-symbols-outlined text-sm">attach_file</span>
                        {{ item.file_name || 'Lampiran Tersedia' }}
                    </div>
                </div>

                <!-- Card Footer -->
                <div class="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
                    <button @click="$emit('open-detail', item)"
                        class="text-xs font-bold text-primary flex items-center gap-1.5 hover:gap-2.5 transition-all">
                        <span class="material-symbols-outlined text-sm">open_in_new</span>
                        Lihat Selengkapnya
                    </button>
                    <div v-if="userSession?.role === 'admin'" class="flex items-center gap-2">
                        <button @click.stop="$emit('open-edit', item)"
                            class="size-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-primary hover:border-primary flex items-center justify-center transition shadow-sm active:scale-90"
                            title="Edit">
                            <span class="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button @click.stop="$emit('delete', item._id)"
                            class="size-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-300 flex items-center justify-center transition shadow-sm active:scale-90"
                            title="Hapus">
                            <span class="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Pagination -->
            <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-4">
                <button @click="$emit('go-page', currentPage - 1)"
                    :disabled="currentPage <= 1"
                    class="size-9 rounded-xl border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 active:scale-95">
                    <span class="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <button v-for="p in pageNumbers" :key="p"
                    @click="$emit('go-page', p)"
                    :class="p === currentPage
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
                    class="size-9 rounded-xl border text-sm font-bold flex items-center justify-center transition active:scale-95">
                    {{ p }}
                </button>
                <button @click="$emit('go-page', currentPage + 1)"
                    :disabled="currentPage >= totalPages"
                    class="size-9 rounded-xl border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 active:scale-95">
                    <span class="material-symbols-outlined text-lg">chevron_right</span>
                </button>
                <span class="text-xs text-slate-400 ml-1">{{ currentPage }} / {{ totalPages }}</span>
            </div>
        </div>

        <!-- ===== GLOBAL BACKDROP — rendered via Teleport to cover full app ===== -->
        <Teleport to="body">

            <!-- FAB: Mobile floating action button -->
            <div v-if="userSession?.role === 'admin' && currentView === 'pengumuman'" class="md:hidden fixed bottom-28 right-5 z-[100]">
                <button @click="$emit('open-add')"
                    class="size-14 flex items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-blue-900/30 hover:bg-blue-800 active:scale-90 transition-all duration-200">
                    <span class="material-symbols-outlined text-2xl">add</span>
                </button>
            </div>

            <!-- FORM MODAL -->
            <Transition name="modal-fade">
                <div v-if="showFormModal"
                    class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                    @click.self="$emit('close-form')">

                    <!-- Modal Card — centered -->
                    <div class="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl ring-1 ring-black/10 animate-scale-in">

                        <!-- Modal Header -->
                        <div class="sticky top-0 bg-white/95 backdrop-blur-sm px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between z-10 rounded-t-3xl">
                            <div>
                                <h3 class="font-black text-slate-800 text-base">
                                    {{ form._id ? 'Edit Pengumuman' : 'Buat Pengumuman Baru' }}
                                </h3>
                                <p v-if="!form._id" class="text-[11px] text-slate-400 mt-0.5">
                                    Notifikasi otomatis dikirim ke semua target saat publish
                                </p>
                            </div>
                            <button @click="$emit('close-form')"
                                class="size-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition text-slate-400 active:scale-90">
                                <span class="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <!-- Modal Body -->
                        <div class="p-6 space-y-5">

                            <!-- Judul -->
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1.5">Judul Pengumuman <span class="text-red-400">*</span></label>
                                <input :value="form.judul" @input="$emit('update:form-judul', $event.target.value)"
                                    placeholder="Contoh: Libur Pondok Hari Raya Idul Fitri"
                                    class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition bg-slate-50/50" />
                            </div>

                            <!-- Kategori & Target -->
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 mb-1.5">Kategori</label>
                                    <select :value="form.kategori" @change="$emit('update:form-kategori', $event.target.value)"
                                        class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:border-primary transition">
                                        <option value="info">Info</option>
                                        <option value="penting">Penting</option>
                                        <option value="darurat">Darurat</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 mb-1.5">Target Penerima</label>
                                    <select :value="form.target" @change="$emit('update:form-target', $event.target.value)"
                                        class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:border-primary transition">
                                        <option value="semua">Semua</option>
                                        <option value="guru">Guru saja</option>
                                        <option value="wali">Wali Santri saja</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Rich Text Editor -->
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <label class="block text-xs font-bold text-slate-700">Isi Pengumuman <span class="text-red-400">*</span></label>
                                    <!-- Inline Upload Loading Indicator -->
                                    <span v-if="fileUpload.isInlineUploading" class="text-[10px] font-bold text-primary flex items-center gap-1 animate-pulse">
                                        <div class="size-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        Menyisipkan gambar...
                                    </span>
                                </div>

                                <!-- Toolbar -->
                                <div class="flex items-center gap-1 flex-wrap p-2 bg-slate-50 rounded-t-xl border border-b-0 border-slate-200">
                                    <button @click="execCmd('bold')" type="button"
                                        class="size-8 rounded-lg hover:bg-white hover:shadow-sm flex items-center justify-center font-black text-slate-600 text-sm transition" title="Tebal">
                                        <strong>B</strong>
                                    </button>
                                    <button @click="execCmd('italic')" type="button"
                                        class="size-8 rounded-lg hover:bg-white hover:shadow-sm flex items-center justify-center text-slate-600 text-sm italic transition" title="Miring">
                                        <em>I</em>
                                    </button>
                                    <button @click="execCmd('underline')" type="button"
                                        class="size-8 rounded-lg hover:bg-white hover:shadow-sm flex items-center justify-center text-slate-600 text-sm underline transition" title="Garis bawah">
                                        U
                                    </button>
                                    <div class="w-px h-5 bg-slate-200 mx-0.5"></div>
                                    <button @click="execCmd('insertUnorderedList')" type="button"
                                        class="size-8 rounded-lg hover:bg-white hover:shadow-sm flex items-center justify-center transition" title="Poin-poin">
                                        <span class="material-symbols-outlined text-base text-slate-600">format_list_bulleted</span>
                                    </button>
                                    <button @click="execCmd('insertOrderedList')" type="button"
                                        class="size-8 rounded-lg hover:bg-white hover:shadow-sm flex items-center justify-center transition" title="Daftar bernomor">
                                        <span class="material-symbols-outlined text-base text-slate-600">format_list_numbered</span>
                                    </button>
                                    <div class="w-px h-5 bg-slate-200 mx-0.5"></div>
                                    <button @click="execCmd('justifyLeft')" type="button"
                                        class="size-8 rounded-lg hover:bg-white hover:shadow-sm flex items-center justify-center transition" title="Rata kiri">
                                        <span class="material-symbols-outlined text-base text-slate-600">format_align_left</span>
                                    </button>
                                    <button @click="execCmd('justifyCenter')" type="button"
                                        class="size-8 rounded-lg hover:bg-white hover:shadow-sm flex items-center justify-center transition" title="Rata tengah">
                                        <span class="material-symbols-outlined text-base text-slate-600">format_align_center</span>
                                    </button>
                                    <button @click="execCmd('justifyRight')" type="button"
                                        class="size-8 rounded-lg hover:bg-white hover:shadow-sm flex items-center justify-center transition" title="Rata kanan">
                                        <span class="material-symbols-outlined text-base text-slate-600">format_align_right</span>
                                    </button>
                                    <div class="w-px h-5 bg-slate-200 mx-0.5"></div>
                                    <button @click="execCmd('removeFormat')" type="button"
                                        class="size-8 rounded-lg hover:bg-white hover:shadow-sm flex items-center justify-center transition" title="Hapus format">
                                        <span class="material-symbols-outlined text-base text-slate-400">format_clear</span>
                                    </button>
                                    <div class="w-px h-5 bg-slate-200 mx-0.5"></div>
                                    
                                    <!-- Embedded Image Button -->
                                    <div class="relative overflow-hidden size-8 rounded-lg hover:bg-white hover:shadow-sm flex items-center justify-center transition group">
                                        <span class="material-symbols-outlined text-base text-primary">image</span>
                                        <input type="file" accept="image/*" @change="handleInlineImage" 
                                            class="absolute inset-0 opacity-0 cursor-pointer" title="Sematkan Gambar" />
                                    </div>
                                </div>

                                <!-- Editable content area -->
                                <div ref="editorRef"
                                    contenteditable="true"
                                    @input="onEditorInput"
                                    data-placeholder="Tulis isi pengumuman di sini..."
                                    class="min-h-[180px] px-4 py-3 rounded-b-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition leading-relaxed"
                                    style="word-break: break-word; empty-cells: show;">
                                </div>
                                <p class="text-[10px] text-slate-400 mt-1.5">
                                    💡 Seleksi teks lalu klik tombol format di toolbar
                                </p>
                            </div>

                            <!-- File Upload Section -->
                            <div class="pt-2">
                                <label class="block text-xs font-bold text-slate-700 mb-2">Lampiran (Foto/File)</label>
                                
                                <!-- File Preview / Info -->
                                <div v-if="form.file_url" class="mb-3 p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                                    <div class="flex items-center gap-3 overflow-hidden">
                                        <div v-if="fileUpload.preview" class="size-12 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                                            <img :src="fileUpload.preview" class="w-full h-full object-cover" />
                                        </div>
                                        <div v-else class="size-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                            <span class="material-symbols-outlined text-slate-400">description</span>
                                        </div>
                                        <div class="overflow-hidden">
                                            <p class="text-xs font-bold text-slate-700 truncate">{{ form.file_name || 'File terlampir' }}</p>
                                            <p class="text-[10px] text-slate-400">Siap untuk disimpan</p>
                                        </div>
                                    </div>
                                    <button @click="$emit('remove-file')" class="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition">
                                        <span class="material-symbols-outlined text-base">delete</span>
                                    </button>
                                </div>

                                <!-- Upload Button -->
                                <div v-if="!form.file_url" class="relative">
                                    <input type="file" @change="$emit('handle-file', $event)" 
                                        class="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                        :disabled="fileUpload.isUploading" />
                                    <div :class="[
                                        'w-full py-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all',
                                        fileUpload.isUploading ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-primary hover:bg-blue-50/30'
                                    ]">
                                        <template v-if="fileUpload.isUploading">
                                            <div class="size-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                            <span class="text-xs font-bold text-slate-400">Mengunggah...</span>
                                        </template>
                                        <template v-else>
                                            <span class="material-symbols-outlined text-slate-400">cloud_upload</span>
                                            <span class="text-xs font-bold text-slate-500">Klik untuk pilih file (Maks 10MB)</span>
                                        </template>
                                    </div>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="flex gap-3 pt-2 pb-1">
                                <button @click="$emit('close-form')"
                                    class="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition active:scale-95">
                                    Batal
                                </button>
                                <button @click="$emit('save')"
                                    :disabled="isLoading"
                                    class="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-blue-900/20 hover:bg-blue-800 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-60">
                                    <span v-if="isLoading" class="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <span class="material-symbols-outlined text-base" v-else>send</span>
                                    {{ form._id ? 'Simpan' : 'Publish' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>

            <!-- DETAIL MODAL -->
            <Transition name="modal-fade">
                <div v-if="showDetailModal && detailItem"
                    class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                    @click.self="$emit('close-detail')">

                    <!-- Modal Card -->
                    <div class="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl ring-1 ring-black/10 animate-scale-in">

                        <!-- Header -->
                        <div class="sticky top-0 bg-white/95 backdrop-blur-sm px-6 pt-5 pb-4 border-b border-slate-100 z-10 rounded-t-3xl">
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex flex-wrap gap-1.5 mt-0.5">
                                    <span :class="[
                                        'inline-flex items-center text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider',
                                        detailItem.kategori === 'darurat' ? 'bg-red-50 text-red-600 border border-red-100' :
                                        detailItem.kategori === 'penting' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                        'bg-blue-50 text-blue-600 border border-blue-100'
                                    ]">
                                        {{ detailItem.kategori === 'darurat' ? 'Darurat' : detailItem.kategori === 'penting' ? 'Penting' : 'Info' }}
                                    </span>
                                    <span class="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100 uppercase tracking-wider">
                                        {{ detailItem.target === 'semua' ? 'Semua' : detailItem.target === 'guru' ? 'Guru' : 'Wali' }}
                                    </span>
                                </div>
                                <button @click="$emit('close-detail')"
                                    class="size-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition text-slate-400 shrink-0 active:scale-90">
                                    <span class="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <h3 class="font-black text-slate-800 text-lg mt-3 leading-snug">{{ detailItem.judul }}</h3>
                            <p class="text-[11px] text-slate-400 mt-1 flex items-center gap-1" v-html="formatDate(detailItem.created_at)">
                            </p>
                        </div>

                        <!-- Content -->
                        <div class="p-6">
                            <div class="prose prose-sm max-w-none text-slate-700 leading-relaxed text-sm announcement-content"
                                 v-html="sanitizeHtml(detailItem.isi)">
                            </div>

                            <!-- Attachment in Detail -->
                            <div v-if="detailItem.file_url" class="mt-8 pt-6 border-t border-slate-100">
                                <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Lampiran</h4>
                                
                                <!-- Photo Preview -->
                                <div v-if="detailItem.file_type && detailItem.file_type.startsWith('image/')" class="mb-4 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                                    <img :src="detailItem.file_url" class="w-full h-auto max-h-[400px] object-contain bg-slate-50" />
                                </div>

                                <!-- Download Button -->
                                <a :href="detailItem.file_url" target="_blank" download 
                                    class="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                                    <div class="flex items-center gap-3 overflow-hidden">
                                        <div class="size-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                            <span class="material-symbols-outlined text-slate-400">{{ detailItem.file_type && detailItem.file_type.startsWith('image/') ? 'image' : 'description' }}</span>
                                        </div>
                                        <div class="overflow-hidden text-left">
                                            <p class="text-xs font-bold text-slate-700 truncate group-hover:text-primary transition-colors">{{ detailItem.file_name || 'Buka Lampiran' }}</p>
                                            <p class="text-[10px] text-slate-400 uppercase tracking-tighter">{{ detailItem.file_type || 'File' }}</p>
                                        </div>
                                    </div>
                                    <span class="material-symbols-outlined text-primary group-hover:translate-x-0.5 transition-transform">download</span>
                                </a>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div v-if="userSession?.role === 'admin'" class="px-6 pb-6 flex gap-3 border-t border-slate-50 pt-4">
                            <button @click="$emit('open-edit', detailItem); $emit('close-detail')"
                                class="flex items-center justify-center gap-2 flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition active:scale-95">
                                <span class="material-symbols-outlined text-base">edit</span> Edit
                            </button>
                            <button @click="$emit('delete', detailItem._id); $emit('close-detail')"
                                class="flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-red-100 bg-red-50 text-red-500 font-bold text-sm hover:bg-red-100 transition active:scale-95">
                                <span class="material-symbols-outlined text-base">delete</span> Hapus
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>

        </Teleport>
    </div>
    `
};
