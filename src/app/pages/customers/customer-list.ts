import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Customer } from '../../core/models';
import { MoneyPipe } from '../../core/money.pipe';
import { NotifyService } from '../../core/notify.service';
import { CustomerService } from '../../core/services/people.service';
import { ModalComponent } from '../../shared/ui/modal';
import { PageHeaderComponent } from '../../shared/ui/page-header';
import { PaginationComponent, paginate } from '../../shared/ui/pagination';
import { IconPlusComponent } from '../../shared/icon/icon-plus';
import { IconPencilComponent } from '../../shared/icon/icon-pencil';
import { IconTrashLinesComponent } from '../../shared/icon/icon-trash-lines';
import { IconEyeComponent } from '../../shared/icon/icon-eye';

@Component({
    imports: [
        FormsModule,
        ReactiveFormsModule,
        RouterLink,
        DatePipe,
        MoneyPipe,
        ModalComponent,
        PageHeaderComponent,
        PaginationComponent,
        IconPlusComponent,
        IconPencilComponent,
        IconTrashLinesComponent,
        IconEyeComponent,
    ],
    template: `
        <app-page-header title="Customers" [crumbs]="[{ label: 'Sales' }, { label: 'Customers' }]">
            <button type="button" class="btn btn-primary gap-1.5" (click)="openForm()"><icon-plus class="h-4 w-4" /> Add customer</button>
        </app-page-header>

        <div class="panel">
            <input
                type="search"
                class="form-input mb-5 max-w-sm"
                placeholder="Search name, phone or email…"
                aria-label="Search customers"
                [ngModel]="q()"
                (ngModelChange)="q.set($event); page.set(1)"
            />
            <div class="table-responsive">
                <table class="table-hover">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th class="text-right">Orders</th>
                            <th class="text-right">Total spent</th>
                            <th>Last visit</th>
                            <th class="w-px"><span class="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (c of pageItems(); track c.id) {
                            <tr>
                                <td>
                                    <a [routerLink]="['/customers', c.id]" class="flex items-center gap-3 font-semibold hover:text-primary">
                                        <span
                                            class="grid h-8 w-8 shrink-0 place-content-center rounded-full bg-info-light text-xs font-bold text-info dark:bg-info-dark-light"
                                            >{{ initials(c.name) }}</span
                                        >
                                        {{ c.name }}
                                    </a>
                                </td>
                                <td class="whitespace-nowrap">{{ c.phone }}</td>
                                <td>{{ c.email || '—' }}</td>
                                <td class="text-right">{{ stats().get(c.id)?.orders ?? 0 }}</td>
                                <td class="whitespace-nowrap text-right font-semibold">{{ stats().get(c.id)?.spent ?? 0 | money }}</td>
                                <td class="whitespace-nowrap">{{ stats().get(c.id)?.lastVisit ? (stats().get(c.id)?.lastVisit | date: 'MMM d, y') : '—' }}</td>
                                <td>
                                    <div class="flex items-center gap-3">
                                        <a [routerLink]="['/customers', c.id]" class="hover:text-primary" [attr.aria-label]="'View ' + c.name"
                                            ><icon-eye class="h-5 w-5"
                                        /></a>
                                        <button type="button" class="hover:text-info" [attr.aria-label]="'Edit ' + c.name" (click)="openForm(c)">
                                            <icon-pencil class="h-5 w-5" />
                                        </button>
                                        @if (auth.isAdmin()) {
                                            <button type="button" class="hover:text-danger" [attr.aria-label]="'Delete ' + c.name" (click)="remove(c)">
                                                <icon-trash-lines class="h-5 w-5" />
                                            </button>
                                        }
                                    </div>
                                </td>
                            </tr>
                        } @empty {
                            <tr>
                                <td colspan="7" class="!py-10 text-center text-white-dark">No customers found.</td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
            <app-pagination [total]="filtered().length" [pageSize]="pageSize" [(page)]="page" label="customers" />
        </div>

        <app-modal [open]="showForm()" [title]="editing() ? 'Edit customer' : 'Add customer'" (closed)="showForm.set(false)">
            <form [formGroup]="form" (ngSubmit)="save()" class="space-y-4">
                <div [class.has-error]="submitted() && form.controls.name.invalid">
                    <label for="name">Name *</label>
                    <input id="name" type="text" class="form-input" formControlName="name" />
                    @if (submitted() && form.controls.name.invalid) {
                        <p class="mt-1 text-danger">Name is required.</p>
                    }
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div [class.has-error]="submitted() && (form.controls.phone.invalid || phoneTaken())">
                        <label for="phone">Phone *</label>
                        <input id="phone" type="tel" class="form-input" formControlName="phone" />
                        @if (submitted() && form.controls.phone.invalid) {
                            <p class="mt-1 text-danger">Phone is required.</p>
                        } @else if (submitted() && phoneTaken()) {
                            <p class="mt-1 text-danger">Another customer uses this phone.</p>
                        }
                    </div>
                    <div [class.has-error]="submitted() && form.controls.email.invalid">
                        <label for="email">Email</label>
                        <input id="email" type="email" class="form-input" formControlName="email" />
                        @if (submitted() && form.controls.email.invalid) {
                            <p class="mt-1 text-danger">Enter a valid email.</p>
                        }
                    </div>
                </div>
                <div>
                    <label for="address">Address</label>
                    <input id="address" type="text" class="form-input" formControlName="address" />
                </div>
                <div>
                    <label for="notes">Notes</label>
                    <textarea id="notes" rows="2" class="form-textarea" formControlName="notes"></textarea>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" class="btn btn-outline-danger" (click)="showForm.set(false)">Cancel</button>
                    <button type="submit" class="btn btn-primary">{{ editing() ? 'Save changes' : 'Add customer' }}</button>
                </div>
            </form>
        </app-modal>
    `,
})
export class CustomerListPage {
    private customers = inject(CustomerService);
    private notify = inject(NotifyService);
    private fb = inject(FormBuilder);
    auth = inject(AuthService);

