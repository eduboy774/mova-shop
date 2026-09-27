import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MoneyPipe } from '../../core/money.pipe';
import { Order, PaymentMethod, PAYMENT_METHODS, Product } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { CustomerService } from '../../core/services/people.service';
import { ProductService } from '../../core/services/product.service';
import { calcTotals, SalesService } from '../../core/services/sales.service';
import { SettingsService } from '../../core/services/settings.service';
import { round2 } from '../../core/utils';
import { ModalComponent } from '../../shared/ui/modal';
import { ProductThumbComponent } from '../../shared/ui/product-thumb';
import { printReceipt, ReceiptComponent } from '../../shared/ui/receipt';
import { IconSearchComponent } from '../../shared/icon/icon-search';
import { IconTrashLinesComponent } from '../../shared/icon/icon-trash-lines';
import { IconPlusComponent } from '../../shared/icon/icon-plus';
import { IconMinusComponent } from '../../shared/icon/icon-minus';
import { IconUserPlusComponent } from '../../shared/icon/icon-user-plus';
import { IconShoppingCartComponent } from '../../shared/icon/icon-shopping-cart';
import { IconPrinterComponent } from '../../shared/icon/icon-printer';

interface CartEntry {
    productId: string;
    qty: number;
}

@Component({
    templateUrl: './pos.html',
    imports: [
        FormsModule,
        MoneyPipe,
        ModalComponent,
        ProductThumbComponent,
        ReceiptComponent,
        IconSearchComponent,
        IconTrashLinesComponent,
        IconPlusComponent,
        IconMinusComponent,
        IconUserPlusComponent,
        IconShoppingCartComponent,
        IconPrinterComponent,
    ],
})
export class PosPage {
    private productService = inject(ProductService);
    private salesService = inject(SalesService);
    private notify = inject(NotifyService);
    customers = inject(CustomerService);
    settings = inject(SettingsService);

    readonly paymentMethods = PAYMENT_METHODS;
    readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

