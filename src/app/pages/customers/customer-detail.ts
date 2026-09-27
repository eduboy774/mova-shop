import { Component, computed, inject, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DbService } from '../../core/db.service';
import { MoneyPipe } from '../../core/money.pipe';
import { CustomerService } from '../../core/services/people.service';
import { PageHeaderComponent } from '../../shared/ui/page-header';
import { IconPhoneComponent } from '../../shared/icon/icon-phone';
import { IconMailComponent } from '../../shared/icon/icon-mail';
import { IconMapPinComponent } from '../../shared/icon/icon-map-pin';

@Component({
    imports: [RouterLink, DatePipe, DecimalPipe, MoneyPipe, PageHeaderComponent, IconPhoneComponent, IconMailComponent, IconMapPinComponent],
    template: `
        @if (customer(); as c) {
            <app-page-header [title]="c.name" [crumbs]="[{ label: 'Customers', link: '/customers' }, { label: c.name }]" />

            <div class="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div class="space-y-6">
                    <div class="panel">
                        <div class="flex flex-col items-center text-center">
                            <span class="grid h-20 w-20 place-content-center rounded-full bg-info-light text-2xl font-bold text-info dark:bg-info-dark-light">{{
                                initials()
                            }}</span>
                            <p class="mt-3 text-lg font-bold dark:text-white-light">{{ c.name }}</p>
                            <p class="text-xs text-white-dark">Customer since {{ c.createdAt | date: 'MMM y' }}</p>
                        </div>
                        <ul class="mt-5 space-y-3 text-sm">
                            <li class="flex items-center gap-2"><icon-phone class="h-4 w-4 shrink-0" /> {{ c.phone }}</li>
                            @if (c.email) {
                                <li class="flex items-center gap-2"><icon-mail class="h-4 w-4 shrink-0" /> {{ c.email }}</li>
                            }
                            @if (c.address) {
                                <li class="flex items-center gap-2"><icon-map-pin class="h-4 w-4 shrink-0" /> {{ c.address }}</li>
                            }
                        </ul>
                        @if (c.notes) {
                            <p class="mt-4 rounded bg-white-light/40 p-3 text-sm dark:bg-[#1b2e4b]">{{ c.notes }}</p>
                        }
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="panel text-center">
                            <p class="text-xs uppercase text-white-dark">Orders</p>
                            <p class="mt-1 text-xl font-bold">{{ stats().orders | number }}</p>
                        </div>
                        <div class="panel text-center">
                            <p class="text-xs uppercase text-white-dark">Spent</p>
                            <p class="mt-1 text-xl font-bold">{{ stats().spent | money }}</p>
                        </div>
                    </div>
                </div>

                <div class="panel">
                    <h2 class="mb-4 text-lg font-semibold dark:text-white-light">Purchase history</h2>
                    <div class="table-responsive">
                        <table class="table-hover">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Date</th>
                                    <th>Items</th>
                                    <th>Status</th>
                                    <th class="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (o of orders(); track o.id) {
                                    <tr>
                                        <td>
                                            <a [routerLink]="['/orders', o.id]" class="font-semibold text-primary hover:underline">{{ o.number }}</a>
                                        </td>
                                        <td class="whitespace-nowrap">{{ o.date | date: 'MMM d, y · HH:mm' }}</td>
                                        <td class="max-w-[280px] truncate">{{ describe(o.items) }}</td>
                                        <td>
                                            <span class="badge" [class]="o.status === 'completed' ? 'badge-outline-success' : 'badge-outline-danger'">{{
                                                o.status
                                            }}</span>
                                        </td>
                                        <td class="text-right font-semibold">{{ o.total | money }}</td>
                                    </tr>
                                } @empty {
                                    <tr>
                                        <td colspan="5" class="!py-10 text-center text-white-dark">No orders yet.</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        } @else {
            <div class="panel py-16 text-center">
                <p class="text-lg font-semibold">Customer not found</p>
                <a routerLink="/customers" class="btn btn-primary mx-auto mt-4 w-max">Back to customers</a>
            </div>
        }
    `,
})
export class CustomerDetailPage {
    private db = inject(DbService);
    private customers = inject(CustomerService);

    readonly id = input.required<string>();
    readonly customer = computed(() => this.customers.getById(this.id()));
    readonly orders = computed(() =>
        this.db
            .orders()
            .filter((o) => o.customerId === this.id())
            .sort((a, b) => b.date.localeCompare(a.date)),
    );
    readonly stats = computed(() => this.customers.stats().get(this.id()) ?? { orders: 0, spent: 0 });
    readonly initials = computed(() =>
        (this.customer()?.name ?? '')
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join(''),
    );

    describe(items: { name: string; qty: number }[]) {
        return items.map((it) => `${it.qty}× ${it.name}`).join(', ');
    }
}
