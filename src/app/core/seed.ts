import { Category, Customer, Order, OrderItem, PaymentMethod, Product, Purchase, ShopDb, ShopSettings, StockMovement, Supplier, User } from './models';
import { addDays, padNumber, round2, uid } from './utils';

export const DB_VERSION = 1;

export const DEFAULT_SETTINGS: ShopSettings = {
    name: 'MOVA Shop',
    tagline: 'Marketplace of Value & Access',
    address: '12 Market Street, City Centre',
    phone: '+000 700 000 000',
    email: 'hello@mova.shop',
    currency: 'USD',
    taxRate: 18,
    defaultReorderLevel: 10,
    receiptFooter: 'Thank you for shopping with MOVA!',
};

export function defaultUsers(now: string): User[] {
    return [
        { id: uid(), name: 'Shop Admin', email: 'admin@mova.shop', password: 'admin123', role: 'admin', active: true, createdAt: now },
        { id: uid(), name: 'Front Desk Cashier', email: 'cashier@mova.shop', password: 'cashier123', role: 'cashier', active: true, createdAt: now },
    ];
}

/** An empty shop: settings + default users only. */
export function createEmptyDb(settings: ShopSettings = DEFAULT_SETTINGS, users?: User[]): ShopDb {
    const now = new Date().toISOString();
    return {
        version: DB_VERSION,
        settings: { ...settings },
        users: users ?? defaultUsers(now),
        categories: [],
        products: [],
        customers: [],
        suppliers: [],
        orders: [],
        purchases: [],
        movements: [],
        counters: { order: 0, purchase: 0 },
    };
}

