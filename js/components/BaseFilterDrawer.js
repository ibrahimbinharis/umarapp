const BaseFilterDrawer = {
    props: {
        show: {
            type: Boolean,
            default: false
        }
    },
    template: `
    <Transition name="accordion">
        <div v-if="show" class="accordion-wrapper w-full">
            <div class="accordion-content bg-white rounded-[20px] p-4 flex flex-col gap-3 font-semibold w-full shadow-sm border border-slate-100/80">
                <slot></slot>
            </div>
        </div>
    </Transition>
    `
};

// CSS Injection for ultra-smooth modern CSS Grid transition (0fr -> 1fr)
if (!document.getElementById('base-filter-drawer-styles')) {
    const style = document.createElement('style');
    style.id = 'base-filter-drawer-styles';
    style.textContent = `
        .accordion-wrapper {
            display: grid;
            grid-template-rows: 1fr;
            opacity: 1;
        }
        .accordion-content {
            overflow: hidden;
            min-height: 0;
            width: 100%;
        }
        .accordion-enter-active {
            transition: grid-template-rows 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out;
        }
        .accordion-leave-active {
            transition: grid-template-rows 0.18s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.15s ease-in;
        }
        .accordion-enter-from, .accordion-leave-to {
            grid-template-rows: 0fr;
            opacity: 0;
        }
        .accordion-enter-to, .accordion-leave-from {
            grid-template-rows: 1fr;
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
}

window.BaseFilterDrawer = BaseFilterDrawer;
