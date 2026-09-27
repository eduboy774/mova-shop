import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MoneyPipe } from '../core/money.pipe';
import { MovementType, Product, stockStatus } from '../core/models';
import { NotifyService } from '../core/notify.service';
import { AdjustMode, InventoryService } from '../core/services/inventory.service';
import { ProductService } from '../core/services/product.service';
import { ModalComponent } from '../shared/ui/modal';
import { PageHeaderComponent } from '../shared/ui/page-header';
import { PaginationComponent, paginate } from '../shared/ui/pagination';
import { ProductThumbComponent } from '../shared/ui/product-thumb';
import { StockBadgeComponent } from '../shared/ui/stock-badge';
import { IconPlusComponent } from '../shared/icon/icon-plus';

const MOVEMENT_LABELS: Record<MovementType, { label: string; cls: string }> = {
    initial: { label: 'Opening', cls: 'badge-outline-dark' },
    sale: { label: 'Sale', cls: 'badge-outline-primary' },
    refund: { label: 'Refund', cls: 'badge-outline-warning' },
    purchase: { label: 'Purchase', cls: 'badge-outline-success' },
    adjustment: { label: 'Adjustment', cls: 'badge-outline-info' },
};

@Component({
    imports: [
        FormsModule,
        RouterLink,
        DatePipe,
        MoneyPipe,
        ModalComponent,
        PageHeaderComponent,
        PaginationComponent,
        ProductThumbComponent,
        StockBadgeComponent,
        IconPlusComponent,
    ],
    template: `
        <app-page-header title="Inventory" [crumbs]="[{ label: 'Stock' }, { label: 'Inventory' }]">
            <a routerLink="/purchases/new" class="btn btn-primary gap-1.5"><icon-plus class="h-4 w-4" /> Purchase order</a>
        </app-page-header>

        <div class="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div class="panel">
                <p class="text-xs uppercase text-white-dark">Units in stock</p>
                <p class="mt-1 text-xl font-bold">{{ totals().units }}</p>
            </div>
            <div class="panel">
                <p class="text-xs uppercase text-white-dark">Value at cost</p>
                <p class="mt-1 text-xl font-bold">{{ totals().cost | money }}</p>
            </div>
            <div class="panel">
                <p class="text-xs uppercase text-white-dark">Value at selling price</p>
                <p class="mt-1 text-xl font-bold">{{ totals().retail | money }}</p>
            </div>
            <div class="panel">
                <p class="text-xs uppercase text-white-dark">Low / out of stock</p>
                <p class="mt-1 text-xl font-bold">
                    <span class="text-warning">{{ totals().low }}</span> / <span class="text-danger">{{ totals().out }}</span>
                </p>
            </div>
        </div>

        <div class="panel">
            <div class="mb-5 flex flex-wrap gap-2 border-b border-white-light dark:border-[#191e3a]" role="tablist">
                <button
                    type="button"
                    role="tab"
                    class="-mb-px border-b-2 px-4 py-2 font-semibold"
                    [class]="tab() === 'stock' ? 'border-primary text-primary' : 'border-transparent hover:text-primary'"
                    [attr.aria-selected]="tab() === 'stock'"
                    (click)="tab.set('stock'); page.set(1)"
                >
                    Stock levels
                </button>
                <button
                    type="button"
                    role="tab"
                    class="-mb-px border-b-2 px-4 py-2 font-semibold"
                    [class]="tab() === 'history' ? 'border-primary text-primary' : 'border-transparent hover:text-primary'"
                    [attr.aria-selected]="tab() === 'history'"
                    (click)="tab.set('history'); page.set(1)"
                >
                    Movement history
                </button>
            </div>

            <div class="mb-5 grid gap-3 sm:grid-cols-3">
                <input
                    type="search"
                    class="form-input sm:col-span-2"
                    placeholder="Search product name or SKU…"
                    aria-label="Search"
                    [ngModel]="q()"
                    (ngModelChange)="q.set($event); page.set(1)"
                />
                @if (tab() === 'stock') {
                    <select class="form-select" aria-label="Stock status" [ngModel]="status()" (ngModelChange)="status.set($event); page.set(1)">
                        <option value="">All stock levels</option>
                        <option value="low">Low stock</option>
                        <option value="out">Out of stock</option>
                        <option value="in">In stock</option>
                    </select>
                } @else {
                    <select class="form-select" aria-label="Movement type" [ngModel]="type()" (ngModelChange)="type.set($event); page.set(1)">
                        <option value="">All movements</option>
                        @for (t of movementTypes; track t) {
                            <option [value]="t">{{ labels[t].label }}</option>
                        }
                    </select>
                }
            </div>

            @if (tab() === 'stock') {
                <div class="table-responsive">
                    <table class="table-hover">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Stock</th>
                                <th class="text-right">Reorder at</th>
                                <th class="text-right">Value (cost)</th>
                                <th class="w-px"><span class="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (p of stockPage(); track p.id) {
                                <tr>
                                    <td>
                                        <span class="flex items-center gap-3">
                                            <app-product-thumb [name]="p.name" [image]="p.image" [color]="products.categoryMap().get(p.categoryId)?.color" />
                                            <span class="font-semibold">{{ p.name }}</span>
                                        </span>
                                    </td>
                                    <td>{{ p.sku }}</td>
                                    <td><app-stock-badge [stock]="p.stock" [reorderLevel]="p.reorderLevel" [unit]="p.unit" /></td>
                                    <td class="text-right">{{ p.reorderLevel }}</td>
                                    <td class="whitespace-nowrap text-right">{{ p.stock * p.cost | money }}</td>
                                    <td>
                                        <button type="button" class="btn btn-outline-primary btn-sm whitespace-nowrap" (click)="openAdjust(p)">Adjust</button>
                                    </td>
                                </tr>
                            } @empty {
                                <tr>
                                    <td colspan="6" class="!py-10 text-center text-white-dark">No products found.</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
                <app-pagination [total]="stockRows().length" [pageSize]="pageSize" [(page)]="page" label="products" />
            } @else {
                <div class="table-responsive">
                    <table class="table-hover">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Product</th>
                                <th>Type</th>
                                <th class="text-right">Change</th>
                                <th class="text-right">Balance</th>
                                <th>Reference</th>
                                <th>By</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (m of historyPage(); track m.id) {
                                <tr>
                                    <td class="whitespace-nowrap">{{ m.date | date: 'MMM d, y · HH:mm' }}</td>
                                    <td class="font-semibold">{{ m.productName }}</td>
                                    <td>
                                        <span class="badge" [class]="labels[m.type].cls">{{ labels[m.type].label }}</span>
                                    </td>
                                    <td class="text-right font-bold" [class]="m.qty > 0 ? 'text-success' : 'text-danger'">
                                        {{ m.qty > 0 ? '+' : '' }}{{ m.qty }}
                                    </td>
                                    <td class="text-right">{{ m.balance }}</td>
                                    <td>
                                        {{ m.reference || '' }}
                                        @if (m.note) {
                                            <span class="block text-xs text-white-dark">{{ m.note }}</span>
                                        }
                                    </td>
                                    <td class="whitespace-nowrap">{{ m.userName }}</td>
                                </tr>
                            } @empty {
                                <tr>
                                    <td colspan="7" class="!py-10 text-center text-white-dark">No stock movements found.</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
                <app-pagination [total]="historyRows().length" [pageSize]="pageSize" [(page)]="page" label="movements" />
            }
        </div>

        <app-modal [open]="!!adjusting()" title="Adjust stock" size="sm" (closed)="adjusting.set(null)">
            @if (adjusting(); as p) {
                <form (ngSubmit)="saveAdjust()" class="space-y-4">
                    <div class="rounded-md bg-white-light/40 p-3 dark:bg-[#1b2e4b]">
                        <p class="font-semibold">{{ p.name }}</p>
                        <p class="text-xs text-white-dark">Current stock: {{ p.stock }} {{ p.unit }}</p>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                        @for (m of modes; track m.value) {
                            <button
                                type="button"
                                class="btn btn-sm"
                                [class]="mode === m.value ? 'btn-primary' : 'btn-outline-primary'"
                                (click)="mode = m.value"
                            >
                                {{ m.label }}
                            </button>
                        }
                    </div>
                    <div>
                        <label for="adjQty">{{ mode === 'set' ? 'New stock count' : 'Quantity' }}</label>
                        <input id="adjQty" name="qty" type="number" min="0" step="1" class="form-input" [(ngModel)]="qty" required />
                        <p class="mt-1 text-xs text-white-dark">
                            New stock will be <b>{{ preview(p) }}</b> {{ p.unit }}
                        </p>
                    </div>
                    <div>
                        <label for="adjReason">Reason</label>
                        <select id="adjReason" name="reason" class="form-select" [(ngModel)]="reason">
                            @for (r of reasons; track r) {
                                <option [value]="r">{{ r }}</option>
                            }
                        </select>
                    </div>
                    @if (adjustError()) {
                        <p class="text-danger">{{ adjustError() }}</p>
                    }
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" class="btn btn-outline-danger" (click)="adjusting.set(null)">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save adjustment</button>
                    </div>
                </form>
            }
        </app-modal>
    `,
})
export class InventoryPage {
    products = inject(ProductService);
    private inventory = inject(InventoryService);
    private notify = inject(NotifyService);
    private route = inject(ActivatedRoute);

