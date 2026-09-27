import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { DbService } from '../db.service';
import { applyStockChanges } from '../stock';

export type AdjustMode = 'add' | 'remove' | 'set';

@Injectable({ providedIn: 'root' })
export class InventoryService {
    private db = inject(DbService);
    private auth = inject(AuthService);

    /** Newest first */
    readonly movements = computed(() => [...this.db.movements()].sort((a, b) => b.date.localeCompare(a.date)));

    adjust(productId: string, mode: AdjustMode, qty: number, note: string) {
        const product = this.db.products().find((p) => p.id === productId);
        if (!product) throw new Error('Product not found');
        if (!Number.isInteger(qty) || qty < 0) throw new Error('Quantity must be a whole number of zero or more');

        const delta = mode === 'add' ? qty : mode === 'remove' ? -qty : qty - product.stock;
        if (delta === 0) return;

        this.db.update((db) =>
            applyStockChanges(
                db,
                [{ productId, qty: delta, type: 'adjustment', note: note.trim() || 'Manual adjustment' }],
                this.auth.user()?.name ?? 'System',
            ),
        );
    }
}
