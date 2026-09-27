import { Component, computed, input } from '@angular/core';
import { stockStatus } from '../../core/models';

@Component({
    selector: 'app-stock-badge',
    template: `<span class="badge whitespace-nowrap" [class]="cls()">{{ text() }}</span>`,
})
export class StockBadgeComponent {
    readonly stock = input.required<number>();
    readonly reorderLevel = input.required<number>();
    readonly unit = input('');

    private readonly status = computed(() => stockStatus({ stock: this.stock(), reorderLevel: this.reorderLevel() }));
    readonly cls = computed(() => ({ in: 'badge-outline-success', low: 'badge-outline-warning', out: 'badge-outline-danger' })[this.status()]);
    readonly text = computed(() => {
        if (this.status() === 'out') return 'Out of stock';
        const label = `${this.stock()} ${this.unit()}`.trim();
        return this.status() === 'low' ? `Low: ${label}` : label;
    });
}
