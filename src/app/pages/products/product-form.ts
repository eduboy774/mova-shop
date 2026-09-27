import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MoneyPipe } from '../../core/money.pipe';
import { NotifyService } from '../../core/notify.service';
import { SupplierService } from '../../core/services/people.service';
import { ProductService } from '../../core/services/product.service';
import { SettingsService } from '../../core/services/settings.service';
import { resizeImage } from '../../core/utils';
import { PageHeaderComponent } from '../../shared/ui/page-header';
import { ProductThumbComponent } from '../../shared/ui/product-thumb';
import { StockBadgeComponent } from '../../shared/ui/stock-badge';
import { IconRefreshComponent } from '../../shared/icon/icon-refresh';
import { IconGalleryComponent } from '../../shared/icon/icon-gallery';

const UNITS = ['pcs', 'pair', 'set', 'kg', 'g', 'litre', 'ml', 'bag', 'bottle', 'box', 'carton', 'pack', 'tube', 'dozen', 'metre'];

@Component({
    imports: [
        ReactiveFormsModule,
        RouterLink,
        MoneyPipe,
        PageHeaderComponent,
        ProductThumbComponent,
        StockBadgeComponent,
        IconRefreshComponent,
        IconGalleryComponent,
    ],
    template: `
        <app-page-header
            [title]="product() ? 'Edit product' : 'Add product'"
            [crumbs]="[{ label: 'Products', link: '/products' }, { label: product()?.name ?? 'New' }]"
        />

        @if (id() && !product()) {
            <div class="panel py-16 text-center">
                <p class="text-lg font-semibold">Product not found</p>
                <a routerLink="/products" class="btn btn-primary mx-auto mt-4 w-max">Back to products</a>
            </div>
        } @else {
            <form [formGroup]="form" (ngSubmit)="save()" class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div class="space-y-6">
                    <div class="panel space-y-5">
                        <h2 class="text-lg font-semibold dark:text-white-light">Details</h2>
                        <div [class.has-error]="invalid('name')">
                            <label for="name">Product name *</label>
                            <input id="name" type="text" class="form-input" formControlName="name" placeholder="e.g. Wireless Headphones" />
                            @if (invalid('name')) {
                                <p class="mt-1 text-danger">Product name is required.</p>
                            }
                        </div>
                        <div class="grid gap-5 sm:grid-cols-2">
                            <div [class.has-error]="invalid('sku')">
                                <label for="sku">SKU *</label>
                                <div class="flex">
                                    <input id="sku" type="text" class="form-input ltr:rounded-r-none rtl:rounded-l-none" formControlName="sku" />
                                    <button
                                        type="button"
                                        class="flex items-center border border-[#e0e6ed] bg-[#eee] px-3 font-semibold hover:text-primary dark:border-[#17263c] dark:bg-[#1b2e4b] ltr:rounded-r-md ltr:border-l-0 rtl:rounded-l-md rtl:border-r-0"
                                        title="Generate SKU"
                                        aria-label="Generate SKU"
                                        (click)="form.controls.sku.setValue(products.nextSku())"
                                    >
                                        <icon-refresh class="h-4 w-4" />
                                    </button>
                                </div>
                                @if (invalid('sku')) {
                                    <p class="mt-1 text-danger">{{ form.controls.sku.hasError('taken') ? 'This SKU is already used.' : 'SKU is required.' }}</p>
                                }
                            </div>
                            <div [class.has-error]="invalid('barcode')">
                                <label for="barcode">Barcode</label>
                                <input id="barcode" type="text" class="form-input" formControlName="barcode" placeholder="Scan or type" />
                                @if (invalid('barcode')) {
                                    <p class="mt-1 text-danger">This barcode is already used.</p>
                                }
                            </div>
                        </div>
                        <div class="grid gap-5 sm:grid-cols-2">
                            <div [class.has-error]="invalid('categoryId')">
                                <label for="category">Category *</label>
                                <select id="category" class="form-select" formControlName="categoryId">
                                    <option value="">Select category</option>
                                    @for (c of products.categories(); track c.id) {
                                        <option [value]="c.id">{{ c.name }}</option>
                                    }
                                </select>
                                @if (invalid('categoryId')) {
                                    <p class="mt-1 text-danger">Choose a category. <a routerLink="/categories" class="underline">Manage categories</a></p>
                                }
                            </div>
                            <div>
                                <label for="supplier">Supplier</label>
                                <select id="supplier" class="form-select" formControlName="supplierId">
                                    <option value="">None</option>
                                    @for (s of suppliers.suppliers(); track s.id) {
                                        <option [value]="s.id">{{ s.name }}</option>
                                    }
                                </select>
                            </div>
                        </div>
                        <div>
                            <label for="description">Description</label>
                            <textarea id="description" rows="3" class="form-textarea" formControlName="description"></textarea>
                        </div>
                    </div>

                    <div class="panel space-y-5">
                        <h2 class="text-lg font-semibold dark:text-white-light">Pricing</h2>
                        <div class="grid gap-5 sm:grid-cols-3">
                            <div [class.has-error]="invalid('cost')">
                                <label for="cost">Cost price ({{ settings.currency() }}) *</label>
                                <input id="cost" type="number" min="0" step="any" class="form-input" formControlName="cost" />
                                @if (invalid('cost')) {
                                    <p class="mt-1 text-danger">Enter 0 or more.</p>
                                }
                            </div>
                            <div [class.has-error]="invalid('price')">
                                <label for="price">Selling price ({{ settings.currency() }}) *</label>
                                <input id="price" type="number" min="0" step="any" class="form-input" formControlName="price" />
                                @if (invalid('price')) {
                                    <p class="mt-1 text-danger">Enter 0 or more.</p>
                                }
                            </div>
                            <div>
                                <p class="mb-2 font-semibold">Profit / margin</p>
                                <p
                                    class="rounded-md border border-white-light px-4 py-2 font-semibold dark:border-[#17263c]"
                                    [class]="profit() < 0 ? 'text-danger' : 'text-success'"
                                >
                                    {{ profit() | money }} · {{ margin() }}%
                                </p>
                            </div>
                        </div>
                        @if (profit() < 0) {
                            <p class="text-warning">Selling price is below cost: every sale loses money.</p>
                        }
                    </div>

                    <div class="panel space-y-5">
                        <h2 class="text-lg font-semibold dark:text-white-light">Inventory</h2>
                        <div class="grid gap-5 sm:grid-cols-3">
                            <div [class.has-error]="invalid('stock')">
                                <label for="stock">{{ product() ? 'Current stock' : 'Opening stock' }}</label>
                                <input id="stock" type="number" min="0" step="1" class="form-input" formControlName="stock" />
                                @if (product()) {
                                    <p class="mt-1 text-xs text-white-dark">
                                        Change stock from <a routerLink="/inventory" [queryParams]="{ q: product()!.sku }" class="text-primary">Inventory</a> so
                                        it is logged.
                                    </p>
                                } @else if (invalid('stock')) {
                                    <p class="mt-1 text-danger">Enter a whole number, 0 or more.</p>
                                }
                            </div>
                            <div [class.has-error]="invalid('reorderLevel')">
                                <label for="reorder">Low-stock alert at</label>
                                <input id="reorder" type="number" min="0" step="1" class="form-input" formControlName="reorderLevel" />
                                @if (invalid('reorderLevel')) {
                                    <p class="mt-1 text-danger">Enter a whole number, 0 or more.</p>
                                }
                            </div>
                            <div>
                                <label for="unit">Unit</label>
                                <select id="unit" class="form-select" formControlName="unit">
                                    @for (u of units; track u) {
                                        <option [value]="u">{{ u }}</option>
                                    }
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-6">
                    <div class="panel">
                        <h2 class="mb-4 text-lg font-semibold dark:text-white-light">Image</h2>
                        <div
                            class="aspect-square w-full overflow-hidden rounded-lg border border-dashed border-white-light bg-white-light/30 dark:border-[#1b2e4b] dark:bg-[#1b2e4b]/40"
                        >
                            @if (image()) {
                                <img [src]="image()" alt="Product image" class="h-full w-full object-cover" />
                            } @else {
                                <div class="grid h-full place-content-center text-center text-white-dark">
                                    <icon-gallery class="mx-auto mb-2 h-10 w-10" />
                                    <p class="text-xs">No image</p>
                                </div>
                            }
                        </div>
                        <div class="mt-3 flex gap-2">
                            <label class="btn btn-outline-primary mb-0 flex-1 cursor-pointer">
                                {{ image() ? 'Change image' : 'Upload image' }}
                                <input type="file" accept="image/*" class="sr-only" (change)="onImage($event)" />
                            </label>
                            @if (image()) {
                                <button type="button" class="btn btn-outline-danger" (click)="image.set(undefined)">Remove</button>
                            }
                        </div>
                    </div>

                    <div class="panel space-y-4">
                        <label class="mb-0 flex cursor-pointer items-center gap-3">
                            <input type="checkbox" class="form-checkbox" formControlName="active" />
                            <span>
                                <span class="block font-semibold">Active</span>
                                <span class="text-xs text-white-dark">Inactive products are hidden from the POS.</span>
                            </span>
                        </label>
                        @if (product(); as p) {
                            <div class="flex items-center justify-between border-t border-white-light pt-4 dark:border-[#1b2e4b]">
                                <span class="text-white-dark">Stock status</span>
                                <app-stock-badge [stock]="p.stock" [reorderLevel]="p.reorderLevel" [unit]="p.unit" />
                            </div>
                        }
                        <div class="flex gap-2 border-t border-white-light pt-4 dark:border-[#1b2e4b]">
                            <a routerLink="/products" class="btn btn-outline-danger flex-1">Cancel</a>
                            <button type="submit" class="btn btn-primary flex-1">{{ product() ? 'Save changes' : 'Add product' }}</button>
                        </div>
                    </div>

                    <div class="panel">
                        <p class="mb-3 text-xs uppercase text-white-dark">POS preview</p>
                        <div class="mx-auto flex w-40 flex-col overflow-hidden rounded-lg border border-white-light dark:border-[#1b2e4b]">
                            <div class="aspect-[4/3]">
                                <app-product-thumb [name]="form.controls.name.value || 'New product'" [image]="image()" [color]="categoryColor()" size="lg" />
                            </div>
                            <div class="p-2.5">
                                <p class="line-clamp-2 text-[13px] font-semibold">{{ form.controls.name.value || 'New product' }}</p>
                                <p class="mt-1 font-bold text-primary dark:text-[#b983e6]">{{ values().price || 0 | money }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        }
    `,
})
export class ProductFormPage implements OnInit {
    products = inject(ProductService);
    suppliers = inject(SupplierService);
    settings = inject(SettingsService);
    private notify = inject(NotifyService);
    private router = inject(Router);
    private fb = inject(FormBuilder);

