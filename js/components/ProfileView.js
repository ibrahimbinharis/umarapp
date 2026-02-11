const ProfileView = {
    props: {
        userSession: { type: Object, required: true },
        profileForm: { type: Object, required: true },
        saveProfile: { type: Function, required: true },
        logout: { type: Function, required: true },
        handleFileSelect: { type: Function, required: true },
        isUploading: { type: Boolean, default: false },
        getInitials: { type: Function, required: true },
        appVersion: { type: String, default: '1.0.0' }
    },
    template: `
    <div class="fade-in space-y-6 pb-8">
        <!-- Header Removed -->

        <div class="bg-white p-6 rounded-3xl border shadow-sm mx-2">
            <div class="flex flex-col items-center mb-6">
                <div class="relative mb-3">
                    <!-- Photo or Initials -->
                    <div v-if="userSession.photo_url"
                        class="size-24 rounded-full shadow-lg overflow-hidden border-2 border-white">
                        <img :src="userSession.photo_url" alt="Profile"
                            class="w-full h-full object-cover">
                    </div>
                    <div v-else
                        class="size-24 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg border-2 border-white">
                        {{ getInitials(userSession.full_name) }}
                    </div>

                    <!-- Upload Button -->
                    <label
                        class="absolute bottom-0 right-0 bg-white text-slate-700 p-2 rounded-full shadow-md cursor-pointer hover:bg-slate-50 transition active:scale-95 flex items-center justify-center border border-slate-100">
                        <input type="file" @change="handleFileSelect" accept="image/*" class="hidden">
                        <span class="material-symbols-outlined text-lg">photo_camera</span>
                    </label>

                    <!-- Loading -->
                    <div v-if="isUploading"
                        class="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full z-10 backdrop-blur-[1px]">
                        <div
                            class="size-6 border-2 border-white border-t-transparent rounded-full animate-spin">
                        </div>
                    </div>
                </div>
                <h3 class="font-bold text-lg text-slate-900">{{ userSession.full_name }}</h3>
                <span class="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold mt-1">
                    {{ userSession.role === 'admin' ? 'Administrator' : (userSession.role === 'guru' ? 'Guru / Staff' : 'Wali Santri') }}
                </span>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="text-xs font-bold text-slate-400 uppercase block mb-1">Nama Lengkap</label>
                    <input v-model="profileForm.full_name" type="text"
                        class="w-full p-3 border rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none">
                </div>

                <div>
                    <label class="text-xs font-bold text-slate-400 uppercase block mb-1">Username (Login)</label>
                    <input v-model="profileForm.username" type="text"
                        :readonly="userSession.role === 'wali'"
                        :class="userSession.role === 'wali' ? 'bg-slate-50 text-slate-500' : ''"
                        class="w-full p-3 border rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none">
                    <p v-if="userSession.role === 'wali'" class="text-[10px] text-slate-400 mt-1">
                        *Username Wali mengikuti NIS Santri</p>
                </div>

                <div class="pt-2 border-t border-slate-100">
                    <label class="text-xs font-bold text-slate-400 uppercase block mb-1">Password Baru</label>
                    <div class="relative">
                        <input v-model="profileForm.password" type="password"
                            placeholder="Kosongkan jika tidak ingin mengubah"
                            class="w-full p-3 border rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none pr-10">
                    </div>
                </div>

                <button @click="saveProfile"
                    class="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition mt-4">
                    Simpan Perubahan
                </button>

                <button @click="logout"
                    class="w-full border-2 border-red-100 text-red-500 py-3 rounded-xl font-bold hover:bg-red-50 active:scale-95 transition mt-4 flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined">logout</span> Keluar Aplikasi
                </button>
            </div>
        </div>

        <div class="mx-2 p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <p class="text-xs text-slate-400">App Version {{ appVersion }}</p>
        </div>
    </div>
    `
};
