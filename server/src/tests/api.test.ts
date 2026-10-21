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
});

