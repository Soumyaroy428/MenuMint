import { Cafe, MenuCategory, MenuItem, Order, User, OrderStatus, AnalyticsSummary, PromoCode } from './types.js';
import bcrypt from 'bcryptjs';

// Pre-seeded database in memory with consistent IDs and tenant isolation
class Database {
  cafes: Cafe[] = [
    {
      id: 'cafe-1',
      name: 'The Daily Grind Café',
      slug: 'daily-grind',
      description: 'Artisanal roasts, sourdough pastries, and chef-crafted brunch.',
      address: '104 Main Street, Downtown',
      phone: '+1 (555) 234-5678',
      currency: 'USD',
      currencySymbol: '$',
      isOpen: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cafe-2',
      name: 'Bella Vista Bistro',
      slug: 'bella-vista',
      description: 'Authentic Italian espresso, paninis, and gelato.',
      address: '42 Harbor View Ave',
      phone: '+1 (555) 987-6543',
      currency: 'USD',
      currencySymbol: '$',
      isOpen: true,
      createdAt: new Date().toISOString(),
    },
  ];

  categories: MenuCategory[] = [
    { id: 'cat-1', cafeId: 'cafe-1', name: 'Signature Coffee', sortOrder: 1, active: true },
    { id: 'cat-2', cafeId: 'cafe-1', name: 'Cold Brews & Refreshers', sortOrder: 2, active: true },
    { id: 'cat-3', cafeId: 'cafe-1', name: 'Bakery & Pastries', sortOrder: 3, active: true },
    { id: 'cat-4', cafeId: 'cafe-1', name: 'All-Day Brunch', sortOrder: 4, active: true },
    // Cafe 2 categories (to test tenant isolation)
    { id: 'cat-201', cafeId: 'cafe-2', name: 'Italian Espresso', sortOrder: 1, active: true },
  ];

  menuItems: MenuItem[] = [
    {
      id: 'item-1',
      cafeId: 'cafe-1',
      categoryId: 'cat-1',
      name: 'Velvet Flat White',
      description: 'Double ristretto espresso with silky microfoam steamed milk.',
      price: 475, // $4.75
      imageUrl: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'item-2',
      cafeId: 'cafe-1',
      categoryId: 'cat-1',
      name: 'Madagascar Vanilla Latte',
      description: 'House-infused bourbon vanilla syrup, whole milk, and single-origin espresso.',
      price: 525, // $5.25
      imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'item-3',
      cafeId: 'cafe-1',
      categoryId: 'cat-1',
      name: 'Cortado',
      description: 'Equal parts bold espresso and warm textured milk served in a 4.5oz glass.',
      price: 425, // $4.25
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'item-4',
      cafeId: 'cafe-1',
      categoryId: 'cat-2',
      name: '24hr Nitro Cold Brew',
      description: 'Slow-steeped Ethiopian beans infused with nitrogen for a creamy stout-like head.',
      price: 550, // $5.50
      imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'item-5',
      cafeId: 'cafe-1',
      categoryId: 'cat-2',
      name: 'Wild Peach Hibiscus Iced Tea',
      description: 'Caffeine-free botanical iced tea shaken with white peach purée.',
      price: 450, // $4.50
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'item-6',
      cafeId: 'cafe-1',
      categoryId: 'cat-3',
      name: 'Almond Butter Croissant',
      description: 'Flaky French butter pastry double-baked with frangipane and toasted almonds.',
      price: 495, // $4.95
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'item-7',
      cafeId: 'cafe-1',
      categoryId: 'cat-3',
      name: 'Cardamom Cinnamon Cruffin',
      description: 'Croissant dough rolled in Ceylon cinnamon and crushed cardamom, baked in a muffin tin.',
      price: 450, // $4.50
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
      isAvailable: false, // Intentionally unavailable for CP-10 verification!
      createdAt: new Date().toISOString(),
    },
    {
      id: 'item-8',
      cafeId: 'cafe-1',
      categoryId: 'cat-4',
      name: 'Avocado Tartine & Poached Eggs',
      description: 'Sourdough toasted with crushed Hass avocados, Danish feta, chili flakes, and two organic poached eggs.',
      price: 1250, // $12.50
      imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'item-9',
      cafeId: 'cafe-1',
      categoryId: 'cat-4',
      name: 'Brioche French Toast & Berry Compote',
      description: 'Thick-cut golden brioche served with whipped mascarpone, fresh berries, and pure maple syrup.',
      price: 1175, // $11.75
      imageUrl: 'https://images.unsplash.com/photo-1484723091739-0045614eb6c7?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      createdAt: new Date().toISOString(),
    },
    // Cafe 2 item for tenant isolation testing
    {
      id: 'item-201',
      cafeId: 'cafe-2',
      categoryId: 'cat-201',
      name: 'Double Ristretto Espresso',
      description: 'Classic Italian style.',
      price: 350,
      imageUrl: '',
      isAvailable: true,
      createdAt: new Date().toISOString(),
    },
  ];

