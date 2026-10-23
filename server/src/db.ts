import { Cafe, MenuCategory, MenuItem, Order, User, OrderStatus, AnalyticsSummary, PromoCode, OrderFeedback, PrepStation, AccountingReport, TaxBreakdownLine, LoyaltyProgramConfig, LoyaltyAccount, InventorySummary } from './types.js';
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
      taxRate: 8.25,
      taxName: 'Sales Tax',
      isOpen: true,
      loyaltyProgram: {
        enabled: true,
        stampsTarget: 5,
        rewardDiscountCents: 500, // $5.00
        rewardDescription: 'Free Coffee or Pastry (Up to $5.00)',
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cafe-2',
      name: 'Bella Vista Bistro',
      slug: 'bella-vista',
      description: 'Authentic Italian espresso, paninis, and gelato.',
      address: '42 Harbor View Ave',
      phone: '+1 (555) 987-6543',
      currency: 'EUR',
      currencySymbol: '€',
      taxRate: 10.0,
      taxName: 'VAT',
      isOpen: true,
      loyaltyProgram: {
        enabled: true,
        stampsTarget: 6,
        rewardDiscountCents: 450, // €4.50
        rewardDescription: 'Free Italian Espresso or Gelato (Up to €4.50)',
      },
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
      dietaryTags: ['VEGETARIAN', 'CHEF_SPECIAL'],
      prepStation: 'BARISTA',
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
      dietaryTags: ['VEGETARIAN'],
      prepStation: 'BARISTA',
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
      dietaryTags: ['VEGETARIAN', 'GLUTEN_FREE'],
      prepStation: 'BARISTA',
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
      dietaryTags: ['VEGAN', 'GLUTEN_FREE', 'CHEF_SPECIAL'],
      prepStation: 'BARISTA',
      trackInventory: true,
      inventoryCount: 8,
      lowStockThreshold: 2,
      auto86Enabled: true,
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
      dietaryTags: ['VEGAN', 'GLUTEN_FREE'],
      prepStation: 'BARISTA',
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
      dietaryTags: ['VEGETARIAN'],
      prepStation: 'BAKERY',
      trackInventory: true,
      inventoryCount: 15,
      lowStockThreshold: 3,
      auto86Enabled: true,
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
      dietaryTags: ['VEGETARIAN'],
      prepStation: 'BAKERY',
      trackInventory: true,
      inventoryCount: 0,
      lowStockThreshold: 2,
      auto86Enabled: true,
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
      dietaryTags: ['VEGETARIAN', 'CHEF_SPECIAL'],
      prepStation: 'KITCHEN',
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
      dietaryTags: ['VEGETARIAN'],
      prepStation: 'KITCHEN',
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
      dietaryTags: ['VEGAN', 'GLUTEN_FREE'],
      prepStation: 'BARISTA',
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
          prepStation: 'BARISTA',
        },
        {
          menuItemId: 'item-6',
          name: 'Almond Butter Croissant',
          unitPrice: 495,
          quantity: 1,
          lineTotal: 495,
          prepStation: 'BAKERY',
        },
      ],
      subtotal: 1445,
      tax: 72,
      total: 1517,
      estimatedPrepMinutes: 15,
      estimatedReadyAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
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
          prepStation: 'BARISTA',
        },
      ],
      subtotal: 550,
      tax: 28,
      total: 578,
      estimatedPrepMinutes: 8,
      estimatedReadyAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
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
          prepStation: 'BARISTA',
        },
      ],
      subtotal: 350,
      tax: 18,
      total: 368,
      estimatedPrepMinutes: 5,
      estimatedReadyAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
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

  feedbacks: OrderFeedback[] = [
    {
      id: 'fb-1',
      orderRef: 'ORD-1001',
      cafeId: 'cafe-1',
      rating: 5,
      comment: 'Best velvet flat white in town! Perfectly textured microfoam.',
      customerName: 'Elena Rostova',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: 'fb-2',
      orderRef: 'ORD-1002',
      cafeId: 'cafe-1',
      rating: 4,
      comment: 'Super fast pickup service, nitro cold brew was wonderfully smooth.',
      customerName: 'Marcus Vance',
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    },
    // Cafe 2 feedback (Tenant isolation testing)
    {
      id: 'fb-201',
      orderRef: 'ORD-2001',
      cafeId: 'cafe-2',
      rating: 5,
      comment: 'Authentic Italian espresso with thick crema!',
      customerName: 'Giovanni Rossi',
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
  ];

  loyaltyAccounts: LoyaltyAccount[] = [
    {
      id: 'loy-1',
      cafeId: 'cafe-1',
      customerPhone: '5553217890',
      customerName: 'Sam VIP',
      stampsCount: 4,
      stampsTarget: 5,
      totalStampsEarned: 9,
      rewardsAvailable: 1,
      totalRewardsRedeemed: 1,
      lastActivityAt: new Date().toISOString(),
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

  updateCafeStatus(cafeId: string, isOpen: boolean, pauseReason?: string): Cafe | undefined {
    const cafe = this.cafes.find((c) => c.id === cafeId);
    if (cafe) {
      cafe.isOpen = isOpen;
      cafe.pauseReason = isOpen ? undefined : (pauseReason?.trim() || 'Kitchen ordering is temporarily paused.');
      return cafe;
    }
    return undefined;
  }

  updateCafeSettings(
    cafeId: string,
    settings: {
      taxRate?: number;
      taxName?: string;
      currency?: string;
      currencySymbol?: string;
    }
  ): Cafe | undefined {
    const cafe = this.cafes.find((c) => c.id === cafeId);
    if (!cafe) return undefined;

    if (settings.taxRate !== undefined) {
      cafe.taxRate = settings.taxRate;
    }
    if (settings.taxName !== undefined) {
      cafe.taxName = settings.taxName.trim();
    }
    if (settings.currency !== undefined) {
      cafe.currency = settings.currency.trim().toUpperCase();
    }
    if (settings.currencySymbol !== undefined) {
      cafe.currencySymbol = settings.currencySymbol.trim();
    }

    return cafe;
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

    const feedbacks = this.getFeedbacksByCafeId(cafeId);
    const totalFeedbackCount = feedbacks.length;
    const averageRating =
      totalFeedbackCount > 0
        ? Math.round((feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedbackCount) * 10) / 10
        : 0;

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
      averageRating,
      totalFeedbackCount,
    };
  }

  // CP-45: Periodic Financial Accounting & Tax Report Engine
  getAccountingReport(cafeId: string, from?: string, to?: string): AccountingReport {
    const cafe = this.getCafeById(cafeId);
    const orders = this.getOrdersByCafeId(cafeId);

    let fromDate: Date | null = from ? new Date(from) : null;
    let toDate: Date | null = to ? new Date(to) : null;

    if (fromDate && isNaN(fromDate.getTime())) fromDate = null;
    if (toDate && isNaN(toDate.getTime())) toDate = null;

    // If toDate is YYYY-MM-DD (10 chars), set to end of that calendar day
    if (toDate && to && to.length <= 10) {
      toDate.setHours(23, 59, 59, 999);
    }

    const matchingOrders = orders.filter((o) => {
      if (o.status === 'CANCELLED') return false;
      const createdAt = new Date(o.createdAt);
      if (fromDate && createdAt < fromDate) return false;
      if (toDate && createdAt > toDate) return false;
      return true;
    });

    let grossSales = 0;
    let totalDiscounts = 0;
    let netSales = 0;
    let totalTaxCollected = 0;
    let totalTipsCollected = 0;
    let totalRevenue = 0;

    const taxMap = new Map<string, TaxBreakdownLine>();

    const orderRows = matchingOrders.map((o) => {
      const orderSubtotal = o.subtotal || 0;
      const orderDiscount = o.discount || 0;
      const orderNet = Math.max(0, orderSubtotal - orderDiscount);
      const orderTax = o.tax || 0;
      const orderTip = o.tip || 0;
      const orderTotal = o.total || 0;
      const orderTaxRate = typeof o.taxRate === 'number' ? o.taxRate : (typeof cafe?.taxRate === 'number' ? cafe.taxRate : 8.25);
      const orderTaxName = o.taxName || cafe?.taxName || 'Sales Tax';

      grossSales += orderSubtotal;
      totalDiscounts += orderDiscount;
      netSales += orderNet;
      totalTaxCollected += orderTax;
      totalTipsCollected += orderTip;
      totalRevenue += orderTotal;

      const taxKey = `${orderTaxName}_${orderTaxRate}`;
      const existingTax = taxMap.get(taxKey) || {
        taxName: orderTaxName,
        taxRate: orderTaxRate,
        taxableSubtotal: 0,
        taxCollected: 0,
        orderCount: 0,
      };
      existingTax.taxableSubtotal += orderNet;
      existingTax.taxCollected += orderTax;
      existingTax.orderCount += 1;
      taxMap.set(taxKey, existingTax);

      return {
        id: o.id,
        orderRef: o.orderRef,
        createdAt: o.createdAt,
        orderType: o.orderType,
        customerName: o.customerName,
        tableNumber: o.tableNumber,
        subtotal: orderSubtotal,
        discount: orderDiscount,
        netSubtotal: orderNet,
        taxRate: orderTaxRate,
        taxName: orderTaxName,
        tax: orderTax,
        tip: orderTip,
        total: orderTotal,
        status: o.status,
      };
    });

    const orderCount = matchingOrders.length;
    const averageTicket = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;
    const taxBreakdown = Array.from(taxMap.values());

    const earliestDate = matchingOrders.length > 0
      ? matchingOrders.reduce((min, o) => (o.createdAt < min ? o.createdAt : min), matchingOrders[0].createdAt)
      : new Date().toISOString();
    const latestDate = matchingOrders.length > 0
      ? matchingOrders.reduce((max, o) => (o.createdAt > max ? o.createdAt : max), matchingOrders[0].createdAt)
      : new Date().toISOString();

    return {
      from: from || earliestDate,
      to: to || latestDate,
      currency: cafe?.currency || 'USD',
      currencySymbol: cafe?.currencySymbol || '$',
      orderCount,
      grossSales,
      totalDiscounts,
      netSales,
      totalTaxCollected,
      totalTipsCollected,
      totalRevenue,
      averageTicket,
      taxBreakdown,
      orders: orderRows,
    };
  }

  addOrderFeedback(orderRef: string, rating: number, comment?: string): OrderFeedback | null {
    const order = this.getOrderByRef(orderRef);
    if (!order) return null;

    const existing = this.feedbacks.find((f) => f.orderRef.toUpperCase() === orderRef.toUpperCase());
    if (existing || order.feedback) {
      return null;
    }

    const newFeedback: OrderFeedback = {
      id: `fb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderRef: order.orderRef,
      cafeId: order.cafeId,
      rating,
      comment: comment?.trim() ? comment.trim() : undefined,
      customerName: order.customerName,
      createdAt: new Date().toISOString(),
    };

    this.feedbacks.unshift(newFeedback);

    order.feedback = {
      rating,
      comment: newFeedback.comment,
      createdAt: newFeedback.createdAt,
    };

    return newFeedback;
  }

  getFeedbacksByCafeId(cafeId: string): OrderFeedback[] {
    return this.feedbacks
      .filter((f) => f.cafeId === cafeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  updateOrderEta(orderId: string, estimatedPrepMinutes: number, estimatedReadyAt: string): Order | undefined {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) {
      order.estimatedPrepMinutes = estimatedPrepMinutes;
      order.estimatedReadyAt = estimatedReadyAt;
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

  // CP-46: Customer Loyalty Program & Digital Stamp Card Methods
  normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  getLoyaltyAccount(cafeId: string, phone: string): LoyaltyAccount | null {
    const cleanPhone = this.normalizePhone(phone);
    if (!cleanPhone) return null;
    return this.loyaltyAccounts.find((a) => a.cafeId === cafeId && a.customerPhone === cleanPhone) || null;
  }

  getOrCreateLoyaltyAccount(cafeId: string, phone: string, customerName?: string): LoyaltyAccount | null {
    const cafe = this.getCafeById(cafeId);
    if (!cafe?.loyaltyProgram?.enabled) return null;

    const cleanPhone = this.normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 7) return null;

    let account = this.loyaltyAccounts.find((a) => a.cafeId === cafeId && a.customerPhone === cleanPhone);
    if (!account) {
      const target = cafe.loyaltyProgram.stampsTarget || 5;
      account = {
        id: `loy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        cafeId,
        customerPhone: cleanPhone,
        customerName: customerName || 'Valued Guest',
        stampsCount: 0,
        stampsTarget: target,
        totalStampsEarned: 0,
        rewardsAvailable: 0,
        totalRewardsRedeemed: 0,
        lastActivityAt: new Date().toISOString(),
      };
      this.loyaltyAccounts.push(account);
    } else if (customerName && customerName.trim()) {
      account.customerName = customerName.trim();
    }
    return account;
  }

  recordLoyaltyOrder(
    cafeId: string,
    phone: string,
    customerName?: string,
    useReward?: boolean
  ): { stampEarned: boolean; rewardUnlocked: boolean; rewardRedeemed: boolean; discountCents: number; account: LoyaltyAccount | null } {
    const cafe = this.getCafeById(cafeId);
    if (!cafe?.loyaltyProgram?.enabled) {
      return { stampEarned: false, rewardUnlocked: false, rewardRedeemed: false, discountCents: 0, account: null };
    }

    const account = this.getOrCreateLoyaltyAccount(cafeId, phone, customerName);
    if (!account) {
      return { stampEarned: false, rewardUnlocked: false, rewardRedeemed: false, discountCents: 0, account: null };
    }

    let rewardRedeemed = false;
    let discountCents = 0;

    // Check if customer is redeeming an existing unlocked reward
    if (useReward && account.rewardsAvailable > 0) {
      account.rewardsAvailable -= 1;
      account.totalRewardsRedeemed += 1;
      rewardRedeemed = true;
      discountCents = cafe.loyaltyProgram.rewardDiscountCents || 500;
    }

    // Customer earns +1 stamp for placing an order
    account.stampsCount += 1;
    account.totalStampsEarned += 1;
    let rewardUnlocked = false;

    // Check if customer reached stampsTarget
    if (account.stampsCount >= account.stampsTarget) {
      account.rewardsAvailable += 1;
      account.stampsCount = 0;
      rewardUnlocked = true;
    }

    account.lastActivityAt = new Date().toISOString();

    return {
      stampEarned: true,
      rewardUnlocked,
      rewardRedeemed,
      discountCents,
      account,
    };
  }

  updateLoyaltyProgram(cafeId: string, updates: Partial<LoyaltyProgramConfig>): Cafe | null {
    const cafe = this.getCafeById(cafeId);
    if (!cafe) return null;

    const current = cafe.loyaltyProgram || {
      enabled: true,
      stampsTarget: 5,
      rewardDiscountCents: 500,
      rewardDescription: 'Free Coffee or Pastry (Up to $5.00)',
    };

    cafe.loyaltyProgram = {
      ...current,
      ...updates,
    };

    return cafe;
  }

  getLoyaltySummary(cafeId: string) {
    const accounts = this.loyaltyAccounts.filter((a) => a.cafeId === cafeId);
    const totalMembers = accounts.length;
    const totalStampsIssued = accounts.reduce((sum, a) => sum + a.totalStampsEarned, 0);
    const rewardsAvailable = accounts.reduce((sum, a) => sum + a.rewardsAvailable, 0);
    const totalRewardsRedeemed = accounts.reduce((sum, a) => sum + a.totalRewardsRedeemed, 0);

    return {
      totalMembers,
      totalStampsIssued,
      rewardsAvailable,
      totalRewardsRedeemed,
    };
  }

  // CP-47: Auto-86 Inventory Depletion Methods
  deductInventory(
    cafeId: string,
    items: { menuItemId: string; quantity: number }[]
  ): { success: boolean; depletedItemNames: string[]; error?: string } {
    // 1. First pass: verify sufficient stock for all tracked items
    for (const reqItem of items) {
      const item = this.getItemById(reqItem.menuItemId);
      if (item && item.cafeId === cafeId && item.trackInventory) {
        const available = item.inventoryCount !== undefined ? item.inventoryCount : 0;
        if (available < reqItem.quantity) {
          return {
            success: false,
            depletedItemNames: [],
            error: `Only ${available} unit${available === 1 ? '' : 's'} of "${item.name}" remaining in stock.`,
          };
        }
      }
    }

    // 2. Second pass: deduct stock and trigger Auto-86 if depleted
    const depletedItemNames: string[] = [];
    for (const reqItem of items) {
      const item = this.getItemById(reqItem.menuItemId);
      if (item && item.cafeId === cafeId && item.trackInventory) {
        const current = item.inventoryCount !== undefined ? item.inventoryCount : 0;
        const newCount = Math.max(0, current - reqItem.quantity);
        item.inventoryCount = newCount;

        if (newCount === 0 && item.auto86Enabled) {
          item.isAvailable = false;
          depletedItemNames.push(item.name);
        }
      }
    }

    return { success: true, depletedItemNames };
  }

  updateItemStock(
    cafeId: string,
    itemId: string,
    updates: {
      inventoryCount?: number;
      restockDelta?: number;
      trackInventory?: boolean;
      lowStockThreshold?: number;
      auto86Enabled?: boolean;
    }
  ): MenuItem | null {
    const item = this.getItemById(itemId);
    if (!item || item.cafeId !== cafeId) return null;

    if (updates.trackInventory !== undefined) {
      item.trackInventory = Boolean(updates.trackInventory);
    }
    if (updates.lowStockThreshold !== undefined) {
      item.lowStockThreshold = Math.max(0, Number(updates.lowStockThreshold) || 0);
    }
    if (updates.auto86Enabled !== undefined) {
      item.auto86Enabled = Boolean(updates.auto86Enabled);
    }

    if (updates.restockDelta !== undefined) {
      const current = item.inventoryCount || 0;
      item.inventoryCount = Math.max(0, current + updates.restockDelta);
    } else if (updates.inventoryCount !== undefined) {
      item.inventoryCount = Math.max(0, Number(updates.inventoryCount) || 0);
    }

    // Auto-restore availability if restocked above 0
    if (item.inventoryCount !== undefined && item.inventoryCount > 0 && !item.isAvailable && item.auto86Enabled) {
      item.isAvailable = true;
    }

    return item;
  }

  getInventorySummary(cafeId: string): InventorySummary {
    const cafeItems = this.getItemsByCafeId(cafeId);
    const trackedItems = cafeItems.filter((i) => i.trackInventory);

    let lowStockCount = 0;
    let depletedCount = 0;

    for (const item of trackedItems) {
      const count = item.inventoryCount || 0;
      const threshold = item.lowStockThreshold !== undefined ? item.lowStockThreshold : 3;
      if (!item.isAvailable || count === 0) {
        depletedCount++;
      } else if (count <= threshold) {
        lowStockCount++;
      }
    }

    return {
      totalTrackedItems: trackedItems.length,
      lowStockCount,
      depletedCount,
      items: trackedItems,
    };
  }
}

export const db = new Database();

