import { Component, HostListener, input, output } from '@angular/core';
import { IconXComponent } from '../icon/icon-x';

@Component({
    selector: 'app-modal',
    imports: [IconXComponent],
    template: `
        @if (open()) {
            <div class="fixed inset-0 z-[999] overflow-y-auto bg-[black]/60" (click)="closed.emit()">
                <div class="flex min-h-screen items-start justify-center px-4 py-8">
                    <div
                        role="dialog"
                        aria-modal="true"
                        [attr.aria-label]="title()"
                        class="panel my-8 w-full overflow-hidden border-0 p-0 animate__animated animate__fadeInDown animate__faster"
                        [class]="sizeClass()"
                        (click)="$event.stopPropagation()"
                    >
                        <div class="flex items-center justify-between bg-[#fbfbfb] px-5 py-3 dark:bg-[#121c2c]">
                            <h5 class="text-lg font-bold">{{ title() }}</h5>
                            <button type="button" class="text-white-dark hover:text-dark dark:hover:text-white" aria-label="Close" (click)="closed.emit()">
                                <icon-x class="h-5 w-5" />
                            </button>
                        </div>
                        <div class="p-5">
                            <ng-content />
                        </div>
                    </div>
                </div>
            </div>
        }
    `,
})
export class ModalComponent {
    readonly open = input(false);
    readonly title = input('');
    readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
    readonly closed = output<void>();

    sizeClass() {
        return { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[this.size()];
    }

    @HostListener('document:keydown.escape')
    onEscape() {
        if (this.open()) this.closed.emit();
    }
}
