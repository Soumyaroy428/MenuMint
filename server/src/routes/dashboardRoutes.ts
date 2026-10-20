import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateOwner, AuthenticatedRequest } from '../auth.js';
import { OrderStatus } from '../types.js';

export const dashboardRouter = Router();

// Apply authentication to all dashboard routes
dashboardRouter.use(authenticateOwner);

// Allowed state transitions map
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED'],
  COMPLETED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

// 1. Get orders for the authenticated café (Strict Tenant Isolation)
dashboardRouter.get('/orders', (req: AuthenticatedRequest, res: Response): void => {
  const cafeId = req.user!.cafeId;
  const orders = db.getOrdersByCafeId(cafeId);

  res.json({
    orders,
    count: orders.length,
  });
});

// 2. Update order status
dashboardRouter.patch('/orders/:id/status', (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { status } = req.body;
  const cafeId = req.user!.cafeId;

  const order = db.getOrderById(id);
  if (!order) {
    res.status(404).json({
      error: 'Not Found',
      message: `Order with ID "${id}" was not found.`,
    });
    return;
  }

  // Tenant Isolation Guard: ensure order belongs to authenticated café
  if (order.cafeId !== cafeId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied. You do not have permission to manage this order.',
    });
    return;
  }

  // State Transition Validation
  const currentStatus = order.status;
  const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];

  if (!allowedNextStatuses.includes(status as OrderStatus)) {
    res.status(400).json({
      error: 'Invalid Transition',
      message: `Cannot transition order status from "${currentStatus}" to "${status}". Allowed transitions: [${allowedNextStatuses.join(', ')}]`,
    });
    return;
  }

  const updated = db.updateOrderStatus(order.id, status as OrderStatus);

  res.json({
    success: true,
    message: `Order status updated to ${status}.`,
    order: updated,
  });
});

// 3. Get menu items for owner management
dashboardRouter.get('/menu', (req: AuthenticatedRequest, res: Response): void => {
  const cafeId = req.user!.cafeId;
  const categories = db.getCategoriesByCafeId(cafeId);
  const items = db.getItemsByCafeId(cafeId);

  res.json({
    categories,
    items,
  });
});

// 4. Toggle item availability
dashboardRouter.patch('/items/:id/availability', (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { isAvailable } = req.body;
  const cafeId = req.user!.cafeId;

  if (typeof isAvailable !== 'boolean') {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Property "isAvailable" must be a boolean.',
    });
    return;
  }

  const item = db.getItemById(id);
  if (!item) {
    res.status(404).json({
      error: 'Not Found',
      message: `Menu item with ID "${id}" was not found.`,
    });
    return;
  }

  // Tenant Isolation Guard
  if (item.cafeId !== cafeId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied. You do not have permission to modify this menu item.',
    });
    return;
  }

  const updated = db.updateItemAvailability(id, isAvailable);

  res.json({
    success: true,
    message: `Item "${item.name}" availability updated to ${isAvailable ? 'available' : 'sold out'}.`,
    item: updated,
  });
});

