import { Cafe, MenuCategory, MenuItem, Order, User, OrderStatus } from './types';

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

export async function fetchDashboardOrders(token: string): Promise<Order[]> {
  const res = await fetch(`${API_BASE}/dashboard/orders`, {
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
  itemData: { name: string; categoryId: string; price: number; description?: string; imageUrl?: string }
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
  updates: { name?: string; categoryId?: string; price?: number; description?: string; imageUrl?: string; isAvailable?: boolean }
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


