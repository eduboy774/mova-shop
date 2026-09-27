import { Category, Order, PaymentMethod, PAYMENT_METHODS, Product } from './models';
import { addDays, inRange, round2, startOfDay, toDateKey } from './utils';

export interface SalesSummary {
    orders: number;
    itemsSold: number;
    /** Total collected, including tax */
    grossSales: number;
    /** Subtotal minus discounts, excluding tax */
    netSales: number;
    discounts: number;
    tax: number;
    cost: number;
    profit: number;
    avgOrder: number;
    refunds: number;
    refundedAmount: number;
}

export function completedIn(orders: Order[], from: Date, to: Date): Order[] {
    return orders.filter((o) => o.status === 'completed' && inRange(o.date, from, to));
}

export function summarize(orders: Order[], from: Date, to: Date): SalesSummary {
    const inPeriod = orders.filter((o) => inRange(o.date, from, to));
    const completed = inPeriod.filter((o) => o.status === 'completed');
    const refunded = inPeriod.filter((o) => o.status === 'refunded');

    let itemsSold = 0;
    let grossSales = 0;
    let netSales = 0;
    let discounts = 0;
    let tax = 0;
    let cost = 0;
    for (const o of completed) {
        grossSales += o.total;
        netSales += o.subtotal - o.discount;
        discounts += o.discount;
        tax += o.tax;
        for (const it of o.items) {
            itemsSold += it.qty;
            cost += it.cost * it.qty;
        }
    }
    return {
        orders: completed.length,
        itemsSold,
        grossSales: round2(grossSales),
        netSales: round2(netSales),
        discounts: round2(discounts),
        tax: round2(tax),
        cost: round2(cost),
        profit: round2(netSales - cost),
        avgOrder: completed.length ? round2(grossSales / completed.length) : 0,
        refunds: refunded.length,
        refundedAmount: round2(refunded.reduce((s, o) => s + o.total, 0)),
    };
}

/** Percentage change, or null when there is nothing to compare against. */
export function percentChange(current: number, previous: number): number | null {
    if (!previous) return null;
    return round2(((current - previous) / previous) * 100);
}

export interface DailyPoint {
    key: string;
    label: string;
    sales: number;
    profit: number;
    orders: number;
}

export function dailySeries(orders: Order[], from: Date, to: Date): DailyPoint[] {
    const buckets = new Map<string, DailyPoint>();
    for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
        const key = toDateKey(d);
        buckets.set(key, { key, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), sales: 0, profit: 0, orders: 0 });
    }
    for (const o of completedIn(orders, from, to)) {
        const b = buckets.get(toDateKey(o.date));
        if (!b) continue;
        b.sales += o.total;
        b.orders++;
        b.profit += o.subtotal - o.discount - o.items.reduce((s, it) => s + it.cost * it.qty, 0);
    }
    return [...buckets.values()].map((b) => ({ ...b, sales: round2(b.sales), profit: round2(b.profit) }));
}

export interface ProductSales {
    productId: string;
    name: string;
    sku: string;
    qty: number;
    revenue: number;
    profit: number;
}

/** Revenue here is before order-level discount and tax (line price x qty). */
export function productSales(orders: Order[], from: Date, to: Date): ProductSales[] {
    const map = new Map<string, ProductSales>();
    for (const o of completedIn(orders, from, to)) {
        for (const it of o.items) {
            const row = map.get(it.productId) ?? { productId: it.productId, name: it.name, sku: it.sku, qty: 0, revenue: 0, profit: 0 };
            row.qty += it.qty;
            row.revenue += it.price * it.qty;
            row.profit += (it.price - it.cost) * it.qty;
            map.set(it.productId, row);
        }
    }
    return [...map.values()].map((r) => ({ ...r, revenue: round2(r.revenue), profit: round2(r.profit) })).sort((a, b) => b.revenue - a.revenue);
}

export interface GroupTotal {
    id: string;
    label: string;
    color?: string;
    value: number;
    count: number;
}

export function salesByCategory(orders: Order[], from: Date, to: Date, products: Map<string, Product>, categories: Map<string, Category>): GroupTotal[] {
    const map = new Map<string, GroupTotal>();
    for (const o of completedIn(orders, from, to)) {
        for (const it of o.items) {
            const category = categories.get(products.get(it.productId)?.categoryId ?? '');
            const id = category?.id ?? 'none';
            const row = map.get(id) ?? { id, label: category?.name ?? 'Uncategorised', color: category?.color ?? '#888ea8', value: 0, count: 0 };
            row.value += it.price * it.qty;
            row.count += it.qty;
            map.set(id, row);
        }
    }
    return [...map.values()].map((r) => ({ ...r, value: round2(r.value) })).sort((a, b) => b.value - a.value);
}

export function salesByPayment(orders: Order[], from: Date, to: Date): GroupTotal[] {
    const map = new Map<PaymentMethod, GroupTotal>(PAYMENT_METHODS.map((m) => [m.value, { id: m.value, label: m.label, value: 0, count: 0 }]));
    for (const o of completedIn(orders, from, to)) {
        const row = map.get(o.paymentMethod)!;
        row.value += o.total;
        row.count++;
    }
    return [...map.values()].map((r) => ({ ...r, value: round2(r.value) }));
}

export function salesByCashier(orders: Order[], from: Date, to: Date): GroupTotal[] {
    const map = new Map<string, GroupTotal>();
    for (const o of completedIn(orders, from, to)) {
        const row = map.get(o.cashierId) ?? { id: o.cashierId, label: o.cashierName, value: 0, count: 0 };
        row.value += o.total;
        row.count++;
        map.set(o.cashierId, row);
    }
    return [...map.values()].map((r) => ({ ...r, value: round2(r.value) })).sort((a, b) => b.value - a.value);
}
