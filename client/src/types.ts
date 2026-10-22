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
  isOpen: boolean;
  pauseReason?: string;
}

export interface MenuCategory {
  id: string;
  cafeId: string;
  name: string;
  sortOrder: number;
  active: boolean;
}

export type DietaryTag = 'VEGAN' | 'VEGETARIAN' | 'GLUTEN_FREE' | 'NUT_FREE' | 'SPICY' | 'CHEF_SPECIAL';

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
  tip?: number; // in cents (gratuity)
  tax: number;
  total: number;
  createdAt: string;
  updatedAt?: string;
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
}

