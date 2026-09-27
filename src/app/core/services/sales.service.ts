import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { DbService } from '../db.service';
import { Order, OrderItem, PaymentMethod } from '../models';
import { applyStockChanges } from '../stock';
import { padNumber, round2, uid } from '../utils';

export interface CartLine {
    productId: string;
    qty: number;
}

export interface CheckoutInput {
    lines: CartLine[];
    customerId?: string;
    discount: number;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    note?: string;
}

export interface Totals {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
}

/** Tax is charged on the discounted subtotal. */
export function calcTotals(items: { price: number; qty: number }[], discount: number, taxRate: number): Totals {
    const subtotal = round2(items.reduce((s, it) => s + it.price * it.qty, 0));
    const safeDiscount = round2(Math.min(Math.max(discount || 0, 0), subtotal));
    const tax = round2(((subtotal - safeDiscount) * (taxRate || 0)) / 100);
    return { subtotal, discount: safeDiscount, tax, total: round2(subtotal - safeDiscount + tax) };
}

@Injectable({ providedIn: 'root' })
export class SalesService {
    private db = inject(DbService);
    private auth = inject(AuthService);

    /** Newest first */
    readonly orders = computed(() => [...this.db.orders()].sort((a, b) => b.date.localeCompare(a.date)));

    getById(id: string): Order | undefined {
        return this.db.orders().find((o) => o.id === id);
    }

    checkout(input: CheckoutInput): Order {
        const user = this.auth.user();
        if (!user) throw new Error('You must be signed in to make a sale');
        if (!input.lines.length) throw new Error('The cart is empty');

        const products = new Map(this.db.products().map((p) => [p.id, p]));
        const items: OrderItem[] = input.lines.map((line) => {
            const p = products.get(line.productId);
            if (!p || !p.active) throw new Error('A product in the cart is no longer available');
            if (line.qty <= 0) throw new Error(`Invalid quantity for "${p.name}"`);
            if (line.qty > p.stock) throw new Error(`Only ${p.stock} ${p.unit} of "${p.name}" in stock`);
            return { productId: p.id, name: p.name, sku: p.sku, price: p.price, cost: p.cost, qty: line.qty };
        });

        const settings = this.db.settings();
        const totals = calcTotals(items, input.discount, settings.taxRate);
        const amountPaid = round2(input.paymentMethod === 'cash' ? input.amountPaid : totals.total);
        if (amountPaid < totals.total) throw new Error('Amount paid is less than the total');

        const customer = input.customerId ? this.db.customers().find((c) => c.id === input.customerId) : undefined;
        const now = new Date().toISOString();
        let created!: Order;

        this.db.update((db) => {
            const counter = db.counters.order + 1;
            created = {
                id: uid(),
                number: 'INV-' + padNumber(counter),
                date: now,
                customerId: customer?.id,
                customerName: customer?.name ?? 'Walk-in Customer',
                items,
                ...totals,
                taxRate: settings.taxRate,
                paymentMethod: input.paymentMethod,
                amountPaid,
                change: round2(amountPaid - totals.total),
                status: 'completed',
                cashierId: user.id,
                cashierName: user.name,
                note: input.note?.trim() || undefined,
            };
            const withStock = applyStockChanges(
                db,
                items.map((it) => ({ productId: it.productId, qty: -it.qty, type: 'sale' as const, reference: created.number })),
                user.name,
                now,
            );
            return { ...withStock, orders: [...withStock.orders, created], counters: { ...db.counters, order: counter } };
        });
        return created;
    }

    /** Full refund: marks the order refunded and puts items back into stock (if the product still exists). */
    refund(orderId: string, reason: string) {
        const order = this.getById(orderId);
        if (!order) throw new Error('Order not found');
        if (order.status === 'refunded') throw new Error('This order is already refunded');
        const userName = this.auth.user()?.name ?? 'System';
        const now = new Date().toISOString();

        this.db.update((db) => {
            const existing = new Set(db.products.map((p) => p.id));
            const withStock = applyStockChanges(
                db,
                order.items
                    .filter((it) => existing.has(it.productId))
                    .map((it) => ({ productId: it.productId, qty: it.qty, type: 'refund' as const, reference: order.number, note: reason })),
                userName,
                now,
            );
            return {
                ...withStock,
                orders: withStock.orders.map((o) => (o.id === orderId ? { ...o, status: 'refunded' as const, refundedAt: now, note: reason || o.note } : o)),
            };
        });
    }
}
