import { Component, input } from '@angular/core';
import { IconArchiveComponent } from '../shared/icon/icon-archive';
import { IconBarChartComponent } from '../shared/icon/icon-bar-chart';
import { IconBoxComponent } from '../shared/icon/icon-box';
import { IconSettingsComponent } from '../shared/icon/icon-settings';
import { IconShoppingBagComponent } from '../shared/icon/icon-shopping-bag';
import { IconShoppingCartComponent } from '../shared/icon/icon-shopping-cart';
import { IconTagComponent } from '../shared/icon/icon-tag';
import { IconUsersComponent } from '../shared/icon/icon-users';
import { IconUsersGroupComponent } from '../shared/icon/icon-users-group';
import { IconMenuDashboardComponent } from '../shared/icon/menu/icon-menu-dashboard';
import { IconMenuInvoiceComponent } from '../shared/icon/menu/icon-menu-invoice';
import { NavIcon } from './nav';

@Component({
    selector: 'app-nav-icon',
    imports: [
        IconMenuDashboardComponent,
        IconShoppingCartComponent,
        IconMenuInvoiceComponent,
        IconUsersComponent,
        IconBoxComponent,
        IconTagComponent,
        IconArchiveComponent,
        IconShoppingBagComponent,
        IconUsersGroupComponent,
        IconBarChartComponent,
        IconSettingsComponent,
    ],
    template: `
        @switch (name()) {
            @case ('dashboard') {
                <icon-menu-dashboard [class]="cls()" />
            }
            @case ('pos') {
                <icon-shopping-cart [class]="cls()" />
            }
            @case ('orders') {
                <icon-menu-invoice [class]="cls()" />
            }
            @case ('customers') {
                <icon-users [class]="cls()" />
            }
            @case ('products') {
                <icon-box [class]="cls()" />
            }
            @case ('categories') {
                <icon-tag [class]="cls()" />
            }
            @case ('inventory') {
                <icon-archive [class]="cls()" />
            }
            @case ('purchases') {
                <icon-shopping-bag [class]="cls()" />
            }
            @case ('suppliers') {
                <icon-users-group [class]="cls()" />
            }
            @case ('reports') {
                <icon-bar-chart [class]="cls()" />
            }
            @case ('settings') {
                <icon-settings [class]="cls()" />
            }
        }
    `,
    host: { class: 'contents' },
})
export class NavIconComponent {
    readonly name = input.required<NavIcon>();
    readonly cls = input('h-5 w-5 shrink-0');
}
