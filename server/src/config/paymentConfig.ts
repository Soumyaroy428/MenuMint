import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

export interface ValidatedPaymentConfig {
  apiUrl: string;
  checkoutUrl: string;
  merchantId: string;
  webhookSecret: string;
  appUrl: string;
  upiId: string;
  payeeName: string;
  isConfigured: boolean;
  currency: string;
}

export class PaymentConfigValidator {
  /**
   * Resolves and validates active YouPI payment configuration from environment
   * or per-cafe database overrides.
   */
  static getValidatedConfig(cafeOverride?: {
    apiUrl?: string;
    checkoutUrl?: string;
    merchantId?: string;
    webhookSecret?: string;
    upiId?: string;
    payeeName?: string;
    currency?: string;
  }): ValidatedPaymentConfig {
    const apiUrl = cafeOverride?.apiUrl || process.env.YOUPI_API_URL || 'http://localhost:6100';
    const checkoutUrl = cafeOverride?.checkoutUrl || process.env.YOUPI_CHECKOUT_URL || 'http://localhost:7000';
    const merchantId = cafeOverride?.merchantId || process.env.YOUPI_MERCHANT_ID || 'merch_menumint_001';
    const webhookSecret = cafeOverride?.webhookSecret || process.env.YOUPI_WEBHOOK_SECRET || 'youpi_sec_live_grind789';
    const appUrl = process.env.APP_URL || process.env.APP_BASE_URL || 'http://localhost:3000';
    const upiId = cafeOverride?.upiId || process.env.YOUPI_UPI_ID || 'dailygrind@upi';
    const payeeName = cafeOverride?.payeeName || process.env.YOUPI_PAYEE_NAME || 'The Daily Grind Cafe';
    const currency = cafeOverride?.currency || process.env.YOUPI_CURRENCY || 'INR';

    // Verify URL validity
    try {
      new URL(apiUrl);
    } catch {
      throw new Error(`[PaymentConfigError] Invalid YOUPI_API_URL configured: "${apiUrl}". Must be a valid URL.`);
    }

    try {
      new URL(checkoutUrl);
    } catch {
      throw new Error(`[PaymentConfigError] Invalid YOUPI_CHECKOUT_URL configured: "${checkoutUrl}". Must be a valid URL.`);
    }

    const isConfigured = Boolean(merchantId && webhookSecret);

    return {
      apiUrl: apiUrl.replace(/\/+$/, ''),
      checkoutUrl: checkoutUrl.replace(/\/+$/, ''),
      merchantId,
      webhookSecret,
      appUrl: appUrl.replace(/\/+$/, ''),
      upiId,
      payeeName,
      isConfigured,
      currency,
    };
  }

  /**
   * Safely returns configuration metadata with secrets redacted for client and logging.
   */
  static getRedactedConfig(cafeOverride?: any) {
    const config = this.getValidatedConfig(cafeOverride);
    return {
      apiUrl: config.apiUrl,
      checkoutUrl: config.checkoutUrl,
      merchantId: config.merchantId ? `${config.merchantId.slice(0, 4)}***` : 'NOT_CONFIGURED',
      webhookSecretConfigured: Boolean(config.webhookSecret),
      appUrl: config.appUrl,
      upiId: config.upiId,
      payeeName: config.payeeName,
      currency: config.currency,
      isConfigured: config.isConfigured,
    };
  }
}

