import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../app.js';
import { db } from '../db.js';
import { youpiPaymentService } from '../services/paymentService.js';
import { PaymentConfigValidator } from '../config/paymentConfig.js';
import { Order, PaymentStatus } from '../types.js';

describe('YOUPI-PG Payment Integration Master Test Suite (Section 11 Checkpoint)', () => {
  let testOrder: Order;
  const webhookSecret = 'test_webhook_secret_key_123';
  const cafeId = 'cafe-1';

  before(() => {
    process.env.YOUPI_WEBHOOK_SECRET = webhookSecret;
    process.env.NODE_ENV = 'test';

    // Seed test order
    testOrder = db.createOrder({
      cafeId,
      status: 'PENDING',
      orderType: 'takeaway',
      customerName: 'Aarav Sharma',
      customerPhone: '+919876543210',
      items: [
        {
          menuItemId: 'item-1',
          name: 'Artisan Espresso',
          unitPrice: 250, // ₹2.50
          quantity: 2,
          lineTotal: 500,
        },
      ],
      subtotal: 500,
      tax: 41,
      total: 541, // 541 paise = ₹5.41
      paymentStatus: 'PENDING',
      paymentMethod: 'YOUPI_ONLINE',
    });
  });

  // Scenario 1: Successful payment-session creation
  test('1. Successful payment-session creation with server-derived amount and UPI intent', async () => {
    const cafe = db.getCafeById(cafeId)!;
    const session = await youpiPaymentService.createPaymentSession(testOrder, cafe);

    assert.ok(session.paymentId, 'Should generate paymentId');
    assert.equal(session.orderId, testOrder.orderRef);
    assert.equal(session.amount, '5.41');
    assert.equal(session.currency, 'INR');
    assert.equal(session.status, 'ACTIVE');
    assert.ok(session.checkoutUrl.includes(session.paymentId || testOrder.orderRef));
    assert.ok(session.qrPayload?.startsWith('upi://pay?'));
  });

  // Scenario 2: Unauthenticated request to staff payment status update
  test('2. Unauthenticated request to staff payment status update should return 401', async () => {
    const res = await request(app)
      .patch(`/api/dashboard/orders/${testOrder.id}/payment`)
      .send({ paymentStatus: 'PAID' });

    assert.equal(res.status, 401);
  });

  // Scenario 3: User/Staff attempting to access another cafe's order (Tenant boundary check)
  test('3. Cross-cafe tenant isolation: Owner of Cafe 2 cannot settle Cafe 1 order', async () => {
    // Generate valid token for Cafe 2
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@bellavista.com', password: 'password123' }); // Cafe 2 owner

    assert.equal(loginRes.status, 200);
    const cafe2Token = loginRes.body.token;

    const res = await request(app)
      .patch(`/api/dashboard/orders/${testOrder.id}/payment`)
      .set('Authorization', `Bearer ${cafe2Token}`)
      .send({ paymentStatus: 'PAID' });

    assert.equal(res.status, 403);
  });

  // Scenario 4: Invalid or missing order ID
  test('4. Webhook with missing orderId and paymentId should return 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/payment/webhook')
      .send({ amount: '5.41', status: 'SUCCESS' });

    assert.equal(res.status, 400);
  });

  // Scenario 5: Amount tampering from the browser is rejected (Server derives authoritative amount)
  test('5. Amount tampering from the client is ignored; server calculates authoritative amount', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        cafeSlug: 'daily-grind',
        orderType: 'dine-in',
        customerName: 'Tamper Tester',
        items: [{ menuItemId: 'item-1', quantity: 1, unitPrice: 1 }], // Client claims $0.01
        total: 1, // Client claims total is $0.01
        paymentMethod: 'YOUPI_ONLINE',
      });

    assert.equal(res.status, 201);
    // Verified DB item-1 price is 350 paise, not 1 paise
    assert.ok(res.body.order.subtotal >= 350, 'Server must enforce authentic DB prices');
  });

  // Scenario 6: Already-paid order cannot be downgraded by delayed failure/expiry event
  test('6. State machine invariant: Already-PAID order cannot be downgraded to FAILED or EXPIRED', async () => {
    const paidOrder = db.createOrder({
      cafeId,
      status: 'ACCEPTED',
      orderType: 'takeaway',
      customerName: 'State Machine Guard',
      items: [{ menuItemId: 'item-1', name: 'Coffee', unitPrice: 300, quantity: 1, lineTotal: 300 }],
      subtotal: 300,
      tax: 25,
      total: 325,
      paymentStatus: 'PAID',
    });

    // Attempt downgrade to FAILED
    const updated = db.updateOrderPayment(paidOrder.id, {
      paymentStatus: 'FAILED',
      source: 'WEBHOOK',
      reason: 'Delayed late failure notification',
    });

    assert.equal(updated?.paymentStatus, 'PAID', 'Must remain PAID');

    // Attempt downgrade to EXPIRED
    const updatedExpired = db.updateOrderPayment(paidOrder.id, {
      paymentStatus: 'EXPIRED',
      source: 'WEBHOOK',
    });

    assert.equal(updatedExpired?.paymentStatus, 'PAID', 'Must remain PAID');
  });

  // Scenario 7: Missing/invalid environment configuration error handling
  test('7. PaymentConfigValidator rejects malformed URLs with clear error', () => {
    assert.throws(
      () => {
        PaymentConfigValidator.getValidatedConfig({ apiUrl: 'invalid-url' });
      },
      /Invalid YOUPI_API_URL/
    );
  });

  // Scenario 8: Gateway timeout and offline resilience (Self-contained fallback)
  test('8. Offline gateway fallback: smoothly provision local session when upstream is unreachable', async () => {
    const cafe = db.getCafeById(cafeId)!;
    // Point to non-existent port to force network timeout/fallback
    const unreachableCafe = {
      ...cafe,
      paymentConfig: {
        ...cafe.paymentConfig!,
        apiUrl: 'http://127.0.0.1:59999',
      },
    };

    const session = await youpiPaymentService.createPaymentSession(testOrder, unreachableCafe as any);
    assert.ok(session.paymentId, 'Should fallback to self-contained payment session');
    assert.equal(session.status, 'ACTIVE');
  });

  // Scenario 9: Valid webhook with correct HMAC signature marks order PAID
  test('9. Valid webhook with HMAC-SHA256 signature updates order to PAID', async () => {
    const order = db.createOrder({
      cafeId,
      status: 'PENDING',
      orderType: 'takeaway',
      customerName: 'Webhook Recipient',
      items: [{ menuItemId: 'item-1', name: 'Item', unitPrice: 200, quantity: 1, lineTotal: 200 }],
      subtotal: 200,
      tax: 16,
      total: 216,
      paymentStatus: 'PENDING',
    });

    const cafe = db.getCafeById(cafeId)!;
    const activeSecret = cafe.paymentConfig?.webhookSecret || webhookSecret;

    const payload = JSON.stringify({
      event: 'SUCCESS',
      orderId: order.orderRef,
      paymentId: `youpi_${order.orderRef}_test`,
      amount: '2.16',
      amountPaise: 216,
      currency: 'INR',
      utr: 'UTR998877665544',
      completedAt: new Date().toISOString(),
    });

    const timestamp = Date.now().toString();
    const signature = 'sha256=' + crypto.createHmac('sha256', activeSecret).update(payload).digest('hex');

    const res = await request(app)
      .post('/api/payment/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Gateway-Signature', signature)
      .set('X-Gateway-Timestamp', timestamp)
      .set('X-Gateway-Delivery-Id', `deliv-${Date.now()}-1`)
      .send(payload);

    assert.equal(res.status, 200);
    assert.equal(res.body.received, true);
    assert.equal(res.body.status, 'PAID');

    const updated = db.getOrderByRef(order.orderRef);
    assert.equal(updated?.paymentStatus, 'PAID');
    assert.equal(updated?.utr, 'UTR998877665544');
  });

  // Scenario 10: Invalid signature and missing signature are rejected with 401
  test('10. Missing or invalid HMAC signature returns 401 Unauthorized', async () => {
    // Missing signature
    const resNoSig = await request(app)
      .post('/api/payment/webhook')
      .set('Content-Type', 'application/json')
      .send({ orderId: testOrder.orderRef, status: 'SUCCESS' });
    assert.equal(resNoSig.status, 401);

    // Forged / wrong signature
    const payload = JSON.stringify({ orderId: testOrder.orderRef, status: 'SUCCESS' });
    const resBadSig = await request(app)
      .post('/api/payment/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Gateway-Signature', 'sha256=bad_hex_hash_000000000000000000000000000000000000000000000000000000000000')
      .send(payload);
    assert.equal(resBadSig.status, 401);
  });

  // Scenario 11: Stale timestamp / replay attack protection
  test('11. Stale timestamp (>5 minutes drift) is rejected by replay guard', () => {
    const rawBody = '{"test":true}';
    const sig = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const staleTimestamp = (Date.now() - 400_000).toString(); // ~6.6 minutes old

    const isValid = youpiPaymentService.verifyWebhookSignature(rawBody, sig, webhookSecret, staleTimestamp);
    assert.equal(isValid, false, 'Should reject stale timestamp');
  });

  // Scenario 12: Duplicate webhook delivery idempotency
  test('12. Duplicate webhook delivery is deduplicated and acknowledged without replay side-effects', async () => {
    const deliveryId = `dup-deliv-uuid-${Date.now()}`;
    const payload = {
      event: 'SUCCESS' as const,
      orderId: testOrder.orderRef,
      paymentId: 'youpi_test_dup',
      amount: '5.41',
      currency: 'INR',
    };

    const firstResult = youpiPaymentService.processWebhookEvent(payload, deliveryId);
    assert.equal(firstResult.success, true);
    assert.equal(firstResult.deduplicated, false);

    // Second delivery with same deliveryId
    const secondResult = youpiPaymentService.processWebhookEvent(payload, deliveryId);
    assert.equal(secondResult.success, true);
    assert.equal(secondResult.deduplicated, true);
  });

  // Scenario 13: Concurrent duplicate payment requests idempotency
  test('13. Concurrent status checks return authoritative DB payment status consistently', async () => {
    const [res1, res2, res3] = await Promise.all([
      request(app).get(`/api/orders/${testOrder.orderRef}/payment-status`),
      request(app).get(`/api/orders/${testOrder.orderRef}/payment-status`),
      request(app).get(`/api/orders/${testOrder.orderRef}/payment-status`),
    ]);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    assert.equal(res3.status, 200);
    assert.equal(res1.body.paymentStatus, res2.body.paymentStatus);
  });

  // Scenario 14: Non-existent order returns 404
  test('14. Unknown order reference in payment-status or webhook returns 404', async () => {
    const res = await request(app).get('/api/orders/ORD-NONEXISTENT-999/payment-status');
    assert.equal(res.status, 404);
  });

  // Scenario 15: Delayed failure event arrival after success
  test('15. Delayed failure event arriving after SUCCESS is cleanly discarded', () => {
    const order = db.createOrder({
      cafeId,
      status: 'COMPLETED',
      orderType: 'dine-in',
      customerName: 'Delayed Arrival Test',
      items: [{ menuItemId: 'item-1', name: 'Item', unitPrice: 100, quantity: 1, lineTotal: 100 }],
      subtotal: 100,
      tax: 8,
      total: 108,
      paymentStatus: 'PAID',
    });

    const res = youpiPaymentService.processWebhookEvent({
      event: 'FAILED',
      orderId: order.orderRef,
      paymentId: 'youpi_late_fail',
      amount: '1.08',
      currency: 'INR',
    });

    assert.equal(res.success, true);
    // Order must remain PAID
    const verifiedOrder = db.getOrderByRef(order.orderRef);
    assert.equal(verifiedOrder?.paymentStatus, 'PAID');
  });

  // Scenario 16: Return URL visited before webhook arrival (Pollable PENDING status)
  test('16. Order status endpoint returns PENDING before webhook arrival so UI polls safely', async () => {
    const unconfirmedOrder = db.createOrder({
      cafeId,
      status: 'PENDING',
      orderType: 'takeaway',
      customerName: 'Polling Customer',
      items: [{ menuItemId: 'item-1', name: 'Item', unitPrice: 100, quantity: 1, lineTotal: 100 }],
      subtotal: 100,
      tax: 8,
      total: 108,
      paymentStatus: 'PENDING',
    });

    const res = await request(app).get(`/api/orders/${unconfirmedOrder.orderRef}/payment-status`);
    assert.equal(res.status, 200);
    assert.equal(res.body.paymentStatus, 'PENDING');
  });

  // Scenario 17: Idempotent fulfillment & audit trail records transitions
  test('17. State machine transitions record durable audit trail', () => {
    const auditOrder = db.createOrder({
      cafeId,
      status: 'PENDING',
      orderType: 'takeaway',
      customerName: 'Audit Trail Test',
      items: [{ menuItemId: 'item-1', name: 'Item', unitPrice: 100, quantity: 1, lineTotal: 100 }],
      subtotal: 100,
      tax: 8,
      total: 108,
      paymentStatus: 'PENDING',
    });

    assert.ok(auditOrder.paymentAuditTrail && auditOrder.paymentAuditTrail.length >= 1);
    assert.equal(auditOrder.paymentAuditTrail[0].toStatus, 'PENDING');

    db.updateOrderPayment(auditOrder.id, {
      paymentStatus: 'PAID',
      source: 'WEBHOOK',
      reason: 'Authoritative test confirmation',
    });

    const updated = db.getOrderByRef(auditOrder.orderRef);
    assert.equal(updated?.paymentAuditTrail?.length, 2);
    assert.equal(updated?.paymentAuditTrail?.[1].toStatus, 'PAID');
  });

  // Scenario 18: Safe retry allows transitioning FAILED -> PENDING
  test('18. Safe retry: Order in FAILED or EXPIRED state can transition back to PENDING for re-attempt', () => {
    const retryOrder = db.createOrder({
      cafeId,
      status: 'PENDING',
      orderType: 'takeaway',
      customerName: 'Retry Customer',
      items: [{ menuItemId: 'item-1', name: 'Item', unitPrice: 100, quantity: 1, lineTotal: 100 }],
      subtotal: 100,
      tax: 8,
      total: 108,
      paymentStatus: 'FAILED',
    });

    const retried = db.updateOrderPayment(retryOrder.id, {
      paymentStatus: 'PENDING',
      source: 'SESSION_CREATION',
      reason: 'Customer requested payment retry',
    });

    assert.equal(retried?.paymentStatus, 'PENDING');
  });
});
