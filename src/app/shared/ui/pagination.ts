import { Component, computed, input, model } from '@angular/core';

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
}

@Component({
    selector: 'app-pagination',
    template: `
        @if (total() > 0) {
            <div class="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p class="text-white-dark">Showing {{ from() }} to {{ to() }} of {{ total() }} {{ label() }}</p>
                @if (pages() > 1) {
                    <ul class="inline-flex items-center space-x-1 rtl:space-x-reverse">
                        <li>
                            <button
                                type="button"
                                class="flex justify-center rounded-full bg-white-light px-3.5 py-2 font-semibold text-dark transition hover:bg-primary hover:text-white disabled:pointer-events-none disabled:opacity-50 dark:bg-[#191e3a] dark:text-white-light dark:hover:bg-primary"
                                [disabled]="page() === 1"
                                (click)="page.set(page() - 1)"
                            >
                                Prev
                            </button>
                        </li>
                        @for (p of visiblePages(); track $index) {
                            <li>
                                @if (p === 0) {
                                    <span class="px-2 text-white-dark">…</span>
                                } @else {
                                    <button
                                        type="button"
                                        class="flex justify-center rounded-full px-3.5 py-2 font-semibold transition"
                                        [class]="
                                            p === page()
                                                ? 'bg-primary text-white'
                                                : 'bg-white-light text-dark hover:bg-primary hover:text-white dark:bg-[#191e3a] dark:text-white-light dark:hover:bg-primary'
                                        "
                                        (click)="page.set(p)"
                                    >
                                        {{ p }}
                                    </button>
                                }
                            </li>
                        }
                        <li>
                            <button
                                type="button"
                                class="flex justify-center rounded-full bg-white-light px-3.5 py-2 font-semibold text-dark transition hover:bg-primary hover:text-white disabled:pointer-events-none disabled:opacity-50 dark:bg-[#191e3a] dark:text-white-light dark:hover:bg-primary"
                                [disabled]="page() === pages()"
                                (click)="page.set(page() + 1)"
                            >
                                Next
                            </button>
                        </li>
                    </ul>
                }
            </div>
        }
    `,
})
export class PaginationComponent {
    readonly total = input.required<number>();
    readonly pageSize = input(10);
    readonly label = input('entries');
    readonly page = model(1);

    readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
    readonly from = computed(() => (this.total() ? (this.page() - 1) * this.pageSize() + 1 : 0));
    readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

    /** Page numbers with 0 as an ellipsis marker, e.g. [1, 0, 4, 5, 6, 0, 12] */
    readonly visiblePages = computed(() => {
        const total = this.pages();
        const current = Math.min(this.page(), total);
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        const pages = new Set([1, total, current, current - 1, current + 1]);
        const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
        const result: number[] = [];
        sorted.forEach((p, i) => {
            if (i > 0 && p - sorted[i - 1] > 1) result.push(0);
            result.push(p);
        });
        return result;
    });
}
