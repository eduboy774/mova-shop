import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { DbService } from '../db.service';
import { Category, Product, stockStatus } from '../models';
import { applyStockChanges } from '../stock';
import { uid } from '../utils';

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
export type CategoryInput = Omit<Category, 'id' | 'createdAt'>;

@Injectable({ providedIn: 'root' })
export class ProductService {
    private db = inject(DbService);
    private auth = inject(AuthService);

    readonly products = this.db.products;
    readonly categories = computed(() => [...this.db.categories()].sort((a, b) => a.name.localeCompare(b.name)));
    readonly activeProducts = computed(() => this.products().filter((p) => p.active));

    readonly categoryMap = computed(() => new Map(this.db.categories().map((c) => [c.id, c])));
    readonly productMap = computed(() => new Map(this.products().map((p) => [p.id, p])));

    readonly productCountByCategory = computed(() => {
        const counts = new Map<string, number>();
        this.products().forEach((p) => counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1));
        return counts;
    });

    readonly lowStock = computed(() =>
        this.activeProducts()
            .filter((p) => stockStatus(p) !== 'in')
            .sort((a, b) => a.stock - b.stock),
    );

    readonly stockValue = computed(() => this.products().reduce((sum, p) => sum + Math.max(p.stock, 0) * p.cost, 0));

    getById(id: string): Product | undefined {
        return this.productMap().get(id);
    }

    isSkuTaken(sku: string, exceptId?: string): boolean {
        const s = sku.trim().toLowerCase();
        return this.products().some((p) => p.id !== exceptId && p.sku.toLowerCase() === s);
    }

    isBarcodeTaken(barcode: string, exceptId?: string): boolean {
        const b = barcode.trim();
        return !!b && this.products().some((p) => p.id !== exceptId && p.barcode === b);
    }

    /** Find an active product by exact SKU or barcode (used by the POS scanner box). */
    findByCode(code: string): Product | undefined {
        const c = code.trim().toLowerCase();
        return this.activeProducts().find((p) => p.sku.toLowerCase() === c || p.barcode?.toLowerCase() === c);
    }

    nextSku(): string {
        const numbers = this.products()
            .map((p) => /^MV-(\d+)$/i.exec(p.sku)?.[1])
            .filter(Boolean)
            .map(Number);
        const next = (numbers.length ? Math.max(...numbers) : 1000) + 1;
        return 'MV-' + String(next).padStart(4, '0');
    }

    create(input: ProductInput): Product {
        const now = new Date().toISOString();
        const { stock, ...rest } = input;
        const product: Product = { ...rest, stock: 0, id: uid(), createdAt: now, updatedAt: now };
        this.db.update((db) => {
            let next = { ...db, products: [...db.products, product] };
            if (stock > 0) {
                next = applyStockChanges(next, [{ productId: product.id, qty: stock, type: 'initial', note: 'Opening stock' }], this.userName());
            }
            return next;
        });
        return this.getById(product.id)!;
    }

    /** Stock is not changed here: use InventoryService.adjust so every change is logged. */
    update(id: string, input: Omit<ProductInput, 'stock'>) {
        this.db.update((db) => ({
            ...db,
            products: db.products.map((p) => (p.id === id ? { ...p, ...input, stock: p.stock, updatedAt: new Date().toISOString() } : p)),
        }));
    }

    setActive(id: string, active: boolean) {
        this.db.update((db) => ({
            ...db,
            products: db.products.map((p) => (p.id === id ? { ...p, active, updatedAt: new Date().toISOString() } : p)),
        }));
    }

    /** Orders keep their own copy of product name/price, so deleting a product never breaks history. */
    delete(id: string) {
        this.db.update((db) => ({ ...db, products: db.products.filter((p) => p.id !== id) }));
    }

    saveCategory(input: CategoryInput, id?: string) {
        this.db.update((db) => ({
            ...db,
            categories: id
                ? db.categories.map((c) => (c.id === id ? { ...c, ...input } : c))
                : [...db.categories, { ...input, id: uid(), createdAt: new Date().toISOString() }],
        }));
    }

    isCategoryNameTaken(name: string, exceptId?: string): boolean {
        const n = name.trim().toLowerCase();
        return this.db.categories().some((c) => c.id !== exceptId && c.name.toLowerCase() === n);
    }

    deleteCategory(id: string) {
        if (this.productCountByCategory().get(id)) {
            throw new Error('This category still has products. Move or delete them first.');
        }
        this.db.update((db) => ({ ...db, categories: db.categories.filter((c) => c.id !== id) }));
    }

    private userName() {
        return this.auth.user()?.name ?? 'System';
    }
}