    /** Route param (edit mode only) */
    readonly id = input<string>();
    readonly product = computed(() => (this.id() ? this.products.getById(this.id()!) : undefined));
    units: string[] = UNITS;
    readonly image = signal<string | undefined>(undefined);
    readonly submitted = signal(false);

    readonly form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        sku: ['', [Validators.required, (c: AbstractControl) => this.uniqueSku(c)]],
        barcode: ['', (c: AbstractControl) => this.uniqueBarcode(c)],
        categoryId: ['', Validators.required],
        supplierId: [''],
        description: [''],
        cost: [0, [Validators.required, Validators.min(0)]],
        price: [0, [Validators.required, Validators.min(0)]],
        stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
        reorderLevel: [10, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
        unit: ['pcs'],
        active: [true],
    });

    readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
    readonly profit = computed(() => (Number(this.values().price) || 0) - (Number(this.values().cost) || 0));
    readonly margin = computed(() => {
        const price = Number(this.values().price) || 0;
        return price ? Math.round((this.profit() / price) * 100) : 0;
    });
    readonly categoryColor = computed(() => this.products.categoryMap().get(this.values().categoryId ?? '')?.color);

    ngOnInit() {
        const p = this.product();
        if (p) {
            this.form.reset({
                name: p.name,
                sku: p.sku,
                barcode: p.barcode ?? '',
                categoryId: p.categoryId,
                supplierId: p.supplierId ?? '',
                description: p.description ?? '',
                cost: p.cost,
                price: p.price,
                stock: p.stock,
                reorderLevel: p.reorderLevel,
                unit: p.unit,
                active: p.active,
            });
            this.form.controls.stock.disable();
            this.image.set(p.image);
            if (!UNITS.includes(p.unit)) this.units = [...UNITS, p.unit];
        } else {
            this.form.patchValue({ sku: this.products.nextSku(), reorderLevel: this.settings.settings().defaultReorderLevel });
        }
    }

    invalid(name: string) {
        const c = this.form.get(name)!;
        return c.invalid && (c.touched || this.submitted());
    }

    async onImage(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        (event.target as HTMLInputElement).value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            this.notify.error('Please choose an image file');
            return;
        }
        try {
            this.image.set(await resizeImage(file));
        } catch {
            this.notify.error('Could not read this image');
        }
    }

    save() {
        this.submitted.set(true);
        this.form.markAllAsTouched();
        if (this.form.invalid) {
            this.notify.error('Please fix the highlighted fields');
            return;
        }
        const v = this.form.getRawValue();
        const data = {
            name: v.name.trim(),
            sku: v.sku.trim(),
            barcode: v.barcode.trim() || undefined,
            categoryId: v.categoryId,
            supplierId: v.supplierId || undefined,
            description: v.description.trim() || undefined,
            cost: Number(v.cost),
            price: Number(v.price),
            reorderLevel: Number(v.reorderLevel),
            unit: v.unit,
            active: v.active,
            image: this.image(),
        };
        const existing = this.product();
        if (existing) {
            this.products.update(existing.id, data);
            this.notify.success('Product updated');
        } else {
            this.products.create({ ...data, stock: Number(v.stock) });
            this.notify.success('Product added');
        }
        this.router.navigate(['/products']);
    }

    private uniqueSku(c: AbstractControl): ValidationErrors | null {
        return c.value && this.products.isSkuTaken(c.value, this.id()) ? { taken: true } : null;
    }

    private uniqueBarcode(c: AbstractControl): ValidationErrors | null {
        return c.value && this.products.isBarcodeTaken(c.value, this.id()) ? { taken: true } : null;
    }
}
