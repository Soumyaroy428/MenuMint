import crypto from 'crypto';
import { Order, Cafe, PaymentSession, PaymentStatus } from '../types.js';

export interface YoupiWebhookEvent {
  event: 'payment.success' | 'payment.failed' | 'payment.cancelled' | 'payment.expired';
  orderId: string;
  paymentId: string;
  amount: string;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  timestamp: string;
}

export class YoupiPaymentService {
  /**
   * Create an official YouPI-PG V2 payment session for an order.
   * Conforms to Section 10 & 11 (Merchant SDK & Direct REST path) of YouPI-PG V2 guide.
   */
  async createPaymentSession(order: Order, cafe: Cafe): Promise<PaymentSession> {
    const config = cafe.paymentConfig;
    const apiUrl = process.env.YOUPI_API_URL || config?.apiUrl || 'http://localhost:6100';
    const checkoutBaseUrl = process.env.YOUPI_CHECKOUT_URL || config?.checkoutUrl || 'http://localhost:7000';
    const merchantId = process.env.YOUPI_MERCHANT_ID || config?.merchantId || 'merch_menumint_001';
    const upiId = process.env.YOUPI_UPI_ID || config?.upiId || 'dailygrind@upi';
    const payeeName = process.env.YOUPI_PAYEE_NAME || config?.payeeName || cafe.name;

    const amountMajor = (order.total / 100).toFixed(2);
    const currency = cafe.currency || 'USD';

    // Construct standardized UPI Intent URI according to NPCI / Indian UPI specification
    const qrPayload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amountMajor}&cu=${currency}&tr=${order.orderRef}&tn=${encodeURIComponent('MenuMint ' + order.orderRef)}`;

    const returnUrl = `${process.env.APP_BASE_URL || 'https://menu-ordering-saas.vercel.app'}/?order=${order.orderRef}&payment=complete`;

    // Attempt to contact live upstream YouPI payment gateway API if available
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const upstreamRes = await fetch(`${apiUrl}/api/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': merchantId,
        },
        body: JSON.stringify({
          orderId: order.orderRef,
          amount: amountMajor,
          currency,
          returnUrl,
          metadata: {
            cafeSlug: cafe.slug,
            cafeName: cafe.name,
            orderId: order.id,
            customerName: order.customerName,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        return {
          paymentId: data.paymentId || `youpi_${order.orderRef}_${Date.now().toString(36)}`,
          orderId: order.orderRef,
          amount: amountMajor,
          currency,
          status: 'ACTIVE',
          checkoutUrl: data.checkoutUrl || `${checkoutBaseUrl}/checkout/${data.paymentId || order.orderRef}`,
          qrPayload,
        };
      }
    } catch {
      // Upstream gateway offline or unreachable; smoothly fallback to self-contained YouPI engine
    }

    // Provision self-contained YouPI session
    const paymentId = `youpi_${order.orderRef}_${Date.now().toString(36)}`;
    const checkoutUrl = `${checkoutBaseUrl}/checkout?paymentId=${paymentId}&orderId=${order.orderRef}&amount=${amountMajor}&currency=${currency}`;

    return {
      paymentId,
      orderId: order.orderRef,
      amount: amountMajor,
      currency,
      status: 'ACTIVE',
      checkoutUrl,
      qrPayload,
    };
  }

  /**
   * Verify HMAC-SHA256 signature from YouPI gateway webhook.
   * Conforms to Section 12 (Webhooks, fulfilment and reconciliation) of YouPI-PG V2 guide.
   */
  verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string | undefined, secret: string): boolean {
    if (!signatureHeader || !secret) {
      return false;
    }

    // Strip optional "sha256=" prefix per specification
    const cleanSignature = signatureHeader.replace(/^sha256=/i, '').trim();

    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'));
      const expectedSignature = hmac.digest('hex');

      // Constant-time comparison to protect against timing attacks
      const sigBuffer = Buffer.from(cleanSignature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Compute HMAC-SHA256 signature for test/simulation webhooks.
   */
  generateWebhookSignature(payloadString: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  }
}

export const paymentService = new YoupiPaymentService();
export const youpiPaymentService = paymentService;
