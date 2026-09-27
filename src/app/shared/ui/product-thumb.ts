import { Component, computed, input } from '@angular/core';

/** Product image, or coloured initials when there is no image. */
@Component({
    selector: 'app-product-thumb',
    template: `
        @if (image()) {
            <img [src]="image()" [alt]="name()" class="shrink-0 rounded-md object-cover" [class]="sizeClass()" loading="lazy" />
        } @else {
            <span
                class="grid shrink-0 place-content-center rounded-md font-bold text-white"
                [class]="sizeClass()"
                [style.background-color]="color() || '#7209b7'"
                aria-hidden="true"
                >{{ initials() }}</span
            >
        }
    `,
})
export class ProductThumbComponent {
    readonly name = input.required<string>();
    readonly image = input<string | undefined>();
    readonly color = input<string | undefined>();
    readonly size = input<'sm' | 'md' | 'lg'>('sm');

    readonly initials = computed(() =>
        this.name()
            .split(/\s+/)
            .filter((w) => /[a-z0-9]/i.test(w))
            .slice(0, 2)
            .map((w) => w[0].toUpperCase())
            .join(''),
    );
    readonly sizeClass = computed(() => ({ sm: 'h-9 w-9 text-xs', md: 'h-14 w-14 text-base', lg: 'h-full w-full text-2xl' })[this.size()]);
}
