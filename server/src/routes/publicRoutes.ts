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
    },
    categories,
    items,
  });
});

// 3. Submit an order (Server-authoritative calculation and validation)
publicRouter.post('/orders', (req: Request, res: Response): void => {
  const { cafeSlug, cafeId, orderType, customerName, customerPhone, tableNumber, notes, items } = req.body;

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
      message: `${cafe.name} is currently closed for new orders.`,
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
    });
  }

  // Calculate tax (5% flat demo tax)
  const calculatedTax = Math.round(calculatedSubtotal * 0.05);
  const calculatedTotal = calculatedSubtotal + calculatedTax;

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
      tax: order.tax,
      total: order.total,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    },
  });
});

