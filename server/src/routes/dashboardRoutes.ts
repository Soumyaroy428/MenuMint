import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateOwner, AuthenticatedRequest } from '../auth.js';
import { OrderStatus, PrepStation } from '../types.js';

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

const ALLOWED_DIETARY_TAGS = ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'NUT_FREE', 'SPICY', 'CHEF_SPECIAL'];
const ALLOWED_PREP_STATIONS: PrepStation[] = ['BARISTA', 'KITCHEN', 'BAKERY'];

// 1. Get orders for the authenticated café (Strict Tenant Isolation with Prep Station filter - CP-39)
dashboardRouter.get('/orders', (req: AuthenticatedRequest, res: Response): void => {
  const cafeId = req.user!.cafeId;
  const { station } = req.query;
  let orders = db.getOrdersByCafeId(cafeId);

  if (station && typeof station === 'string' && station.trim() !== 'all') {
    const targetStation = station.trim().toUpperCase();
    orders = orders.filter((o) =>
      o.items.some((i) => (i.prepStation || 'BARISTA') === targetStation)
    );
  }

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

// 2b. Adjust or expedite order prep ETA (CP-40)
dashboardRouter.patch('/orders/:id/eta', (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { deltaMinutes, estimatedPrepMinutes } = req.body;
  const cafeId = req.user!.cafeId;

  const order = db.getOrderById(id);
  if (!order) {
    res.status(404).json({
      error: 'Not Found',
      message: `Order with ID "${id}" was not found.`,
    });
    return;
  }

  // Tenant Isolation Guard
  if (order.cafeId !== cafeId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied. You do not have permission to manage this order.',
    });
    return;
  }

  // ETA can only be adjusted for active orders
  const activeStatuses: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PREPARING'];
  if (!activeStatuses.includes(order.status)) {
    res.status(400).json({
      error: 'Invalid Operation',
      message: `Cannot adjust ETA for order in "${order.status}" status. Only active orders (PENDING, ACCEPTED, PREPARING) support ETA adjustments.`,
    });
    return;
  }

  let updatedReadyAtMs: number;
  let finalPrepMinutes: number;

  if (typeof estimatedPrepMinutes === 'number' && Number.isInteger(estimatedPrepMinutes)) {
    if (estimatedPrepMinutes < 1 || estimatedPrepMinutes > 120) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'estimatedPrepMinutes must be an integer between 1 and 120.',
      });
      return;
    }
    updatedReadyAtMs = Date.now() + estimatedPrepMinutes * 60 * 1000;
    finalPrepMinutes = Math.max(1, Math.round((updatedReadyAtMs - new Date(order.createdAt).getTime()) / 60000));
  } else if (typeof deltaMinutes === 'number' && Number.isInteger(deltaMinutes)) {
    if (deltaMinutes < -60 || deltaMinutes > 60) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'deltaMinutes must be an integer between -60 and +60.',
      });
      return;
    }
    const currentBaseMs = order.estimatedReadyAt
      ? Math.max(new Date(order.estimatedReadyAt).getTime(), Date.now())
      : Date.now() + (order.estimatedPrepMinutes || 10) * 60 * 1000;
    updatedReadyAtMs = Math.max(currentBaseMs + deltaMinutes * 60 * 1000, Date.now() + 60 * 1000);
    finalPrepMinutes = Math.max(1, Math.round((updatedReadyAtMs - new Date(order.createdAt).getTime()) / 60000));
  } else {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Either deltaMinutes or estimatedPrepMinutes integer must be provided.',
    });
    return;
  }

  const newReadyAt = new Date(updatedReadyAtMs).toISOString();
  const updated = db.updateOrderEta(order.id, finalPrepMinutes, newReadyAt);

  res.json({
    success: true,
    message: `Order ETA updated to ${finalPrepMinutes} minutes.`,
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
  const { name, categoryId, price, description, imageUrl, dietaryTags, prepStation } = req.body;

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

  let validDietaryTags: any = undefined;
  if (Array.isArray(dietaryTags)) {
    validDietaryTags = dietaryTags.filter((t) => ALLOWED_DIETARY_TAGS.includes(t));
  }

  let validPrepStation: PrepStation | undefined = undefined;
  if (prepStation && ALLOWED_PREP_STATIONS.includes(prepStation)) {
    validPrepStation = prepStation;
  }

  const createdItem = db.createMenuItem({
    cafeId,
    categoryId,
    name: name.trim().slice(0, 100),
    description: description ? String(description).trim().slice(0, 300) : '',
    price: numericPrice,
    imageUrl: imageUrl ? String(imageUrl).trim() : '',
    isAvailable: true,
    dietaryTags: validDietaryTags,
    prepStation: validPrepStation || 'BARISTA',
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
  const { name, categoryId, price, description, imageUrl, isAvailable, dietaryTags, prepStation } = req.body;

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

  if (Array.isArray(dietaryTags)) {
    updates.dietaryTags = dietaryTags.filter((t) => ALLOWED_DIETARY_TAGS.includes(t));
  }

  if (prepStation !== undefined && ALLOWED_PREP_STATIONS.includes(prepStation)) {
    updates.prepStation = prepStation;
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

// 15. Get customer feedbacks for authenticated café (Strict Tenant Isolation - CP-37)
dashboardRouter.get('/feedback', (req: AuthenticatedRequest, res: Response): void => {
  const cafeId = req.user!.cafeId;
  const feedbacks = db.getFeedbacksByCafeId(cafeId);

  res.json({
    feedbacks,
    count: feedbacks.length,
  });
});

// 16. Update café settings: Tax rate, Tax label, Currency & Currency Symbol (CP-38)
dashboardRouter.patch('/cafe/settings', (req: AuthenticatedRequest, res: Response): void => {
  const cafeId = req.user!.cafeId;
  const { taxRate, taxName, currency, currencySymbol } = req.body;

  const updates: {
    taxRate?: number;
    taxName?: string;
    currency?: string;
    currencySymbol?: string;
  } = {};

  if (taxRate !== undefined) {
    const numericRate = Number(taxRate);
    if (isNaN(numericRate) || numericRate < 0 || numericRate > 50) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Tax rate must be a valid number between 0% and 50%.',
      });
      return;
    }
    updates.taxRate = Math.round(numericRate * 100) / 100;
  }

  if (taxName !== undefined) {
    if (typeof taxName !== 'string' || taxName.trim().length === 0 || taxName.trim().length > 30) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Tax name must be a string between 1 and 30 characters.',
      });
      return;
    }
    updates.taxName = taxName.trim();
  }

  if (currency !== undefined) {
    if (typeof currency !== 'string' || currency.trim().length < 2 || currency.trim().length > 6) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Currency code must be between 2 and 6 characters (e.g. USD, EUR, GBP).',
      });
      return;
    }
    updates.currency = currency.trim().toUpperCase();
  }

  if (currencySymbol !== undefined) {
    if (typeof currencySymbol !== 'string' || currencySymbol.trim().length === 0 || currencySymbol.trim().length > 5) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Currency symbol must be between 1 and 5 characters (e.g. $, €, £).',
      });
      return;
    }
    updates.currencySymbol = currencySymbol.trim();
  }

  const updatedCafe = db.updateCafeSettings(cafeId, updates);
  if (!updatedCafe) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Café not found.',
    });
    return;
  }

  res.json({
    success: true,
    message: 'Café regional tax and currency settings updated successfully.',
    cafe: updatedCafe,
  });
});

