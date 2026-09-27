import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MoneyPipe } from '../../core/money.pipe';
import { Product, stockStatus } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { ProductService } from '../../core/services/product.service';
import { downloadFile, toCsv, toDateKey } from '../../core/utils';
import { PageHeaderComponent } from '../../shared/ui/page-header';
import { PaginationComponent, paginate } from '../../shared/ui/pagination';
import { ProductThumbComponent } from '../../shared/ui/product-thumb';
import { StockBadgeComponent } from '../../shared/ui/stock-badge';
import { IconPlusComponent } from '../../shared/icon/icon-plus';
import { IconPencilComponent } from '../../shared/icon/icon-pencil';
import { IconTrashLinesComponent } from '../../shared/icon/icon-trash-lines';
import { IconDownloadComponent } from '../../shared/icon/icon-download';

@Component({
    imports: [
        FormsModule,
        RouterLink,
        MoneyPipe,
        PageHeaderComponent,
        PaginationComponent,
        ProductThumbComponent,
        StockBadgeComponent,
        IconPlusComponent,
        IconPencilComponent,
        IconTrashLinesComponent,
        IconDownloadComponent,
    ],
    template: `
        <app-page-header title="Products" [crumbs]="[{ label: 'Catalog' }, { label: 'Products' }]">
            <button type="button" class="btn btn-outline-primary gap-1.5" (click)="exportCsv()"><icon-download class="h-4 w-4" /> Export CSV</button>
            <a routerLink="/products/new" class="btn btn-primary gap-1.5"><icon-plus class="h-4 w-4" /> Add product</a>
        </app-page-header>

        <div class="panel">
            <div class="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input
                    type="search"
                    class="form-input lg:col-span-2"
                    placeholder="Search name, SKU or barcode…"
                    aria-label="Search products"
                    [ngModel]="q()"
                    (ngModelChange)="q.set($event); page.set(1)"
                />
                <select class="form-select" aria-label="Category" [ngModel]="categoryId()" (ngModelChange)="categoryId.set($event); page.set(1)">
                    <option value="">All categories</option>
                    @for (c of products.categories(); track c.id) {
                        <option [value]="c.id">{{ c.name }}</option>
                    }
                </select>
                <select class="form-select" aria-label="Stock status" [ngModel]="stock()" (ngModelChange)="stock.set($event); page.set(1)">
                    <option value="">All stock levels</option>
                    <option value="in">In stock</option>
                    <option value="low">Low stock</option>
                    <option value="out">Out of stock</option>
                    <option value="inactive">Inactive products</option>
                </select>
            </div>

            <div class="table-responsive">
                <table class="table-hover">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th class="text-right">Cost</th>
                            <th class="text-right">Price</th>
                            <th class="text-right">Margin</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th class="w-px"><span class="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (p of pageItems(); track p.id) {
                            <tr [class.opacity-60]="!p.active">
                                <td>
                                    <a [routerLink]="['/products', p.id, 'edit']" class="flex items-center gap-3 hover:text-primary">
                                        <app-product-thumb [name]="p.name" [image]="p.image" [color]="products.categoryMap().get(p.categoryId)?.color" />
                                        <span class="font-semibold">{{ p.name }}</span>
                                    </a>
                                </td>
                                <td class="whitespace-nowrap">{{ p.sku }}</td>
                                <td class="whitespace-nowrap">
                                    <span class="inline-flex items-center gap-1.5">
                                        <span class="h-2 w-2 rounded-full" [style.background-color]="products.categoryMap().get(p.categoryId)?.color"></span>
                                        {{ products.categoryMap().get(p.categoryId)?.name ?? '—' }}
                                    </span>
                                </td>
                                <td class="whitespace-nowrap text-right">{{ p.cost | money }}</td>
                                <td class="whitespace-nowrap text-right font-semibold">{{ p.price | money }}</td>
                                <td class="text-right" [class]="margin(p) < 0 ? 'text-danger' : 'text-success'">{{ margin(p) }}%</td>
                                <td><app-stock-badge [stock]="p.stock" [reorderLevel]="p.reorderLevel" [unit]="p.unit" /></td>
                                <td>
                                    <label
                                        class="relative mb-0 inline-block h-6 w-11 cursor-pointer align-middle"
                                        [title]="p.active ? 'Active: shown in POS' : 'Inactive: hidden from POS'"
                                    >
                                        <input
                                            type="checkbox"
                                            class="peer absolute z-10 h-full w-full cursor-pointer opacity-0"
                                            [attr.aria-label]="'Active: ' + p.name"
                                            [checked]="p.active"
                                            (change)="products.setActive(p.id, $any($event.target).checked)"
                                        />
                                        <span
                                            class="block h-full rounded-full bg-[#ebedf2] before:absolute before:bottom-1 before:left-1 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-all before:duration-300 peer-checked:bg-primary peer-checked:before:left-6 dark:bg-dark"
                                        ></span>
                                    </label>
                                </td>
                                <td>
                                    <div class="flex items-center gap-3">
                                        <a [routerLink]="['/products', p.id, 'edit']" class="hover:text-info" [attr.aria-label]="'Edit ' + p.name"
                                            ><icon-pencil class="h-5 w-5"
                                        /></a>
                                        <button type="button" class="hover:text-danger" [attr.aria-label]="'Delete ' + p.name" (click)="remove(p)">
                                            <icon-trash-lines class="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        } @empty {
                            <tr>
                                <td colspan="9" class="!py-10 text-center text-white-dark">
                                    No products found. <a routerLink="/products/new" class="text-primary">Add a product</a>.
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
            <app-pagination [total]="filtered().length" [pageSize]="pageSize" [(page)]="page" label="products" />
        </div>
    `,
})
export class ProductListPage {
    products = inject(ProductService);
    private notify = inject(NotifyService);
    private route = inject(ActivatedRoute);

