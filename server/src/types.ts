export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export type OrderType = 'dine-in' | 'takeaway';

export interface Cafe {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  phone: string;
  currency: string;
  currencySymbol: string;
  taxRate: number; // Regional tax percentage (e.g. 8.25 for 8.25%)
  taxName: string; // e.g. 'Sales Tax', 'VAT', 'GST'
  isOpen: boolean;
  pauseReason?: string;
  createdAt: string;
}

export interface MenuCategory {
  id: string;
  cafeId: string;
  name: string;
  sortOrder: number;
  active: boolean;
}

export type DietaryTag = 'VEGAN' | 'VEGETARIAN' | 'GLUTEN_FREE' | 'NUT_FREE' | 'SPICY' | 'CHEF_SPECIAL';

export type PrepStation = 'BARISTA' | 'KITCHEN' | 'BAKERY';

export interface MenuItem {
  id: string;
  cafeId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number; // Stored in minor units (cents), e.g., 450 = $4.50
  imageUrl: string;
  isAvailable: boolean;
  dietaryTags?: DietaryTag[];
  prepStation?: PrepStation;
  createdAt: string;
}

export interface OrderItemSnapshot {
  menuItemId: string;
  name: string;
  unitPrice: number; // Stored price at moment of ordering
  quantity: number;
  lineTotal: number;
  dietaryTags?: DietaryTag[];
  prepStation?: PrepStation;
}

export interface Order {
  id: string;
  orderRef: string; // e.g. ORD-1024
  cafeId: string;
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
  tip?: number; // in cents (gratuity)
  tax: number;
  taxRate?: number; // Snapshot tax rate percentage at order time
  taxName?: string; // Snapshot tax label at order time
  total: number;
  estimatedPrepMinutes?: number; // Estimated prep time in minutes (CP-40)
  estimatedReadyAt?: string;     // ISO timestamp for projected completion (CP-40)
  feedback?: {
    rating: number;
    comment?: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
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
  minOrderAmount?: number; // minimum subtotal in cents required to apply
  isActive: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  cafeId: string;
  role: 'OWNER' | 'STAFF';
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

