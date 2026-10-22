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
    // Expected: 2 * 475 = 950 subtotal + 5% tax (48) = 998 total
    assert.strictEqual(res.body.order.subtotal, 950);
    assert.strictEqual(res.body.order.tax, 48);
    assert.strictEqual(res.body.order.total, 998);
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
    // 5% tax on 918 = 46 tax -> 964 total
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
    assert.strictEqual(res.body.order.tax, 46);
    assert.strictEqual(res.body.order.total, 964);
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
    // 5% tax = Math.round(495 * 0.05) = 25.
    // Tip = 150 ($1.50).
    // Total = 495 + 25 + 150 = 670.
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
    assert.strictEqual(res.body.order.tax, 25);
    assert.strictEqual(res.body.order.tip, 150);
    assert.strictEqual(res.body.order.total, 670);

    // Verify analytics reflects tip
    const analyticsRes = await request(app)
      .get('/api/dashboard/analytics')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(analyticsRes.status, 200);
    assert.strictEqual(typeof analyticsRes.body.analytics.totalTips, 'number');
    assert.ok(analyticsRes.body.analytics.totalTips >= 150);
  });
});



