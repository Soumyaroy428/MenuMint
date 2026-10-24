export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export type OrderType = 'dine-in' | 'takeaway';

export interface LoyaltyProgramConfig {
  enabled: boolean;
  stampsTarget: number;
  rewardDiscountCents: number;
  rewardDescription: string;
}

export interface LoyaltyAccount {
  id: string;
  cafeId: string;
  customerPhone: string;
  customerName?: string;
  stampsCount: number;
  stampsTarget: number;
  totalStampsEarned: number;
  rewardsAvailable: number;
  totalRewardsRedeemed: number;
  lastActivityAt: string;
}

export interface Cafe {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  phone: string;
  currency: string;
  currencySymbol: string;
  taxRate?: number;
  taxName?: string;
  isOpen: boolean;
  pauseReason?: string;
  loyaltyProgram?: LoyaltyProgramConfig;
}

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'it';

export interface MenuCategory {
  id: string;
  cafeId: string;
  name: string;
  sortOrder: number;
  active: boolean;
  translations?: Partial<Record<SupportedLanguage, string>>;
}

export type DietaryTag = 'VEGAN' | 'VEGETARIAN' | 'GLUTEN_FREE' | 'NUT_FREE' | 'SPICY' | 'CHEF_SPECIAL';

export type PrepStation = 'BARISTA' | 'KITCHEN' | 'BAKERY';

export interface MenuItem {
  id: string;
  cafeId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number; // in cents
  imageUrl: string;
  isAvailable: boolean;
  dietaryTags?: DietaryTag[];
  prepStation?: PrepStation;
  trackInventory?: boolean; // CP-47: Real-time inventory deduction & depletion tracking
  inventoryCount?: number; // Current stock on hand
  lowStockThreshold?: number; // Threshold to trigger low-stock warning (e.g. <= 3)
  auto86Enabled?: boolean; // Automatically 86 (set isAvailable: false) when stock reaches 0
  translations?: Partial<Record<SupportedLanguage, { name: string; description?: string }>>; // CP-48: Multilingual Localization
}

export interface InventorySummary {
  totalTrackedItems: number;
  lowStockCount: number;
  depletedCount: number; // 86'd items
  items: MenuItem[];
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface OrderItemSnapshot {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  dietaryTags?: DietaryTag[];
  prepStation?: PrepStation;
}

export interface Order {
  id: string;
  orderRef: string;
  cafeId: string;
  cafeName?: string;
  currencySymbol?: string;
  status: OrderStatus;
  orderType: OrderType;
  customerName: string;
  customerPhone?: string;
  tableNumber?: string;
  notes?: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  discount?: number; // in cents
  promoCode?: string;
  loyaltyDiscount?: number; // in cents (CP-46)
  loyaltyStampEarned?: boolean; // whether order earned a loyalty stamp (CP-46)
  tip?: number; // in cents (gratuity)
  tax: number;
  taxRate?: number;
  taxName?: string;
  total: number;
  estimatedPrepMinutes?: number; // Estimated prep time in minutes (CP-40)
  estimatedReadyAt?: string;     // ISO timestamp for projected completion (CP-40)
  feedback?: {
    rating: number;
    comment?: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerPastOrder {
  orderRef: string;
  cafeId?: string;
  cafeSlug: string;
  cafeName: string;
  currencySymbol: string;
  total: number;
  itemCount: number;
  status: OrderStatus;
  createdAt: string;
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    dietaryTags?: DietaryTag[];
    prepStation?: PrepStation;
  }[];
}

export interface OrderFeedback {
  id: string;
  orderRef: string;
  cafeId: string;
  rating: number; // 1 to 5
  comment?: string;
  customerName: string;
  createdAt: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface PromoCode {
  id: string;
  cafeId: string;
  code: string;
  discountType: DiscountType;
  discountValue: number; // percentage (e.g., 10) or cents (e.g., 200)
  minOrderAmount?: number; // min subtotal in cents
  isActive: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'STAFF';
  cafeId: string;
  cafeName: string;
  cafeSlug: string;
  currencySymbol: string;
}

export interface TopSellingItem {
  id: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalTips: number;
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  averageOrderValue: number;
  dineInCount: number;
  takeawayCount: number;
  topSellingItems: TopSellingItem[];
  statusDistribution: Record<OrderStatus, number>;
  averageRating: number;
  totalFeedbackCount: number;
}

export interface TaxBreakdownLine {
  taxName: string;
  taxRate: number;
  taxableSubtotal: number;
  taxCollected: number;
  orderCount: number;
}

export interface AccountingReport {
  from: string;
  to: string;
  currency: string;
  currencySymbol: string;
  orderCount: number;
  grossSales: number;
  totalDiscounts: number;
  netSales: number;
  totalTaxCollected: number;
  totalTipsCollected: number;
  totalRevenue: number;
  averageTicket: number;
  taxBreakdown: TaxBreakdownLine[];
  orders: {
    id: string;
    orderRef: string;
    createdAt: string;
    orderType: OrderType;
    customerName: string;
    tableNumber?: string;
    subtotal: number;
    discount: number;
    netSubtotal: number;
    taxRate: number;
    taxName: string;
    tax: number;
    tip: number;
    total: number;
    status: OrderStatus;
  }[];
}

