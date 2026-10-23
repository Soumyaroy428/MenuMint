import { test, describe } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../app.js';
import { db } from '../db.js';

describe('MenuMint API Test Suite', () => {
  let ownerToken: string;

  // 1. Health check
  test('GET /api/health should return ok', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  test('GET /api/cafes should return list of active cafés', async () => {
    const res = await request(app).get('/api/cafes');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.cafes));
    assert.ok(res.body.cafes.length >= 2);
    const dailyGrind = res.body.cafes.find((c: any) => c.slug === 'daily-grind');
    assert.ok(dailyGrind);
    const bellaVista = res.body.cafes.find((c: any) => c.slug === 'bella-vista');
    assert.ok(bellaVista);
  });

  // 2. CP-09: Public café & menu
  test('GET /api/cafes/daily-grind/menu should return café info, categories, and items', async () => {
    const res = await request(app).get('/api/cafes/daily-grind/menu');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.cafe.name, 'The Daily Grind Café');
    assert.ok(Array.isArray(res.body.categories));
    assert.ok(res.body.categories.length > 0);
    assert.ok(Array.isArray(res.body.items));
    assert.ok(res.body.items.length > 0);
  });

  test('GET /api/cafes/unknown-cafe-slug/menu should return 404', async () => {
    const res = await request(app).get('/api/cafes/unknown-cafe-slug/menu');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error, 'Not Found');
  });

  // 3. CP-10: Reject unavailable items
  test('POST /api/orders should reject unavailable items', async () => {
    // item-7 is pre-seeded with isAvailable: false
    const res = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        customerName: 'Test Customer',
        orderType: 'takeaway',
        items: [{ menuItemId: 'item-7', quantity: 1 }],
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Item Unavailable');
  });

  // 4. CP-11: Cart validations
  test('POST /api/orders should reject empty items list', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        customerName: 'Test Customer',
        orderType: 'takeaway',
        items: [],
      });

    assert.strictEqual(res.status, 400);
  });

  test('POST /api/orders should reject negative or zero quantity', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        customerName: 'Test Customer',
        orderType: 'takeaway',
        items: [{ menuItemId: 'item-1', quantity: 0 }],
      });

    assert.strictEqual(res.status, 400);
  });

  // 5. CP-12 & CP-13: Server-authoritative calculation and order creation
  test('POST /api/orders should recalculate prices from DB and ignore client spoofed price', async () => {
    // item-1 price in DB is 475 ($4.75). Client attempts to spoof price as 10 cents.
    const res = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        customerName: 'Honest Customer',
        orderType: 'dine-in',
        tableNumber: 'Table 5',
        items: [{ menuItemId: 'item-1', quantity: 2, price: 10, unitPrice: 10 }],
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.order.orderRef.startsWith('ORD-'));
    // Expected: 2 * 475 = 950 subtotal + 8.25% Sales Tax (78) = 1028 total
    assert.strictEqual(res.body.order.subtotal, 950);
    assert.strictEqual(res.body.order.tax, 78);
    assert.strictEqual(res.body.order.taxRate, 8.25);
    assert.strictEqual(res.body.order.taxName, 'Sales Tax');
    assert.strictEqual(res.body.order.total, 1028);
  });

  // 6. CP-14: Authentication
  test('POST /api/auth/login should authenticate owner and return token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'owner@dailygrind.com',
        password: 'password123',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token);
    ownerToken = res.body.token;
  });

  test('GET /api/dashboard/orders should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/dashboard/orders');
    assert.strictEqual(res.status, 401);
  });

  // 7. CP-15: Tenant Isolation
  test('GET /api/dashboard/orders should only return orders for authenticated cafe', async () => {
    const res = await request(app)
      .get('/api/dashboard/orders')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.orders));
    // Every order returned must belong to cafe-1
    for (const ord of res.body.orders) {
      assert.strictEqual(ord.cafeId, 'cafe-1');
    }
  });

  test('Owner of Cafe 1 should be forbidden from updating Cafe 2 orders', async () => {
    // ord-init-201 belongs to cafe-2
    const res = await request(app)
      .patch('/api/dashboard/orders/ord-init-201/status')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'ACCEPTED' });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'Forbidden');
  });

  // 8. CP-16: Order Status State Machine
  test('PATCH /api/dashboard/orders/:id/status should allow valid transitions', async () => {
    // Get a pending order for cafe-1
    const listRes = await request(app)
      .get('/api/dashboard/orders')
      .set('Authorization', `Bearer ${ownerToken}`);

    const pendingOrder = listRes.body.orders.find((o: any) => o.status === 'PENDING');
    assert.ok(pendingOrder, 'Found pending order');

    // Transition PENDING -> ACCEPTED
    const patchRes = await request(app)
      .patch(`/api/dashboard/orders/${pendingOrder.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'ACCEPTED' });

    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchRes.body.order.status, 'ACCEPTED');
  });

  test('PATCH /api/dashboard/orders/:id/status should reject invalid transitions', async () => {
    const listRes = await request(app)
      .get('/api/dashboard/orders')
      .set('Authorization', `Bearer ${ownerToken}`);

    const acceptedOrder = listRes.body.orders.find((o: any) => o.status === 'ACCEPTED');
    assert.ok(acceptedOrder, 'Found accepted order');

    // Attempt invalid transition: ACCEPTED -> PENDING (backward transition not allowed)
    const patchRes = await request(app)
      .patch(`/api/dashboard/orders/${acceptedOrder.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'PENDING' });

    assert.strictEqual(patchRes.status, 400);
    assert.strictEqual(patchRes.body.error, 'Invalid Transition');
  });

  // 9. CP-16: Toggle item availability
  test('PATCH /api/dashboard/items/:id/availability should update item availability', async () => {
    const res = await request(app)
      .patch('/api/dashboard/items/item-7/availability')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isAvailable: true });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.item.isAvailable, true);

    // Verify it is now available in public menu
    const menuRes = await request(app).get('/api/cafes/daily-grind/menu');
    const item7 = menuRes.body.items.find((i: any) => i.id === 'item-7');
    assert.strictEqual(item7.isAvailable, true);

    // Reset back to false
    await request(app)
      .patch('/api/dashboard/items/item-7/availability')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isAvailable: false });
  });

  // 10. CP-29: Menu Item Management (Create, Edit, Delete with Tenant Isolation)
  test('POST /api/dashboard/items should create new menu item', async () => {
    const res = await request(app)
      .post('/api/dashboard/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Seasonal Pumpkin Spice Latte',
        categoryId: 'cat-1',
        price: 575,
        description: 'Made with organic spices and house pumpkin purée.',
        imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.item.name, 'Seasonal Pumpkin Spice Latte');
    assert.strictEqual(res.body.item.price, 575);
    assert.strictEqual(res.body.item.cafeId, 'cafe-1');
  });

  test('PUT /api/dashboard/items/:id should update existing menu item', async () => {
    const res = await request(app)
      .put('/api/dashboard/items/item-1')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        price: 495, // Price increase to $4.95
        description: 'Updated silky microfoam recipe.',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.item.price, 495);
  });

  test('Owner of Cafe 1 should be forbidden from editing Cafe 2 item', async () => {
    // item-201 belongs to cafe-2
    const res = await request(app)
      .put('/api/dashboard/items/item-201')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Hacked Item' });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'Forbidden');
  });

  test('DELETE /api/dashboard/items/:id should delete item for authenticated cafe', async () => {
    // First create a temporary item
    const createRes = await request(app)
      .post('/api/dashboard/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Temporary Muffin',
        categoryId: 'cat-3',
        price: 350,
      });

    const tempId = createRes.body.item.id;

    // Delete it
    const deleteRes = await request(app)
      .delete(`/api/dashboard/items/${tempId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteRes.body.success, true);
  });

  // 11. CP-32: Dashboard Analytics & Business Metrics (Tenant Isolated)
  test('GET /api/dashboard/analytics should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/dashboard/analytics');
    assert.strictEqual(res.status, 401);
  });

  test('GET /api/dashboard/analytics should return business metrics with strict tenant isolation', async () => {
    const res = await request(app)
      .get('/api/dashboard/analytics')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.analytics);
    const { analytics } = res.body;

    assert.strictEqual(typeof analytics.totalRevenue, 'number');
    assert.ok(analytics.totalRevenue > 0);
    assert.strictEqual(typeof analytics.totalOrders, 'number');
    assert.ok(analytics.totalOrders >= 2);
    assert.strictEqual(typeof analytics.averageOrderValue, 'number');
    assert.ok(Array.isArray(analytics.topSellingItems));
    assert.ok(analytics.topSellingItems.length > 0);
    assert.strictEqual(typeof analytics.dineInCount, 'number');
    assert.strictEqual(typeof analytics.takeawayCount, 'number');
    assert.ok(analytics.statusDistribution);

    // Verify Cafe 2 has separate isolated analytics
    const cafe2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@bellavista.com', password: 'password123' });
    const cafe2Token = cafe2Login.body.token;

    const cafe2Res = await request(app)
      .get('/api/dashboard/analytics')
      .set('Authorization', `Bearer ${cafe2Token}`);

    assert.strictEqual(cafe2Res.status, 200);
    assert.ok(cafe2Res.body.analytics);
    // Cafe 2 total orders should reflect only Cafe 2
    assert.strictEqual(cafe2Res.body.analytics.totalOrders, 1);
    assert.strictEqual(cafe2Res.body.analytics.totalRevenue, 368);
  });

  // 12. CP-33: Promo Code Engine & Tenant Isolation
  test('POST /api/cafes/:slug/promo/validate should validate promo code and calculate discount', async () => {
    // 10% on $10.00 (1000 cents) = 100 cents discount
    const res = await request(app)
      .post('/api/cafes/daily-grind/promo/validate')
      .send({ code: 'mint10', subtotal: 1000 });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.valid, true);
    assert.strictEqual(res.body.code, 'MINT10');
    assert.strictEqual(res.body.discountAmount, 100);

    // Cafe 2 promo BELLA15 should be rejected on Cafe 1 (Tenant Isolation)
    const crossCafeRes = await request(app)
      .post('/api/cafes/daily-grind/promo/validate')
      .send({ code: 'BELLA15', subtotal: 1000 });

    assert.strictEqual(crossCafeRes.status, 400);
    assert.strictEqual(crossCafeRes.body.valid, false);
  });

  test('POST /api/orders should apply promo code discount and recalculate total correctly', async () => {
    // Note: item-1 was updated to 495 in test 17; item-2 is 525. 495 + 525 = 1020 subtotal
    // MINT10 = 10% off = 102 discount -> 918 discounted subtotal
    // 8.25% Sales Tax on 918 = 76 tax -> 994 total
    const res = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        customerName: 'Discounted Customer',
        orderType: 'dine-in',
        promoCode: 'MINT10',
        items: [
          { menuItemId: 'item-1', quantity: 1 },
          { menuItemId: 'item-2', quantity: 1 },
        ],
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.order.subtotal, 1020);
    assert.strictEqual(res.body.order.discount, 102);
    assert.strictEqual(res.body.order.promoCode, 'MINT10');
    assert.strictEqual(res.body.order.tax, 76);
    assert.strictEqual(res.body.order.taxRate, 8.25);
    assert.strictEqual(res.body.order.taxName, 'Sales Tax');
    assert.strictEqual(res.body.order.total, 994);
  });

  test('GET /api/dashboard/promos should return tenant-scoped promo codes', async () => {
    const res = await request(app)
      .get('/api/dashboard/promos')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.promos));
    const codes = res.body.promos.map((p: any) => p.code);
    assert.ok(codes.includes('MINT10'));
    assert.ok(!codes.includes('BELLA15')); // Cafe 2 promo excluded
  });

  test('POST, PATCH, and DELETE /api/dashboard/promos should manage promo lifecycle', async () => {
    // Create new promo
    const createRes = await request(app)
      .post('/api/dashboard/promos')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        code: 'SUMMER20',
        discountType: 'PERCENTAGE',
        discountValue: 20,
      });

    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createRes.body.promo.code, 'SUMMER20');
    const newPromoId = createRes.body.promo.id;

    // Toggle status to inactive
    const patchRes = await request(app)
      .patch(`/api/dashboard/promos/${newPromoId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isActive: false });

    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchRes.body.promo.isActive, false);

    // Delete promo
    const deleteRes = await request(app)
      .delete(`/api/dashboard/promos/${newPromoId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(deleteRes.status, 200);
  });

  // 13. CP-34: Customer Tipping & Staff Gratuity Engine
  test('POST /api/orders should reject negative tip or non-integer tip', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        customerName: 'Negative Tipper',
        orderType: 'takeaway',
        tip: -50,
        items: [{ menuItemId: 'item-1', quantity: 1 }],
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Validation Error');
  });

  test('POST /api/orders should calculate total with tip and persist tip snapshot', async () => {
    // 1x item-1 (495). subtotal = 495.
    // 8.25% Sales Tax = Math.round(495 * 0.0825) = 41.
    // Tip = 150 ($1.50).
    // Total = 495 + 41 + 150 = 686.
    const res = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        customerName: 'Generous Tipper',
        orderType: 'dine-in',
        tip: 150,
        items: [{ menuItemId: 'item-1', quantity: 1 }],
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.order.subtotal, 495);
    assert.strictEqual(res.body.order.tax, 41);
    assert.strictEqual(res.body.order.taxRate, 8.25);
    assert.strictEqual(res.body.order.taxName, 'Sales Tax');
    assert.strictEqual(res.body.order.tip, 150);
    assert.strictEqual(res.body.order.total, 686);

    // Verify analytics reflects tip
    const analyticsRes = await request(app)
      .get('/api/dashboard/analytics')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(analyticsRes.status, 200);
    assert.strictEqual(typeof analyticsRes.body.analytics.totalTips, 'number');
    assert.ok(analyticsRes.body.analytics.totalTips >= 150);
  });

  // CP-35: Café Operating Status (Store Open / Kitchen Rush Pause Engine)
  test('PATCH /api/dashboard/cafe/status should reject unauthenticated requests', async () => {
    const res = await request(app)
      .patch('/api/dashboard/cafe/status')
      .send({ isOpen: false });

    assert.strictEqual(res.status, 401);
  });

  test('PATCH /api/dashboard/cafe/status should reject non-boolean isOpen', async () => {
    const res = await request(app)
      .patch('/api/dashboard/cafe/status')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isOpen: 'invalid' });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /must be a boolean/i);
  });

  test('PATCH /api/dashboard/cafe/status should pause ordering and reject incoming orders', async () => {
    // 1. Pause orders for Cafe 1
    const pauseRes = await request(app)
      .patch('/api/dashboard/cafe/status')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isOpen: false, pauseReason: 'Kitchen rush: Paused for 20 mins' });

    assert.strictEqual(pauseRes.status, 200);
    assert.strictEqual(pauseRes.body.cafe.isOpen, false);
    assert.strictEqual(pauseRes.body.cafe.pauseReason, 'Kitchen rush: Paused for 20 mins');

    // 2. Verify public menu reflects paused status and pauseReason
    const menuRes = await request(app).get('/api/cafes/daily-grind/menu');
    assert.strictEqual(menuRes.status, 200);
    assert.strictEqual(menuRes.body.cafe.isOpen, false);
    assert.strictEqual(menuRes.body.cafe.pauseReason, 'Kitchen rush: Paused for 20 mins');

    // 3. Attempt placing an order while paused
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        orderType: 'dine-in',
        customerName: 'Rush Customer',
        items: [{ menuItemId: 'item-1', quantity: 1 }],
      });

    assert.strictEqual(orderRes.status, 400);
    assert.strictEqual(orderRes.body.error, 'Café Closed');
    assert.strictEqual(orderRes.body.message, 'Kitchen rush: Paused for 20 mins');

    // 4. Verify Cafe 2 is unaffected (Tenant Isolation)
    const cafe2Menu = await request(app).get('/api/cafes/bella-vista/menu');
    assert.strictEqual(cafe2Menu.status, 200);
    assert.strictEqual(cafe2Menu.body.cafe.isOpen, true);

    // 5. Reopen store
    const reopenRes = await request(app)
      .patch('/api/dashboard/cafe/status')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isOpen: true });

    assert.strictEqual(reopenRes.status, 200);
    assert.strictEqual(reopenRes.body.cafe.isOpen, true);
    assert.strictEqual(reopenRes.body.cafe.pauseReason, undefined);

    // 6. Verify order succeeds after reopening
    const successfulOrderRes = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        orderType: 'dine-in',
        customerName: 'Post Reopen Customer',
        items: [{ menuItemId: 'item-1', quantity: 1 }],
      });

    assert.strictEqual(successfulOrderRes.status, 201);
    assert.strictEqual(successfulOrderRes.body.success, true);
  });

  // CP-36: Customer Dietary Badges & Filter Engine
  test('POST /api/dashboard/items should create menu item with dietary tags', async () => {
    const res = await request(app)
      .post('/api/dashboard/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Organic Matcha Chia Bowl',
        categoryId: 'cat-4',
        price: 850,
        description: 'Ceremonial grade Uji matcha with coconut chia pudding and wild blueberries.',
        dietaryTags: ['VEGAN', 'GLUTEN_FREE', 'CHEF_SPECIAL'],
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.item.name, 'Organic Matcha Chia Bowl');
    assert.deepStrictEqual(res.body.item.dietaryTags, ['VEGAN', 'GLUTEN_FREE', 'CHEF_SPECIAL']);
  });

  test('PUT /api/dashboard/items/:id should update dietary tags and snapshot them on order creation', async () => {
    // 1. Update dietary tags on item-1
    const updateRes = await request(app)
      .put('/api/dashboard/items/item-1')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        dietaryTags: ['VEGETARIAN', 'GLUTEN_FREE', 'CHEF_SPECIAL'],
      });

    assert.strictEqual(updateRes.status, 200);
    assert.deepStrictEqual(updateRes.body.item.dietaryTags, ['VEGETARIAN', 'GLUTEN_FREE', 'CHEF_SPECIAL']);

    // 2. Place an order containing item-1
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        orderType: 'dine-in',
        customerName: 'Dietary Conscientious Customer',
        items: [{ menuItemId: 'item-1', quantity: 1 }],
      });

    assert.strictEqual(orderRes.status, 201);
    const orderedItem = orderRes.body.order.items.find((i: any) => i.menuItemId === 'item-1');
    assert.ok(orderedItem);
    assert.deepStrictEqual(orderedItem.dietaryTags, ['VEGETARIAN', 'GLUTEN_FREE', 'CHEF_SPECIAL']);
  });

  // CP-37: Customer Order Rating & Post-Meal Feedback System
  test('POST /api/orders/:orderRef/feedback should submit valid 1-5 star rating and comment', async () => {
    // 1. Create a fresh order
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        orderType: 'takeaway',
        customerName: 'Samira Khan',
        items: [{ menuItemId: 'item-1', quantity: 1 }],
      });

    assert.strictEqual(orderRes.status, 201);
    const orderRef = orderRes.body.order.orderRef;

    // 2. Submit rating & comment
    const feedbackRes = await request(app)
      .post(`/api/orders/${orderRef}/feedback`)
      .send({
        rating: 5,
        comment: 'Absolutely delightful coffee and rapid turnaround!',
      });

    assert.strictEqual(feedbackRes.status, 201);
    assert.strictEqual(feedbackRes.body.success, true);
    assert.strictEqual(feedbackRes.body.feedback.rating, 5);
    assert.strictEqual(feedbackRes.body.feedback.comment, 'Absolutely delightful coffee and rapid turnaround!');
    assert.strictEqual(feedbackRes.body.feedback.orderRef, orderRef);
    assert.strictEqual(feedbackRes.body.feedback.customerName, 'Samira Khan');

    // 3. Verify order query returns the snapshot feedback
    const trackRes = await request(app).get(`/api/orders/${orderRef}`);
    assert.strictEqual(trackRes.status, 200);
    assert.ok(trackRes.body.order.feedback);
    assert.strictEqual(trackRes.body.order.feedback.rating, 5);
    assert.strictEqual(trackRes.body.order.feedback.comment, 'Absolutely delightful coffee and rapid turnaround!');
  });

  test('POST /api/orders/:orderRef/feedback should reject invalid rating, comment over 500 chars, and duplicates', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        orderType: 'dine-in',
        customerName: 'Reviewer Test',
        items: [{ menuItemId: 'item-1', quantity: 1 }],
      });
    const orderRef = orderRes.body.order.orderRef;

    // Reject rating 0
    const resLow = await request(app)
      .post(`/api/orders/${orderRef}/feedback`)
      .send({ rating: 0 });
    assert.strictEqual(resLow.status, 400);

    // Reject rating 6
    const resHigh = await request(app)
      .post(`/api/orders/${orderRef}/feedback`)
      .send({ rating: 6 });
    assert.strictEqual(resHigh.status, 400);

    // Reject non-integer rating 4.5
    const resFloat = await request(app)
      .post(`/api/orders/${orderRef}/feedback`)
      .send({ rating: 4.5 });
    assert.strictEqual(resFloat.status, 400);

    // Reject comment > 500 characters
    const longComment = 'a'.repeat(501);
    const resLong = await request(app)
      .post(`/api/orders/${orderRef}/feedback`)
      .send({ rating: 4, comment: longComment });
    assert.strictEqual(resLong.status, 400);

    // Valid submission succeeds
    const resValid = await request(app)
      .post(`/api/orders/${orderRef}/feedback`)
      .send({ rating: 4, comment: 'Nice and clean ambience' });
    assert.strictEqual(resValid.status, 201);

    // Duplicate submission on same order rejected
    const resDuplicate = await request(app)
      .post(`/api/orders/${orderRef}/feedback`)
      .send({ rating: 5, comment: 'Trying to review again' });
    assert.strictEqual(resDuplicate.status, 400);
    assert.strictEqual(resDuplicate.body.error, 'Duplicate Feedback');

    // Non-existent order returns 404
    const res404 = await request(app)
      .post('/api/orders/ORD-999999/feedback')
      .send({ rating: 5 });
    assert.strictEqual(res404.status, 404);
  });

  test('GET /api/dashboard/feedback should enforce strict tenant isolation and include metrics in analytics', async () => {
    // 1. Cafe 1 owner fetches feedbacks
    const fbRes = await request(app)
      .get('/api/dashboard/feedback')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(fbRes.status, 200);
    assert.ok(Array.isArray(fbRes.body.feedbacks));
    assert.ok(fbRes.body.count >= 2);
    // Ensure all returned feedbacks belong to cafe-1
    for (const fb of fbRes.body.feedbacks) {
      assert.strictEqual(fb.cafeId, 'cafe-1');
    }

    // 2. Login as Cafe 2 owner (Bella Vista)
    const bellaLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@bellavista.com', password: 'password123' });
    const bellaToken = bellaLogin.body.token;

    const bellaFbRes = await request(app)
      .get('/api/dashboard/feedback')
      .set('Authorization', `Bearer ${bellaToken}`);

    assert.strictEqual(bellaFbRes.status, 200);
    assert.ok(Array.isArray(bellaFbRes.body.feedbacks));
    // Verify Bella Vista has only its own feedbacks
    for (const fb of bellaFbRes.body.feedbacks) {
      assert.strictEqual(fb.cafeId, 'cafe-2');
    }

    // 3. Analytics includes CSAT metrics
    const analyticsRes = await request(app)
      .get('/api/dashboard/analytics')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(analyticsRes.status, 200);
    assert.ok(typeof analyticsRes.body.analytics.averageRating === 'number');
    assert.ok(analyticsRes.body.analytics.averageRating >= 1 && analyticsRes.body.analytics.averageRating <= 5);
    assert.ok(typeof analyticsRes.body.analytics.totalFeedbackCount === 'number');
    assert.ok(analyticsRes.body.analytics.totalFeedbackCount >= 2);
  });

  // CP-38: Multi-Currency & Regional Tax Calculation Engine
  test('GET /api/cafes/:slug/menu should return regional tax rate and tax name', async () => {
    // Cafe 1: 8.25% Sales Tax (USD)
    const c1 = await request(app).get('/api/cafes/daily-grind/menu');
    assert.strictEqual(c1.status, 200);
    assert.strictEqual(c1.body.cafe.taxRate, 8.25);
    assert.strictEqual(c1.body.cafe.taxName, 'Sales Tax');
    assert.strictEqual(c1.body.cafe.currency, 'USD');
    assert.strictEqual(c1.body.cafe.currencySymbol, '$');

    // Cafe 2: 10.0% VAT (EUR)
    const c2 = await request(app).get('/api/cafes/bella-vista/menu');
    assert.strictEqual(c2.status, 200);
    assert.strictEqual(c2.body.cafe.taxRate, 10.0);
    assert.strictEqual(c2.body.cafe.taxName, 'VAT');
    assert.strictEqual(c2.body.cafe.currency, 'EUR');
    assert.strictEqual(c2.body.cafe.currencySymbol, '€');
  });

  test('POST /api/orders should calculate dynamic regional tax and snapshot taxRate and taxName', async () => {
    // 1. Order on Cafe 2 (Bella Vista: 10.0% VAT)
    // item-201 price: 350 cents. 2 items = 700 cents subtotal.
    // 10% VAT of 700 = 70 cents. Total = 770 cents.
    const res2 = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'bella-vista',
        orderType: 'dine-in',
        customerName: 'Marco Polo',
        items: [{ menuItemId: 'item-201', quantity: 2 }],
      });

    assert.strictEqual(res2.status, 201);
    assert.strictEqual(res2.body.order.subtotal, 700);
    assert.strictEqual(res2.body.order.tax, 70); // exactly 10%
    assert.strictEqual(res2.body.order.taxRate, 10.0);
    assert.strictEqual(res2.body.order.taxName, 'VAT');
    assert.strictEqual(res2.body.order.total, 770);
    assert.strictEqual(res2.body.order.currency, 'EUR');
    assert.strictEqual(res2.body.order.currencySymbol, '€');

    // Verify snapshot persists on GET /api/orders/:orderRef
    const orderRef = res2.body.order.orderRef;
    const trackRes = await request(app).get(`/api/orders/${orderRef}`);
    assert.strictEqual(trackRes.status, 200);
    assert.strictEqual(trackRes.body.order.taxRate, 10.0);
    assert.strictEqual(trackRes.body.order.taxName, 'VAT');
    assert.strictEqual(trackRes.body.order.tax, 70);
  });

  test('PATCH /api/dashboard/cafe/settings should update tax and currency settings with validation and tenant isolation', async () => {
    // 1. Reject invalid tax rate (< 0 or > 50)
    const invRes1 = await request(app)
      .patch('/api/dashboard/cafe/settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ taxRate: -5 });
    assert.strictEqual(invRes1.status, 400);

    const invRes2 = await request(app)
      .patch('/api/dashboard/cafe/settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ taxRate: 65 });
    assert.strictEqual(invRes2.status, 400);

    // 2. Reject empty tax name
    const invRes3 = await request(app)
      .patch('/api/dashboard/cafe/settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ taxName: '   ' });
    assert.strictEqual(invRes3.status, 400);

    // 3. Successfully update Cafe 1 settings (e.g. to 9.5% State Sales Tax)
    const updateRes = await request(app)
      .patch('/api/dashboard/cafe/settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        taxRate: 9.5,
        taxName: 'State Sales Tax',
      });

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.cafe.taxRate, 9.5);
    assert.strictEqual(updateRes.body.cafe.taxName, 'State Sales Tax');

    // 4. Verify Cafe 2 remains unaffected (Tenant Isolation)
    const cafe2Check = await request(app).get('/api/cafes/bella-vista/menu');
    assert.strictEqual(cafe2Check.status, 200);
    assert.strictEqual(cafe2Check.body.cafe.taxRate, 10.0);
    assert.strictEqual(cafe2Check.body.cafe.taxName, 'VAT');
  });

  // -------------------------------------------------------------
  // CP-39: Kitchen Station Routing & Split Prep View Engine
  // -------------------------------------------------------------
  test('CP-39: POST /api/dashboard/items should persist prepStation and fallback safely', async () => {
    // 1. Create item with KITCHEN prep station (price in minor units/cents)
    const res1 = await request(app)
      .post('/api/dashboard/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Avocado Toast with Poached Egg',
        categoryId: 'cat-2',
        price: 950,
        description: 'Sourdough toast with mashed avocado and organic poached egg',
        prepStation: 'KITCHEN',
      });

    assert.strictEqual(res1.status, 201);
    assert.strictEqual(res1.body.item.name, 'Avocado Toast with Poached Egg');
    assert.strictEqual(res1.body.item.prepStation, 'KITCHEN');

    // 2. Create item without prepStation (defaults to BARISTA)
    const res2 = await request(app)
      .post('/api/dashboard/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Iced Matcha Latte',
        categoryId: 'cat-1',
        price: 575,
        description: 'Ceremonial grade matcha with oat milk',
      });

    assert.strictEqual(res2.status, 201);
    assert.strictEqual(res2.body.item.prepStation, 'BARISTA');

    // 3. Update prepStation via PUT /api/dashboard/items/:id
    const itemId = res2.body.item.id;
    const resUpdate = await request(app)
      .put(`/api/dashboard/items/${itemId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        prepStation: 'BAKERY',
      });

    assert.strictEqual(resUpdate.status, 200);
    assert.strictEqual(resUpdate.body.item.prepStation, 'BAKERY');
  });

  test('CP-39: POST /api/orders should snapshot prepStation on each order item', async () => {
    // Place order with item-1 (BARISTA) and item-8 (KITCHEN)
    const res = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        customerName: 'Gordon Ramsay',
        orderType: 'dine-in',
        tableNumber: 'Chef Table',
        items: [
          { menuItemId: 'item-1', quantity: 1 },
          { menuItemId: 'item-8', quantity: 2 },
        ],
      });

    assert.strictEqual(res.status, 201);
    const order = res.body.order;
    assert.strictEqual(order.items.length, 2);

    const baristaItem = order.items.find((i: any) => i.menuItemId === 'item-1');
    assert.ok(baristaItem);
    assert.strictEqual(baristaItem.prepStation, 'BARISTA');

    const kitchenItem = order.items.find((i: any) => i.menuItemId === 'item-8');
    assert.ok(kitchenItem);
    assert.strictEqual(kitchenItem.prepStation, 'KITCHEN');

    // Verify snapshot persistence on GET /api/orders/:orderRef
    const getRes = await request(app).get(`/api/orders/${order.orderRef}`);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.order.items[0].prepStation, baristaItem.prepStation);
    assert.strictEqual(getRes.body.order.items[1].prepStation, kitchenItem.prepStation);
  });

  test('CP-39: GET /api/dashboard/orders?station=X should filter orders by station and maintain tenant isolation', async () => {
    // 1. Fetch BARISTA orders for Cafe 1
    const baristaRes = await request(app)
      .get('/api/dashboard/orders?station=BARISTA')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(baristaRes.status, 200);
    assert.ok(Array.isArray(baristaRes.body.orders));
    assert.ok(baristaRes.body.orders.length > 0);
    for (const ord of baristaRes.body.orders) {
      assert.strictEqual(ord.cafeId, 'cafe-1');
      assert.ok(ord.items.some((i: any) => (i.prepStation || 'BARISTA') === 'BARISTA'));
    }

    // 2. Fetch KITCHEN orders for Cafe 1
    const kitchenRes = await request(app)
      .get('/api/dashboard/orders?station=KITCHEN')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(kitchenRes.status, 200);
    assert.ok(Array.isArray(kitchenRes.body.orders));
    for (const ord of kitchenRes.body.orders) {
      assert.strictEqual(ord.cafeId, 'cafe-1');
      assert.ok(ord.items.some((i: any) => i.prepStation === 'KITCHEN'));
    }

    // 3. Fetch BAKERY orders for Cafe 1
    const bakeryRes = await request(app)
      .get('/api/dashboard/orders?station=BAKERY')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(bakeryRes.status, 200);
    assert.ok(Array.isArray(bakeryRes.body.orders));
    for (const ord of bakeryRes.body.orders) {
      assert.strictEqual(ord.cafeId, 'cafe-1');
      assert.ok(ord.items.some((i: any) => i.prepStation === 'BAKERY'));
    }

    // 4. Station=all returns all orders
    const allRes = await request(app)
      .get('/api/dashboard/orders?station=all')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(allRes.status, 200);
    assert.ok(allRes.body.orders.length >= baristaRes.body.orders.length);
  });

  // -------------------------------------------------------------
  // CP-40: Real-Time Kitchen Prep ETA & Dynamic Countdown Engine
  // -------------------------------------------------------------
  test('CP-40: POST /api/orders should calculate prep ETA and persist on order tracking', async () => {
    // 1. Barista-only order
    const baristaOrderRes = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        customerName: 'Alice Quick',
        orderType: 'takeaway',
        items: [{ menuItemId: 'item-1', quantity: 1 }],
      });

    assert.strictEqual(baristaOrderRes.status, 201);
    const bOrder = baristaOrderRes.body.order;
    assert.ok(typeof bOrder.estimatedPrepMinutes === 'number');
    assert.ok(bOrder.estimatedPrepMinutes >= 4);
    assert.ok(typeof bOrder.estimatedReadyAt === 'string');
    assert.ok(new Date(bOrder.estimatedReadyAt).getTime() > Date.now());

    // 2. Kitchen hot-food order (requires more prep time)
    const kitchenOrderRes = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        customerName: 'Bob Feast',
        orderType: 'dine-in',
        tableNumber: 'Table 7',
        items: [
          { menuItemId: 'item-8', quantity: 2 },
          { menuItemId: 'item-1', quantity: 1 },
        ],
      });

    assert.strictEqual(kitchenOrderRes.status, 201);
    const kOrder = kitchenOrderRes.body.order;
    assert.ok(typeof kOrder.estimatedPrepMinutes === 'number');
    assert.ok(kOrder.estimatedPrepMinutes >= 12);
    assert.ok(kOrder.estimatedPrepMinutes > bOrder.estimatedPrepMinutes);

    // 3. Verify public tracking endpoint exposes ETA fields
    const trackRes = await request(app).get(`/api/orders/${kOrder.orderRef}`);
    assert.strictEqual(trackRes.status, 200);
    assert.strictEqual(trackRes.body.order.estimatedPrepMinutes, kOrder.estimatedPrepMinutes);
    assert.strictEqual(trackRes.body.order.estimatedReadyAt, kOrder.estimatedReadyAt);
  });

  test('CP-40: PATCH /api/dashboard/orders/:id/eta should adjust prep ETA with tenant isolation', async () => {
    // 1. Fetch an active order for Cafe 1
    const ordersRes = await request(app)
      .get('/api/dashboard/orders')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.strictEqual(ordersRes.status, 200);
    const activeOrder = ordersRes.body.orders.find((o: any) =>
      ['PENDING', 'ACCEPTED', 'PREPARING'].includes(o.status)
    );
    assert.ok(activeOrder, 'Active order must exist');

    const originalMins = activeOrder.estimatedPrepMinutes || 10;

    // 2. Delay order ETA by +5 minutes
    const delayRes = await request(app)
      .patch(`/api/dashboard/orders/${activeOrder.id}/eta`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ deltaMinutes: 5 });

    assert.strictEqual(delayRes.status, 200);
    assert.strictEqual(delayRes.body.order.estimatedPrepMinutes, originalMins + 5);
    assert.ok(new Date(delayRes.body.order.estimatedReadyAt).getTime() > Date.now());

    // 3. Directly set ETA to 25 minutes
    const directRes = await request(app)
      .patch(`/api/dashboard/orders/${activeOrder.id}/eta`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ estimatedPrepMinutes: 25 });

    assert.strictEqual(directRes.status, 200);
    assert.strictEqual(directRes.body.order.estimatedPrepMinutes, 25);

    // 4. Reject invalid values
    const invRes1 = await request(app)
      .patch(`/api/dashboard/orders/${activeOrder.id}/eta`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ estimatedPrepMinutes: -10 });
    assert.strictEqual(invRes1.status, 400);

    const invRes2 = await request(app)
      .patch(`/api/dashboard/orders/${activeOrder.id}/eta`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({});
    assert.strictEqual(invRes2.status, 400);

    // 5. Tenant isolation: Cafe 1 owner cannot modify Cafe 2 order ETA
    const cafe2OrderId = 'ord-init-201'; // belongs to cafe-2
    const forbidRes = await request(app)
      .patch(`/api/dashboard/orders/${cafe2OrderId}/eta`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ deltaMinutes: 5 });

    assert.strictEqual(forbidRes.status, 403);
    assert.strictEqual(forbidRes.body.error, 'Forbidden');
  });

  // -------------------------------------------------------------
  // CP-41: Customer Order History & One-Click Quick Reorder Engine
  // -------------------------------------------------------------
  test('CP-41: POST /api/cafes/:slug/reorder-check should check item availability and enforce tenant boundaries', async () => {
    // 1. Check with a mix of in-stock item (item-1), sold-out item (item-7), and missing item (item-999)
    const checkRes = await request(app)
      .post('/api/cafes/daily-grind/reorder-check')
      .send({
        items: [
          { menuItemId: 'item-1' },
          { menuItemId: 'item-7' },
          { menuItemId: 'item-99999' },
        ],
      });

    assert.strictEqual(checkRes.status, 200);
    assert.strictEqual(checkRes.body.cafeId, 'cafe-1');
    assert.strictEqual(typeof checkRes.body.isStoreOpen, 'boolean');
    assert.ok(Array.isArray(checkRes.body.availableItems));
    assert.ok(Array.isArray(checkRes.body.unavailableItems));

    // item-1 must be available
    const availItem1 = checkRes.body.availableItems.find((i: any) => i.id === 'item-1');
    assert.ok(availItem1, 'item-1 should be in availableItems');
    assert.strictEqual(availItem1.name, 'Velvet Flat White');

    // item-7 (sold out) must be in unavailableItems
    const unavailItem7 = checkRes.body.unavailableItems.find((i: any) => i.menuItemId === 'item-7');
    assert.ok(unavailItem7, 'item-7 should be in unavailableItems');
    assert.strictEqual(unavailItem7.reason, 'Item is currently sold out');

    // item-99999 (non-existent) must be in unavailableItems
    const unavailItem999 = checkRes.body.unavailableItems.find((i: any) => i.menuItemId === 'item-99999');
    assert.ok(unavailItem999, 'item-99999 should be in unavailableItems');
    assert.strictEqual(unavailItem999.reason, 'Item no longer exists on menu');

    // 2. Reject non-array items payload
    const badRes = await request(app)
      .post('/api/cafes/daily-grind/reorder-check')
      .send({ items: 'not-an-array' });
    assert.strictEqual(badRes.status, 400);
    assert.strictEqual(badRes.body.error, 'Validation Error');

    // 3. 404 for unknown cafe slug
    const notFoundRes = await request(app)
      .post('/api/cafes/non-existent-cafe/reorder-check')
      .send({ items: [{ menuItemId: 'item-1' }] });
    assert.strictEqual(notFoundRes.status, 404);

    // 4. Tenant isolation: Cafe 2 item on Cafe 1 menu check should be marked as non-existent
    const crossTenantRes = await request(app)
      .post('/api/cafes/daily-grind/reorder-check')
      .send({ items: [{ menuItemId: 'item-201' }] }); // item-201 belongs to cafe-2 (Bella Vista)
    assert.strictEqual(crossTenantRes.status, 200);
    assert.strictEqual(crossTenantRes.body.availableItems.length, 0);
    assert.strictEqual(crossTenantRes.body.unavailableItems[0].menuItemId, 'item-201');
    assert.strictEqual(crossTenantRes.body.unavailableItems[0].reason, 'Item no longer exists on menu');
  });

  // -------------------------------------------------------------
  // CP-42: Customer Inactive Tab Audio-Visual "Order Ready" Web Alert Engine
  // -------------------------------------------------------------
  test('CP-42: Order lifecycle transition to READY should be trackable with public reference', async () => {
    // 1. Place a new order
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        customerName: 'Chime Listener',
        orderType: 'takeaway',
        items: [{ menuItemId: 'item-1', quantity: 1 }],
      });

    assert.strictEqual(orderRes.status, 201);
    const order = orderRes.body.order;
    assert.strictEqual(order.status, 'PENDING');

    // 2. Kitchen accepts order
    const acceptRes = await request(app)
      .patch(`/api/dashboard/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'ACCEPTED' });
    assert.strictEqual(acceptRes.status, 200);
    assert.strictEqual(acceptRes.body.order.status, 'ACCEPTED');

    // 3. Kitchen starts preparing order
    const prepRes = await request(app)
      .patch(`/api/dashboard/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'PREPARING' });
    assert.strictEqual(prepRes.status, 200);
    assert.strictEqual(prepRes.body.order.status, 'PREPARING');

    // 4. Kitchen marks order READY (triggers client chime & notification)
    const readyRes = await request(app)
      .patch(`/api/dashboard/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'READY' });
    assert.strictEqual(readyRes.status, 200);
    assert.strictEqual(readyRes.body.order.status, 'READY');

    // 5. Customer polling verifies status is READY
    const trackRes = await request(app).get(`/api/orders/${order.orderRef}`);
    assert.strictEqual(trackRes.status, 200);
    assert.strictEqual(trackRes.body.order.status, 'READY');
    assert.strictEqual(trackRes.body.order.cafeName, 'The Daily Grind Café');
    assert.ok(trackRes.body.order.estimatedReadyAt);
  });
});





