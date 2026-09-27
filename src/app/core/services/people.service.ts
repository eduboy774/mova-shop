import { Injectable, computed, inject } from '@angular/core';
import { DbService } from '../db.service';
import { Customer, Role, Supplier, User } from '../models';
import { uid } from '../utils';

export type CustomerInput = Omit<Customer, 'id' | 'createdAt'>;
export type SupplierInput = Omit<Supplier, 'id' | 'createdAt'>;
export type UserInput = Omit<User, 'id' | 'createdAt'>;

export interface CustomerStats {
    orders: number;
    spent: number;
    lastVisit?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
    private db = inject(DbService);

    readonly customers = computed(() => [...this.db.customers()].sort((a, b) => a.name.localeCompare(b.name)));

    readonly stats = computed(() => {
        const map = new Map<string, CustomerStats>();
        for (const o of this.db.orders()) {
            if (!o.customerId || o.status !== 'completed') continue;
            const s = map.get(o.customerId) ?? { orders: 0, spent: 0 };
            s.orders++;
            s.spent += o.total;
            if (!s.lastVisit || o.date > s.lastVisit) s.lastVisit = o.date;
            map.set(o.customerId, s);
        }
        return map;
    });

    getById(id: string) {
        return this.db.customers().find((c) => c.id === id);
    }

    isPhoneTaken(phone: string, exceptId?: string) {
        const p = phone.replace(/\s+/g, '');
        return this.db.customers().some((c) => c.id !== exceptId && c.phone.replace(/\s+/g, '') === p);
    }

    save(input: CustomerInput, id?: string): Customer {
        let saved!: Customer;
        this.db.update((db) => {
            if (id) {
                return { ...db, customers: db.customers.map((c) => (c.id === id ? (saved = { ...c, ...input }) : c)) };
            }
            saved = { ...input, id: uid(), createdAt: new Date().toISOString() };
            return { ...db, customers: [...db.customers, saved] };
        });
        return saved;
    }

    /** Past orders keep the customer name, so history stays readable. */
    delete(id: string) {
        this.db.update((db) => ({ ...db, customers: db.customers.filter((c) => c.id !== id) }));
    }
}

@Injectable({ providedIn: 'root' })
export class SupplierService {
    private db = inject(DbService);

    readonly suppliers = computed(() => [...this.db.suppliers()].sort((a, b) => a.name.localeCompare(b.name)));

    readonly productCount = computed(() => {
        const map = new Map<string, number>();
        this.db.products().forEach((p) => p.supplierId && map.set(p.supplierId, (map.get(p.supplierId) ?? 0) + 1));
        return map;
    });

    readonly purchaseTotals = computed(() => {
        const map = new Map<string, number>();
        this.db.purchases().forEach((p) => p.status === 'received' && map.set(p.supplierId, (map.get(p.supplierId) ?? 0) + p.total));
        return map;
    });

    save(input: SupplierInput, id?: string) {
        this.db.update((db) => ({
            ...db,
            suppliers: id
                ? db.suppliers.map((s) => (s.id === id ? { ...s, ...input } : s))
                : [...db.suppliers, { ...input, id: uid(), createdAt: new Date().toISOString() }],
        }));
    }

    delete(id: string) {
        if (this.db.purchases().some((p) => p.supplierId === id && p.status === 'pending')) {
            throw new Error('This supplier has pending purchase orders. Receive or cancel them first.');
        }
        this.db.update((db) => ({
            ...db,
            suppliers: db.suppliers.filter((s) => s.id !== id),
            products: db.products.map((p) => (p.supplierId === id ? { ...p, supplierId: undefined } : p)),
        }));
    }
}

@Injectable({ providedIn: 'root' })
export class UserService {
    private db = inject(DbService);

    readonly users = computed(() => [...this.db.users()].sort((a, b) => a.name.localeCompare(b.name)));

    isEmailTaken(email: string, exceptId?: string) {
        const e = email.trim().toLowerCase();
        return this.db.users().some((u) => u.id !== exceptId && u.email.toLowerCase() === e);
    }

    save(input: UserInput, id?: string) {
        if (id) this.assertKeepsAnAdmin(id, input.role, input.active);
        this.db.update((db) => ({
            ...db,
            users: id
                ? db.users.map((u) => (u.id === id ? { ...u, ...input, password: input.password || u.password } : u))
                : [...db.users, { ...input, email: input.email.trim(), id: uid(), createdAt: new Date().toISOString() }],
        }));
    }

    delete(id: string) {
        this.assertKeepsAnAdmin(id, 'cashier', false);
        this.db.update((db) => ({ ...db, users: db.users.filter((u) => u.id !== id) }));
    }

    private assertKeepsAnAdmin(id: string, role: Role, active: boolean) {
        if (role === 'admin' && active) return;
        const otherAdmins = this.db.users().filter((u) => u.id !== id && u.role === 'admin' && u.active);
        if (!otherAdmins.length) throw new Error('The shop needs at least one active admin.');
    }
}
