import { Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { MenuModule } from 'headlessui-angular';
import { toggleAnimation } from '../shared/animations';
import { IconMenuComponent } from '../shared/icon/icon-menu';
import { IconSearchComponent } from '../shared/icon/icon-search';
import { IconXCircleComponent } from '../shared/icon/icon-x-circle';
import { IconSunComponent } from '../shared/icon/icon-sun';
import { IconMoonComponent } from '../shared/icon/icon-moon';
import { IconLaptopComponent } from '../shared/icon/icon-laptop';
import { IconBellBingComponent } from '../shared/icon/icon-bell-bing';
import { IconInfoCircleComponent } from '../shared/icon/icon-info-circle';
import { IconSettingsComponent } from '../shared/icon/icon-settings';
import { IconLogoutComponent } from '../shared/icon/icon-logout';
import { IconPlusComponent } from '../shared/icon/icon-plus';
import { IconCaretDownComponent } from '../shared/icon/icon-caret-down';
import { AuthService } from '../core/auth.service';
import { ProductService } from '../core/services/product.service';
import { SettingsService } from '../core/services/settings.service';
import { StockBadgeComponent } from '../shared/ui/stock-badge';
import { NavIconComponent } from './nav-icon';
import { navFor } from './nav';

@Component({
    selector: 'header',
    templateUrl: './header.html',
    animations: [toggleAnimation],
    imports: [
        NgClass,
        FormsModule,
        MenuModule,
        RouterModule,
        IconMenuComponent,
        IconSearchComponent,
        IconXCircleComponent,
        IconSunComponent,
        IconMoonComponent,
        IconLaptopComponent,
        IconBellBingComponent,
        IconInfoCircleComponent,
        IconSettingsComponent,
        IconLogoutComponent,
        IconPlusComponent,
        IconCaretDownComponent,
        StockBadgeComponent,
        NavIconComponent,
    ],
})
export class HeaderComponent {
    storeData = inject(Store<any>);
    auth = inject(AuthService);
    settings = inject(SettingsService);
    private products = inject(ProductService);
    private router = inject(Router);

    store: any;
    search = false;
    query = '';

    readonly sections = computed(() => navFor(this.auth.isAdmin()));
    readonly lowStock = computed(() => (this.auth.isAdmin() ? this.products.lowStock() : []));
    readonly initials = computed(() =>
        (this.auth.user()?.name ?? '?')
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join(''),
    );

    constructor() {
        this.storeData
            .select((d) => d.index)
            .subscribe((d) => {
                this.store = d;
            });
    }

    /** Admins search the product catalog; cashiers search orders. */
    submitSearch() {
        const q = this.query.trim();
        this.search = false;
        if (!q) return;
        this.router.navigate([this.auth.isAdmin() ? '/products' : '/orders'], { queryParams: { q } });
        this.query = '';
    }
}
