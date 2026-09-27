import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Crumb {
    label: string;
    link?: string;
}

@Component({
    selector: 'app-page-header',
    imports: [RouterLink],
    template: `
        <div class="mb-5 flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div>
                <h1 class="text-xl font-bold text-black dark:text-white-light">{{ title() }}</h1>
                @if (crumbs().length) {
                    <ul class="mt-1 flex space-x-2 text-xs rtl:space-x-reverse">
                        @for (c of crumbs(); track c.label; let last = $last, first = $first) {
                            <li class="flex items-center gap-2">
                                @if (!first) {
                                    <span class="text-white-dark" aria-hidden="true">/</span>
                                }
                                @if (c.link && !last) {
                                    <a [routerLink]="c.link" class="text-primary hover:underline">{{ c.label }}</a>
                                } @else {
                                    <span class="text-white-dark">{{ c.label }}</span>
                                }
                            </li>
                        }
                    </ul>
                }
            </div>
            <div class="flex flex-wrap items-center gap-2">
                <ng-content />
            </div>
        </div>
    `,
})
export class PageHeaderComponent {
    readonly title = input.required<string>();
    readonly crumbs = input<Crumb[]>([]);
}
