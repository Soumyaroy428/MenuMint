import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { OrderItemSnapshot, OrderType, PaymentMethod, PaymentStatus } from '../types.js';
import { calculateBillSplit } from '../billSplitter.js';
import { youpiPaymentService } from '../services/paymentService.js';

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
      taxRate: cafe.taxRate,
      taxName: cafe.taxName,
      isOpen: cafe.isOpen,
      pauseReason: cafe.pauseReason,
      loyaltyProgram: cafe.loyaltyProgram,
      advanceOrdering: cafe.advanceOrdering,
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

  const lang = (req.query.lang as string)?.toLowerCase();
  const validLang = ['es', 'fr', 'it'].includes(lang) ? (lang as 'es' | 'fr' | 'it') : undefined;

  const categories = db.getCategoriesByCafeId(cafe.id).map((cat) => {
    if (validLang && cat.translations && cat.translations[validLang]) {
      return { ...cat, name: cat.translations[validLang]! };
    }
    return cat;
  });

  const items = db.getItemsByCafeId(cafe.id).map((item) => {
    if (validLang && item.translations && item.translations[validLang]) {
      const trans = item.translations[validLang]!;
      return {
        ...item,
        name: trans.name || item.name,
        description: trans.description !== undefined ? trans.description : item.description,
      };
    }
    return item;
  });

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
      taxRate: cafe.taxRate,
      taxName: cafe.taxName,
      isOpen: cafe.isOpen,
      pauseReason: cafe.pauseReason,
      loyaltyProgram: cafe.loyaltyProgram,
      advanceOrdering: cafe.advanceOrdering,
    },
    categories,
    items,
  });
});

// 2.1 Get available pickup slots for advance scheduled orders (CP-49)
publicRouter.get('/cafes/:slug/pickup-slots', (req: Request, res: Response): void => {
  const { slug } = req.params;
  const { date } = req.query;
  const cafe = db.getCafeBySlug(slug);

  if (!cafe) {
    res.status(404).json({
      error: 'Not Found',
      message: `Café with slug "${slug}" was not found.`,
    });
    return;
  }

  const slotsData = db.getPickupSlots(cafe.id, date as string | undefined);
  res.json({
    success: true,
    cafe: {
      id: cafe.id,
      name: cafe.name,
      slug: cafe.slug,
    },
    ...slotsData,
  });
});

