import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { MoneyPipe } from '../core/money.pipe';
import { Product, stockStatus } from '../core/models';
import { ProductService } from '../core/services/product.service';
import { SettingsService } from '../core/services/settings.service';
import { MovaLogoComponent } from '../shared/ui/mova-logo';
import { ProductThumbComponent } from '../shared/ui/product-thumb';
import { IconSearchComponent } from '../shared/icon/icon-search';
import { IconShoppingCartComponent } from '../shared/icon/icon-shopping-cart';
import { IconLoginComponent } from '../shared/icon/icon-login';

type SortKey = 'name' | 'price-asc' | 'price-desc';

/** Public landing page: browse active products, filter by category, "Buy" leads to sign in. */
@Component({
    imports: [FormsModule, RouterLink, MoneyPipe, MovaLogoComponent, ProductThumbComponent, IconSearchComponent, IconShoppingCartComponent, IconLoginComponent],
    template: `
        <div class="min-h-screen bg-[#fafafa] dark:bg-[#060818]">
            <!-- top bar -->
            <header class="sticky top-0 z-40 border-b border-white-light bg-white/90 backdrop-blur dark:border-[#1b2e4b] dark:bg-[#0e1726]/90">
                <div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
                    <a routerLink="/" aria-label="MOVA home" class="shrink-0"><app-mova-logo [compact]="true" /></a>
                    <div class="relative ms-auto hidden w-full max-w-md md:block">
                        <input
                            type="search"
                            class="form-input ps-10"
                            placeholder="Search products…"
                            aria-label="Search products"
                            [ngModel]="search()"
                            (ngModelChange)="search.set($event)"
                        />
                        <span class="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-white-dark"><icon-search /></span>
                    </div>
                    @if (auth.isLoggedIn()) {
                        <a [routerLink]="auth.isAdmin() ? '/dashboard' : '/pos'" class="btn btn-primary ms-auto shrink-0 md:ms-0">
                            {{ auth.isAdmin() ? 'Dashboard' : 'Point of Sale' }}
                        </a>
                    } @else {
                        <a routerLink="/login" class="btn btn-primary ms-auto shrink-0 gap-2 md:ms-0"><icon-login class="h-4 w-4" /> Sign in</a>
                    }
                </div>
            </header>

            <!-- hero -->
            <section class="relative overflow-hidden">
                <div class="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-mova-cyan/20 blur-3xl"></div>
                <div class="pointer-events-none absolute -right-16 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl"></div>
                <div class="relative mx-auto max-w-7xl px-4 pb-6 pt-10 sm:px-6 sm:pt-14">
                    <p class="text-xs font-bold uppercase tracking-[0.2em] text-primary dark:text-[#b983e6]">{{ settings.settings().tagline }}</p>
                    <h1 class="mt-2 text-3xl font-extrabold text-black sm:text-4xl dark:text-white">Shop at {{ settings.settings().name }}</h1>
                    <p class="mt-2 max-w-xl text-white-dark">Browse our products, pick the categories you like, and sign in to buy.</p>

                    <!-- search on small screens -->
                    <div class="relative mt-5 md:hidden">
                        <input
                            type="search"
                            class="form-input ps-10"
                            placeholder="Search products…"
                            aria-label="Search products"
                            [ngModel]="search()"
                            (ngModelChange)="search.set($event)"
                        />
                        <span class="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-white-dark"><icon-search /></span>
                    </div>
                </div>
            </section>

            <main class="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)]">
                <!-- filters -->
                <aside class="lg:sticky lg:top-24 lg:self-start" aria-label="Filters">
                    <button
                        type="button"
                        class="btn btn-outline-primary mb-3 w-full lg:hidden"
                        [attr.aria-expanded]="showFilters()"
                        aria-controls="category-filters"
                        (click)="showFilters.set(!showFilters())"
                    >
                        {{ showFilters() ? 'Hide filters' : 'Filter by category' }}
                        @if (selected().size) {
                            <span class="badge ms-2 bg-primary">{{ selected().size }}</span>
                        }
                    </button>

                    <div id="category-filters" class="panel !rounded-xl lg:!block" [class.hidden]="!showFilters()">
                        <div class="mb-3 flex items-center justify-between">
                            <h2 class="text-base font-bold text-black dark:text-white-light">Categories</h2>
                            <button
                                type="button"
                                class="text-sm font-semibold text-primary hover:underline disabled:invisible"
                                [disabled]="!selected().size && !inStockOnly()"
                                (click)="clearFilters()"
                            >
                                Clear
                            </button>
                        </div>

                        <fieldset>
                            <legend class="sr-only">Categories</legend>
                            <ul class="space-y-1">
                                @for (c of categories(); track c.id) {
                                    <li>
                                        <label class="mb-0 flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white-light/40 dark:hover:bg-[#1b2e4b]/60">
                                            <input type="checkbox" class="form-checkbox" [checked]="selected().has(c.id)" (change)="toggleCategory(c.id)" />
                                            <span class="h-2.5 w-2.5 shrink-0 rounded-full" [style.background-color]="c.color" aria-hidden="true"></span>
                                            <span class="flex-1 font-normal text-black dark:text-white-light">{{ c.name }}</span>
                                            <span class="text-xs text-white-dark">{{ c.count }}</span>
                                        </label>
                                    </li>
                                }
                            </ul>
                        </fieldset>

                        <div class="mt-4 border-t border-white-light pt-4 dark:border-[#1b2e4b]">
                            <label class="mb-0 flex cursor-pointer items-center gap-3 px-2">
                                <input type="checkbox" class="form-checkbox" [checked]="inStockOnly()" (change)="inStockOnly.set(!inStockOnly())" />
                                <span class="font-normal text-black dark:text-white-light">In stock only</span>
                            </label>
                        </div>
                    </div>
                </aside>

                <!-- products -->
                <section aria-label="Products">
                    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p class="text-white-dark" aria-live="polite">
                            {{ visibleProducts().length }} {{ visibleProducts().length === 1 ? 'product' : 'products' }}
                            @if (selected().size) {
                                in {{ selected().size }} {{ selected().size === 1 ? 'category' : 'categories' }}
                            }
                        </p>
                        <label class="mb-0 flex items-center gap-2 font-normal">
                            <span class="text-white-dark">Sort</span>
                            <select class="form-select w-auto py-1.5" [ngModel]="sort()" (ngModelChange)="sort.set($event)">
                                <option value="name">Name</option>
                                <option value="price-asc">Price: low to high</option>
                                <option value="price-desc">Price: high to low</option>
                            </select>
                        </label>
                    </div>

                    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                        @for (p of visibleProducts(); track p.id) {
                            <article
                                class="flex flex-col overflow-hidden rounded-xl border border-white-light bg-white transition hover:shadow-lg dark:border-[#1b2e4b] dark:bg-[#0e1726]"
                            >
                                <div class="relative aspect-[4/3] w-full overflow-hidden bg-white-light/40 dark:bg-[#1b2e4b]">
                                    <app-product-thumb [name]="p.name" [image]="p.image" [color]="categoryMap().get(p.categoryId)?.color" size="lg" />
                                    @if (stockLabel(p); as label) {
                                        <span
                                            class="badge absolute start-2 top-2 shadow"
                                            [class]="label === 'Out of stock' ? 'bg-danger' : 'bg-warning'"
                                            >{{ label }}</span
                                        >
                                    }
                                </div>
                                <div class="flex flex-1 flex-col p-3">
                                    <span class="text-[11px] font-semibold uppercase tracking-wide" [style.color]="categoryMap().get(p.categoryId)?.color">
                                        {{ categoryMap().get(p.categoryId)?.name }}
                                    </span>
                                    <h3 class="mt-1 line-clamp-2 font-semibold leading-snug text-black dark:text-white-light">{{ p.name }}</h3>
                                    <div class="mt-auto flex items-center justify-between gap-2 pt-3">
                                        <span class="text-base font-bold text-primary dark:text-[#b983e6]">{{ p.price | money }}</span>
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-gradient gap-1.5 border-0 shadow-none"
                                            [disabled]="p.stock <= 0"
                                            [attr.aria-label]="'Buy ' + p.name"
                                            (click)="buy(p)"
                                        >
                                            <icon-shopping-cart class="h-4 w-4" /> Buy
                                        </button>
                                    </div>
                                </div>
                            </article>
                        } @empty {
                            <div class="panel col-span-full py-16 text-center">
                                <p class="text-white-dark">No products match your filters.</p>
                                <button type="button" class="btn btn-outline-primary mx-auto mt-4" (click)="clearFilters(); search.set('')">Show all products</button>
                            </div>
                        }
                    </div>
                </section>
            </main>

            <footer class="border-t border-white-light py-6 text-center text-xs text-white-dark dark:border-[#1b2e4b]">
                © {{ year }} {{ settings.settings().name }}
            </footer>
        </div>
    `,
})
export class StorefrontPage {
    private productService = inject(ProductService);
    private router = inject(Router);
    auth = inject(AuthService);
    settings = inject(SettingsService);

