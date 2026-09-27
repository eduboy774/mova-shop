import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MoneyPipe } from '../../core/money.pipe';
import { PurchaseStatus } from '../../core/models';
import { PurchaseService } from '../../core/services/purchase.service';
import { PageHeaderComponent } from '../../shared/ui/page-header';
import { PaginationComponent, paginate } from '../../shared/ui/pagination';
import { IconPlusComponent } from '../../shared/icon/icon-plus';

export const PURCHASE_STATUS: Record<PurchaseStatus, string> = {
    pending: 'badge-outline-warning',
    received: 'badge-outline-success',
    cancelled: 'badge-outline-danger',
};

@Component({
    imports: [FormsModule, RouterLink, DatePipe, MoneyPipe, PageHeaderComponent, PaginationComponent, IconPlusComponent],
    template: `
        <app-page-header title="Purchase orders" [crumbs]="[{ label: 'Stock' }, { label: 'Purchases' }]">
            <a routerLink="/purchases/new" class="btn btn-primary gap-1.5"><icon-plus class="h-4 w-4" /> New purchase order</a>
        </app-page-header>

        <div class="panel">
            <div class="mb-5 flex flex-wrap gap-3">
                <input
                    type="search"
                    class="form-input max-w-sm"
                    placeholder="Search PO # or supplier…"
                    aria-label="Search purchase orders"
                    [ngModel]="q()"
                    (ngModelChange)="q.set($event); page.set(1)"
                />
                <select class="form-select w-auto" aria-label="Status" [ngModel]="status()" (ngModelChange)="status.set($event); page.set(1)">
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
            <div class="table-responsive">
                <table class="table-hover">
                    <thead>
                        <tr>
                            <th>PO #</th>
                            <th>Date</th>
                            <th>Supplier</th>
                            <th class="text-right">Items</th>
                            <th>Status</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (p of pageItems(); track p.id) {
                            <tr>
                                <td>
                                    <a [routerLink]="['/purchases', p.id]" class="font-semibold text-primary hover:underline">{{ p.number }}</a>
                                </td>
                                <td class="whitespace-nowrap">{{ p.date | date: 'MMM d, y' }}</td>
                                <td>{{ p.supplierName }}</td>
                                <td class="text-right">{{ units(p.items) }}</td>
                                <td>
                                    <span class="badge capitalize" [class]="statusClass[p.status]">{{ p.status }}</span>
                                </td>
                                <td class="whitespace-nowrap text-right font-semibold">{{ p.total | money }}</td>
                            </tr>
                        } @empty {
                            <tr>
                                <td colspan="6" class="!py-10 text-center text-white-dark">No purchase orders found.</td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
            <app-pagination [total]="filtered().length" [pageSize]="pageSize" [(page)]="page" label="purchase orders" />
        </div>
    `,
})
export class PurchaseListPage {
    private purchases = inject(PurchaseService);

    readonly statusClass = PURCHASE_STATUS;
    readonly pageSize = 15;
    readonly q = signal('');
    readonly status = signal('');
    readonly page = signal(1);

    readonly filtered = computed(() => {
        const q = this.q().trim().toLowerCase();
        return this.purchases
            .purchases()
            .filter((p) => !this.status() || p.status === this.status())
            .filter((p) => !q || p.number.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q));
    });
    readonly pageItems = computed(() => paginate(this.filtered(), this.page(), this.pageSize));

    units(items: { qty: number }[]) {
        return items.reduce((s, it) => s + it.qty, 0);
    }
}