// 3. Submit an order (Server-authoritative calculation and validation)
publicRouter.post('/orders', async (req: Request, res: Response): Promise<void> => {
  const {
    cafeSlug,
    cafeId,
    orderType,
    customerName,
    customerPhone,
    tableNumber,
    notes,
    items,
    promoCode,
    tip,
    useLoyaltyReward,
    fulfillmentType,
    scheduledPickupTime,
    pickupWindow,
    paymentMethod,
  } = req.body;

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

  // Validate Scheduled Advance Ordering (CP-49)
  const isScheduled = fulfillmentType === 'SCHEDULED';
  if (isScheduled) {
    if (!cafe.advanceOrdering || !cafe.advanceOrdering.enabled) {
      res.status(400).json({
        error: 'Advance Ordering Disabled',
        message: `Advance scheduled ordering is currently disabled at ${cafe.name}.`,
      });
      return;
    }

    if (!scheduledPickupTime || typeof scheduledPickupTime !== 'string') {
      res.status(400).json({
        error: 'Invalid Scheduled Time',
        message: 'A valid scheduled pickup time is required for advance scheduled orders.',
      });
      return;
    }

    const pickupDate = new Date(scheduledPickupTime);
    if (isNaN(pickupDate.getTime())) {
      res.status(400).json({
        error: 'Invalid Scheduled Time',
        message: 'Scheduled pickup time must be a valid ISO date timestamp.',
      });
      return;
    }

    const now = new Date();
    const minLeadTimeMs = (cafe.advanceOrdering.leadTimeMinutes || 20) * 60 * 1000;
    // Allow 30 seconds of client/server clock tolerance
    if (pickupDate.getTime() < now.getTime() + minLeadTimeMs - 30000) {
      res.status(400).json({
        error: 'Advance Lead Time Required',
        message: `Scheduled orders require at least ${cafe.advanceOrdering.leadTimeMinutes} minutes advance lead time.`,
      });
      return;
    }

    const maxAdvanceDays = cafe.advanceOrdering.maxDaysInAdvance || 2;
    const maxAdvanceMs = maxAdvanceDays * 24 * 60 * 60 * 1000;
    if (pickupDate.getTime() > now.getTime() + maxAdvanceMs + 86400000) {
      res.status(400).json({
        error: 'Exceeded Advance Window',
        message: `Orders can only be scheduled up to ${maxAdvanceDays} days in advance.`,
      });
      return;
    }

    // Validate operating hours
    const [openH, openM] = (cafe.advanceOrdering.operatingHours.open || '07:00').split(':').map(Number);
    const [closeH, closeM] = (cafe.advanceOrdering.operatingHours.close || '21:00').split(':').map(Number);
    const pickupMinutes = pickupDate.getHours() * 60 + pickupDate.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (pickupMinutes < openMinutes || pickupMinutes > closeMinutes) {
      res.status(400).json({
        error: 'Outside Operating Hours',
        message: `Pickup time must fall within café operating hours (${cafe.advanceOrdering.operatingHours.open} - ${cafe.advanceOrdering.operatingHours.close}).`,
      });
      return;
    }
  }

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
      prepStation: authenticItem.prepStation || 'BARISTA',
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

  // Process Loyalty stamp and/or reward redemption (CP-46)
  let loyaltyDiscountAmount = 0;
  let loyaltyResult: any = null;

  if (customerPhone && cafe.loyaltyProgram?.enabled) {
    loyaltyResult = db.recordLoyaltyOrder(
      cafe.id,
      String(customerPhone),
      customerName,
      Boolean(useLoyaltyReward)
    );
    if (loyaltyResult.rewardRedeemed) {
      const remainingSubtotal = Math.max(0, calculatedSubtotal - discountAmount);
      loyaltyDiscountAmount = Math.min(remainingSubtotal, loyaltyResult.discountCents);
    }
  }

  const totalDiscount = discountAmount + loyaltyDiscountAmount;

  // Calculate regional tax on post-discount subtotal (CP-38)
  const discountedSubtotal = Math.max(0, calculatedSubtotal - totalDiscount);
  const effectiveTaxRate = typeof cafe.taxRate === 'number' ? cafe.taxRate : 8.25;
  const effectiveTaxName = cafe.taxName || 'Sales Tax';
  const calculatedTax = Math.round((discountedSubtotal * effectiveTaxRate) / 100);
  const calculatedTotal = discountedSubtotal + calculatedTax + calculatedTip;

  // Calculate dynamic prep ETA based on stations and active queue load (CP-40)
  const hasKitchen = orderItemSnapshots.some((i) => i.prepStation === 'KITCHEN');
  const hasBakery = orderItemSnapshots.some((i) => i.prepStation === 'BAKERY');
  let basePrepTime = hasKitchen ? 12 : hasBakery ? 6 : 4;

  const totalItemCount = orderItemSnapshots.reduce((acc, i) => acc + i.quantity, 0);
  if (totalItemCount > 2) {
    basePrepTime += Math.min(totalItemCount - 2, 6);
  }

  const activeCafeOrders = db.getOrdersByCafeId(cafe.id).filter((o) =>
    ['PENDING', 'ACCEPTED', 'PREPARING'].includes(o.status)
  ).length;
  const queueDelay = activeCafeOrders * 2;

  const estimatedPrepMinutes = Math.min(Math.max(basePrepTime + queueDelay, 5), 60);
  const estimatedReadyAt = new Date(Date.now() + estimatedPrepMinutes * 60 * 1000).toISOString();

  // Deduct inventory and trigger auto-86 if stock hits 0 (CP-47)
  const inventoryResult = db.deductInventory(
    cafe.id,
    orderItemSnapshots.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity }))
  );
  if (!inventoryResult.success) {
    res.status(400).json({
      error: 'Inventory Depleted',
      message: inventoryResult.error || 'One or more items in your cart are out of stock.',
    });
    return;
  }

  const chosenPaymentMethod: PaymentMethod =
    paymentMethod === 'YOUPI_ONLINE' ? 'YOUPI_ONLINE' : 'CASH';

  // Persist order with snapshot taxRate & taxName, prep ETA, loyalty, and payment status
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
    discount: totalDiscount > 0 ? totalDiscount : undefined,
    promoCode: appliedPromoCode,
    loyaltyDiscount: loyaltyDiscountAmount > 0 ? loyaltyDiscountAmount : undefined,
    loyaltyStampEarned: loyaltyResult ? loyaltyResult.stampEarned : undefined,
    tip: calculatedTip > 0 ? calculatedTip : undefined,
    tax: calculatedTax,
    taxRate: effectiveTaxRate,
    taxName: effectiveTaxName,
    total: calculatedTotal,
    estimatedPrepMinutes,
    estimatedReadyAt,
    fulfillmentType: isScheduled ? 'SCHEDULED' : 'ASAP',
    scheduledPickupTime: isScheduled ? scheduledPickupTime : undefined,
    pickupWindow: isScheduled ? (pickupWindow || undefined) : undefined,
    paymentStatus: 'PENDING',
    paymentMethod: chosenPaymentMethod,
  });

  // If YouPI online payment chosen, generate active gateway session & QR payload
  if (chosenPaymentMethod === 'YOUPI_ONLINE') {
    try {
      const session = await youpiPaymentService.createPaymentSession(newOrder, cafe);
      db.updateOrderPayment(newOrder.id, {
        paymentId: session.paymentId,
        checkoutUrl: session.checkoutUrl,
        qrPayload: session.qrPayload,
      });
      newOrder.paymentId = session.paymentId;
      newOrder.checkoutUrl = session.checkoutUrl;
      newOrder.qrPayload = session.qrPayload;
    } catch {
      // Session creation fallback already handled internally
    }
  }

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
      loyaltyDiscount: newOrder.loyaltyDiscount,
      loyaltyStampEarned: newOrder.loyaltyStampEarned,
      tip: newOrder.tip,
      tax: newOrder.tax,
      taxRate: newOrder.taxRate,
      taxName: newOrder.taxName,
      total: newOrder.total,
      estimatedPrepMinutes: newOrder.estimatedPrepMinutes,
      estimatedReadyAt: newOrder.estimatedReadyAt,
      fulfillmentType: newOrder.fulfillmentType,
      scheduledPickupTime: newOrder.scheduledPickupTime,
      pickupWindow: newOrder.pickupWindow,
      currency: cafe.currency,
      currencySymbol: cafe.currencySymbol,
      paymentStatus: newOrder.paymentStatus || 'PENDING',
      paymentMethod: newOrder.paymentMethod || chosenPaymentMethod,
      paymentId: newOrder.paymentId,
      checkoutUrl: newOrder.checkoutUrl,
      qrPayload: newOrder.qrPayload,
      createdAt: newOrder.createdAt,
    },
    loyalty: loyaltyResult
      ? {
          stampEarned: loyaltyResult.stampEarned,
          rewardUnlocked: loyaltyResult.rewardUnlocked,
          rewardRedeemed: loyaltyResult.rewardRedeemed,
          discountAmount: loyaltyDiscountAmount,
          stampsCount: loyaltyResult.account.stampsCount,
          stampsTarget: loyaltyResult.account.stampsTarget,
          rewardsAvailable: loyaltyResult.account.rewardsAvailable,
        }
      : null,
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
      loyaltyDiscount: order.loyaltyDiscount,
      loyaltyStampEarned: order.loyaltyStampEarned,
      tip: order.tip,
      tax: order.tax,
      taxRate: order.taxRate,
      taxName: order.taxName,
      total: order.total,
      estimatedPrepMinutes: order.estimatedPrepMinutes,
      estimatedReadyAt: order.estimatedReadyAt,
      fulfillmentType: order.fulfillmentType,
      scheduledPickupTime: order.scheduledPickupTime,
      pickupWindow: order.pickupWindow,
      paymentStatus: order.paymentStatus || 'PENDING',
      paymentMethod: order.paymentMethod || 'CASH',
      paymentId: order.paymentId,
      paidAt: order.paidAt,
      checkoutUrl: order.checkoutUrl,
      qrPayload: order.qrPayload,
      feedback: order.feedback,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    },
  });
});