    readonly year = new Date().getFullYear();
    readonly categoryMap = this.productService.categoryMap;

    readonly search = signal('');
    readonly selected = signal<ReadonlySet<string>>(new Set());
    readonly inStockOnly = signal(false);
    readonly sort = signal<SortKey>('name');
    readonly showFilters = signal(false);

    /** Categories that have at least one product for sale, with their count. */
    readonly categories = computed(() => {
        const counts = new Map<string, number>();
        this.productService.activeProducts().forEach((p) => counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1));
        return this.productService
            .categories()
            .filter((c) => counts.has(c.id))
            .map((c) => ({ ...c, count: counts.get(c.id)! }));
    });

    readonly visibleProducts = computed(() => {
        const q = this.search().trim().toLowerCase();
        const cats = this.selected();
        const sort = this.sort();
        return this.productService
            .activeProducts()
            .filter((p) => !cats.size || cats.has(p.categoryId))
            .filter((p) => !this.inStockOnly() || p.stock > 0)
            .filter((p) => !q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
            .sort((a, b) => (sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : a.name.localeCompare(b.name)));
    });

    toggleCategory(id: string) {
        this.selected.update((set) => {
            const next = new Set(set);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    clearFilters() {
        this.selected.set(new Set());
        this.inStockOnly.set(false);
    }

    stockLabel(p: Product): string {
        const status = stockStatus(p);
        return status === 'out' ? 'Out of stock' : status === 'low' ? 'Only a few left' : '';
    }

    /** The POS is behind authGuard, so signed-out visitors land on the login page and come back with the product in the cart. */
    buy(p: Product) {
        this.router.navigate(['/pos'], { queryParams: { add: p.id } });
    }
}
