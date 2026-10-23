import { Order, CustomerPastOrder } from '../types';

const STORAGE_KEY = 'menumint_customer_order_history';

export function saveOrderToHistory(order: Order, cafeSlug: string, cafeName: string): void {
  try {
    const existingHistory = getCustomerOrderHistory();
    const newEntry: CustomerPastOrder = {
      orderRef: order.orderRef,
      cafeId: order.cafeId,
      cafeSlug: cafeSlug || 'daily-grind',
      cafeName: cafeName || order.cafeName || 'MenuMint Café',
      currencySymbol: order.currencySymbol || '$',
      total: order.total,
      itemCount: order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0,
      status: order.status,
      createdAt: order.createdAt,
      items: (order.items || []).map((i) => ({
        menuItemId: i.menuItemId,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
        dietaryTags: i.dietaryTags,
        prepStation: i.prepStation,
      })),
    };

    const filtered = existingHistory.filter((o) => o.orderRef !== order.orderRef);
    const updated = [newEntry, ...filtered].slice(0, 25);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save order to local history:', err);
  }
}

export function getCustomerOrderHistory(cafeSlug?: string): CustomerPastOrder[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const orders: CustomerPastOrder[] = JSON.parse(data);
    if (!Array.isArray(orders)) return [];

    if (cafeSlug) {
      return orders.filter((o) => o.cafeSlug === cafeSlug);
    }
    return orders;
  } catch (err) {
    console.error('Failed to read customer order history:', err);
    return [];
  }
}

export function clearCustomerOrderHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear customer order history:', err);
  }
}

