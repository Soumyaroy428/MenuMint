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

// 5. Create a new menu item
dashboardRouter.post('/items', (req: AuthenticatedRequest, res: Response): void => {
  const cafeId = req.user!.cafeId;
  const { name, categoryId, price, description, imageUrl } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Validation Error', message: 'Item name is required.' });
    return;
  }

  if (!categoryId || typeof categoryId !== 'string') {
    res.status(400).json({ error: 'Validation Error', message: 'Valid categoryId is required.' });
    return;
  }

  const categories = db.getCategoriesByCafeId(cafeId);
  const categoryExists = categories.some((c) => c.id === categoryId);
  if (!categoryExists) {
    res.status(400).json({ error: 'Validation Error', message: 'Category not found or does not belong to your café.' });
    return;
  }

  const numericPrice = Number(price);
  if (!Number.isInteger(numericPrice) || numericPrice <= 0 || numericPrice > 100000) {
    res.status(400).json({ error: 'Validation Error', message: 'Price must be a positive integer in minor units (cents).' });
    return;
  }

  const createdItem = db.createMenuItem({
    cafeId,
    categoryId,
    name: name.trim().slice(0, 100),
    description: description ? String(description).trim().slice(0, 300) : '',
    price: numericPrice,
    imageUrl: imageUrl ? String(imageUrl).trim() : '',
    isAvailable: true,
  });

  res.status(201).json({
    success: true,
    message: `Menu item "${createdItem.name}" created successfully.`,
    item: createdItem,
  });
});

// 6. Update an existing menu item
dashboardRouter.put('/items/:id', (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const cafeId = req.user!.cafeId;
  const { name, categoryId, price, description, imageUrl, isAvailable } = req.body;

  const item = db.getItemById(id);
  if (!item) {
    res.status(404).json({ error: 'Not Found', message: `Menu item with ID "${id}" was not found.` });
    return;
  }

  // Tenant Isolation Guard
  if (item.cafeId !== cafeId) {
    res.status(403).json({ error: 'Forbidden', message: 'Access denied. You do not have permission to edit this item.' });
    return;
  }

  const updates: any = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Validation Error', message: 'Item name cannot be empty.' });
      return;
    }
    updates.name = name.trim().slice(0, 100);
  }

  if (categoryId !== undefined) {
    const categories = db.getCategoriesByCafeId(cafeId);
    if (!categories.some((c) => c.id === categoryId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Selected category does not exist in your café.' });
      return;
    }
    updates.categoryId = categoryId;
  }

  if (price !== undefined) {
    const numericPrice = Number(price);
    if (!Number.isInteger(numericPrice) || numericPrice <= 0 || numericPrice > 100000) {
      res.status(400).json({ error: 'Validation Error', message: 'Price must be a positive integer in cents.' });
      return;
    }
    updates.price = numericPrice;
  }

  if (description !== undefined) {
    updates.description = String(description).trim().slice(0, 300);
  }

  if (imageUrl !== undefined) {
    updates.imageUrl = String(imageUrl).trim();
  }

  if (typeof isAvailable === 'boolean') {
    updates.isAvailable = isAvailable;
  }

  const updated = db.updateMenuItem(id, updates);

  res.json({
    success: true,
    message: `Menu item "${updated?.name}" updated successfully.`,
    item: updated,
  });
});

// 7. Delete a menu item
dashboardRouter.delete('/items/:id', (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const cafeId = req.user!.cafeId;

  const item = db.getItemById(id);
  if (!item) {
    res.status(404).json({ error: 'Not Found', message: `Menu item with ID "${id}" was not found.` });
    return;
  }

  // Tenant Isolation Guard
  if (item.cafeId !== cafeId) {
    res.status(403).json({ error: 'Forbidden', message: 'Access denied. You do not have permission to delete this item.' });
    return;
  }

  db.deleteMenuItem(id);

  res.json({
    success: true,
    message: `Menu item "${item.name}" deleted successfully.`,
  });
});

// 8. Get business analytics & performance metrics (Strict Tenant Isolation)
dashboardRouter.get('/analytics', (req: AuthenticatedRequest, res: Response): void => {
  const cafeId = req.user!.cafeId;
  const analytics = db.getAnalyticsByCafeId(cafeId);

  res.json({
    analytics,
  });
});

// 9. Get all promo codes for the authenticated café
dashboardRouter.get('/promos', (req: AuthenticatedRequest, res: Response): void => {
  const cafeId = req.user!.cafeId;
  const promos = db.getPromoCodesByCafeId(cafeId);

  res.json({
    promos,
  });
});

