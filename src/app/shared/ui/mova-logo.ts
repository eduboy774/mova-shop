import { Component, input } from '@angular/core';

/** MOVA wordmark built from HTML text so it adapts to dark mode. */
@Component({
    selector: 'app-mova-logo',
    template: `
        <span class="inline-flex items-center gap-3">
            <img src="/assets/images/logo.svg" alt="" class="flex-none" [class]="compact() ? 'h-8 w-8' : 'h-14 w-14'" />
            <span class="flex flex-col leading-none">
                <span
                    class="font-black tracking-[0.35em] text-mova-ink dark:text-white-light"
                    [class]="compact() ? 'text-xl' : 'text-4xl'"
                    style="font-family: 'Arial Black', 'Helvetica Neue', Arial, sans-serif"
                    >MO<span class="text-mova-cyan">V</span>A</span
                >
                @if (!compact()) {
                    <span class="mt-2 text-[10px] font-bold tracking-[0.2em] text-primary dark:text-[#b983e6]">MARKETPLACE OF VALUE &amp; ACCESS</span>
                }
            </span>
        </span>
    `,
})
export class MovaLogoComponent {
    readonly compact = input(false);
}
