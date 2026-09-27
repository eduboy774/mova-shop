export type Role = 'admin' | 'cashier';

export interface User {
    id: string;
    name: string;
    email: string;
    /** Demo only: stored in plain text in localStorage. Replace with a real auth API before going live. */
    password: string;
    role: Role;
    active: boolean;
    createdAt: string;
}

export interface Category {
    id: string;
    name: string;
    description?: string;
    color: string;
    createdAt: string;
}

export interface Product {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
    categoryId: string;
    supplierId?: string;
    /** Selling price */
    price: number;
    /** Buying / unit cost, used for profit reports */
    cost: number;
    stock: number;
    reorderLevel: number;
    unit: string;
    image?: string;
    description?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
    createdAt: string;
}

export interface Supplier {
    id: string;
    name: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    address?: string;
    createdAt: string;
}

export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'bank';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'mobile', label: 'Mobile Money' },
    { value: 'bank', label: 'Bank Transfer' },
];

export interface OrderItem {
    productId: string;
    name: string;
    sku: string;
    price: number;
    cost: number;
    qty: number;
}

export type OrderStatus = 'completed' | 'refunded';

export interface Order {
    id: string;
    number: string;
    date: string;
    customerId?: string;
    customerName: string;
    items: OrderItem[];
    subtotal: number;
    discount: number;
    taxRate: number;
    tax: number;
    total: number;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    change: number;
    status: OrderStatus;
    cashierId: string;
    cashierName: string;
    note?: string;
    refundedAt?: string;
}

export interface PurchaseItem {
    productId: string;
    name: string;
    qty: number;
    cost: number;
}

export type PurchaseStatus = 'pending' | 'received' | 'cancelled';

export interface Purchase {
    id: string;
    number: string;
    date: string;
    supplierId: string;
    supplierName: string;
    items: PurchaseItem[];
    total: number;
    status: PurchaseStatus;
    receivedAt?: string;
    note?: string;
}

export type MovementType = 'initial' | 'sale' | 'refund' | 'purchase' | 'adjustment';

export interface StockMovement {
    id: string;
    date: string;
    productId: string;
    productName: string;
    type: MovementType;
    /** Signed quantity: positive adds stock, negative removes it */
    qty: number;
    /** Stock level after this movement */
    balance: number;
    reference?: string;
    note?: string;
    userName: string;
}

export interface ShopSettings {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    currency: string;
    /** Percentage, e.g. 18 for 18% */
    taxRate: number;
    defaultReorderLevel: number;
    receiptFooter: string;
}

export interface ShopDb {
    version: number;
    settings: ShopSettings;
    users: User[];
    categories: Category[];
    products: Product[];
    customers: Customer[];
    suppliers: Supplier[];
    orders: Order[];
    purchases: Purchase[];
    movements: StockMovement[];
    counters: { order: number; purchase: number };
}

export type StockStatus = 'in' | 'low' | 'out';

export function stockStatus(p: Pick<Product, 'stock' | 'reorderLevel'>): StockStatus {
    if (p.stock <= 0) return 'out';
    if (p.stock <= p.reorderLevel) return 'low';
    return 'in';
}
