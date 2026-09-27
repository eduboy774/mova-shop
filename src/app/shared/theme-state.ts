import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';

/** Signals over the Vristo layout store, mainly so charts can follow dark mode / RTL. */
@Injectable({ providedIn: 'root' })
export class ThemeState {
    private store = inject(Store<any>);

    readonly isDark = toSignal(
        this.store.select((s: any) => !!s.index.isDarkMode),
        { initialValue: false },
    );
    readonly isRtl = toSignal(
        this.store.select((s: any) => s.index.rtlClass === 'rtl'),
        { initialValue: false },
    );

    /** Base ApexCharts options shared by every chart in the app. */
    chartBase(type: string, height: number) {
        const dark = this.isDark();
        return {
            chart: { type, height, fontFamily: 'Nunito, sans-serif', toolbar: { show: false }, zoom: { enabled: false }, background: 'transparent' },
            grid: { borderColor: dark ? '#191e3a' : '#e0e6ed', strokeDashArray: 5 },
            tooltip: { theme: dark ? 'dark' : 'light' },
            theme: { mode: dark ? 'dark' : 'light' },
            legend: { labels: { colors: dark ? '#bfc9d4' : '#3b3f5c' } },
        } as any;
    }
}
