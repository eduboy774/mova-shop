import { Injectable, computed, signal } from '@angular/core';
import { ShopDb } from './models';
import { DB_VERSION, createDemoDb, createEmptyDb } from './seed';

const STORAGE_KEY = 'mova_shop_db';

/**
 * Local persistence for the whole shop.
 *
 * All data lives in one signal and is saved to localStorage after every change.
 * Feature services (ProductService, SalesService, ...) are the only callers, so to move
 * to a real backend you replace the bodies of those services with HTTP calls.
 */
@Injectable({ providedIn: 'root' })
export class DbService {
    private readonly _db = signal<ShopDb>(this.load());
    readonly db = this._db.asReadonly();

    readonly settings = computed(() => this._db().settings);
    readonly users = computed(() => this._db().users);
    readonly categories = computed(() => this._db().categories);
    readonly products = computed(() => this._db().products);
    readonly customers = computed(() => this._db().customers);
    readonly suppliers = computed(() => this._db().suppliers);
    readonly orders = computed(() => this._db().orders);
    readonly purchases = computed(() => this._db().purchases);
    readonly movements = computed(() => this._db().movements);

    /** Apply an immutable change and persist it. */
    update(mutate: (db: ShopDb) => ShopDb) {
        const next = mutate(this._db());
        this._db.set(next);
        this.save(next);
    }

    exportJson(): string {
        return JSON.stringify(this._db(), null, 2);
    }

    importJson(json: string) {
        const data = JSON.parse(json) as ShopDb;
        const required: (keyof ShopDb)[] = [
            'settings',
            'users',
            'categories',
            'products',
            'customers',
            'suppliers',
            'orders',
            'purchases',
            'movements',
            'counters',
        ];
        const missing = required.filter((k) => !(k in data));
        if (missing.length) {
            throw new Error('Invalid backup file. Missing: ' + missing.join(', '));
        }
        if (!data.users.some((u) => u.role === 'admin' && u.active)) {
            throw new Error('Invalid backup file. It has no active admin user.');
        }
        this.update(() => ({ ...data, version: DB_VERSION }));
    }

    resetToDemo() {
        this.update(() => createDemoDb());
    }

    /** Remove all business data but keep settings and user accounts. */
    clearBusinessData() {
        this.update((db) => createEmptyDb(db.settings, db.users));
    }

    private load(): ShopDb {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw) as ShopDb;
                if (data?.version === DB_VERSION) return data;
            }
        } catch {
            // corrupted or unavailable storage: fall through to demo data
        }
        const demo = createDemoDb();
        this.save(demo);
        return demo;
    }

    private save(db: ShopDb) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        } catch (e) {
            console.error('Could not save shop data to localStorage', e);
            alert('Could not save data: browser storage is full or unavailable. Export a backup from Settings.');
        }
    }
}
