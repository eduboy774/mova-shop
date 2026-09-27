export type NavIcon =
    'dashboard' | 'pos' | 'orders' | 'customers' | 'products' | 'categories' | 'inventory' | 'purchases' | 'suppliers' | 'reports' | 'settings';

export interface NavItem {
    label: string;
    link: string;
    icon: NavIcon;
    adminOnly?: boolean;
    exact?: boolean;
}

export interface NavSection {
    title: string;
    items: NavItem[];
}

/** Single source for the sidebar and the horizontal menu. */
export const NAV: NavSection[] = [
    {
        title: 'Main',
        items: [
            { label: 'Dashboard', link: '/dashboard', icon: 'dashboard', adminOnly: true, exact: true },
            { label: 'Point of Sale', link: '/pos', icon: 'pos' },
        ],
    },
    {
        title: 'Sales',
        items: [
            { label: 'Orders', link: '/orders', icon: 'orders' },
            { label: 'Customers', link: '/customers', icon: 'customers' },
        ],
    },
    {
        title: 'Catalog',
        items: [
            { label: 'Products', link: '/products', icon: 'products', adminOnly: true },
            { label: 'Categories', link: '/categories', icon: 'categories', adminOnly: true },
        ],
    },
    {
        title: 'Stock',
        items: [
            { label: 'Inventory', link: '/inventory', icon: 'inventory', adminOnly: true },
            { label: 'Purchases', link: '/purchases', icon: 'purchases', adminOnly: true },
            { label: 'Suppliers', link: '/suppliers', icon: 'suppliers', adminOnly: true },
        ],
    },
    {
        title: 'Insights',
        items: [
            { label: 'Reports', link: '/reports', icon: 'reports', adminOnly: true },
            { label: 'Settings', link: '/settings', icon: 'settings', adminOnly: true },
        ],
    },
];

export function navFor(isAdmin: boolean): NavSection[] {
    return NAV.map((s) => ({ ...s, items: s.items.filter((i) => isAdmin || !i.adminOnly) })).filter((s) => s.items.length);
}
