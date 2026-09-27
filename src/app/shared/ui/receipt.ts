import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Order, PAYMENT_METHODS } from '../../core/models';
import { MoneyPipe } from '../../core/money.pipe';
import { SettingsService } from '../../core/services/settings.service';

/** Print only the receipt, even when it sits inside a modal or a page. */
export function printReceipt() {
    document.body.classList.add('print-receipt');
    const cleanup = () => {
        document.body.classList.remove('print-receipt');
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
}

@Component({
    selector: 'app-receipt',
    imports: [DatePipe, MoneyPipe],
    template: `
        <div class="receipt mx-auto max-w-sm rounded-md bg-white p-5 font-mono text-[13px] text-black shadow-[0_0_4px_2px_rgb(31_45_61_/_10%)]">
            <div class="text-center">
                <img src="/assets/images/logo.svg" alt="" class="mx-auto mb-2 h-10 w-10" />
                <p class="text-base font-bold">{{ settings().name }}</p>
                @if (settings().tagline) {
                    <p class="text-[11px]">{{ settings().tagline }}</p>
                }
                <p class="text-[11px]">{{ settings().address }}</p>
                <p class="text-[11px]">{{ settings().phone }} · {{ settings().email }}</p>
            </div>

            <div class="my-3 border-t border-dashed border-black/40"></div>

            <div class="space-y-0.5 text-[12px]">
                <div class="flex justify-between">
                    <span>Receipt</span><span class="font-bold">{{ order().number }}</span>
                </div>
                <div class="flex justify-between">
                    <span>Date</span><span>{{ order().date | date: 'dd/MM/yyyy HH:mm' }}</span>
                </div>
                <div class="flex justify-between">
                    <span>Cashier</span><span>{{ order().cashierName }}</span>
                </div>
                <div class="flex justify-between">
                    <span>Customer</span><span>{{ order().customerName }}</span>
                </div>
            </div>

            <div class="my-3 border-t border-dashed border-black/40"></div>

            <table class="w-full !border-separate text-[12px]">
                <tbody>
                    @for (item of order().items; track item.productId) {
                        <tr class="!bg-transparent">
                            <td class="!border-0 !p-0 !pb-1.5 align-top">
                                <div>{{ item.name }}</div>
                                <div class="text-[11px] text-black/60">{{ item.qty }} x {{ item.price | money }}</div>
                            </td>
                            <td class="!border-0 !p-0 !pb-1.5 text-right align-top">{{ item.qty * item.price | money }}</td>
                        </tr>
                    }
                </tbody>
            </table>

            <div class="my-3 border-t border-dashed border-black/40"></div>

            <div class="space-y-0.5">
                <div class="flex justify-between">
                    <span>Subtotal</span><span>{{ order().subtotal | money }}</span>
                </div>
                @if (order().discount) {
                    <div class="flex justify-between">
                        <span>Discount</span><span>-{{ order().discount | money }}</span>
                    </div>
                }
                <div class="flex justify-between">
                    <span>Tax ({{ order().taxRate }}%)</span><span>{{ order().tax | money }}</span>
                </div>
                <div class="flex justify-between border-t border-black/40 pt-1 text-base font-bold">
                    <span>TOTAL</span><span>{{ order().total | money }}</span>
                </div>
                <div class="flex justify-between">
                    <span>Paid ({{ method() }})</span><span>{{ order().amountPaid | money }}</span>
                </div>
                @if (order().change) {
                    <div class="flex justify-between">
                        <span>Change</span><span>{{ order().change | money }}</span>
                    </div>
                }
            </div>

            @if (order().status === 'refunded') {
                <p class="mt-3 border border-black p-1 text-center font-bold">REFUNDED {{ order().refundedAt | date: 'dd/MM/yyyy HH:mm' }}</p>
            }

            <div class="my-3 border-t border-dashed border-black/40"></div>
            <p class="text-center text-[12px]">{{ settings().receiptFooter }}</p>
        </div>
    `,
})
export class ReceiptComponent {
    private settingsService = inject(SettingsService);
    readonly order = input.required<Order>();
    readonly settings = this.settingsService.settings;
    readonly method = computed(() => PAYMENT_METHODS.find((m) => m.value === this.order().paymentMethod)?.label ?? this.order().paymentMethod);
}
