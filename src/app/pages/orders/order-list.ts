import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MoneyPipe } from '../../core/money.pipe';
import { PAYMENT_METHODS } from '../../core/models';
import { SalesService } from '../../core/services/sales.service';
import { downloadFile, endOfDay, fromDateKey, toCsv, toDateKey } from '../../core/utils';
import { PageHeaderComponent } from '../../shared/ui/page-header';
import { PaginationComponent, paginate } from '../../shared/ui/pagination';
import { IconDownloadComponent } from '../../shared/icon/icon-download';
import { IconPlusComponent } from '../../shared/icon/icon-plus';
import { IconEyeComponent } from '../../shared/icon/icon-eye';

@Component({
    imports: [
        FormsModule,
        RouterLink,
        DatePipe,
        MoneyPipe,
        PageHeaderComponent,
        PaginationComponent,
        IconDownloadComponent,
        IconPlusComponent,
        IconEyeComponent,
    ],
    template: `
        <app-page-header title="Orders" [crumbs]="[{ label: 'Sales' }, { label: 'Orders' }]">
            <button type="button" class="btn btn-outline-primary gap-1.5" (click)="exportCsv()" [disabled]="!filtered().length">
                <icon-download class="h-4 w-4" /> Export CSV
            </button>
            <a routerLink="/pos" class="btn btn-primary gap-1.5"><icon-plus class="h-4 w-4" /> New sale</a>
        </app-page-header>

        <div class="panel">
            <div class="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <input
                    type="search"
                    class="form-input lg:col-span-2"
                    placeholder="Search order #, customer or cashier…"
                    aria-label="Search orders"
                    [ngModel]="q()"
                    (ngModelChange)="q.set($event); page.set(1)"
                />
                <select class="form-select" aria-label="Status" [ngModel]="status()" (ngModelChange)="status.set($event); page.set(1)">
                    <option value="">All statuses</option>
                    <option value="completed">Completed</option>
                    <option value="refunded">Refunded</option>
                </select>
                <select class="form-select" aria-label="Payment method" [ngModel]="method()" (ngModelChange)="method.set($event); page.set(1)">
                    <option value="">All payments</option>
                    @for (m of paymentMethods; track m.value) {
                        <option [value]="m.value">{{ m.label }}</option>
                    }
                </select>
                <div class="flex gap-2">
                    <input type="date" class="form-input px-2" aria-label="From date" [ngModel]="from()" (ngModelChange)="from.set($event); page.set(1)" />
                    <input type="date" class="form-input px-2" aria-label="To date" [ngModel]="to()" (ngModelChange)="to.set($event); page.set(1)" />
                </div>
            </div>

            <div class="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span
                    ><span class="text-white-dark">Orders:</span> <b>{{ filtered().length }}</b></span
                >
                <span
                    ><span class="text-white-dark">Completed total:</span> <b>{{ completedTotal() | money }}</b></span
                >
            </div>

            <div class="table-responsive">
                <table class="table-hover">
                    <thead>
                        <tr>
                            <th>Order</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Payment</th>
                            <th>Cashier</th>
                            <th>Status</th>
                            <th class="text-right">Total</th>
                            <th class="w-px"><span class="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (o of pageItems(); track o.id) {
                            <tr>
                                <td>
                                    <a [routerLink]="['/orders', o.id]" class="font-semibold text-primary hover:underline">{{ o.number }}</a>
                                </td>
                                <td class="whitespace-nowrap">{{ o.date | date: 'MMM d, y · HH:mm' }}</td>
                                <td class="whitespace-nowrap">{{ o.customerName }}</td>
                                <td>{{ itemCount(o.items) }}</td>
                                <td class="whitespace-nowrap">{{ paymentLabel(o.paymentMethod) }}</td>
                                <td class="whitespace-nowrap">{{ o.cashierName }}</td>
                                <td>
                                    <span class="badge" [class]="o.status === 'completed' ? 'badge-outline-success' : 'badge-outline-danger'">{{
                                        o.status
                                    }}</span>
                                </td>
                                <td class="whitespace-nowrap text-right font-semibold">{{ o.total | money }}</td>
                                <td>
                                    <a [routerLink]="['/orders', o.id]" class="hover:text-primary" [attr.aria-label]="'View ' + o.number"
                                        ><icon-eye class="h-5 w-5"
                                    /></a>
                                </td>
                            </tr>
                        } @empty {
                            <tr>
                                <td colspan="9" class="!py-10 text-center text-white-dark">No orders match these filters.</td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
            <app-pagination [total]="filtered().length" [pageSize]="pageSize" [(page)]="page" label="orders" />
        </div>
    `,
})
export class OrderListPage {
    private sales = inject(SalesService);
    private route = inject(ActivatedRoute);

    readonly paymentMethods = PAYMENT_METHODS;
    readonly pageSize = 15;

    readonly q = signal('');
    readonly status = signal('');
    readonly method = signal('');
    readonly from = signal('');
    readonly to = signal('');
    readonly page = signal(1);

    constructor() {
        // header search sends ?q=
        this.route.queryParamMap.subscribe((params) => {
            const q = params.get('q');
            if (q !== null) {
                this.q.set(q);
                this.page.set(1);
            }
        });
        // keep the page in range when the list shrinks
        effect(() => {
            const pages = Math.max(1, Math.ceil(this.filtered().length / this.pageSize));
            if (this.page() > pages) this.page.set(pages);
        });
    }

    readonly filtered = computed(() => {
        const q = this.q().trim().toLowerCase();
        const from = this.from() ? fromDateKey(this.from()).getTime() : -Infinity;
        const to = this.to() ? endOfDay(fromDateKey(this.to())).getTime() : Infinity;
        return this.sales.orders().filter((o) => {
            if (this.status() && o.status !== this.status()) return false;
            if (this.method() && o.paymentMethod !== this.method()) return false;
            const t = new Date(o.date).getTime();
            if (t < from || t > to) return false;
            return !q || o.number.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.cashierName.toLowerCase().includes(q);
        });
    });
    readonly pageItems = computed(() => paginate(this.filtered(), this.page(), this.pageSize));
    readonly completedTotal = computed(() => this.filtered().reduce((s, o) => s + (o.status === 'completed' ? o.total : 0), 0));

    itemCount(items: { qty: number }[]) {
        return items.reduce((s, it) => s + it.qty, 0);
    }

    paymentLabel(value: string) {
        return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
    }

    exportCsv() {
        const rows: (string | number)[][] = [['Order', 'Date', 'Customer', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total', 'Payment', 'Cashier', 'Status']];
        this.filtered().forEach((o) =>
            rows.push([
                o.number,
                new Date(o.date).toLocaleString(),
                o.customerName,
                this.itemCount(o.items),
                o.subtotal,
                o.discount,
                o.tax,
                o.total,
                this.paymentLabel(o.paymentMethod),
                o.cashierName,
                o.status,
            ]),
        );
        downloadFile(`orders-${toDateKey(new Date())}.csv`, toCsv(rows), 'text/csv');
    }
}
