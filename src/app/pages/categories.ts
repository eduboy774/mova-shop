import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Category } from '../core/models';
import { NotifyService } from '../core/notify.service';
import { ProductService } from '../core/services/product.service';
import { ModalComponent } from '../shared/ui/modal';
import { PageHeaderComponent } from '../shared/ui/page-header';
import { IconPlusComponent } from '../shared/icon/icon-plus';
import { IconPencilComponent } from '../shared/icon/icon-pencil';
import { IconTrashLinesComponent } from '../shared/icon/icon-trash-lines';
import { IconTagComponent } from '../shared/icon/icon-tag';

const COLORS = ['#7209b7', '#00b4d8', '#f72585', '#e2a03f', '#00ab55', '#2196f3', '#805dca', '#e7515a', '#3b3f5c', '#14b8a6'];

@Component({
    imports: [FormsModule, RouterLink, ModalComponent, PageHeaderComponent, IconPlusComponent, IconPencilComponent, IconTrashLinesComponent, IconTagComponent],
    template: `
        <app-page-header title="Categories" [crumbs]="[{ label: 'Catalog' }, { label: 'Categories' }]">
            <button type="button" class="btn btn-primary gap-1.5" (click)="openForm()"><icon-plus class="h-4 w-4" /> Add category</button>
        </app-page-header>

        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            @for (c of products.categories(); track c.id) {
                <div class="panel flex flex-col">
                    <div class="flex items-start justify-between gap-3">
                        <span class="grid h-12 w-12 shrink-0 place-content-center rounded-xl text-white" [style.background-color]="c.color">
                            <icon-tag class="h-6 w-6" />
                        </span>
                        <div class="flex gap-3">
                            <button type="button" class="hover:text-info" [attr.aria-label]="'Edit ' + c.name" (click)="openForm(c)">
                                <icon-pencil class="h-5 w-5" />
                            </button>
                            <button type="button" class="hover:text-danger" [attr.aria-label]="'Delete ' + c.name" (click)="remove(c)">
                                <icon-trash-lines class="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    <h2 class="mt-4 text-lg font-bold dark:text-white-light">{{ c.name }}</h2>
                    <p class="mt-1 flex-1 text-white-dark">{{ c.description || 'No description' }}</p>
                    <a routerLink="/products" [queryParams]="{ category: c.id }" class="mt-4 text-sm font-semibold text-primary hover:underline"
                        >{{ products.productCountByCategory().get(c.id) ?? 0 }} products</a
                    >
                </div>
            } @empty {
                <div class="panel col-span-full py-16 text-center text-white-dark">No categories yet. Add your first category to start adding products.</div>
            }
        </div>

        <app-modal [open]="showForm()" [title]="editing() ? 'Edit category' : 'Add category'" size="sm" (closed)="showForm.set(false)">
            <form (ngSubmit)="save()" class="space-y-4">
                <div [class.has-error]="error()">
                    <label for="catName">Name *</label>
                    <input id="catName" name="name" type="text" class="form-input" [(ngModel)]="name" />
                    @if (error()) {
                        <p class="mt-1 text-danger">{{ error() }}</p>
                    }
                </div>
                <div>
                    <label for="catDesc">Description</label>
                    <textarea id="catDesc" name="description" rows="2" class="form-textarea" [(ngModel)]="description"></textarea>
                </div>
                <div>
                    <p class="mb-2 font-semibold">Colour</p>
                    <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
                        @for (col of colors; track col) {
                            <button
                                type="button"
                                role="radio"
                                class="h-8 w-8 rounded-full ring-offset-2 transition dark:ring-offset-[#0e1726]"
                                [class.ring-2]="color === col"
                                [style.background-color]="col"
                                [style.--tw-ring-color]="col"
                                [attr.aria-checked]="color === col"
                                [attr.aria-label]="col"
                                (click)="color = col"
                            ></button>
                        }
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" class="btn btn-outline-danger" (click)="showForm.set(false)">Cancel</button>
                    <button type="submit" class="btn btn-primary">{{ editing() ? 'Save changes' : 'Add category' }}</button>
                </div>
            </form>
        </app-modal>
    `,
})
export class CategoriesPage {
    products = inject(ProductService);
    private notify = inject(NotifyService);

    readonly colors = COLORS;
    readonly showForm = signal(false);
    readonly editing = signal<Category | null>(null);
    readonly error = signal('');
    name = '';
    description = '';
    color = COLORS[0];

    openForm(c?: Category) {
        this.editing.set(c ?? null);
        this.name = c?.name ?? '';
        this.description = c?.description ?? '';
        this.color = c?.color ?? COLORS[this.products.categories().length % COLORS.length];
        this.error.set('');
        this.showForm.set(true);
    }

    save() {
        const name = this.name.trim();
        if (!name) return this.error.set('Name is required.');
        if (this.products.isCategoryNameTaken(name, this.editing()?.id)) return this.error.set('A category with this name already exists.');
        this.products.saveCategory({ name, description: this.description.trim() || undefined, color: this.color }, this.editing()?.id);
        this.notify.success(this.editing() ? 'Category updated' : 'Category added');
        this.showForm.set(false);
    }

    async remove(c: Category) {
        if (!(await this.notify.confirm(`Delete ${c.name}?`, '', 'Delete'))) return;
        try {
            this.products.deleteCategory(c.id);
            this.notify.success('Category deleted');
        } catch (e: any) {
            this.notify.error(e.message);
        }
    }
}
