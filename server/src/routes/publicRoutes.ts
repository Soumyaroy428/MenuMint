import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { OrderItemSnapshot, OrderType } from '../types.js';

export const publicRouter = Router();

// 0. Get all public cafés
publicRouter.get('/cafes', (_req: Request, res: Response): void => {
  const cafes = db.cafes.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    address: c.address,
    phone: c.phone,
    currency: c.currency,
    currencySymbol: c.currencySymbol,
    isOpen: c.isOpen,
  }));
  res.json({ cafes });
});

// 1. Get café details by slug
publicRouter.get('/cafes/:slug', (req: Request, res: Response): void => {
  const { slug } = req.params;
  const cafe = db.getCafeBySlug(slug);

  if (!cafe) {
    res.status(404).json({
      error: 'Not Found',
      message: `Café with slug "${slug}" was not found.`,
    });
    return;
  }

  res.json({
    cafe: {
      id: cafe.id,
      name: cafe.name,
      slug: cafe.slug,
      description: cafe.description,
      address: cafe.address,
      phone: cafe.phone,
      currency: cafe.currency,
      currencySymbol: cafe.currencySymbol,
      isOpen: cafe.isOpen,
      pauseReason: cafe.pauseReason,
    },
  });
});

// 2. Get public menu for a café
publicRouter.get('/cafes/:slug/menu', (req: Request, res: Response): void => {
  const { slug } = req.params;
  const cafe = db.getCafeBySlug(slug);

  if (!cafe) {
    res.status(404).json({
      error: 'Not Found',
      message: `Café with slug "${slug}" was not found.`,
    });
    return;
  }

  const categories = db.getCategoriesByCafeId(cafe.id);
  const items = db.getItemsByCafeId(cafe.id);

  res.json({
    cafe: {
      id: cafe.id,
      name: cafe.name,
      slug: cafe.slug,
      description: cafe.description,
      address: cafe.address,
      phone: cafe.phone,
      currency: cafe.currency,
      currencySymbol: cafe.currencySymbol,
      isOpen: cafe.isOpen,
      pauseReason: cafe.pauseReason,
    },
    categories,
    items,
  });
});

// 3. Submit an order (Server-authoritative calculation and validation)
publicRouter.post('/orders', (req: Request, res: Response): void => {
  const { cafeSlug, cafeId, orderType, customerName, customerPhone, tableNumber, notes, items, promoCode, tip } = req.body;

  // Resolve café
  const cafe = cafeSlug ? db.getCafeBySlug(cafeSlug) : db.getCafeById(cafeId);
  if (!cafe) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Specified café could not be found.',
    });
    return;
  }

  if (!cafe.isOpen) {
    res.status(400).json({
      error: 'Café Closed',
      message: cafe.pauseReason || `${cafe.name} is currently closed for new orders.`,
    });
    return;
  }

  // Validate customer name
  if (!customerName || typeof customerName !== 'string' || customerName.trim().length === 0) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Customer name is required.',
    });
    return;
  }

  const validOrderType: OrderType = orderType === 'takeaway' ? 'takeaway' : 'dine-in';

  // Validate items list
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Cart cannot be empty. Please select at least one item.',
    });
    return;
  }

  if (items.length > 30) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Exceeded maximum number of items per order (30).',
    });
    return;
  }

  const orderItemSnapshots: OrderItemSnapshot[] = [];
  let calculatedSubtotal = 0;

  for (const requestedItem of items) {
    const { menuItemId, quantity } = requestedItem;

    if (!menuItemId || typeof menuItemId !== 'string') {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid menuItemId in request payload.',
      });
      return;
    }

    // Validate quantity is positive integer between 1 and 50
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 50) {
      res.status(400).json({
        error: 'Validation Error',
        message: `Quantity for item ${menuItemId} must be an integer between 1 and 50.`,
      });
      return;
    }

    // Retrieve authentic item from server database
    const authenticItem = db.getItemById(menuItemId);

    if (!authenticItem) {
      res.status(400).json({
        error: 'Item Not Found',
        message: `Menu item with ID "${menuItemId}" does not exist.`,
      });
      return;
    }

    // Verify item belongs to this café
    if (authenticItem.cafeId !== cafe.id) {
      res.status(400).json({
        error: 'Tenant Mismatch',
        message: `Item "${authenticItem.name}" does not belong to café "${cafe.name}".`,
      });
      return;
    }

    // Verify availability
    if (!authenticItem.isAvailable) {
      res.status(400).json({
        error: 'Item Unavailable',
        message: `Sorry, "${authenticItem.name}" is currently sold out and unavailable for ordering.`,
      });
      return;
    }

    // Server-authoritative calculation: unit price is pulled directly from database
    const unitPrice = authenticItem.price;
    const lineTotal = unitPrice * quantity;
    calculatedSubtotal += lineTotal;

    orderItemSnapshots.push({
      menuItemId: authenticItem.id,
      name: authenticItem.name,
      unitPrice,
      quantity,
      lineTotal,
      dietaryTags: authenticItem.dietaryTags,
    });
  }

  // Handle promo code discount if provided
  let discountAmount = 0;
  let appliedPromoCode: string | undefined = undefined;

  if (promoCode && typeof promoCode === 'string' && promoCode.trim().length > 0) {
    const cleanCode = promoCode.trim().toUpperCase();
    const promo = db.getPromoCode(cafe.id, cleanCode);
    if (!promo || !promo.isActive) {
      res.status(400).json({
        error: 'Invalid Promo Code',
        message: `Promo code "${cleanCode}" is invalid or inactive for ${cafe.name}.`,
      });
      return;
    }

    if (promo.minOrderAmount && calculatedSubtotal < promo.minOrderAmount) {
      res.status(400).json({
        error: 'Minimum Order Not Met',
        message: `Promo code "${cleanCode}" requires a minimum order of ${cafe.currencySymbol}${(promo.minOrderAmount / 100).toFixed(2)}.`,
      });
      return;
    }

    if (promo.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((calculatedSubtotal * promo.discountValue) / 100);
    } else {
      discountAmount = Math.min(calculatedSubtotal, promo.discountValue);
    }
    appliedPromoCode = promo.code;
  }

  // Validate tip (gratuity) if provided
  let calculatedTip = 0;
  if (tip !== undefined && tip !== null && tip !== '') {
    const numericTip = Number(tip);
    if (!Number.isInteger(numericTip) || numericTip < 0 || numericTip > 100000) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Tip amount must be a non-negative integer in cents (max $1,000.00).',
      });
      return;
    }
    calculatedTip = numericTip;
  }

  // Calculate tax (5% flat demo tax) on post-discount subtotal
  const discountedSubtotal = Math.max(0, calculatedSubtotal - discountAmount);
  const calculatedTax = Math.round(discountedSubtotal * 0.05);
  const calculatedTotal = discountedSubtotal + calculatedTax + calculatedTip;

  // Persist order
  const newOrder = db.createOrder({
    cafeId: cafe.id,
    status: 'PENDING',
    orderType: validOrderType,
    customerName: customerName.trim().slice(0, 100),
    customerPhone: customerPhone ? String(customerPhone).trim().slice(0, 20) : undefined,
    tableNumber: tableNumber ? String(tableNumber).trim().slice(0, 30) : undefined,
    notes: notes ? String(notes).trim().slice(0, 300) : undefined,
    items: orderItemSnapshots,
    subtotal: calculatedSubtotal,
    discount: discountAmount > 0 ? discountAmount : undefined,
    promoCode: appliedPromoCode,
    tip: calculatedTip > 0 ? calculatedTip : undefined,
    tax: calculatedTax,
    total: calculatedTotal,
  });

  res.status(201).json({
    success: true,
    message: 'Order created successfully.',
    order: {
      id: newOrder.id,
      orderRef: newOrder.orderRef,
      cafeId: newOrder.cafeId,
      status: newOrder.status,
      orderType: newOrder.orderType,
      customerName: newOrder.customerName,
      tableNumber: newOrder.tableNumber,
      items: newOrder.items,
      subtotal: newOrder.subtotal,
      discount: newOrder.discount,
      promoCode: newOrder.promoCode,
      tip: newOrder.tip,
      tax: newOrder.tax,
      total: newOrder.total,
      currency: cafe.currency,
      currencySymbol: cafe.currencySymbol,
      createdAt: newOrder.createdAt,
    },
  });
});

