import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartComponent } from 'ng-apexcharts';
import { DbService } from '../../core/db.service';
import { MoneyPipe } from '../../core/money.pipe';
import { dailySeries, productSales, salesByCashier, salesByCategory, salesByPayment, summarize } from '../../core/reports';
import { ProductService } from '../../core/services/product.service';
import { SettingsService } from '../../core/services/settings.service';
import { addDays, downloadFile, endOfDay, fromDateKey, startOfDay, toCsv, toDateKey } from '../../core/utils';
import { ThemeState } from '../../shared/theme-state';
import { PageHeaderComponent } from '../../shared/ui/page-header';
import { IconDownloadComponent } from '../../shared/icon/icon-download';
import { IconPrinterComponent } from '../../shared/icon/icon-printer';

type Preset = 'today' | '7d' | '30d' | 'month' | 'lastMonth' | 'custom';

@Component({
    templateUrl: './reports.html',
    imports: [FormsModule, DecimalPipe, ChartComponent, MoneyPipe, PageHeaderComponent, IconDownloadComponent, IconPrinterComponent],
})
export class ReportsPage {
    private db = inject(DbService);
    private products = inject(ProductService);
    private settings = inject(SettingsService);
    private theme = inject(ThemeState);

    readonly presets: { value: Preset; label: string }[] = [
        { value: 'today', label: 'Today' },
        { value: '7d', label: 'Last 7 days' },
        { value: '30d', label: 'Last 30 days' },
        { value: 'month', label: 'This month' },
        { value: 'lastMonth', label: 'Last month' },
        { value: 'custom', label: 'Custom' },
    ];
    readonly preset = signal<Preset>('30d');
    readonly customFrom = signal(toDateKey(addDays(new Date(), -6)));
    readonly customTo = signal(toDateKey(new Date()));

    readonly range = computed(() => {
        const now = new Date();
        const today = startOfDay(now);
        switch (this.preset()) {
            case 'today':
                return { from: today, to: endOfDay(now) };
            case '7d':
                return { from: addDays(today, -6), to: endOfDay(now) };
            case 'month':
                return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
            case 'lastMonth':
                return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)) };
            case 'custom': {
                const from = startOfDay(fromDateKey(this.customFrom() || toDateKey(now)));
                const to = endOfDay(fromDateKey(this.customTo() || toDateKey(now)));
                return from <= to ? { from, to } : { from: startOfDay(to), to: endOfDay(from) };
            }
            default:
                return { from: addDays(today, -29), to: endOfDay(now) };
        }
    });
    readonly rangeLabel = computed(() => {
        const { from, to } = this.range();
        const f = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        return toDateKey(from) === toDateKey(to) ? f(from) : `${f(from)} – ${f(to)}`;
    });

    readonly summary = computed(() => summarize(this.db.orders(), this.range().from, this.range().to));
    readonly margin = computed(() => (this.summary().netSales ? (this.summary().profit / this.summary().netSales) * 100 : 0));
    readonly daily = computed(() => dailySeries(this.db.orders(), this.range().from, this.range().to));
    readonly topProducts = computed(() => productSales(this.db.orders(), this.range().from, this.range().to));
    readonly categories = computed(() =>
        salesByCategory(this.db.orders(), this.range().from, this.range().to, this.products.productMap(), this.products.categoryMap()),
    );
    readonly payments = computed(() => salesByPayment(this.db.orders(), this.range().from, this.range().to));
    readonly cashiers = computed(() => salesByCashier(this.db.orders(), this.range().from, this.range().to));
    readonly categoryTotal = computed(() => this.categories().reduce((s, c) => s + c.value, 0));
    readonly paymentTotal = computed(() => this.payments().reduce((s, c) => s + c.value, 0));

    readonly dailyChart = computed(() => {
        const points = this.daily();
        const base = this.theme.chartBase('bar', 330);
        return {
            ...base,
            series: [
                { name: 'Sales', data: points.map((p) => p.sales) },
                { name: 'Profit', data: points.map((p) => p.profit) },
            ],
            colors: ['#7209b7', '#00b4d8'],
            dataLabels: { enabled: false },
            stroke: { show: true, width: 2, colors: ['transparent'] },
            plotOptions: { bar: { horizontal: false, columnWidth: points.length > 20 ? '80%' : '55%', borderRadius: 4, borderRadiusApplication: 'end' } },
            xaxis: { categories: points.map((p) => p.label), axisBorder: { show: false }, labels: { rotate: -45, hideOverlappingLabels: true } },
            yaxis: { labels: { formatter: (v: number) => new Intl.NumberFormat(undefined, { notation: 'compact' }).format(v) }, opposite: this.theme.isRtl() },
            tooltip: { ...base.tooltip, y: { formatter: (v: number) => this.settings.format(v) } },
            legend: { ...base.legend, position: 'top', horizontalAlign: 'right' },
        };
    });

    readonly paymentChart = computed(() => {
        const rows = this.payments();
        const base = this.theme.chartBase('donut', 300);
        return {
            ...base,
            series: rows.map((r) => r.value),
            labels: rows.map((r) => r.label),
            colors: ['#00ab55', '#7209b7', '#00b4d8', '#e2a03f'],
            dataLabels: { enabled: false },
            stroke: { show: true, width: 2, colors: [this.theme.isDark() ? '#0e1726' : '#fff'] },
            legend: { ...base.legend, position: 'bottom' },
            plotOptions: { pie: { donut: { size: '65%' } } },
            tooltip: { ...base.tooltip, y: { formatter: (v: number) => this.settings.format(v) } },
        };
    });

    pct(value: number, total: number) {
        return total ? (value / total) * 100 : 0;
    }

    print() {
        window.print();
    }

    exportCsv() {
        const s = this.summary();
        const rows: (string | number)[][] = [
            ['MOVA Shop sales report', this.rangeLabel()],
            [],
            ['Summary'],
            ['Orders', s.orders],
            ['Items sold', s.itemsSold],
            ['Gross sales (incl. tax)', s.grossSales],
            ['Net sales (excl. tax)', s.netSales],
            ['Discounts', s.discounts],
            ['Tax collected', s.tax],
            ['Cost of goods', s.cost],
            ['Gross profit', s.profit],
            ['Refunds', s.refunds, s.refundedAmount],
            [],
            ['Daily', 'Orders', 'Sales', 'Profit'],
            ...this.daily().map((d) => [d.key, d.orders, d.sales, d.profit]),
            [],
            ['Product', 'SKU', 'Qty', 'Revenue', 'Profit'],
            ...this.topProducts().map((p) => [p.name, p.sku, p.qty, p.revenue, p.profit]),
        ];
        downloadFile(`sales-report-${toDateKey(this.range().from)}-to-${toDateKey(this.range().to)}.csv`, toCsv(rows), 'text/csv');
    }
}