// 4a. Get payment status for live checkout polling
publicRouter.get('/orders/:orderRef/payment-status', (req: Request, res: Response): void => {
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
    success: true,
    orderRef: order.orderRef,
    orderId: order.id,
    paymentStatus: order.paymentStatus || 'PENDING',
    paymentMethod: order.paymentMethod || 'CASH',
    paymentId: order.paymentId,
    paidAt: order.paidAt,
    total: order.total,
    currency: cafe?.currency || 'USD',
    currencySymbol: cafe?.currencySymbol || '$',
    checkoutUrl: order.checkoutUrl,
    qrPayload: order.qrPayload,
  });
});

// 4b. YouPI-PG Webhook listener (Section 12: Webhooks, fulfilment & reconciliation)
publicRouter.post(['/payment/webhook', '/webhooks/payment'], (req: Request, res: Response): void => {
  const signature = (req.headers['x-gateway-signature'] || req.headers['x-signature']) as string | undefined;
  const payload = req.body;
  const orderId = payload?.orderId;
  const paymentId = payload?.paymentId;
  const status = (payload?.status || (payload?.event === 'payment.success' ? 'SUCCESS' : 'FAILED')) as string;

  if (!orderId && !paymentId) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing orderId or paymentId in webhook payload.',
    });
    return;
  }

  const order = (orderId ? db.getOrderByRef(orderId) : null) || (paymentId ? db.getOrderByPaymentId(paymentId) : null);
  if (!order) {
    res.status(404).json({
      error: 'Not Found',
      message: `Order not found for orderId="${orderId}", paymentId="${paymentId}".`,
    });
    return;
  }

  const cafe = db.getCafeById(order.cafeId);
  const secret = cafe?.paymentConfig?.webhookSecret || process.env.YOUPI_WEBHOOK_SECRET || 'youpi_sec_live_grind789';

  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  const isValid = youpiPaymentService.verifyWebhookSignature(rawBody, signature, secret);

  if (!isValid && process.env.NODE_ENV !== 'test-bypass') {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid HMAC-SHA256 webhook signature.',
    });
    return;
  }

  if (status === 'SUCCESS' || payload?.event === 'payment.success') {
    db.updateOrderPayment(order.id, {
      paymentStatus: 'PAID',
      paymentId: paymentId || order.paymentId,
      paidAt: new Date().toISOString(),
    });
  } else if (status === 'FAILED' || payload?.event === 'payment.failed') {
    db.updateOrderPayment(order.id, {
      paymentStatus: 'FAILED',
      paymentId: paymentId || order.paymentId,
    });
  }

  res.status(200).json({
    received: true,
    orderRef: order.orderRef,
    status: status === 'SUCCESS' ? 'PAID' : status,
  });
});

