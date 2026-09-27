import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { NgClass } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { IconCaretsDownComponent } from '../shared/icon/icon-carets-down';
import { AuthService } from '../core/auth.service';
import { NavIconComponent } from './nav-icon';
import { navFor } from './nav';

@Component({
    selector: 'sidebar',
    templateUrl: './sidebar.html',
    imports: [NgClass, NgScrollbarModule, RouterModule, IconCaretsDownComponent, NavIconComponent],
})
export class SidebarComponent {
    storeData = inject(Store<any>);
    private auth = inject(AuthService);

    store: any;
    readonly sections = computed(() => navFor(this.auth.isAdmin()));

    constructor() {
        this.storeData
            .select((d) => d.index)
            .subscribe((d) => {
                this.store = d;
            });
    }

    toggleMobileMenu() {
        if (window.innerWidth < 1024) {
            this.storeData.dispatch({ type: 'toggleSidebar' });
        }
    }
}