// 17. CP-45: Get periodic financial accounting & tax compliance report
dashboardRouter.get('/accounting/report', (req: AuthenticatedRequest, res: Response): void => {
  const cafeId = req.user!.cafeId;
  const { from, to } = req.query;

  const report = db.getAccountingReport(
    cafeId,
    typeof from === 'string' ? from : undefined,
    typeof to === 'string' ? to : undefined
  );

  res.json({
    success: true,
    report,
  });
});

// 18. CP-45: Export periodic financial accounting & tax statement as CSV
dashboardRouter.get('/accounting/export', (req: AuthenticatedRequest, res: Response): void => {
  const cafeId = req.user!.cafeId;
  const { from, to } = req.query;

  const report = db.getAccountingReport(
    cafeId,
    typeof from === 'string' ? from : undefined,
    typeof to === 'string' ? to : undefined
  );

  const headers = [
    'Date',
    'Order Ref',
    'Order Type',
    'Customer',
    'Table',
    'Gross Subtotal',
    'Discount',
    'Taxable Net Sales',
    'Tax Rate (%)',
    'Tax Label',
    'Tax Collected',
    'Gratuity / Tip',
    'Total Paid',
    'Status',
  ];

  const rows = report.orders.map((o) => [
    new Date(o.createdAt).toLocaleDateString(),
    o.orderRef,
    o.orderType,
    `"${o.customerName.replace(/"/g, '""')}"`,
    `"${(o.tableNumber || '').replace(/"/g, '""')}"`,
    (o.subtotal / 100).toFixed(2),
    (o.discount / 100).toFixed(2),
    (o.netSubtotal / 100).toFixed(2),
    `${o.taxRate}%`,
    `"${o.taxName.replace(/"/g, '""')}"`,
    (o.tax / 100).toFixed(2),
    (o.tip / 100).toFixed(2),
    (o.total / 100).toFixed(2),
    o.status,
  ]);

  const totalRow = [
    `"PERIOD TOTALS (${report.orderCount} Orders)"`,
    '""',
    '""',
    '""',
    '""',
    (report.grossSales / 100).toFixed(2),
    (report.totalDiscounts / 100).toFixed(2),
    (report.netSales / 100).toFixed(2),
    '""',
    '""',
    (report.totalTaxCollected / 100).toFixed(2),
    (report.totalTipsCollected / 100).toFixed(2),
    (report.totalRevenue / 100).toFixed(2),
    '""',
  ];

  const lines = [
    `"MenuMint Periodic Accounting & Tax Statement - ${report.currency} (${report.currencySymbol})"`,
    `"Period: ${report.from} to ${report.to}"`,
    `"Generated: ${new Date().toISOString()}"`,
    '',
    headers.join(','),
    ...rows.map((r) => r.join(',')),
    '',
    totalRow.join(','),
    '',
    '"TAX COMPLIANCE LIABILITY SUMMARY:"',
    ...report.taxBreakdown.map((t) =>
      `"${t.taxName} (${t.taxRate}%)","Taxable Base: ${(t.taxableSubtotal / 100).toFixed(2)}","Tax Collected: ${(t.taxCollected / 100).toFixed(2)}","Orders: ${t.orderCount}"`
    ),
  ];

  const csvContent = lines.join('\n');
  const filename = `menumint-accounting-${report.from.slice(0, 10)}-to-${report.to.slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
});




