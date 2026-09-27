import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { DbService } from '../../core/db.service';
import { Role, User } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { UserService } from '../../core/services/people.service';
import { CURRENCIES, SettingsService } from '../../core/services/settings.service';
import { downloadFile, toDateKey } from '../../core/utils';
import { ModalComponent } from '../../shared/ui/modal';
import { PageHeaderComponent } from '../../shared/ui/page-header';
import { IconPlusComponent } from '../../shared/icon/icon-plus';
import { IconPencilComponent } from '../../shared/icon/icon-pencil';
import { IconTrashLinesComponent } from '../../shared/icon/icon-trash-lines';

type Tab = 'shop' | 'users' | 'data';

@Component({
    templateUrl: './settings.html',
    imports: [ReactiveFormsModule, DatePipe, ModalComponent, PageHeaderComponent, IconPlusComponent, IconPencilComponent, IconTrashLinesComponent],
})
export class SettingsPage implements OnInit {
    private fb = inject(FormBuilder);
    private settingsService = inject(SettingsService);
    private db = inject(DbService);
    private notify = inject(NotifyService);
    auth = inject(AuthService);
    users = inject(UserService);

    readonly tabs: { value: Tab; label: string }[] = [
        { value: 'shop', label: 'Shop & receipts' },
        { value: 'users', label: 'Users' },
        { value: 'data', label: 'Data & backup' },
    ];
    readonly tab = signal<Tab>('shop');
    readonly currencies = CURRENCIES;
    readonly shopSubmitted = signal(false);

    readonly shopForm = this.fb.nonNullable.group({
        name: ['', Validators.required],
        tagline: [''],
        address: [''],
        phone: [''],
        email: ['', Validators.email],
        currency: ['USD', Validators.required],
        taxRate: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
        defaultReorderLevel: [10, [Validators.required, Validators.min(0)]],
        receiptFooter: [''],
    });

    readonly counts = computed(() => {
        const db = this.db.db();
        return [
            { label: 'Products', value: db.products.length },
            { label: 'Categories', value: db.categories.length },
            { label: 'Customers', value: db.customers.length },
            { label: 'Suppliers', value: db.suppliers.length },
            { label: 'Orders', value: db.orders.length },
            { label: 'Purchase orders', value: db.purchases.length },
            { label: 'Stock movements', value: db.movements.length },
            { label: 'Users', value: db.users.length },
        ];
    });
    readonly storageSize = computed(() => {
        const bytes = new Blob([JSON.stringify(this.db.db())]).size;
        return bytes > 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(2) + ' MB' : Math.round(bytes / 1024) + ' KB';
    });

    // users
    readonly showUserForm = signal(false);
    readonly editingUser = signal<User | null>(null);
    readonly userSubmitted = signal(false);
    readonly userError = signal('');
    readonly userForm = this.fb.nonNullable.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: [''],
        role: ['cashier' as Role],
        active: [true],
    });

    ngOnInit() {
        this.shopForm.reset({ ...this.settingsService.settings() });
    }

    saveShop() {
        this.shopSubmitted.set(true);
        if (this.shopForm.invalid) return;
        const v = this.shopForm.getRawValue();
        this.settingsService.save({ ...v, name: v.name.trim(), taxRate: Number(v.taxRate), defaultReorderLevel: Number(v.defaultReorderLevel) });
        this.notify.success('Settings saved');
    }

    shopInvalid(name: string) {
        const c = this.shopForm.get(name)!;
        return c.invalid && (c.touched || this.shopSubmitted());
    }

    openUser(u?: User) {
        this.editingUser.set(u ?? null);
        this.userSubmitted.set(false);
        this.userError.set('');
        this.userForm.reset({ name: u?.name ?? '', email: u?.email ?? '', password: '', role: u?.role ?? 'cashier', active: u?.active ?? true });
        this.showUserForm.set(true);
    }

    saveUser() {
        this.userSubmitted.set(true);
        this.userError.set('');
        if (this.userForm.invalid) return;
        const v = this.userForm.getRawValue();
        const editing = this.editingUser();
        if (!editing && v.password.length < 6) return this.userError.set('Password must be at least 6 characters.');
        if (editing && v.password && v.password.length < 6) return this.userError.set('New password must be at least 6 characters.');
        if (this.users.isEmailTaken(v.email, editing?.id)) return this.userError.set('Another user already uses this email.');
        if (editing?.id === this.auth.user()?.id && (!v.active || v.role !== 'admin')) {
            return this.userError.set('You cannot remove your own admin access or disable your own account.');
        }
        try {
            this.users.save({ name: v.name.trim(), email: v.email.trim(), password: v.password, role: v.role, active: v.active }, editing?.id);
            this.notify.success(editing ? 'User updated' : 'User added');
            this.showUserForm.set(false);
        } catch (e: any) {
            this.userError.set(e.message);
        }
    }

    async deleteUser(u: User) {
        if (u.id === this.auth.user()?.id) return this.notify.error('You cannot delete your own account');
        if (!(await this.notify.confirm(`Delete ${u.name}?`, 'They will no longer be able to sign in. Their past sales stay in reports.', 'Delete'))) return;
        try {
            this.users.delete(u.id);
            this.notify.success('User deleted');
        } catch (e: any) {
            this.notify.error(e.message);
        }
    }

    exportBackup() {
        downloadFile(`mova-shop-backup-${toDateKey(new Date())}.json`, this.db.exportJson(), 'application/json');
        this.notify.success('Backup downloaded');
    }

    async importBackup(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;
        if (!(await this.notify.confirm('Restore this backup?', 'All current data in this browser will be replaced by the backup file.', 'Restore'))) return;
        try {
            this.db.importJson(await file.text());
            this.notify.success('Backup restored');
            this.ngOnInit();
            if (!this.auth.user()) this.auth.logout();
        } catch (e: any) {
            this.notify.error(e?.message ?? 'Invalid backup file');
        }
    }

    async resetDemo() {
        if (
            !(await this.notify.confirm(
                'Load demo data?',
                'All current data will be replaced with sample products, customers and 60 days of sales.',
                'Load demo data',
            ))
        )
            return;
        this.db.resetToDemo();
        this.notify.success('Demo data loaded');
        this.ngOnInit();
        if (!this.auth.user()) this.auth.logout();
    }

    async clearData() {
        const ok = await this.notify.confirm(
            'Start with an empty shop?',
            'This deletes ALL products, categories, customers, suppliers, orders and stock history. Settings and user accounts are kept. Export a backup first if unsure.',
            'Delete everything',
        );
        if (!ok) return;
        this.db.clearBusinessData();
        this.notify.success('Shop data cleared');
    }
}
