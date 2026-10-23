import { Cafe, MenuCategory, MenuItem, Order, User, OrderStatus, AnalyticsSummary, PromoCode, DietaryTag, OrderFeedback, PrepStation } from './types';

const API_BASE = '/api';

export async function fetchCafes(): Promise<Cafe[]> {
  const res = await fetch(`${API_BASE}/cafes`);
  if (!res.ok) {
    throw new Error('Failed to load café directory');
  }
  const data = await res.json();
  return data.cafes;
}

export async function fetchMenu(slug: string): Promise<{ cafe: Cafe; categories: MenuCategory[]; items: MenuItem[] }> {
  const res = await fetch(`${API_BASE}/cafes/${slug}/menu`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to load menu for "${slug}"`);
  }
  return res.json();
}

export async function submitOrder(orderData: {
  cafeSlug: string;
  orderType: 'dine-in' | 'takeaway';
  customerName: string;
  customerPhone?: string;
  tableNumber?: string;
  notes?: string;
  promoCode?: string;
  tip?: number;
  items: { menuItemId: string; quantity: number }[];
}): Promise<{ success: boolean; order: Order; message: string }> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to submit order');
  }
  return data;
}

export async function trackOrder(orderRef: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${orderRef}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Order not found');
  }
  const data = await res.json();
  return data.order;
}

export async function loginOwner(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Login failed');
  }
  return data;
}

export async function fetchDashboardOrders(token: string, station?: string): Promise<Order[]> {
  const url = station && station !== 'all'
    ? `${API_BASE}/dashboard/orders?station=${encodeURIComponent(station)}`
    : `${API_BASE}/dashboard/orders`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch dashboard orders');
  }
  const data = await res.json();
  return data.orders;
}

export async function updateOrderStatus(token: string, orderId: string, status: OrderStatus): Promise<Order> {
  const res = await fetch(`${API_BASE}/dashboard/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update order status');
  }
  return data.order;
}

export async function updateOrderEta(
  token: string,
  orderId: string,
  payload: { deltaMinutes?: number; estimatedPrepMinutes?: number }
): Promise<Order> {
  const res = await fetch(`${API_BASE}/dashboard/orders/${orderId}/eta`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update order prep ETA');
  }
  return data.order;
}

export async function fetchDashboardMenu(token: string): Promise<{ categories: MenuCategory[]; items: MenuItem[] }> {
  const res = await fetch(`${API_BASE}/dashboard/menu`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch dashboard menu');
  }
  return res.json();
}

export async function toggleItemAvailability(token: string, itemId: string, isAvailable: boolean): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/dashboard/items/${itemId}/availability`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isAvailable }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update item availability');
  }
  return data.item;
}

export async function createMenuItem(
  token: string,
  itemData: { name: string; categoryId: string; price: number; description?: string; imageUrl?: string; dietaryTags?: DietaryTag[]; prepStation?: PrepStation }
): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/dashboard/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(itemData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create menu item');
  }
  return data.item;
}

export async function updateMenuItem(
  token: string,
  itemId: string,
  updates: { name?: string; categoryId?: string; price?: number; description?: string; imageUrl?: string; isAvailable?: boolean; dietaryTags?: DietaryTag[]; prepStation?: PrepStation }
): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/dashboard/items/${itemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update menu item');
  }
  return data.item;
}

export async function deleteMenuItem(token: string, itemId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard/items/${itemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to delete menu item');
  }
}

export async function fetchDashboardAnalytics(token: string): Promise<AnalyticsSummary> {
  const res = await fetch(`${API_BASE}/dashboard/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch analytics');
  }
  const data = await res.json();
  return data.analytics;
}

export async function validatePromoCode(
  cafeSlug: string,
  code: string,
  subtotal: number
): Promise<{
  valid: boolean;
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/cafes/${cafeSlug}/promo/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, subtotal }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Invalid promo code');
  }
  return data;
}

export async function fetchDashboardPromos(token: string): Promise<PromoCode[]> {
  const res = await fetch(`${API_BASE}/dashboard/promos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch promo codes');
  }
  const data = await res.json();
  return data.promos;
}

export async function createDashboardPromo(
  token: string,
  promo: {
    code: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    minOrderAmount?: number;
  }
): Promise<PromoCode> {
  const res = await fetch(`${API_BASE}/dashboard/promos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(promo),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create promo code');
  }
  return data.promo;
}

export async function toggleDashboardPromo(token: string, id: string, isActive: boolean): Promise<PromoCode> {
  const res = await fetch(`${API_BASE}/dashboard/promos/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isActive }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update promo status');
  }
  return data.promo;
}

export async function deleteDashboardPromo(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard/promos/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete promo code');
  }
}

export async function fetchDashboardCafe(token: string): Promise<Cafe> {
  const res = await fetch(`${API_BASE}/dashboard/cafe`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch café profile');
  }
  const data = await res.json();
  return data.cafe;
}

export async function updateDashboardCafeStatus(
  token: string,
  isOpen: boolean,
  pauseReason?: string
): Promise<Cafe> {
  const res = await fetch(`${API_BASE}/dashboard/cafe/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isOpen, pauseReason }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update store status');
  }
  return data.cafe;
}

export async function submitOrderFeedback(
  orderRef: string,
  rating: number,
  comment?: string
): Promise<{ success: boolean; feedback: OrderFeedback; message: string }> {
  const res = await fetch(`${API_BASE}/orders/${orderRef}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to submit feedback');
  }
  return data;
}

export async function fetchDashboardFeedbacks(token: string): Promise<OrderFeedback[]> {
  const res = await fetch(`${API_BASE}/dashboard/feedback`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch customer feedbacks');
  }
  const data = await res.json();
  return data.feedbacks;
}

export async function updateDashboardCafeSettings(
  token: string,
  settings: {
    taxRate?: number;
    taxName?: string;
    currency?: string;
    currencySymbol?: string;
  }
): Promise<Cafe> {
  const res = await fetch(`${API_BASE}/dashboard/cafe/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update store settings');
  }
  return data.cafe;
}