    // catalog
    readonly search = signal('');
    readonly categoryId = signal<string>('all');
    readonly categories = this.productService.categories;
    readonly categoryMap = this.productService.categoryMap;
    readonly visibleProducts = computed(() => {
        const q = this.search().trim().toLowerCase();
        const cat = this.categoryId();
        return this.productService
            .activeProducts()
            .filter((p) => cat === 'all' || p.categoryId === cat)
            .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode?.includes(q))
            .sort((a, b) => a.name.localeCompare(b.name));
    });

    // cart
    readonly cart = signal<CartEntry[]>([]);
    readonly customerId = signal<string>('');
    readonly discountValue = signal<number>(0);
    readonly discountType = signal<'amount' | 'percent'>('amount');

    readonly lines = computed(() => {
        const map = this.productService.productMap();
        return this.cart()
            .map((entry) => ({ ...entry, product: map.get(entry.productId)! }))
            .filter((l) => l.product);
    });
    readonly itemCount = computed(() => this.cart().reduce((s, l) => s + l.qty, 0));
    readonly discountAmount = computed(() => {
        const subtotal = this.lines().reduce((s, l) => s + l.product.price * l.qty, 0);
        const value = Math.max(0, Number(this.discountValue()) || 0);
        return round2(this.discountType() === 'percent' ? (subtotal * Math.min(value, 100)) / 100 : value);
    });
    readonly totals = computed(() =>
        calcTotals(
            this.lines().map((l) => ({ price: l.product.price, qty: l.qty })),
            this.discountAmount(),
            this.settings.settings().taxRate,
        ),
    );

    // payment
    readonly showPayment = signal(false);
    readonly paymentMethod = signal<PaymentMethod>('cash');
    readonly amountPaid = signal<number>(0);
    readonly note = signal('');
    readonly change = computed(() => round2(Math.max(0, (Number(this.amountPaid()) || 0) - this.totals().total)));
    readonly canComplete = computed(() => this.paymentMethod() !== 'cash' || (Number(this.amountPaid()) || 0) >= this.totals().total);
    readonly quickAmounts = computed(() => {
        const total = this.totals().total;
        const denominations = [1, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
        const rounded = denominations.map((d) => Math.ceil(total / d) * d).filter((v) => v > total);
        return [
            total,
            ...Array.from(new Set(rounded))
                .sort((a, b) => a - b)
                .slice(0, 3),
        ];
    });

    // receipt
    readonly lastOrder = signal<Order | null>(null);

    // quick add customer
    readonly showCustomerModal = signal(false);
    newCustomer = { name: '', phone: '' };
    customerError = '';

    constructor() {
        // "Buy" on the storefront links here as /pos?add=<productId>
        const route = inject(ActivatedRoute);
        const addId = route.snapshot.queryParamMap.get('add');
        if (addId) {
            const product = this.productService.getById(addId);
            if (product?.active) this.add(product);
            // drop ?add= so a refresh doesn't add it again (no router navigation: it would cut the view transition short)
            inject(Location).replaceState('/pos');
        }
    }

    qtyInCart(productId: string) {
        return this.cart().find((l) => l.productId === productId)?.qty ?? 0;
    }

    add(product: Product) {
        const inCart = this.qtyInCart(product.id);
        if (inCart + 1 > product.stock) {
            this.notify.toast(
                product.stock <= 0 ? `${product.name} is out of stock` : `Only ${product.stock} ${product.unit} of ${product.name} in stock`,
                'warning',
            );
            return;
        }
        this.cart.update((cart) =>
            inCart ? cart.map((l) => (l.productId === product.id ? { ...l, qty: l.qty + 1 } : l)) : [...cart, { productId: product.id, qty: 1 }],
        );
    }

    setQty(productId: string, qty: number) {
        const product = this.productService.getById(productId);
        if (!product) return;
        const value = Math.floor(Number(qty) || 0);
        if (value <= 0) {
            this.remove(productId);
            return;
        }
        if (value > product.stock) {
            this.notify.toast(`Only ${product.stock} ${product.unit} of ${product.name} in stock`, 'warning');
        }
        const next = Math.min(value, product.stock);
        this.cart.update((cart) => cart.map((l) => (l.productId === productId ? { ...l, qty: next } : l)));
    }

    remove(productId: string) {
        this.cart.update((cart) => cart.filter((l) => l.productId !== productId));
    }

    async clearCart() {
        if (!this.cart().length) return;
        if (await this.notify.confirm('Clear the cart?', 'All items in the current sale will be removed.', 'Clear cart')) {
            this.resetSale();
        }
    }

    /** Enter in the search box: exact SKU/barcode match (scanner) or the only visible product. */
    onSearchEnter() {
        const code = this.search().trim();
        if (!code) return;
        const product = this.productService.findByCode(code) ?? (this.visibleProducts().length === 1 ? this.visibleProducts()[0] : undefined);
        if (product) {
            this.add(product);
            this.search.set('');
        } else {
            this.notify.toast(`No product found for "${code}"`, 'warning');
        }
    }

    openPayment() {
        if (!this.cart().length) return;
        this.paymentMethod.set('cash');
        this.amountPaid.set(this.totals().total);
        this.note.set('');
        this.showPayment.set(true);
    }

    completeSale() {
        if (!this.canComplete()) return;
        try {
            const order = this.salesService.checkout({
                lines: this.cart(),
                customerId: this.customerId() || undefined,
                discount: this.discountAmount(),
                paymentMethod: this.paymentMethod(),
                amountPaid: Number(this.amountPaid()) || 0,
                note: this.note(),
            });
            this.showPayment.set(false);
            this.lastOrder.set(order);
            this.resetSale();
            this.notify.success(`Sale ${order.number} completed`);
        } catch (e: any) {
            this.notify.error(e?.message ?? 'Could not complete the sale');
        }
    }

    print() {
        printReceipt();
    }

    newSale() {
        this.lastOrder.set(null);
        setTimeout(() => this.searchInput()?.nativeElement.focus());
    }

    saveCustomer() {
        const name = this.newCustomer.name.trim();
        const phone = this.newCustomer.phone.trim();
        if (!name || !phone) {
            this.customerError = 'Name and phone are required.';
            return;
        }
        if (this.customers.isPhoneTaken(phone)) {
            this.customerError = 'A customer with this phone number already exists.';
            return;
        }
        const customer = this.customers.save({ name, phone });
        this.customerId.set(customer.id);
        this.showCustomerModal.set(false);
        this.notify.success(`${customer.name} added`);
    }

    openCustomerModal() {
        this.newCustomer = { name: '', phone: '' };
        this.customerError = '';
        this.showCustomerModal.set(true);
    }

    private resetSale() {
        this.cart.set([]);
        this.customerId.set('');
        this.discountValue.set(0);
        this.discountType.set('amount');
    }
}