    readonly labels = MOVEMENT_LABELS;
    readonly movementTypes = Object.keys(MOVEMENT_LABELS) as MovementType[];
    readonly modes: { value: AdjustMode; label: string }[] = [
        { value: 'add', label: 'Add' },
        { value: 'remove', label: 'Remove' },
        { value: 'set', label: 'Set count' },
    ];
    readonly reasons = ['Stock count correction', 'Damaged / expired', 'Lost / stolen', 'Returned to supplier', 'Received without PO', 'Internal use', 'Other'];
    readonly pageSize = 15;

    readonly tab = signal<'stock' | 'history'>('stock');
    readonly q = signal('');
    readonly status = signal('');
    readonly type = signal('');
    readonly page = signal(1);

    readonly totals = computed(() => {
        const list = this.products.products();
        return {
            units: list.reduce((s, p) => s + Math.max(p.stock, 0), 0),
            cost: list.reduce((s, p) => s + Math.max(p.stock, 0) * p.cost, 0),
            retail: list.reduce((s, p) => s + Math.max(p.stock, 0) * p.price, 0),
            low: list.filter((p) => p.active && stockStatus(p) === 'low').length,
            out: list.filter((p) => p.active && stockStatus(p) === 'out').length,
        };
    });

    readonly stockRows = computed(() => {
        const q = this.q().trim().toLowerCase();
        return [...this.products.products()]
            .filter((p) => !this.status() || stockStatus(p) === this.status())
            .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
            .sort((a, b) => a.stock - a.reorderLevel - (b.stock - b.reorderLevel));
    });
    readonly stockPage = computed(() => paginate(this.stockRows(), this.page(), this.pageSize));

