import { Component, computed, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ChartComponent } from 'ng-apexcharts';
import { DbService } from '../../core/db.service';
import { MoneyPipe } from '../../core/money.pipe';
import { PAYMENT_METHODS } from '../../core/models';
import { dailySeries, percentChange, productSales, salesByCategory, summarize } from '../../core/reports';
import { AuthService } from '../../core/auth.service';
import { ProductService } from '../../core/services/product.service';
import { SalesService } from '../../core/services/sales.service';
import { SettingsService } from '../../core/services/settings.service';
import { addDays, endOfDay, startOfDay } from '../../core/utils';
import { ThemeState } from '../../shared/theme-state';
import { StockBadgeComponent } from '../../shared/ui/stock-badge';
import { ProductThumbComponent } from '../../shared/ui/product-thumb';
import { IconCashBanknotesComponent } from '../../shared/icon/icon-cash-banknotes';
import { IconShoppingCartComponent } from '../../shared/icon/icon-shopping-cart';
import { IconTrendingUpComponent } from '../../shared/icon/icon-trending-up';
import { IconBoxComponent } from '../../shared/icon/icon-box';
import { IconPlusComponent } from '../../shared/icon/icon-plus';

@Component({
    templateUrl: './dashboard.html',
    imports: [
        RouterLink,
        DatePipe,
        DecimalPipe,
        ChartComponent,
        MoneyPipe,
        StockBadgeComponent,
        ProductThumbComponent,
        IconCashBanknotesComponent,
        IconShoppingCartComponent,
        IconTrendingUpComponent,
        IconBoxComponent,
        IconPlusComponent,
    ],
})
export class DashboardPage {
    private db = inject(DbService);
    private sales = inject(SalesService);
    private settings = inject(SettingsService);
    private theme = inject(ThemeState);
    auth = inject(AuthService);
    products = inject(ProductService);

    private readonly now = new Date();
    private readonly todayStart = startOfDay(this.now);
    private readonly todayEnd = endOfDay(this.now);
    private readonly monthStart = new Date(this.now.getFullYear(), this.now.getMonth(), 1);
    /** Same number of days into last month, for a fair comparison. */
    private readonly lastMonthStart = new Date(this.now.getFullYear(), this.now.getMonth() - 1, 1);
    private readonly lastMonthSameDay = endOfDay(
        new Date(
            this.now.getFullYear(),
            this.now.getMonth() - 1,
            Math.min(this.now.getDate(), new Date(this.now.getFullYear(), this.now.getMonth(), 0).getDate()),
        ),
    );

    readonly greeting = this.now.getHours() < 12 ? 'Good morning' : this.now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

    readonly today = computed(() => summarize(this.db.orders(), this.todayStart, this.todayEnd));
    readonly yesterday = computed(() => summarize(this.db.orders(), addDays(this.todayStart, -1), addDays(this.todayEnd, -1)));
    readonly month = computed(() => summarize(this.db.orders(), this.monthStart, this.todayEnd));
    readonly lastMonth = computed(() => summarize(this.db.orders(), this.lastMonthStart, this.lastMonthSameDay));

    readonly todayChange = computed(() => percentChange(this.today().grossSales, this.yesterday().grossSales));
    readonly monthChange = computed(() => percentChange(this.month().grossSales, this.lastMonth().grossSales));
    readonly profitChange = computed(() => percentChange(this.month().profit, this.lastMonth().profit));
    readonly margin = computed(() => (this.month().netSales ? (this.month().profit / this.month().netSales) * 100 : 0));

    readonly recentOrders = computed(() => this.sales.orders().slice(0, 6));
    readonly topProducts = computed(() => {
        const map = this.products.productMap();
        const cats = this.products.categoryMap();
        return productSales(this.db.orders(), addDays(this.todayStart, -29), this.todayEnd)
            .slice(0, 5)
            .map((row) => {
                const p = map.get(row.productId);
                return { ...row, image: p?.image, color: cats.get(p?.categoryId ?? '')?.color };
            });
    });
    readonly lowStock = computed(() => this.products.lowStock().slice(0, 6));

    readonly salesChart = computed(() => {
        const points = dailySeries(this.db.orders(), addDays(this.todayStart, -29), this.todayEnd);
        const base = this.theme.chartBase('area', 320);
        const money = (v: number) => this.settings.format(v);
        return {
            ...base,
            series: [
                { name: 'Sales', data: points.map((p) => p.sales) },
                { name: 'Profit', data: points.map((p) => p.profit) },
            ],
            colors: ['#7209b7', '#00b4d8'],
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90, 100] } },
            xaxis: {
                categories: points.map((p) => p.label),
                tickAmount: 10,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { rotate: 0, hideOverlappingLabels: true },
            },
            yaxis: { labels: { formatter: (v: number) => this.compact(v) }, opposite: this.theme.isRtl() },
            tooltip: { ...base.tooltip, y: { formatter: money } },
            legend: { ...base.legend, position: 'top', horizontalAlign: 'right' },
        };
    });

    readonly categoryChart = computed(() => {
        const rows = salesByCategory(this.db.orders(), this.monthStart, this.todayEnd, this.products.productMap(), this.products.categoryMap());
        const base = this.theme.chartBase('donut', 320);
        return {
            ...base,
            series: rows.map((r) => r.value),
            labels: rows.map((r) => r.label),
            colors: rows.map((r) => r.color),
            dataLabels: { enabled: false },
            stroke: { show: true, width: 2, colors: [this.theme.isDark() ? '#0e1726' : '#fff'] },
            legend: { ...base.legend, position: 'bottom', fontSize: '13px' },
            plotOptions: {
                pie: {
                    donut: {
                        size: '68%',
                        labels: {
                            show: true,
                            value: { formatter: (v: string) => this.settings.format(Number(v)) },
                            total: {
                                show: true,
                                label: 'This month',
                                formatter: (w: any) => this.settings.format(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)),
                            },
                        },
                    },
                },
            },
            tooltip: { ...base.tooltip, y: { formatter: (v: number) => this.settings.format(v) } },
            hasData: rows.length > 0,
        };
    });

    paymentLabel(value: string) {
        return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
    }

    private compact(v: number) {
        return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(v);
    }
}