  orders: Order[] = [
    {
      id: 'ord-init-1',
      orderRef: 'ORD-1001',
      cafeId: 'cafe-1',
      status: 'PREPARING',
      orderType: 'dine-in',
      customerName: 'Sarah Jenkins',
      tableNumber: 'Table 4',
      notes: 'Oat milk in the latte please',
      items: [
        {
          menuItemId: 'item-1',
          name: 'Velvet Flat White',
          unitPrice: 475,
          quantity: 2,
          lineTotal: 950,
        },
        {
          menuItemId: 'item-6',
          name: 'Almond Butter Croissant',
          unitPrice: 495,
          quantity: 1,
          lineTotal: 495,
        },
      ],
      subtotal: 1445,
      tax: 72,
      total: 1517,
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ord-init-2',
      orderRef: 'ORD-1002',
      cafeId: 'cafe-1',
      status: 'PENDING',
      orderType: 'takeaway',
      customerName: 'Marcus Vance',
      customerPhone: '+1 (555) 789-1234',
      notes: 'Leaving in 10 mins',
      items: [
        {
          menuItemId: 'item-4',
          name: '24hr Nitro Cold Brew',
          unitPrice: 550,
          quantity: 1,
          lineTotal: 550,
        },
      ],
      subtotal: 550,
      tax: 28,
      total: 578,
      createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // Cafe 2 order for tenant isolation tests
    {
      id: 'ord-init-201',
      orderRef: 'ORD-2001',
      cafeId: 'cafe-2',
      status: 'PENDING',
      orderType: 'dine-in',
      customerName: 'Giovanni Rossi',
      tableNumber: 'Table 1',
      items: [
        {
          menuItemId: 'item-201',
          name: 'Double Ristretto Espresso',
          unitPrice: 350,
          quantity: 1,
          lineTotal: 350,
        },
      ],
      subtotal: 350,
      tax: 18,
      total: 368,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  users: User[] = [
    {
      id: 'user-1',
      email: 'owner@dailygrind.com',
      name: 'Alex Mercer (Owner)',
      // Bcrypt hash for password: "password123"
      passwordHash: bcrypt.hashSync('password123', 10),
      cafeId: 'cafe-1',
      role: 'OWNER',
    },
    {
      id: 'user-2',
      email: 'owner@bellavista.com',
      name: 'Marco Bellini (Owner)',
      passwordHash: bcrypt.hashSync('password123', 10),
      cafeId: 'cafe-2',
      role: 'OWNER',
    },
  ];

  promoCodes: PromoCode[] = [
    {
      id: 'promo-1',
      cafeId: 'cafe-1',
      code: 'MINT10',
      discountType: 'PERCENTAGE',
      discountValue: 10, // 10% off
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'promo-2',
      cafeId: 'cafe-1',
      code: 'WELCOME5',
      discountType: 'FIXED',
      discountValue: 500, // $5.00 off
      minOrderAmount: 1500, // Min $15 order
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'promo-201',
      cafeId: 'cafe-2',
      code: 'BELLA15',
      discountType: 'PERCENTAGE',
      discountValue: 15, // 15% off
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  private orderCounter = 1003;

  // Accessors
  getCafeBySlug(slug: string): Cafe | undefined {
    return this.cafes.find((c) => c.slug === slug);
  }

  getCafeById(id: string): Cafe | undefined {
    return this.cafes.find((c) => c.id === id);
  }

  getCategoriesByCafeId(cafeId: string): MenuCategory[] {
    return this.categories
      .filter((c) => c.cafeId === cafeId && c.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getItemsByCafeId(cafeId: string): MenuItem[] {
    return this.menuItems.filter((i) => i.cafeId === cafeId);
  }

  getItemById(id: string): MenuItem | undefined {
    return this.menuItems.find((i) => i.id === id);
  }

  updateItemAvailability(id: string, isAvailable: boolean): MenuItem | undefined {
    const item = this.menuItems.find((i) => i.id === id);
    if (item) {
      item.isAvailable = isAvailable;
      return item;
    }
    return undefined;
  }

  createMenuItem(item: Omit<MenuItem, 'id' | 'createdAt'>): MenuItem {
    const newItem: MenuItem = {
      ...item,
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    this.menuItems.push(newItem);
    return newItem;
  }

  updateMenuItem(id: string, updates: Partial<Omit<MenuItem, 'id' | 'cafeId' | 'createdAt'>>): MenuItem | undefined {
    const item = this.menuItems.find((i) => i.id === id);
    if (item) {
      Object.assign(item, updates);
      return item;
    }
    return undefined;
  }

  deleteMenuItem(id: string): boolean {
    const idx = this.menuItems.findIndex((i) => i.id === id);
    if (idx !== -1) {
      this.menuItems.splice(idx, 1);
      return true;
    }
    return false;
  }

  createOrder(order: Omit<Order, 'id' | 'orderRef' | 'createdAt' | 'updatedAt'>): Order {
    const newOrder: Order = {
      ...order,
      id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderRef: `ORD-${this.orderCounter++}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.orders.unshift(newOrder);
    return newOrder;
  }

  getOrderById(id: string): Order | undefined {
    return this.orders.find((o) => o.id === id);
  }

  getOrderByRef(orderRef: string): Order | undefined {
    return this.orders.find((o) => o.orderRef.toUpperCase() === orderRef.toUpperCase());
  }

  getOrdersByCafeId(cafeId: string): Order[] {
    return this.orders
      .filter((o) => o.cafeId === cafeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAnalyticsByCafeId(cafeId: string): AnalyticsSummary {
    const orders = this.getOrdersByCafeId(cafeId);
    const nonCancelled = orders.filter((o) => o.status !== 'CANCELLED');
    const totalRevenue = nonCancelled.reduce((sum, o) => sum + o.total, 0);
    const totalTips = nonCancelled.reduce((sum, o) => sum + (o.tip || 0), 0);
    const completedOrders = orders.filter((o) => o.status === 'COMPLETED').length;
    const activeOrders = orders.filter((o) => ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status)).length;
    const dineInCount = orders.filter((o) => o.orderType === 'dine-in').length;
    const takeawayCount = orders.filter((o) => o.orderType === 'takeaway').length;
    const averageOrderValue = nonCancelled.length > 0 ? Math.round(totalRevenue / nonCancelled.length) : 0;

    const statusDistribution: Record<OrderStatus, number> = {
      PENDING: 0,
      ACCEPTED: 0,
      PREPARING: 0,
      READY: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    orders.forEach((o) => {
      if (statusDistribution[o.status] !== undefined) {
        statusDistribution[o.status]++;
      }
    });

    const itemMap = new Map<string, { id: string; name: string; quantitySold: number; revenue: number }>();
    nonCancelled.forEach((o) => {
      o.items.forEach((item) => {
        const existing = itemMap.get(item.menuItemId) || {
          id: item.menuItemId,
          name: item.name,
          quantitySold: 0,
          revenue: 0,
        };
        existing.quantitySold += item.quantity;
        existing.revenue += item.lineTotal;
        itemMap.set(item.menuItemId, existing);
      });
    });

    const topSellingItems = Array.from(itemMap.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);

    return {
      totalRevenue,
      totalTips,
      totalOrders: orders.length,
      completedOrders,
      activeOrders,
      averageOrderValue,
      dineInCount,
      takeawayCount,
      topSellingItems,
      statusDistribution,
    };
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Order | undefined {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      return order;
    }
    return undefined;
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getPromoCodesByCafeId(cafeId: string): PromoCode[] {
    return this.promoCodes.filter((p) => p.cafeId === cafeId);
  }

  getPromoCode(cafeId: string, code: string): PromoCode | undefined {
    return this.promoCodes.find(
      (p) => p.cafeId === cafeId && p.code.toUpperCase() === code.trim().toUpperCase()
    );
  }

  createPromoCode(promo: Omit<PromoCode, 'id' | 'createdAt'>): PromoCode {
    const newPromo: PromoCode = {
      ...promo,
      code: promo.code.trim().toUpperCase(),
      id: `promo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    this.promoCodes.push(newPromo);
    return newPromo;
  }

  togglePromoCode(id: string, cafeId: string, isActive: boolean): PromoCode | undefined {
    const promo = this.promoCodes.find((p) => p.id === id && p.cafeId === cafeId);
    if (promo) {
      promo.isActive = isActive;
      return promo;
    }
    return undefined;
  }

  deletePromoCode(id: string, cafeId: string): boolean {
    const idx = this.promoCodes.findIndex((p) => p.id === id && p.cafeId === cafeId);
    if (idx !== -1) {
      this.promoCodes.splice(idx, 1);
      return true;
    }
    return false;
  }
}

export const db = new Database();