    readonly historyRows = computed(() => {
        const q = this.q().trim().toLowerCase();
        const skus = new Map(this.products.products().map((p) => [p.id, p.sku.toLowerCase()]));
        return this.inventory
            .movements()
            .filter((m) => !this.type() || m.type === this.type())
            .filter((m) => !q || m.productName.toLowerCase().includes(q) || skus.get(m.productId)?.includes(q) || m.reference?.toLowerCase().includes(q));
    });
    readonly historyPage = computed(() => paginate(this.historyRows(), this.page(), this.pageSize));

    // adjust modal
    readonly adjusting = signal<Product | null>(null);
    readonly adjustError = signal('');
    mode: AdjustMode = 'add';
    qty = 0;
    reason = this.reasons[0];

    constructor() {
        this.route.queryParamMap.subscribe((params) => {
            const q = params.get('q');
            if (q !== null) this.q.set(q);
        });
        effect(() => {
            const total = this.tab() === 'stock' ? this.stockRows().length : this.historyRows().length;
            const pages = Math.max(1, Math.ceil(total / this.pageSize));
            if (this.page() > pages) this.page.set(pages);
        });
    }

    openAdjust(p: Product) {
        this.mode = 'add';
        this.qty = 0;
        this.reason = this.reasons[0];
        this.adjustError.set('');
        this.adjusting.set(p);
    }

    preview(p: Product) {
        const qty = Math.floor(Number(this.qty) || 0);
        return this.mode === 'add' ? p.stock + qty : this.mode === 'remove' ? p.stock - qty : qty;
    }

    saveAdjust() {
        const p = this.adjusting();
        if (!p) return;
        const qty = Number(this.qty);
        if (!Number.isInteger(qty) || qty < 0) return this.adjustError.set('Enter a whole number, 0 or more.');
        if (this.preview(p) < 0) return this.adjustError.set(`You cannot remove more than ${p.stock} ${p.unit}.`);
        try {
            this.inventory.adjust(p.id, this.mode, qty, this.reason);
            this.notify.success(`Stock updated: ${p.name}`);
            this.adjusting.set(null);
        } catch (e: any) {
            this.adjustError.set(e.message);
        }
    }
}
