const BasePopup = {
    props: {
        isOpen: {
            type: Boolean,
            required: true
        },
        title: {
            type: String,
            default: ''
        },
        message: {
            type: String,
            default: ''
        },
        icon: {
            type: String,
            default: 'report'
        },
        iconBgClass: {
            type: String,
            default: 'bg-red-50 text-red-500'
        },
        animateClass: {
            type: String,
            default: 'animate-scale-in'
        }
    },
    emits: ['close'],
    template: `
    <Teleport to="body">
        <Transition name="backdrop-fade">
            <div v-if="isOpen" @click="$emit('close')"
                class="fixed inset-0 z-[500] bg-slate-900/40 backdrop-blur-[3px] flex items-center justify-center p-4">
                
                <!-- Card Container -->
                <div @click.stop
                    class="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-sm border border-slate-100 flex flex-col transition-all duration-200"
                    :class="animateClass">
                    
                    <!-- Icon & Header -->
                    <div class="p-6 pb-0 flex flex-col items-center text-center w-full">
                        <div v-if="icon" class="size-16 rounded-full flex items-center justify-center mb-4" :class="iconBgClass">
                            <span class="material-symbols-outlined text-4xl">{{ icon }}</span>
                        </div>
                        <h3 class="text-xl font-black text-slate-800 mb-2">{{ title }}</h3>
                        <p v-if="message" class="text-slate-500 text-sm leading-relaxed px-2">{{ message }}</p>
                        
                        <!-- Slot for custom body contents -->
                        <slot></slot>
                    </div>
                    
                    <!-- Actions -->
                    <div class="p-6 flex gap-3 w-full">
                        <slot name="actions"></slot>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
    `
};

window.BasePopup = BasePopup;