    readonly pageSize = 15;
    readonly q = signal('');
    readonly page = signal(1);
    readonly stats = this.customers.stats;

    readonly filtered = computed(() => {
        const q = this.q().trim().toLowerCase();
        return this.customers
            .customers()
            .filter(
                (c) =>
                    !q || c.name.toLowerCase().includes(q) || c.phone.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) || c.email?.toLowerCase().includes(q),
            );
    });
    readonly pageItems = computed(() => paginate(this.filtered(), this.page(), this.pageSize));

    readonly showForm = signal(false);
    readonly editing = signal<Customer | null>(null);
    readonly submitted = signal(false);
    readonly form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        phone: ['', Validators.required],
        email: ['', Validators.email],
        address: [''],
        notes: [''],
    });

    constructor() {
        effect(() => {
            const pages = Math.max(1, Math.ceil(this.filtered().length / this.pageSize));
            if (this.page() > pages) this.page.set(pages);
        });
    }

    initials(name: string) {
        return name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join('');
    }

    phoneTaken() {
        return this.customers.isPhoneTaken(this.form.controls.phone.value, this.editing()?.id);
    }

    openForm(customer?: Customer) {
        this.editing.set(customer ?? null);
        this.submitted.set(false);
        this.form.reset({
            name: customer?.name ?? '',
            phone: customer?.phone ?? '',
            email: customer?.email ?? '',
            address: customer?.address ?? '',
            notes: customer?.notes ?? '',
        });
        this.showForm.set(true);
    }

    save() {
        this.submitted.set(true);
        if (this.form.invalid || this.phoneTaken()) return;
        const v = this.form.getRawValue();
        this.customers.save(
            {
                name: v.name.trim(),
                phone: v.phone.trim(),
                email: v.email.trim() || undefined,
                address: v.address.trim() || undefined,
                notes: v.notes.trim() || undefined,
            },
            this.editing()?.id,
        );
        this.notify.success(this.editing() ? 'Customer updated' : 'Customer added');
        this.showForm.set(false);
    }

    async remove(c: Customer) {
        if (!(await this.notify.confirm(`Delete ${c.name}?`, 'Their past orders are kept, but the customer record will be removed.', 'Delete'))) return;
        this.customers.delete(c.id);
        this.notify.success('Customer deleted');
    }
}
