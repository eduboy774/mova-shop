import { Routes } from '@angular/router';

// layouts
import { AppLayout } from './layouts/app-layout';
import { AuthLayout } from './layouts/auth-layout';

// guards
import { adminGuard, authGuard, guestGuard } from './core/guards';

export const routes: Routes = [
    // public storefront (landing page)
    {
        path: '',
        component: AuthLayout,
        children: [{ path: '', pathMatch: 'full', loadComponent: () => import('./pages/storefront').then((m) => m.StorefrontPage), data: { title: 'Shop' } }],
    },

    // sign in (no sidebar/header)
    {
        path: 'login',
        component: AuthLayout,
        canActivate: [guestGuard],
        children: [{ path: '', loadComponent: () => import('./pages/login').then((m) => m.LoginPage), data: { title: 'Sign In' } }],
    },

    // the shop (signed-in users)
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            // everyone (admin + cashier)
            { path: 'pos', loadComponent: () => import('./pages/pos/pos').then((m) => m.PosPage), data: { title: 'Point of Sale' } },
            { path: 'orders', loadComponent: () => import('./pages/orders/order-list').then((m) => m.OrderListPage), data: { title: 'Orders' } },
            { path: 'orders/:id', loadComponent: () => import('./pages/orders/order-detail').then((m) => m.OrderDetailPage), data: { title: 'Order' } },
            { path: 'customers', loadComponent: () => import('./pages/customers/customer-list').then((m) => m.CustomerListPage), data: { title: 'Customers' } },
            {
                path: 'customers/:id',
                loadComponent: () => import('./pages/customers/customer-detail').then((m) => m.CustomerDetailPage),
                data: { title: 'Customer' },
            },

            // admin only
            {
                path: '',
                canActivate: [adminGuard],
                children: [
                    { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage), data: { title: 'Dashboard' } },
                    {
                        path: 'products',
                        loadComponent: () => import('./pages/products/product-list').then((m) => m.ProductListPage),
                        data: { title: 'Products' },
                    },
                    {
                        path: 'products/new',
                        loadComponent: () => import('./pages/products/product-form').then((m) => m.ProductFormPage),
                        data: { title: 'Add Product' },
                    },
                    {
                        path: 'products/:id/edit',
                        loadComponent: () => import('./pages/products/product-form').then((m) => m.ProductFormPage),
                        data: { title: 'Edit Product' },
                    },
                    { path: 'categories', loadComponent: () => import('./pages/categories').then((m) => m.CategoriesPage), data: { title: 'Categories' } },
                    { path: 'inventory', loadComponent: () => import('./pages/inventory').then((m) => m.InventoryPage), data: { title: 'Inventory' } },
                    {
                        path: 'purchases',
                        loadComponent: () => import('./pages/purchases/purchase-list').then((m) => m.PurchaseListPage),
                        data: { title: 'Purchases' },
                    },
                    {
                        path: 'purchases/new',
                        loadComponent: () => import('./pages/purchases/purchase-form').then((m) => m.PurchaseFormPage),
                        data: { title: 'New Purchase Order' },
                    },
                    {
                        path: 'purchases/:id',
                        loadComponent: () => import('./pages/purchases/purchase-form').then((m) => m.PurchaseFormPage),
                        data: { title: 'Purchase Order' },
                    },
                    { path: 'suppliers', loadComponent: () => import('./pages/suppliers').then((m) => m.SuppliersPage), data: { title: 'Suppliers' } },
                    { path: 'reports', loadComponent: () => import('./pages/reports/reports').then((m) => m.ReportsPage), data: { title: 'Reports' } },
                    { path: 'settings', loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage), data: { title: 'Settings' } },
                ],
            },
        ],
    },

    { path: '**', loadComponent: () => import('./not-found').then((d) => d.NotFoundComponent), data: { title: 'Not Found' } },
];