// 4. Track order status by public reference (e.g. ORD-1001)
publicRouter.get('/orders/:orderRef', (req: Request, res: Response): void => {
  const { orderRef } = req.params;
  const order = db.getOrderByRef(orderRef);

  if (!order) {
    res.status(404).json({
      error: 'Not Found',
      message: `Order with reference "${orderRef}" was not found.`,
    });
    return;
  }

  const cafe = db.getCafeById(order.cafeId);

  res.json({
    order: {
      id: order.id,
      orderRef: order.orderRef,
      cafeName: cafe?.name || 'Café',
      currencySymbol: cafe?.currencySymbol || '$',
      status: order.status,
      orderType: order.orderType,
      customerName: order.customerName,
      tableNumber: order.tableNumber,
      items: order.items,
      subtotal: order.subtotal,
      discount: order.discount,
      promoCode: order.promoCode,
      tip: order.tip,
      tax: order.tax,
      total: order.total,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    },
  });
});

// 5. Validate promo code for customer cart
publicRouter.post('/cafes/:slug/promo/validate', (req: Request, res: Response): void => {
  const { slug } = req.params;
  const { code, subtotal } = req.body;

  const cafe = db.getCafeBySlug(slug);
  if (!cafe) {
    res.status(404).json({ error: 'Not Found', message: 'Café not found.' });
    return;
  }

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    res.status(400).json({ error: 'Validation Error', message: 'Promo code is required.' });
    return;
  }

  const cleanCode = code.trim().toUpperCase();
  const promo = db.getPromoCode(cafe.id, cleanCode);
  if (!promo || !promo.isActive) {
    res.status(400).json({
      valid: false,
      error: 'Invalid Promo Code',
      message: `Promo code "${cleanCode}" is invalid or expired for ${cafe.name}.`,
    });
    return;
  }

  const numericSubtotal = Number(subtotal) || 0;
  if (promo.minOrderAmount && numericSubtotal < promo.minOrderAmount) {
    res.status(400).json({
      valid: false,
      error: 'Minimum Order Not Met',
      message: `Requires a minimum order of ${cafe.currencySymbol}${(promo.minOrderAmount / 100).toFixed(2)}.`,
    });
    return;
  }

  let discountAmount = 0;
  if (promo.discountType === 'PERCENTAGE') {
    discountAmount = Math.round((numericSubtotal * promo.discountValue) / 100);
  } else {
    discountAmount = Math.min(numericSubtotal, promo.discountValue);
  }

  res.json({
    valid: true,
    code: promo.code,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    discountAmount,
    message:
      promo.discountType === 'PERCENTAGE'
        ? `${promo.discountValue}% discount applied!`
        : `${cafe.currencySymbol}${(promo.discountValue / 100).toFixed(2)} discount applied!`,
  });
});