/** Deterministic PRNG so the demo data looks the same on every fresh install. */
function mulberry32(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type SeedProduct = [name: string, category: string, price: number, cost: number, stock: number, unit: string, popularity: number, image?: string];

const CATEGORIES: [string, string, string][] = [
    ['Electronics', '#7209b7', 'Computers, audio and gadgets'],
    ['Phones & Accessories', '#00b4d8', 'Smartphones, chargers and cases'],
    ['Fashion', '#f72585', 'Clothing and accessories'],
    ['Shoes', '#e2a03f', 'Sneakers, sandals and formal shoes'],
    ['Groceries', '#00ab55', 'Everyday food items'],
    ['Beverages', '#2196f3', 'Soft drinks, juice and water'],
    ['Home & Kitchen', '#805dca', 'Cookware and household items'],
    ['Beauty & Health', '#e7515a', 'Personal care products'],
];

const PRODUCTS: SeedProduct[] = [
    ['Ultrabook Laptop 14"', 'Electronics', 899, 720, 28, 'pcs', 1, 'product-laptop.jpg'],
    ['Wireless Headphones', 'Electronics', 79, 48, 80, 'pcs', 3, 'product-headphones.jpg'],
    ['Mirrorless Camera', 'Electronics', 649, 510, 16, 'pcs', 1, 'product-camera.jpg'],
    ['Bluetooth Speaker', 'Electronics', 45, 27, 70, 'pcs', 3],
    ['Smart Watch', 'Electronics', 129, 86, 44, 'pcs', 2, 'product-watch.jpg'],
    ['Android Smartphone 128GB', 'Phones & Accessories', 239, 190, 36, 'pcs', 2],
    ['Fast Charger 25W', 'Phones & Accessories', 15, 7, 160, 'pcs', 5],
    ['USB-C Cable 1m', 'Phones & Accessories', 6, 2.5, 240, 'pcs', 6],
    ['Power Bank 20000mAh', 'Phones & Accessories', 32, 19, 60, 'pcs', 3],
    ['Phone Case (Universal)', 'Phones & Accessories', 9, 3.5, 50, 'pcs', 4],
    ['Cotton T-Shirt', 'Fashion', 12, 5, 180, 'pcs', 5],
    ['Denim Jeans', 'Fashion', 35, 18, 90, 'pcs', 3],
    ['Leather Belt', 'Fashion', 18, 8, 24, 'pcs', 2],
    ['Running Sneakers', 'Shoes', 65, 38, 60, 'pair', 3, 'product-shoes.jpg'],
    ['Leather Sandals', 'Shoes', 22, 11, 52, 'pair', 2],
    ['Rice 5kg', 'Groceries', 9.5, 7, 120, 'bag', 6],
    ['Cooking Oil 3L', 'Groceries', 8, 6, 110, 'bottle', 5],
    ['Sugar 2kg', 'Groceries', 3.2, 2.4, 140, 'bag', 6],
    ['Wheat Flour 2kg', 'Groceries', 2.8, 2, 40, 'bag', 5],
    ['Mineral Water 1.5L', 'Beverages', 0.9, 0.45, 400, 'bottle', 9],
    ['Orange Juice 1L', 'Beverages', 2.5, 1.5, 120, 'carton', 5],
    ['Cola 500ml', 'Beverages', 0.8, 0.45, 300, 'bottle', 8],
    ['Ground Coffee 250g', 'Beverages', 6.5, 4, 32, 'pack', 3],
    ['Non-stick Frying Pan', 'Home & Kitchen', 24, 14, 40, 'pcs', 2],
    ['Electric Kettle 1.7L', 'Home & Kitchen', 28, 17, 30, 'pcs', 2],
    ['Dinner Plate Set (6)', 'Home & Kitchen', 30, 18, 12, 'set', 1],
    ['Body Lotion 400ml', 'Beauty & Health', 7.5, 4.2, 80, 'bottle', 4],
    ['Toothpaste 150g', 'Beauty & Health', 2.2, 1.1, 180, 'tube', 6],
    ['Hand Sanitizer 500ml', 'Beauty & Health', 4, 2, 20, 'bottle', 3],
];

const SUPPLIERS: [string, string, string, string][] = [
    ['TechHub Distributors', 'Grace M.', '+000 711 100 200', 'orders@techhub.example'],
    ['Urban Style Wholesale', 'Daniel K.', '+000 722 300 400', 'sales@urbanstyle.example'],
    ['FreshFarm Supplies', 'Aisha N.', '+000 733 500 600', 'supply@freshfarm.example'],
    ['HomePro Traders', 'Peter O.', '+000 744 700 800', 'info@homepro.example'],
    ['CareWell Products', 'Maria L.', '+000 755 900 100', 'care@carewell.example'],
];

const SUPPLIER_FOR_CATEGORY: Record<string, number> = {
    Electronics: 0,
    'Phones & Accessories': 0,
    Fashion: 1,
    Shoes: 1,
    Groceries: 2,
    Beverages: 2,
    'Home & Kitchen': 3,
    'Beauty & Health': 4,
};

const CUSTOMERS: [string, string][] = [
    ['Amina Hassan', '+000 761 234 567'],
    ['John Mwangi', '+000 762 345 678'],
    ['Fatuma Said', '+000 763 456 789'],
    ['David Otieno', '+000 764 567 890'],
    ['Grace Wanjiru', '+000 765 678 901'],
    ['Joseph Kimaro', '+000 766 789 012'],
    ['Sarah Njeri', '+000 767 890 123'],
    ['Michael Banda', '+000 768 901 234'],
    ['Esther Achieng', '+000 769 012 345'],
    ['Samuel Tembo', '+000 770 123 456'],
    ['Linda Mushi', '+000 771 234 567'],
    ['Kevin Mutua', '+000 772 345 678'],
];

export function createDemoDb(): ShopDb {
    const rand = mulberry32(20260911);
    const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
    const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

    const today = new Date();
    const start = addDays(today, -60);
    start.setHours(8, 0, 0, 0);
    const startIso = start.toISOString();

    const db = createEmptyDb();
    db.users.forEach((u) => (u.createdAt = startIso));
    const admin = db.users[0];
    const cashier = db.users[1];

    db.categories = CATEGORIES.map(([name, color, description]) => ({ id: uid(), name, color, description, createdAt: startIso }) as Category);
    const catByName = new Map(db.categories.map((c) => [c.name, c]));

    db.suppliers = SUPPLIERS.map(
        ([name, contactPerson, phone, email]) =>
            ({ id: uid(), name, contactPerson, phone, email, address: 'Industrial Area', createdAt: startIso }) as Supplier,
    );

    db.customers = CUSTOMERS.map(
        ([name, phone], i) =>
            ({
                id: uid(),
                name,
                phone,
                email: name.toLowerCase().replace(/\s+/g, '.') + '@mail.example',
                createdAt: addDays(start, i * 3).toISOString(),
            }) as Customer,
    );

    const popularity: number[] = [];
    db.products = PRODUCTS.map(([name, category, price, cost, stock, unit, pop, image], i) => {
        popularity.push(pop);
        return {
            id: uid(),
            name,
            sku: 'MV-' + padNumber(1001 + i, 4),
            barcode: String(6000000000000 + (1001 + i) * 7919),
            categoryId: catByName.get(category)!.id,
            supplierId: db.suppliers[SUPPLIER_FOR_CATEGORY[category]].id,
            price,
            cost,
            stock,
            reorderLevel: price > 100 ? 3 : 10,
            unit,
            image: image ? `assets/images/products/${image}` : undefined,
            active: true,
            createdAt: startIso,
            updatedAt: startIso,
        } as Product;
    });

    const movements: StockMovement[] = [];
    const move = (p: Product, type: StockMovement['type'], qty: number, date: string, userName: string, reference?: string, note?: string) => {
        p.stock += qty;
        movements.push({ id: uid(), date, productId: p.id, productName: p.name, type, qty, balance: p.stock, reference, note, userName });
    };

    // Opening stock
    db.products.forEach((p) => {
        const opening = p.stock;
        p.stock = 0;
        move(p, 'initial', opening, startIso, admin.name, undefined, 'Opening stock');
    });

    // Restocks from suppliers on these days
    const purchaseDays = new Map<number, Purchase>();
    const makePurchase = (day: number, supplierIdx: number, received: boolean) => {
        const supplier = db.suppliers[supplierIdx];
        const items = db.products
            .filter((p) => p.supplierId === supplier.id)
            .slice(0, 4)
            .map((p) => ({ productId: p.id, name: p.name, qty: p.price > 100 ? between(3, 6) : between(20, 50), cost: p.cost }));
        const date = addDays(start, day);
        date.setHours(7, 30, 0, 0); // before the shop opens, so stock balances stay chronological
        const purchase: Purchase = {
            id: uid(),
            number: 'PO-' + padNumber(++db.counters.purchase, 4),
            date: date.toISOString(),
            supplierId: supplier.id,
            supplierName: supplier.name,
            items,
            total: round2(items.reduce((s, it) => s + it.qty * it.cost, 0)),
            status: received ? 'received' : 'pending',
            receivedAt: received ? date.toISOString() : undefined,
        };
        db.purchases.push(purchase);
        if (received) purchaseDays.set(day, purchase);
    };
    makePurchase(18, 2, true);
    makePurchase(30, 0, true);
    makePurchase(44, 4, true);
    makePurchase(52, 1, true);
    makePurchase(59, 3, false);

    const weighted: number[] = [];
    popularity.forEach((w, idx) => {
        for (let i = 0; i < w; i++) weighted.push(idx);
    });
    const methods: PaymentMethod[] = ['cash', 'cash', 'cash', 'cash', 'mobile', 'mobile', 'mobile', 'card', 'card', 'bank'];
    const taxRate = db.settings.taxRate;

    for (let day = 0; day <= 60; day++) {
        const date = addDays(start, day);

        const po = purchaseDays.get(day);
        if (po) {
            po.items.forEach((it) => {
                const p = db.products.find((x) => x.id === it.productId)!;
                move(p, 'purchase', it.qty, po.receivedAt!, admin.name, po.number);
            });
        }

        const weekend = date.getDay() === 0 || date.getDay() === 6;
        const orderCount = between(weekend ? 4 : 2, weekend ? 9 : 6) + Math.floor(day / 20);
        const times = Array.from({ length: orderCount }, () => between(8 * 60, 20 * 60)).sort((a, b) => a - b);

        for (const minutes of times) {
            const orderDate = new Date(date);
            orderDate.setHours(Math.floor(minutes / 60), minutes % 60, between(0, 59), 0);
            if (orderDate > today) break;

            const items: OrderItem[] = [];
            const lines = between(1, 4);
            for (let l = 0; l < lines; l++) {
                const p = db.products[pick(weighted)];
                const qty = p.price > 100 ? 1 : between(1, 3);
                const existing = items.find((it) => it.productId === p.id);
                const already = existing?.qty ?? 0;
                if (p.stock - already < qty) continue;
                if (existing) existing.qty += qty;
                else items.push({ productId: p.id, name: p.name, sku: p.sku, price: p.price, cost: p.cost, qty });
            }
            if (!items.length) continue;

            const subtotal = round2(items.reduce((s, it) => s + it.price * it.qty, 0));
            const discount = rand() < 0.1 ? round2(subtotal * 0.05) : 0;
            const tax = round2(((subtotal - discount) * taxRate) / 100);
            const total = round2(subtotal - discount + tax);
            const paymentMethod = pick(methods);
            const amountPaid = paymentMethod === 'cash' ? Math.ceil(total / 5) * 5 : total;
            const customer = rand() < 0.4 ? pick(db.customers) : undefined;
            const user = rand() < 0.7 ? cashier : admin;

            const order: Order = {
                id: uid(),
                number: 'INV-' + padNumber(++db.counters.order),
                date: orderDate.toISOString(),
                customerId: customer?.id,
                customerName: customer?.name ?? 'Walk-in Customer',
                items,
                subtotal,
                discount,
                taxRate,
                tax,
                total,
                paymentMethod,
                amountPaid,
                change: round2(amountPaid - total),
                status: 'completed',
                cashierId: user.id,
                cashierName: user.name,
            };
            items.forEach((it) =>
                move(
                    db.products.find((p) => p.id === it.productId)!,
                    'sale',
                    -it.qty,
                    order.date,
                    user.name,
                    order.number,
                ),
            );

            if (rand() < 0.02) {
                const refundedAt = new Date(orderDate.getTime() + 60 * 60 * 1000);
                if (refundedAt <= today) {
                    order.status = 'refunded';
                    order.refundedAt = refundedAt.toISOString();
                    order.note = 'Customer returned items';
                    items.forEach((it) =>
                        move(
                            db.products.find((p) => p.id === it.productId)!,
                            'refund',
                            it.qty,
                            order.refundedAt!,
                            admin.name,
                            order.number,
                            'Refund',
                        ),
                    );
                }
            }
            db.orders.push(order);
        }
    }

    db.movements = movements;
    return db;
}
