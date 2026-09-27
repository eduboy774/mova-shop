import { Pipe, PipeTransform, inject } from '@angular/core';
import { SettingsService } from './services/settings.service';

/** Formats a number in the shop currency. Impure so it follows currency changes in Settings. */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
    private settings = inject(SettingsService);

    transform(value: number | null | undefined): string {
        return this.settings.format(value);
    }
}
