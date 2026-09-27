import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { MoneyPipe } from '../../core/money.pipe';
import { PAYMENT_METHODS } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { SalesService } from '../../core/services/sales.service';
import { PageHeaderComponent } from '../../shared/ui/page-header';
import { printReceipt, ReceiptComponent } from '../../shared/ui/receipt';
import { IconPrinterComponent } from '../../shared/icon/icon-printer';
import { IconRestoreComponent } from '../../shared/icon/icon-restore';
import Swal from 'sweetalert2';

@Component({
    imports: [RouterLink, DatePipe, MoneyPipe, PageHeaderComponent, ReceiptComponent, IconPrinterComponent, IconRestoreComponent],
    template: `
        @if (order(); as o) {
            <app-page-header [title]="'Order ' + o.number" [crumbs]="[{ label: 'Orders', link: '/orders' }, { label: o.number }]">
                <button type="button" class="btn btn-outline-primary gap-1.5" (click)="print()"><icon-printer class="h-4 w-4" /> Print receipt</button>
                @if (auth.isAdmin() && o.status === 'completed') {
                    <button type="button" class="btn btn-outline-danger gap-1.5" (click)="refund()"><icon-restore class="h-4 w-4" /> Refund</button>
                }
            </app-page-header>

            <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div class="space-y-6">
                    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div class="panel">
                            <p class="text-xs uppercase text-white-dark">Status</p>
                            <span class="badge mt-2 capitalize" [class]="o.status === 'completed' ? 'bg-success' : 'bg-danger'">{{ o.status }}</span>
                            @if (o.refundedAt) {
                                <p class="mt-1 text-xs text-white-dark">{{ o.refundedAt | date: 'MMM d, y HH:mm' }}</p>
                            }
                        </div>
                        <div class="panel">
                            <p class="text-xs uppercase text-white-dark">Date</p>
                            <p class="mt-2 font-semibold">{{ o.date | date: 'MMM d, y · HH:mm' }}</p>
                        </div>
                        <div class="panel">
                            <p class="text-xs uppercase text-white-dark">Customer</p>
                            @if (o.customerId) {
                                <a [routerLink]="['/customers', o.customerId]" class="mt-2 block font-semibold text-primary hover:underline">{{
                                    o.customerName
                                }}</a>
                            } @else {
                                <p class="mt-2 font-semibold">{{ o.customerName }}</p>
                            }
                        </div>
                        <div class="panel">
                            <p class="text-xs uppercase text-white-dark">Payment</p>
                            <p class="mt-2 font-semibold">{{ method() }} · {{ o.cashierName }}</p>
                        </div>
                    </div>

                    <div class="panel">
                        <h2 class="mb-4 text-lg font-semibold dark:text-white-light">Items</h2>
                        <div class="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>SKU</th>
                                        <th class="text-right">Price</th>
                                        <th class="text-right">Qty</th>
                                        <th class="text-right">Total</th>
                                        @if (auth.isAdmin()) {
                                            <th class="text-right">Profit</th>
                                        }
                                    </tr>
                                </thead>
                                <tbody>
                                    @for (it of o.items; track it.productId) {
                                        <tr>
                                            <td class="font-semibold">{{ it.name }}</td>
                                            <td>{{ it.sku }}</td>
                                            <td class="text-right">{{ it.price | money }}</td>
                                            <td class="text-right">{{ it.qty }}</td>
                                            <td class="text-right font-semibold">{{ it.price * it.qty | money }}</td>
                                            @if (auth.isAdmin()) {
                                                <td class="text-right text-success">{{ (it.price - it.cost) * it.qty | money }}</td>
                                            }
                                        </tr>
                                    }
                                </tbody>
                            </table>
                        </div>
                        <div class="ms-auto mt-5 max-w-xs space-y-1.5 text-sm">
                            <div class="flex justify-between">
                                <span class="text-white-dark">Subtotal</span><span>{{ o.subtotal | money }}</span>
                            </div>
                            @if (o.discount) {
                                <div class="flex justify-between text-success">
                                    <span>Discount</span><span>-{{ o.discount | money }}</span>
                                </div>
                            }
                            <div class="flex justify-between">
                                <span class="text-white-dark">Tax ({{ o.taxRate }}%)</span><span>{{ o.tax | money }}</span>
                            </div>
                            <div class="flex justify-between border-t border-white-light pt-2 text-lg font-bold dark:border-[#1b2e4b]">
                                <span>Total</span><span>{{ o.total | money }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white-dark">Paid</span><span>{{ o.amountPaid | money }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-white-dark">Change</span><span>{{ o.change | money }}</span>
                            </div>
                        </div>
                        @if (o.note) {
                            <p class="mt-5 rounded bg-white-light/40 p-3 dark:bg-[#1b2e4b]"><b>Note:</b> {{ o.note }}</p>
                        }
                    </div>
                </div>

                <div>
                    <app-receipt [order]="o" />
                </div>
            </div>
        } @else {
            <div class="panel py-16 text-center">
                <p class="text-lg font-semibold">Order not found</p>
                <a routerLink="/orders" class="btn btn-primary mx-auto mt-4 w-max">Back to orders</a>
            </div>
        }
    `,
})
export class OrderDetailPage {
    private sales = inject(SalesService);
    private notify = inject(NotifyService);
    auth = inject(AuthService);

    /** Route param, bound via withComponentInputBinding */
    readonly id = input.required<string>();
    readonly order = computed(() => this.sales.getById(this.id()));
    readonly method = computed(() => PAYMENT_METHODS.find((m) => m.value === this.order()?.paymentMethod)?.label ?? '');

    print() {
        printReceipt();
    }

    async refund() {
        const o = this.order();
        if (!o) return;
        const { isConfirmed, value } = await Swal.fire({
            title: `Refund ${o.number}?`,
            text: 'Items will be returned to stock and the order marked as refunded.',
            input: 'text',
            inputPlaceholder: 'Reason (e.g. damaged item)',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Refund order',
            confirmButtonColor: '#e7515a',
            reverseButtons: true,
        });
        if (!isConfirmed) return;
        try {
            this.sales.refund(o.id, (value as string)?.trim() || 'Refund');
            this.notify.success(`${o.number} refunded`);
        } catch (e: any) {
            this.notify.error(e?.message ?? 'Refund failed');
        }
    }
}