// 10. Create a new promo code
dashboardRouter.post('/promos', (req: AuthenticatedRequest, res: Response): void => {
  const cafeId = req.user!.cafeId;
  const { code, discountType, discountValue, minOrderAmount } = req.body;

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    res.status(400).json({ error: 'Validation Error', message: 'Promo code is required.' });
    return;
  }

  const cleanCode = code.trim().toUpperCase();
  const existing = db.getPromoCode(cafeId, cleanCode);
  if (existing) {
    res.status(400).json({ error: 'Conflict', message: `Promo code "${cleanCode}" already exists for your café.` });
    return;
  }

  if (discountType !== 'PERCENTAGE' && discountType !== 'FIXED') {
    res.status(400).json({ error: 'Validation Error', message: 'discountType must be either "PERCENTAGE" or "FIXED".' });
    return;
  }

  const numericValue = Number(discountValue);
  if (discountType === 'PERCENTAGE') {
    if (!Number.isInteger(numericValue) || numericValue <= 0 || numericValue > 100) {
      res.status(400).json({ error: 'Validation Error', message: 'Percentage discount must be an integer between 1 and 100.' });
      return;
    }
  } else {
    if (!Number.isInteger(numericValue) || numericValue <= 0 || numericValue > 100000) {
      res.status(400).json({ error: 'Validation Error', message: 'Fixed discount must be a positive integer in cents.' });
      return;
    }
  }

  let minAmount: number | undefined = undefined;
  if (minOrderAmount !== undefined && minOrderAmount !== null && minOrderAmount !== '') {
    const parsedMin = Number(minOrderAmount);
    if (!Number.isInteger(parsedMin) || parsedMin < 0) {
      res.status(400).json({ error: 'Validation Error', message: 'Minimum order amount must be a non-negative integer in cents.' });
      return;
    }
    minAmount = parsedMin;
  }

  const createdPromo = db.createPromoCode({
    cafeId,
    code: cleanCode,
    discountType,
    discountValue: numericValue,
    minOrderAmount: minAmount,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: `Promo code "${createdPromo.code}" created successfully.`,
    promo: createdPromo,
  });
});

// 11. Toggle promo code active status
dashboardRouter.patch('/promos/:id/status', (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { isActive } = req.body;
  const cafeId = req.user!.cafeId;

  if (typeof isActive !== 'boolean') {
    res.status(400).json({ error: 'Validation Error', message: 'isActive must be a boolean.' });
    return;
  }

  const updated = db.togglePromoCode(id, cafeId, isActive);
  if (!updated) {
    res.status(404).json({ error: 'Not Found', message: 'Promo code not found or does not belong to your café.' });
    return;
  }

  res.json({
    success: true,
    message: `Promo code "${updated.code}" is now ${isActive ? 'active' : 'inactive'}.`,
    promo: updated,
  });
});

// 12. Delete promo code
dashboardRouter.delete('/promos/:id', (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const cafeId = req.user!.cafeId;

  const deleted = db.deletePromoCode(id, cafeId);
  if (!deleted) {
    res.status(404).json({ error: 'Not Found', message: 'Promo code not found or does not belong to your café.' });
    return;
  }

  res.json({
    success: true,
    message: 'Promo code deleted successfully.',
  });
});

// 13. Get café profile for authenticated owner
dashboardRouter.get('/cafe', (req: AuthenticatedRequest, res: Response): void => {
  const cafeId = req.user!.cafeId;
  const cafe = db.getCafeById(cafeId);

  if (!cafe) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Café profile not found.',
    });
    return;
  }

  res.json({
    cafe,
  });
});

// 14. Update store operating status (Open / Paused with optional rush notice)
dashboardRouter.patch('/cafe/status', (req: AuthenticatedRequest, res: Response): void => {
  const cafeId = req.user!.cafeId;
  const { isOpen, pauseReason } = req.body;

  if (typeof isOpen !== 'boolean') {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Field "isOpen" must be a boolean.',
    });
    return;
  }

  const updatedCafe = db.updateCafeStatus(cafeId, isOpen, pauseReason);
  if (!updatedCafe) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Café not found.',
    });
    return;
  }

  res.json({
    success: true,
    message: isOpen ? 'Store is now open and accepting orders.' : 'Store ordering has been paused.',
    cafe: updatedCafe,
  });
});



