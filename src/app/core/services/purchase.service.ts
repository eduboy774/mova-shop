import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { DbService } from '../db.service';
import { Purchase, PurchaseItem } from '../models';
import { applyStockChanges } from '../stock';
import { padNumber, round2, uid } from '../utils';

export interface PurchaseInput {
    supplierId: string;
    date: string;
    items: PurchaseItem[];
    note?: string;
}

@Injectable({ providedIn: 'root' })
export class PurchaseService {
    private db = inject(DbService);
    private auth = inject(AuthService);

    /** Newest first */
    readonly purchases = computed(() => [...this.db.purchases()].sort((a, b) => b.date.localeCompare(a.date)));

    getById(id: string): Purchase | undefined {
        return this.db.purchases().find((p) => p.id === id);
    }

    save(input: PurchaseInput, id?: string): Purchase {
        const supplier = this.db.suppliers().find((s) => s.id === input.supplierId);
        if (!supplier) throw new Error('Select a supplier');
        const items = input.items.filter((it) => it.productId && it.qty > 0);
        if (!items.length) throw new Error('Add at least one product');
        if (id && this.getById(id)?.status !== 'pending') throw new Error('Only pending purchase orders can be edited');

        const total = round2(items.reduce((s, it) => s + it.qty * it.cost, 0));
        let saved!: Purchase;
        this.db.update((db) => {
            if (id) {
                const purchases = db.purchases.map((p) => {
                    if (p.id !== id) return p;
                    saved = { ...p, supplierId: supplier.id, supplierName: supplier.name, date: input.date, items, total, note: input.note };
                    return saved;
                });
                return { ...db, purchases };
            }
            const counter = db.counters.purchase + 1;
            saved = {
                id: uid(),
                number: 'PO-' + padNumber(counter, 4),
                date: input.date,
                supplierId: supplier.id,
                supplierName: supplier.name,
                items,
                total,
                status: 'pending',
                note: input.note,
            };
            return { ...db, purchases: [...db.purchases, saved], counters: { ...db.counters, purchase: counter } };
        });
        return saved;
    }

    /** Receive goods: adds stock and (optionally) updates each product's cost to the latest purchase cost. */
    receive(id: string, updateCosts: boolean) {
        const purchase = this.getById(id);
        if (!purchase || purchase.status !== 'pending') throw new Error('Only pending purchase orders can be received');
        const userName = this.auth.user()?.name ?? 'System';
        const now = new Date().toISOString();

        this.db.update((db) => {
            const existing = new Set(db.products.map((p) => p.id));
            const items = purchase.items.filter((it) => existing.has(it.productId));
            let next = applyStockChanges(
                db,
                items.map((it) => ({ productId: it.productId, qty: it.qty, type: 'purchase' as const, reference: purchase.number })),
                userName,
                now,
            );
            if (updateCosts) {
                const costs = new Map(items.map((it) => [it.productId, it.cost]));
                next = { ...next, products: next.products.map((p) => (costs.has(p.id) ? { ...p, cost: costs.get(p.id)! } : p)) };
            }
            return {
                ...next,
                purchases: next.purchases.map((p) => (p.id === id ? { ...p, status: 'received' as const, receivedAt: now } : p)),
            };
        });
    }

    cancel(id: string) {
        if (this.getById(id)?.status !== 'pending') throw new Error('Only pending purchase orders can be cancelled');
        this.db.update((db) => ({ ...db, purchases: db.purchases.map((p) => (p.id === id ? { ...p, status: 'cancelled' as const } : p)) }));
    }

    delete(id: string) {
        if (this.getById(id)?.status === 'received') throw new Error('Received purchase orders cannot be deleted');
        this.db.update((db) => ({ ...db, purchases: db.purchases.filter((p) => p.id !== id) }));
    }
}