    readonly pageSize = 12;
    readonly q = signal('');
    readonly categoryId = signal('');
    readonly stock = signal('');
    readonly page = signal(1);

    readonly filtered = computed(() => {
        const q = this.q().trim().toLowerCase();
        const stock = this.stock();
        return [...this.products.products()]
            .filter((p) => !this.categoryId() || p.categoryId === this.categoryId())
            .filter((p) => {
                if (!stock) return true;
                if (stock === 'inactive') return !p.active;
                return p.active && stockStatus(p) === stock;
            })
            .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode?.includes(q))
            .sort((a, b) => a.name.localeCompare(b.name));
    });
    readonly pageItems = computed(() => paginate(this.filtered(), this.page(), this.pageSize));

    constructor() {
        this.route.queryParamMap.subscribe((params) => {
            const q = params.get('q');
            const category = params.get('category');
            if (q !== null) this.q.set(q);
            if (category !== null) this.categoryId.set(category);
            this.page.set(1);
        });
        effect(() => {
            const pages = Math.max(1, Math.ceil(this.filtered().length / this.pageSize));
            if (this.page() > pages) this.page.set(pages);
        });
    }

    margin(p: Product) {
        return p.price ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
    }

    async remove(p: Product) {
        const ok = await this.notify.confirm(
            `Delete ${p.name}?`,
            'Past orders keep their copy of this product. Tip: switch it to inactive instead if you may sell it again.',
            'Delete product',
        );
        if (!ok) return;
        this.products.delete(p.id);
        this.notify.success('Product deleted');
    }

    exportCsv() {
        const cats = this.products.categoryMap();
        const rows: (string | number)[][] = [['Name', 'SKU', 'Barcode', 'Category', 'Cost', 'Price', 'Stock', 'Unit', 'Reorder level', 'Active']];
        this.filtered().forEach((p) =>
            rows.push([
                p.name,
                p.sku,
                p.barcode ?? '',
                cats.get(p.categoryId)?.name ?? '',
                p.cost,
                p.price,
                p.stock,
                p.unit,
                p.reorderLevel,
                p.active ? 'yes' : 'no',
            ]),
        );
        downloadFile(`products-${toDateKey(new Date())}.csv`, toCsv(rows), 'text/csv');
    }
}