// 4c. Payment simulation endpoint for sandbox verification
publicRouter.post('/orders/:orderRef/simulate-payment', (req: Request, res: Response): void => {
  const { orderRef } = req.params;
  const order = db.getOrderByRef(orderRef);

  if (!order) {
    res.status(404).json({
      error: 'Not Found',
      message: `Order with reference "${orderRef}" was not found.`,
    });
    return;
  }

  const outcome = req.body?.outcome === 'FAILED' ? 'FAILED' : 'PAID';
  const updated = db.updateOrderPayment(order.id, {
    paymentStatus: outcome,
    paidAt: outcome === 'PAID' ? new Date().toISOString() : undefined,
  });

  res.json({
    success: true,
    message: `Simulated payment outcome: ${outcome}`,
    order: updated,
  });
});

// 4b. CP-44: Calculate dine-in bill split breakdown for an order
publicRouter.get('/orders/:orderRef/split', (req: Request, res: Response): void => {
  const { orderRef } = req.params;
  const waysParam = req.query.ways;

  const order = db.getOrderByRef(orderRef);
  if (!order) {
    res.status(404).json({
      error: 'Not Found',
      message: `Order with reference "${orderRef}" was not found.`,
    });
    return;
  }

  let ways = 2;
  if (waysParam !== undefined) {
    const parsed = Number(waysParam);
    if (!Number.isInteger(parsed) || parsed < 2 || parsed > 20) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Split count must be an integer between 2 and 20.',
      });
      return;
    }
    ways = parsed;
  }

  const cafe = db.getCafeById(order.cafeId);

  const splitResult = calculateBillSplit({
    totalCents: order.total,
    subtotalCents: order.subtotal,
    discountCents: order.discount || 0,
    taxCents: order.tax || 0,
    tipCents: order.tip || 0,
    splitCount: ways,
    currencySymbol: cafe?.currencySymbol || '$',
    orderRef: order.orderRef,
    tableNumber: order.tableNumber,
    cafeName: cafe?.name,
  });

  res.json({
    success: true,
    split: splitResult,
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

// 6. Submit customer feedback for an order (CP-37)
publicRouter.post('/orders/:orderRef/feedback', (req: Request, res: Response): void => {
  const { orderRef } = req.params;
  const { rating, comment } = req.body;

  const order = db.getOrderByRef(orderRef);
  if (!order) {
    res.status(404).json({
      error: 'Not Found',
      message: `Order with reference "${orderRef}" was not found.`,
    });
    return;
  }

  // Validate rating (integer 1 to 5)
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Rating must be an integer between 1 and 5.',
    });
    return;
  }

  // Validate comment length (max 500 chars)
  if (comment !== undefined && comment !== null) {
    if (typeof comment !== 'string') {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Feedback comment must be a string.',
      });
      return;
    }
    if (comment.length > 500) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Feedback comment cannot exceed 500 characters.',
      });
      return;
    }
  }

  // Prevent duplicate review per order
  if (order.feedback) {
    res.status(400).json({
      error: 'Duplicate Feedback',
      message: 'Feedback has already been submitted for this order.',
    });
    return;
  }

  const feedback = db.addOrderFeedback(order.orderRef, numericRating, comment);
  if (!feedback) {
    res.status(400).json({
      error: 'Duplicate Feedback',
      message: 'Feedback has already been recorded for this order.',
    });
    return;
  }

  res.status(201).json({
    success: true,
    message: 'Thank you for your feedback!',
    feedback,
  });
});

