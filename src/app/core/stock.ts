import { MovementType, ShopDb } from './models';
import { uid } from './utils';

export interface StockChange {
    productId: string;
    /** Signed quantity: positive adds stock, negative removes it */
    qty: number;
    type: MovementType;
    reference?: string;
    note?: string;
}

/**
 * Apply stock changes to products and append matching movements.
 * Pure: returns a new db object. Throws if any product would go below zero.
 */
export function applyStockChanges(db: ShopDb, changes: StockChange[], userName: string, date = new Date().toISOString()): ShopDb {
    const products = db.products.map((p) => ({ ...p }));
    const byId = new Map(products.map((p) => [p.id, p]));
    const movements = [...db.movements];

    for (const change of changes) {
        const product = byId.get(change.productId);
        if (!product) throw new Error('Product not found');
        const next = product.stock + change.qty;
        if (next < 0) throw new Error(`Not enough stock for "${product.name}" (available: ${product.stock})`);
        product.stock = next;
        product.updatedAt = date;
        movements.push({
            id: uid(),
            date,
            productId: product.id,
            productName: product.name,
            type: change.type,
            qty: change.qty,
            balance: next,
            reference: change.reference,
            note: change.note,
            userName,
        });
    }
    return { ...db, products, movements };
}
