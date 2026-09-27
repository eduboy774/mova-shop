import { Injectable, computed, inject } from '@angular/core';
import { DbService } from '../db.service';
import { ShopSettings } from '../models';

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'TZS', 'KES', 'UGX', 'RWF', 'NGN', 'GHS', 'ZAR', 'ZMW', 'MWK', 'ETB', 'INR', 'AED'];

@Injectable({ providedIn: 'root' })
export class SettingsService {
    private db = inject(DbService);

    readonly settings = this.db.settings;
    readonly currency = computed(() => this.settings().currency);

    private readonly formatter = computed(() => {
        const currency = this.currency();
        try {
            return new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' });
        } catch {
            return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
        }
    });

    format(value: number | null | undefined): string {
        return this.formatter().format(value ?? 0);
    }

    save(settings: ShopSettings) {
        this.db.update((db) => ({ ...db, settings: { ...settings } }));
    }
}
