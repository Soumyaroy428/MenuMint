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
   * Resolves and validates active YouPI payment configuration from Vercel / server environment
   * or per-cafe database overrides.
   * Prioritizes YOUPI_UPI_ID, UPI_ID, VITE_YOUPI_UPI_ID, VITE_UPI_ID.
   */
  static getValidatedConfig(cafeOverride?: {
    apiUrl?: string;
    checkoutUrl?: string;
    merchantId?: string;
    webhookSecret?: string;
    upiId?: string;
    payeeName?: string;
    name?: string;
    currency?: string;
  }): ValidatedPaymentConfig {
    const apiUrl = (
      process.env.YOUPI_API_URL ||
      process.env.API_URL ||
      cafeOverride?.apiUrl ||
      'http://localhost:6100'
    ).trim();

    const checkoutUrl = (
      process.env.YOUPI_CHECKOUT_URL ||
      process.env.CHECKOUT_URL ||
      cafeOverride?.checkoutUrl ||
      'http://localhost:7000'
    ).trim();

    const merchantId = (
      process.env.YOUPI_MERCHANT_ID ||
      process.env.MERCHANT_ID ||
      cafeOverride?.merchantId ||
      ''
    ).trim();

    const webhookSecret = (
      process.env.YOUPI_WEBHOOK_SECRET ||
      process.env.WEBHOOK_SECRET ||
      cafeOverride?.webhookSecret ||
      ''
    ).trim();

    const appUrl = (
      process.env.APP_URL ||
      process.env.APP_BASE_URL ||
      'http://localhost:3000'
    ).trim();

    // Authenticated UPI ID dynamically resolved from Vercel / server environment
    const upiId = (
      process.env.YOUPI_UPI_ID ||
      process.env.UPI_ID ||
      process.env.VITE_YOUPI_UPI_ID ||
      process.env.VITE_UPI_ID ||
      cafeOverride?.upiId ||
      ''
    ).trim();

    // Authenticated Payee display name dynamically resolved from Vercel / server environment
    const payeeName = (
      process.env.YOUPI_PAYEE_NAME ||
      process.env.PAYEE_NAME ||
      process.env.VITE_YOUPI_PAYEE_NAME ||
      process.env.VITE_PAYEE_NAME ||
      cafeOverride?.payeeName ||
      cafeOverride?.name ||
      'MenuMint Merchant'
    ).trim();

    const currency = (
      process.env.YOUPI_CURRENCY ||
      process.env.CURRENCY ||
      cafeOverride?.currency ||
      'INR'
    ).trim();

    // Verify URL validity if provided
    if (apiUrl) {
      try {
        new URL(apiUrl);
      } catch {
        throw new Error(`[PaymentConfigError] Invalid YOUPI_API_URL configured: "${apiUrl}". Must be a valid URL.`);
      }
    }

    if (checkoutUrl) {
      try {
        new URL(checkoutUrl);
      } catch {
        throw new Error(`[PaymentConfigError] Invalid YOUPI_CHECKOUT_URL configured: "${checkoutUrl}". Must be a valid URL.`);
      }
    }

    // Configured if at least a valid UPI ID is present in environment
    const isConfigured = Boolean(upiId);

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
      upiId: config.upiId || 'NOT_CONFIGURED_IN_ENV',
      payeeName: config.payeeName,
      currency: config.currency,
      isConfigured: config.isConfigured,
    };
  }
}
