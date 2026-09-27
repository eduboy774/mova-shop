import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Supplier } from '../core/models';
import { MoneyPipe } from '../core/money.pipe';
import { NotifyService } from '../core/notify.service';
import { SupplierService } from '../core/services/people.service';
import { ModalComponent } from '../shared/ui/modal';
import { PageHeaderComponent } from '../shared/ui/page-header';
import { IconPlusComponent } from '../shared/icon/icon-plus';
import { IconPencilComponent } from '../shared/icon/icon-pencil';
import { IconTrashLinesComponent } from '../shared/icon/icon-trash-lines';

@Component({
    imports: [
        FormsModule,
        ReactiveFormsModule,
        RouterLink,
        MoneyPipe,
        ModalComponent,
        PageHeaderComponent,
        IconPlusComponent,
        IconPencilComponent,
        IconTrashLinesComponent,
    ],
    template: `
        <app-page-header title="Suppliers" [crumbs]="[{ label: 'Stock' }, { label: 'Suppliers' }]">
            <button type="button" class="btn btn-primary gap-1.5" (click)="openForm()"><icon-plus class="h-4 w-4" /> Add supplier</button>
        </app-page-header>

        <div class="panel">
            <input
                type="search"
                class="form-input mb-5 max-w-sm"
                placeholder="Search suppliers…"
                aria-label="Search suppliers"
                [ngModel]="q()"
                (ngModelChange)="q.set($event)"
            />
            <div class="table-responsive">
                <table class="table-hover">
                    <thead>
                        <tr>
                            <th>Supplier</th>
                            <th>Contact</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th class="text-right">Products</th>
                            <th class="text-right">Purchased</th>
                            <th class="w-px"><span class="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (s of filtered(); track s.id) {
                            <tr>
                                <td>
                                    <p class="font-semibold">{{ s.name }}</p>
                                    @if (s.address) {
                                        <p class="text-xs text-white-dark">{{ s.address }}</p>
                                    }
                                </td>
                                <td>{{ s.contactPerson || '—' }}</td>
                                <td class="whitespace-nowrap">{{ s.phone }}</td>
                                <td>{{ s.email || '—' }}</td>
                                <td class="text-right">{{ suppliers.productCount().get(s.id) ?? 0 }}</td>
                                <td class="whitespace-nowrap text-right font-semibold">{{ suppliers.purchaseTotals().get(s.id) ?? 0 | money }}</td>
                                <td>
                                    <div class="flex items-center gap-3">
                                        <a
                                            routerLink="/purchases/new"
                                            [queryParams]="{ supplier: s.id }"
                                            class="whitespace-nowrap text-xs font-semibold text-primary hover:underline"
                                            >New PO</a
                                        >
                                        <button type="button" class="hover:text-info" [attr.aria-label]="'Edit ' + s.name" (click)="openForm(s)">
                                            <icon-pencil class="h-5 w-5" />
                                        </button>
                                        <button type="button" class="hover:text-danger" [attr.aria-label]="'Delete ' + s.name" (click)="remove(s)">
                                            <icon-trash-lines class="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        } @empty {
                            <tr>
                                <td colspan="7" class="!py-10 text-center text-white-dark">No suppliers found.</td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
        </div>

        <app-modal [open]="showForm()" [title]="editing() ? 'Edit supplier' : 'Add supplier'" (closed)="showForm.set(false)">
            <form [formGroup]="form" (ngSubmit)="save()" class="space-y-4">
                <div [class.has-error]="submitted() && form.controls.name.invalid">
                    <label for="sName">Company name *</label>
                    <input id="sName" type="text" class="form-input" formControlName="name" />
                    @if (submitted() && form.controls.name.invalid) {
                        <p class="mt-1 text-danger">Name is required.</p>
                    }
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label for="sContact">Contact person</label>
                        <input id="sContact" type="text" class="form-input" formControlName="contactPerson" />
                    </div>
                    <div [class.has-error]="submitted() && form.controls.phone.invalid">
                        <label for="sPhone">Phone *</label>
                        <input id="sPhone" type="tel" class="form-input" formControlName="phone" />
                        @if (submitted() && form.controls.phone.invalid) {
                            <p class="mt-1 text-danger">Phone is required.</p>
                        }
                    </div>
                </div>
                <div [class.has-error]="submitted() && form.controls.email.invalid">
                    <label for="sEmail">Email</label>
                    <input id="sEmail" type="email" class="form-input" formControlName="email" />
                    @if (submitted() && form.controls.email.invalid) {
                        <p class="mt-1 text-danger">Enter a valid email.</p>
                    }
                </div>
                <div>
                    <label for="sAddress">Address</label>
                    <input id="sAddress" type="text" class="form-input" formControlName="address" />
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" class="btn btn-outline-danger" (click)="showForm.set(false)">Cancel</button>
                    <button type="submit" class="btn btn-primary">{{ editing() ? 'Save changes' : 'Add supplier' }}</button>
                </div>
            </form>
        </app-modal>
    `,
})
export class SuppliersPage {
    suppliers = inject(SupplierService);
    private notify = inject(NotifyService);
    private fb = inject(FormBuilder);

    readonly q = signal('');
    readonly filtered = computed(() => {
        const q = this.q().trim().toLowerCase();
        return this.suppliers
            .suppliers()
            .filter((s) => !q || s.name.toLowerCase().includes(q) || s.contactPerson?.toLowerCase().includes(q) || s.phone.includes(q));
    });

    readonly showForm = signal(false);
    readonly editing = signal<Supplier | null>(null);
    readonly submitted = signal(false);
    readonly form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        contactPerson: [''],
        phone: ['', Validators.required],
        email: ['', Validators.email],
        address: [''],
    });

    openForm(s?: Supplier) {
        this.editing.set(s ?? null);
        this.submitted.set(false);
        this.form.reset({
            name: s?.name ?? '',
            contactPerson: s?.contactPerson ?? '',
            phone: s?.phone ?? '',
            email: s?.email ?? '',
            address: s?.address ?? '',
        });
        this.showForm.set(true);
    }

    save() {
        this.submitted.set(true);
        if (this.form.invalid) return;
        const v = this.form.getRawValue();
        this.suppliers.save(
            {
                name: v.name.trim(),
                contactPerson: v.contactPerson.trim() || undefined,
                phone: v.phone.trim(),
                email: v.email.trim() || undefined,
                address: v.address.trim() || undefined,
            },
            this.editing()?.id,
        );
        this.notify.success(this.editing() ? 'Supplier updated' : 'Supplier added');
        this.showForm.set(false);
    }

    async remove(s: Supplier) {
        if (!(await this.notify.confirm(`Delete ${s.name}?`, 'Products from this supplier will be unlinked. Purchase history is kept.', 'Delete'))) return;
        try {
            this.suppliers.delete(s.id);
            this.notify.success('Supplier deleted');
        } catch (e: any) {
            this.notify.error(e.message);
        }
    }
}
