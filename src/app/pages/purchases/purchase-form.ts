import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MoneyPipe } from '../../core/money.pipe';
import { PurchaseItem, stockStatus } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SupplierService } from '../../core/services/people.service';
import { ProductService } from '../../core/services/product.service';
import { PurchaseService } from '../../core/services/purchase.service';
import { fromDateKey, round2, toDateKey } from '../../core/utils';
import { PageHeaderComponent } from '../../shared/ui/page-header';
import { IconPlusComponent } from '../../shared/icon/icon-plus';
import { IconTrashLinesComponent } from '../../shared/icon/icon-trash-lines';
import { PURCHASE_STATUS } from './purchase-list';

interface Row {
    productId: string;
    qty: number;
    cost: number;
}

@Component({
    imports: [FormsModule, RouterLink, DatePipe, MoneyPipe, PageHeaderComponent, IconPlusComponent, IconTrashLinesComponent],
    template: `
        <app-page-header
            [title]="purchase() ? 'Purchase order ' + purchase()!.number : 'New purchase order'"
            [crumbs]="[{ label: 'Purchases', link: '/purchases' }, { label: purchase()?.number ?? 'New' }]"
        >
            @if (purchase()?.status === 'pending') {
                <button type="button" class="btn btn-outline-danger" (click)="cancel()">Cancel PO</button>
                <button type="button" class="btn btn-success" (click)="receive()">Receive goods</button>
            }
            @if (purchase() && purchase()!.status !== 'received') {
                <button type="button" class="btn btn-outline-dark" (click)="remove()">Delete</button>
            }
        </app-page-header>

        @if (id() && !purchase()) {
            <div class="panel py-16 text-center">
                <p class="text-lg font-semibold">Purchase order not found</p>
                <a routerLink="/purchases" class="btn btn-primary mx-auto mt-4 w-max">Back to purchases</a>
            </div>
        } @else {
            <div class="panel">
                @if (purchase(); as po) {
                    <div class="mb-5 flex flex-wrap items-center gap-3">
                        <span class="badge capitalize" [class]="statusClass[po.status]">{{ po.status }}</span>
                        @if (po.receivedAt) {
                            <span class="text-white-dark">Received {{ po.receivedAt | date: 'MMM d, y · HH:mm' }}</span>
                        }
                    </div>
                }

                <div class="grid gap-5 sm:grid-cols-3">
                    <div>
                        <label for="supplier">Supplier *</label>
                        <select id="supplier" class="form-select" [disabled]="readonly()" [(ngModel)]="supplierId">
                            <option value="">Select supplier</option>
                            @for (s of suppliers.suppliers(); track s.id) {
                                <option [value]="s.id">{{ s.name }}</option>
                            }
                        </select>
                        @if (!suppliers.suppliers().length) {
                            <p class="mt-1 text-xs"><a routerLink="/suppliers" class="text-primary">Add a supplier first</a></p>
                        }
                    </div>
                    <div>
                        <label for="date">Order date</label>
                        <input id="date" type="date" class="form-input" [disabled]="readonly()" [(ngModel)]="date" />
                    </div>
                    <div>
                        <label for="note">Note</label>
                        <input id="note" type="text" class="form-input" [disabled]="readonly()" [(ngModel)]="note" placeholder="Optional" />
                    </div>
                </div>

                <div class="mt-8 flex flex-wrap items-center justify-between gap-2">
                    <h2 class="text-lg font-semibold dark:text-white-light">Items</h2>
                    @if (!readonly()) {
                        <div class="flex flex-wrap gap-2">
                            <button type="button" class="btn btn-outline-warning btn-sm" (click)="addLowStock()">Add low-stock items</button>
                            <button type="button" class="btn btn-outline-primary btn-sm gap-1" (click)="addRow()">
                                <icon-plus class="h-4 w-4" /> Add item
                            </button>
                        </div>
                    }
                </div>

                <div class="table-responsive mt-4">
                    <table>
                        <thead>
                            <tr>
                                <th class="min-w-[220px]">Product</th>
                                <th class="w-32">In stock</th>
                                <th class="w-32">Qty</th>
                                <th class="w-40">Unit cost</th>
                                <th class="w-36 text-right">Total</th>
                                @if (!readonly()) {
                                    <th class="w-px"><span class="sr-only">Remove</span></th>
                                }
                            </tr>
                        </thead>
                        <tbody>
                            @for (row of rows(); track $index; let i = $index) {
                                <tr>
                                    <td>
                                        @if (readonly()) {
                                            <span class="font-semibold">{{ nameOf(i) }}</span>
                                        } @else {
                                            <select
                                                class="form-select"
                                                [attr.aria-label]="'Product for row ' + (i + 1)"
                                                [ngModel]="row.productId"
                                                (ngModelChange)="setProduct(i, $event)"
                                            >
                                                <option value="">Select product</option>
                                                @for (p of productOptions(); track p.id) {
                                                    <option [value]="p.id">{{ p.name }} ({{ p.sku }})</option>
                                                }
                                            </select>
                                        }
                                    </td>
                                    <td>{{ products.getById(row.productId)?.stock ?? '—' }}</td>
                                    <td>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            class="form-input"
                                            [attr.aria-label]="'Quantity for row ' + (i + 1)"
                                            [disabled]="readonly()"
                                            [ngModel]="row.qty"
                                            (ngModelChange)="patch(i, { qty: $event })"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            class="form-input"
                                            [attr.aria-label]="'Unit cost for row ' + (i + 1)"
                                            [disabled]="readonly()"
                                            [ngModel]="row.cost"
                                            (ngModelChange)="patch(i, { cost: $event })"
                                        />
                                    </td>
                                    <td class="text-right font-semibold">{{ (+row.qty || 0) * (+row.cost || 0) | money }}</td>
                                    @if (!readonly()) {
                                        <td>
                                            <button type="button" class="hover:text-danger" [attr.aria-label]="'Remove row ' + (i + 1)" (click)="removeRow(i)">
                                                <icon-trash-lines class="h-5 w-5" />
                                            </button>
                                        </td>
                                    }
                                </tr>
                            } @empty {
                                <tr>
                                    <td colspan="6" class="!py-8 text-center text-white-dark">No items yet. Add products to this purchase order.</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>

                <div class="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white-light pt-5 dark:border-[#1b2e4b]">
                    <p class="text-lg">
                        Total: <span class="font-extrabold">{{ total() | money }}</span>
                        <span class="text-sm text-white-dark">· {{ units() }} {{ units() === 1 ? 'unit' : 'units' }}</span>
                    </p>
                    @if (!readonly()) {
                        <div class="flex gap-2">
                            <a routerLink="/purchases" class="btn btn-outline-danger">Cancel</a>
                            <button type="button" class="btn btn-primary" (click)="save()">{{ purchase() ? 'Save changes' : 'Create purchase order' }}</button>
                        </div>
                    }
                </div>
            </div>
        }
    `,
})
export class PurchaseFormPage implements OnInit {
    products = inject(ProductService);
    suppliers = inject(SupplierService);
    private purchases = inject(PurchaseService);
    private notify = inject(NotifyService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    readonly id = input<string>();
    readonly purchase = computed(() => (this.id() ? this.purchases.getById(this.id()!) : undefined));
    readonly readonly = computed(() => !!this.purchase() && this.purchase()!.status !== 'pending');
    readonly statusClass = PURCHASE_STATUS;

    supplierId = '';
    date = toDateKey(new Date());
    note = '';
    readonly rows = signal<Row[]>([]);

    readonly productOptions = computed(() => [...this.products.products()].sort((a, b) => a.name.localeCompare(b.name)));
    readonly total = computed(() => round2(this.rows().reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.cost) || 0), 0)));
    readonly units = computed(() => this.rows().reduce((s, r) => s + (Number(r.qty) || 0), 0));

    ngOnInit() {
        const po = this.purchase();
        if (po) {
            this.supplierId = po.supplierId;
            this.date = toDateKey(po.date);
            this.note = po.note ?? '';
            this.rows.set(po.items.map((it) => ({ productId: it.productId, qty: it.qty, cost: it.cost })));
        } else {
            this.supplierId = this.route.snapshot.queryParamMap.get('supplier') ?? '';
            this.addRow();
        }
    }

    nameOf(i: number) {
        const row = this.rows()[i];
        return this.products.getById(row.productId)?.name ?? this.purchase()?.items[i]?.name ?? 'Deleted product';
    }

    addRow() {
        this.rows.update((rows) => [...rows, { productId: '', qty: 1, cost: 0 }]);
    }

    removeRow(i: number) {
        this.rows.update((rows) => rows.filter((_, idx) => idx !== i));
    }

    patch(i: number, change: Partial<Row>) {
        this.rows.update((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...change } : r)));
    }

    setProduct(i: number, productId: string) {
        const p = this.products.getById(productId);
        this.patch(i, { productId, cost: p?.cost ?? 0 });
    }

    /** Low-stock products (from the selected supplier, if any), ordered up to 3x their reorder level. */
    addLowStock() {
        const existing = new Set(this.rows().map((r) => r.productId));
        const items = this.products
            .products()
            .filter((p) => p.active && stockStatus(p) !== 'in' && !existing.has(p.id))
            .filter((p) => !this.supplierId || p.supplierId === this.supplierId)
            .map((p) => ({ productId: p.id, qty: Math.max(p.reorderLevel * 3 - p.stock, 1), cost: p.cost }));
        if (!items.length) {
            this.notify.toast(this.supplierId ? 'No low-stock products for this supplier' : 'No low-stock products', 'info');
            return;
        }
        this.rows.update((rows) => [...rows.filter((r) => r.productId), ...items]);
        this.notify.success(`${items.length} low-stock products added`);
    }

    save() {
        const rows = this.rows().filter((r) => r.productId);
        if (rows.some((r) => !Number.isInteger(Number(r.qty)) || Number(r.qty) <= 0)) {
            this.notify.error('Quantities must be whole numbers above 0');
            return;
        }
        if (new Set(rows.map((r) => r.productId)).size !== rows.length) {
            this.notify.error('Each product can only appear once');
            return;
        }
        const items: PurchaseItem[] = rows.map((r) => ({
            productId: r.productId,
            name: this.products.getById(r.productId)?.name ?? '',
            qty: Number(r.qty),
            cost: Math.max(0, Number(r.cost) || 0),
        }));
        try {
            const dateIso = fromDateKey(this.date || toDateKey(new Date())).toISOString();
            const saved = this.purchases.save({ supplierId: this.supplierId, date: dateIso, items, note: this.note.trim() || undefined }, this.purchase()?.id);
            this.notify.success(this.purchase() ? 'Purchase order updated' : `${saved.number} created`);
            this.router.navigate(['/purchases', saved.id]);
        } catch (e: any) {
            this.notify.error(e.message);
        }
    }

    async receive() {
        const po = this.purchase();
        if (!po) return;
        if (
            !(await this.notify.confirm(
                `Receive ${po.number}?`,
                'Stock will be added for every item, and product cost prices updated to these costs.',
                'Receive goods',
                false,
            ))
        )
            return;
        try {
            this.purchases.receive(po.id, true);
            this.notify.success(`${po.number} received, stock updated`);
        } catch (e: any) {
            this.notify.error(e.message);
        }
    }

    async cancel() {
        const po = this.purchase();
        if (!po || !(await this.notify.confirm(`Cancel ${po.number}?`, 'No stock will be added.', 'Cancel PO'))) return;
        this.purchases.cancel(po.id);
        this.notify.success(`${po.number} cancelled`);
    }

    async remove() {
        const po = this.purchase();
        if (!po || !(await this.notify.confirm(`Delete ${po.number}?`, '', 'Delete'))) return;
        this.purchases.delete(po.id);
        this.notify.success(`${po.number} deleted`);
        this.router.navigate(['/purchases']);
    }
}
