# MOVA Shop — Marketplace of Value & Access

Shop management and point-of-sale (POS) system built with **Angular 20** on the **Vristo** Tailwind admin template.

## Run it

```bash
npm install
npm start          # http://localhost:4200
npm run build      # production build in dist/
```

Requires Node.js 20.19+ (22 LTS recommended).

### Demo accounts

| Role    | Email               | Password     | Access                               |
| ------- | ------------------- | ------------ | ------------------------------------ |
| Admin   | `admin@mova.shop`   | `admin123`   | Everything                           |
| Cashier | `cashier@mova.shop` | `cashier123` | Point of Sale, Orders, Customers     |

The first launch loads demo data (8 categories, 29 products, 12 customers, 5 suppliers and ~60 days of sales)
so the dashboard and reports have something to show. Use **Settings → Data & backup** to reload the demo or
start with an empty shop.

## Features

- **Storefront** (`/`, public) – product grid with category checkboxes, search, in-stock filter and sorting. **Buy** asks visitors to sign in, then opens the Point of Sale with that product in the cart.
- **Dashboard** (`/dashboard`) – today / month sales, gross profit and margin, stock value, 30-day sales chart, sales by category, recent orders, top products, stock alerts.
- **Point of Sale** – product grid with category filters, barcode / SKU scanner input (press Enter), cart with stock limits, discount (amount or %), tax, cash / card / mobile money / bank transfer, change calculation, printable 80mm receipt, quick “add customer”.
- **Orders** – search and filter by status, payment method and date; order detail with receipt; full refunds that put items back in stock; CSV export.
- **Products & categories** – SKU / barcode (unique), cost & selling price with live margin, image upload, low-stock level, active / inactive, CSV export.
- **Inventory** – stock levels and value, manual adjustments with reasons, full movement history (opening, sale, refund, purchase, adjustment).
- **Purchases & suppliers** – purchase orders, “add low-stock items” shortcut, receiving goods adds stock and updates cost prices.
- **Customers** – purchase history, total spent, last visit.
- **Reports** – date presets or custom range; gross / net sales, profit, tax, discounts, refunds; daily chart; payment methods; product, category and cashier performance; CSV export and print.
- **Settings** – shop details for receipts, currency, tax rate, users & roles, JSON backup / restore.
- Light / dark theme, RTL and the Vristo layout options (theme customizer), mobile friendly.

## Where things are

```
src/app/
  core/                 data + business logic (no UI)
    models.ts           Product, Order, Purchase, StockMovement, ...
    db.service.ts       single store, saved to localStorage
    seed.ts             demo data
    stock.ts            every stock change goes through applyStockChanges()
    reports.ts          sales summaries and breakdowns (pure functions)
    auth.service.ts     demo login + roles
    guards.ts           authGuard, adminGuard, guestGuard
    services/           product, sales (checkout/refund), inventory, purchase, people, settings
  pages/                one folder/file per screen
  shared/ui/            modal, pagination, page header, receipt, stock badge, product thumb, logo
  layouts/              Vristo layout; menu is defined once in layouts/nav.ts
```

Brand colours live in `tailwind.config.js` (`primary` purple, `secondary` pink, `info` / `mova-cyan`).

## Moving to a real backend

Today all data is stored in the browser (localStorage), so it is **per-browser and per-device**, and
the login is a demo (passwords are stored unencrypted). Before real use:

1. Build an API (Laravel, Node, Django, …) with proper authentication (hashed passwords, tokens).
2. Replace the bodies of the services in `src/app/core/services/` and `auth.service.ts` with `HttpClient`
   calls. Pages only talk to these services, so the UI does not need to change.
3. Do stock changes and order numbering on the server, inside a transaction, so two tills can’t
   sell the same last item.
4. Use `src/jwt.interceptor.ts` to attach the auth token to requests.