// 7. Check item availability for one-click reorder (CP-41)
publicRouter.post('/cafes/:slug/reorder-check', (req: Request, res: Response): void => {
  const { slug } = req.params;
  const { items } = req.body;

  const cafe = db.getCafeBySlug(slug);
  if (!cafe) {
    res.status(404).json({ error: 'Not Found', message: 'Café not found.' });
    return;
  }

  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'Validation Error', message: 'items array is required.' });
    return;
  }

  const allCafeItems = db.getItemsByCafeId(cafe.id);
  const availableItems: any[] = [];
  const unavailableItems: { menuItemId: string; name?: string; reason: string }[] = [];

  for (const requested of items) {
    const id = typeof requested === 'string' ? requested : requested?.menuItemId;
    if (!id || typeof id !== 'string') continue;

    const found = allCafeItems.find((i) => i.id === id);
    if (!found) {
      unavailableItems.push({ menuItemId: id, reason: 'Item no longer exists on menu' });
    } else if (!found.isAvailable) {
      unavailableItems.push({ menuItemId: id, name: found.name, reason: 'Item is currently sold out' });
    } else {
      availableItems.push(found);
    }
  }

  res.json({
    cafeId: cafe.id,
    isStoreOpen: cafe.isOpen,
    availableItems,
    unavailableItems,
  });
});

// 8. CP-46: Check customer digital stamp card & loyalty reward balance
publicRouter.get('/cafes/:slug/loyalty', (req: Request, res: Response): void => {
  const { slug } = req.params;
  const { phone } = req.query;

  const cafe = db.getCafeBySlug(slug);
  if (!cafe) {
    res.status(404).json({ error: 'Not Found', message: 'Café not found.' });
    return;
  }

  const program = cafe.loyaltyProgram || {
    enabled: false,
    stampsTarget: 5,
    rewardDiscountCents: 500,
    rewardDescription: 'Loyalty program currently disabled',
  };

  let account: any = null;
  if (program.enabled && typeof phone === 'string' && phone.trim()) {
    account = db.getOrCreateLoyaltyAccount(cafe.id, phone.trim());
  }

  res.json({
    success: true,
    enabled: program.enabled,
    program,
    account: account
      ? {
          stampsCount: account.stampsCount,
          stampsTarget: account.stampsTarget,
          rewardsAvailable: account.rewardsAvailable,
          totalStampsEarned: account.totalStampsEarned,
          totalRewardsRedeemed: account.totalRewardsRedeemed,
          customerName: account.customerName,
          progressPct: Math.min(100, Math.round((account.stampsCount / account.stampsTarget) * 100)),
        }
      : null,
  });
});

