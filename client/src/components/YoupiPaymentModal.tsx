import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  Clock,
  ExternalLink,
  Smartphone,
  Copy,
  Check,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Order } from '../types';

interface YoupiPaymentModalProps {
  isOpen: boolean;
  order: Order | null;
  currencySymbol: string;
  onClose: () => void;
  onPaymentSuccess: (order: Order) => void;
  onSwitchToCash?: (order: Order) => void;
}

export const YoupiPaymentModal: React.FC<YoupiPaymentModalProps> = ({
  isOpen,
  order,
  currencySymbol,
  onClose,
  onPaymentSuccess,
  onSwitchToCash,
}) => {
  const [paymentStatus, setPaymentStatus] = useState<
    'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED'
  >('PENDING');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [qrImageError, setQrImageError] = useState<boolean>(false);
  const [utrInput, setUtrInput] = useState<string>('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState<boolean>(false);
  const [utrMessage, setUtrMessage] = useState<string | null>(null);
  const [showUtrBox, setShowUtrBox] = useState<boolean>(false);
  const pollTimerRef = useRef<number | null>(null);

  // Sync state when order changes
  useEffect(() => {
    if (!order) return;
    setPaymentStatus((order.paymentStatus as any) || 'PENDING');
  }, [order]);

  // Live polling for payment reconciliation
  useEffect(() => {
    if (!isOpen || !order || paymentStatus === 'PAID') {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${order.orderRef}/payment-status`);
        if (res.ok) {
          const data = await res.json();
          if (data.paymentStatus === 'PAID') {
            setPaymentStatus('PAID');
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setTimeout(() => {
              onPaymentSuccess({ ...order, paymentStatus: 'PAID', paidAt: data.paidAt });
            }, 1200);
          } else if (data.paymentStatus === 'FAILED') {
            setPaymentStatus('FAILED');
          } else if (data.paymentStatus === 'EXPIRED') {
            setPaymentStatus('EXPIRED');
          } else if (data.paymentStatus === 'CANCELLED') {
            setPaymentStatus('CANCELLED');
          } else if (data.paymentStatus === 'PROCESSING') {
            setPaymentStatus('PROCESSING');
          }
        }
      } catch {
        // Network blip, continue polling
      }
    };

    pollTimerRef.current = window.setInterval(checkStatus, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, order, paymentStatus, onPaymentSuccess]);

  if (!isOpen || !order) return null;

  // Dynamically resolve authenticated UPI ID from order, QR payload, or Vercel environment
  const upiId = (
    order.upiId ||
    (order.qrPayload ? new URLSearchParams(order.qrPayload.replace(/^upi:\/\/pay\??/, '')).get('pa') : '') ||
    (import.meta as any).env?.VITE_YOUPI_UPI_ID ||
    (import.meta as any).env?.VITE_UPI_ID ||
    ''
  ).trim();

  const payeeName = (
    order.payeeName ||
    (order.qrPayload ? new URLSearchParams(order.qrPayload.replace(/^upi:\/\/pay\??/, '')).get('pn') : '') ||
    (import.meta as any).env?.VITE_YOUPI_PAYEE_NAME ||
    (import.meta as any).env?.VITE_PAYEE_NAME ||
    'MenuMint Merchant'
  ).trim();

  const totalFormatted = (order.total / 100).toFixed(2);

  // Check if personal VPA (like @jio, @okhdfcbank, @paytm) where beneficiary bank strictly rejects 'tr=' parameter
  const isPersonalVpa =
    upiId.endsWith('@jio') ||
    upiId.endsWith('@okhdfcbank') ||
    upiId.endsWith('@oksbi') ||
    upiId.endsWith('@okaxis') ||
    upiId.endsWith('@okicici') ||
    upiId.endsWith('@paytm') ||
    upiId.endsWith('@ybl') ||
    upiId.endsWith('@ibl') ||
    upiId.endsWith('@axl');

  const cleanNote = `Order ${order.orderRef}`.trim();
  const encodedPayee = encodeURIComponent(payeeName);
  const encodedNote = encodeURIComponent(cleanNote);

  // Standard NPCI UPI URI:
  // 1. pa MUST NOT be percent-encoded (%40) because mobile UPI apps validate raw VPA syntax.
  // 2. tr is strictly omitted for personal/P2P VPAs (like @jio) to avoid beneficiary bank rejection (ZM/U16).
  const cleanUpiUri = upiId
    ? (isPersonalVpa
        ? `upi://pay?pa=${upiId}&pn=${encodedPayee}&am=${totalFormatted}&cu=INR&tn=${encodedNote}`
        : `upi://pay?pa=${upiId}&pn=${encodedPayee}&am=${totalFormatted}&cu=INR&tr=${order.orderRef}&tn=${encodedNote}`)
    : '';

  const qrData = cleanUpiUri;

  // App-specific Android intents (package-targeted intents prevent browser scheme blocking and app chooser failure)
  const phonepeIntent = `intent://pay?pa=${upiId}&pn=${encodedPayee}&am=${totalFormatted}&cu=INR&tn=${encodedNote}#Intent;scheme=upi;package=com.phonepe.app;end`;
  const gpayIntent = `intent://pay?pa=${upiId}&pn=${encodedPayee}&am=${totalFormatted}&cu=INR&tn=${encodedNote}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
  const paytmIntent = `intent://pay?pa=${upiId}&pn=${encodedPayee}&am=${totalFormatted}&cu=INR&tn=${encodedNote}#Intent;scheme=upi;package=net.one97.paytm;end`;

  // Dual-CDN high-reliability QR Code image
  const qrImageUrl = qrImageError
    ? `https://quickchart.io/qr?size=220&text=${encodeURIComponent(qrData)}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(qrData)}`;

  const handleCopyUpi = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrInput.trim()) return;
    const clean = utrInput.trim().replace(/\s+/g, '');
    if (!/^\d{10,22}$/.test(clean)) {
      setUtrMessage('Please enter a valid 12-digit UPI UTR number from your payment app.');
      return;
    }
    setIsSubmittingUtr(true);
    setUtrMessage(null);
    try {
      const res = await fetch(`/api/orders/${order.orderRef}/submit-utr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr: clean }),
      });
      const data = await res.json();
      if (res.ok) {
        setPaymentStatus('PROCESSING');
        setUtrMessage('✓ UTR submitted! Verifying bank settlement credit alert...');
      } else {
        setUtrMessage(data.message || 'Failed to submit UTR. Please try again.');
      }
    } catch {
      setUtrMessage('Network error. Status is still polling in the background.');
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  const handleSwitchToCounter = () => {
    if (onSwitchToCash) {
      onSwitchToCash({ ...order, paymentMethod: 'CASH', paymentStatus: 'PENDING' });
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 420,
          width: '92%',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Gateway Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            padding: '1.25rem 1.5rem',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              color: '#94a3b8',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={16} color="#ffffff" fill="#ffffff" />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', color: '#34d399' }}>
              YOUPI-PG V2 GATEWAY
            </span>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '4px 0 0', color: '#ffffff' }}>
            {currencySymbol}{totalFormatted}
          </h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
            Order #{order.orderRef} &bull; {order.customerName}
          </p>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          {/* Status Badge */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            {paymentStatus === 'PAID' ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#dcfce7',
                  color: '#166534',
                  padding: '0.4rem 1rem',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                <CheckCircle2 size={18} color="#16a34a" />
                <span>Payment Verified & Confirmed!</span>
              </div>
            ) : paymentStatus === 'FAILED' ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '0.4rem 1rem',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={18} color="#dc2626" />
                <span>Payment Authorization Failed</span>
              </div>
            ) : paymentStatus === 'EXPIRED' ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '0.4rem 1rem',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={18} color="#dc2626" />
                <span>Payment Session Expired</span>
              </div>
            ) : paymentStatus === 'CANCELLED' ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#f1f5f9',
                  color: '#475569',
                  padding: '0.4rem 1rem',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={18} color="#64748b" />
                <span>Payment Cancelled</span>
              </div>
            ) : paymentStatus === 'PROCESSING' ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  padding: '0.4rem 1rem',
                  borderRadius: 9999,
                  fontWeight: 600,
                  fontSize: '0.82rem',
                }}
              >
                <RefreshCw size={16} className="spin-slow" />
                <span>Verifying UPI Credit Alert...</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#fef3c7',
                  color: '#92400e',
                  padding: '0.4rem 1rem',
                  borderRadius: 9999,
                  fontWeight: 600,
                  fontSize: '0.82rem',
                }}
              >
                <Clock size={16} className="spin-slow" />
                <span>Waiting for UPI Payment Confirmation...</span>
              </div>
            )}
          </div>

          {/* QR Code Container */}
          {paymentStatus !== 'PAID' && (
            upiId ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '1.25rem 1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    padding: 8,
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    marginBottom: '0.75rem',
                  }}
                >
                  <img
                    src={qrImageUrl}
                    onError={() => setQrImageError(true)}
                    alt="UPI Payment QR Code"
                    style={{ width: 180, height: 180, display: 'block', borderRadius: 6 }}
                  />
                </div>

                <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, textAlign: 'center' }}>
                  Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)
                </div>

                {/* Verified UPI ID display */}
                <div
                  style={{
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    color: '#334155',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>UPI ID: {upiId}</span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: copiedUpi ? '#059669' : '#64748b',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 12,
                  padding: '1.25rem 1rem',
                  marginBottom: '1.25rem',
                  textAlign: 'center',
                }}
              >
                <AlertCircle size={28} color="#d97706" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#92400e', marginBottom: '0.25rem' }}>
                  UPI Setup Required
                </div>
                <div style={{ fontSize: '0.8rem', color: '#b45309', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                  Please set <code>YOUPI_UPI_ID</code> (or <code>VITE_YOUPI_UPI_ID</code>) in your Vercel project environment variables to activate live UPI QR payments.
                </div>
                <div style={{ fontSize: '0.78rem', color: '#78350f', fontWeight: 600 }}>
                  In the meantime, you can settle your order directly at the counter.
                </div>
              </div>
            )
          )}

          {/* Action Buttons */}
          {paymentStatus !== 'PAID' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {(paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED' || paymentStatus === 'CANCELLED') && (
                <button
                  type="button"
                  onClick={() => setPaymentStatus('PENDING')}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '0.7rem',
                    fontSize: '0.9rem',
                    background: '#059669',
                  }}
                >
                  <RefreshCw size={16} />
                  <span>Retry UPI Payment</span>
                </button>
              )}

              {/* Mobile UPI Direct App Links (Package-targeted intents prevent bank declines) */}
              {upiId && qrData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Pay with Installed UPI App:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                    {/* PhonePe */}
                    <a
                      href={phonepeIntent}
                      className="btn"
                      style={{
                        background: '#5f259f',
                        color: '#ffffff',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '0.65rem 0.5rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        borderRadius: 8,
                      }}
                    >
                      <Smartphone size={16} />
                      <span>PhonePe</span>
                    </a>

                    {/* Google Pay */}
                    <a
                      href={gpayIntent}
                      className="btn"
                      style={{
                        background: '#1a73e8',
                        color: '#ffffff',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '0.65rem 0.5rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        borderRadius: 8,
                      }}
                    >
                      <Smartphone size={16} />
                      <span>Google Pay</span>
                    </a>

                    {/* Paytm */}
                    <a
                      href={paytmIntent}
                      className="btn"
                      style={{
                        background: '#002e6e',
                        color: '#ffffff',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '0.65rem 0.5rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        borderRadius: 8,
                      }}
                    >
                      <Smartphone size={16} />
                      <span>Paytm</span>
                    </a>

                    {/* Universal / Other Apps */}
                    <a
                      href={qrData}
                      className="btn"
                      style={{
                        background: '#059669',
                        color: '#ffffff',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '0.65rem 0.5rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        borderRadius: 8,
                      }}
                    >
                      <Smartphone size={16} />
                      <span>Any UPI App</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Manual UPI UTR Submission (PRD Checkpoint 4 & 7) */}
              {upiId && (
                <div
                  style={{
                    marginTop: '0.25rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '0.65rem 0.85rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => setShowUtrBox(!showUtrBox)}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                      Already paid in app? Enter UPI Ref / UTR
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                      {showUtrBox ? '▲ Hide' : '▼ Enter'}
                    </span>
                  </div>

                  {showUtrBox && (
                    <form onSubmit={handleSubmitUtr} style={{ marginTop: '0.6rem' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="text"
                          placeholder="e.g. 428912345678 (12-digit UTR)"
                          value={utrInput}
                          onChange={(e) => setUtrInput(e.target.value)}
                          maxLength={22}
                          style={{
                            flex: 1,
                            padding: '0.45rem 0.6rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: '0.82rem',
                          }}
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingUtr || !utrInput.trim()}
                          className="btn btn-primary"
                          style={{
                            padding: '0.45rem 0.75rem',
                            fontSize: '0.8rem',
                            background: '#059669',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isSubmittingUtr ? 'Verifying...' : 'Verify UTR'}
                        </button>
                      </div>
                      {utrMessage && (
                        <div
                          style={{
                            marginTop: '0.4rem',
                            fontSize: '0.75rem',
                            color: utrMessage.startsWith('✓') ? '#166534' : '#dc2626',
                            fontWeight: 600,
                          }}
                        >
                          {utrMessage}
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}

              {/* Notification Status Pill (PRD Checkpoint 8) */}
              {order.customerPhone && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.72rem',
                    color: '#64748b',
                    background: '#f1f5f9',
                    borderRadius: 6,
                    padding: '0.35rem 0.6rem',
                    justifyContent: 'center',
                  }}
                >
                  <span>📱 SMS receipt will be dispatched to {order.customerPhone}</span>
                </div>
              )}

              {/* External checkout link if hosted */}
              {order.checkoutUrl && (
                <a
                  href={order.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '0.65rem',
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={16} />
                  <span>Open YouPI Card & Netbanking Portal</span>
                </a>
              )}

              {/* Pay at Counter Fallback */}
              <button
                type="button"
                onClick={handleSwitchToCounter}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  padding: '0.4rem 0',
                  marginTop: '0.25rem',
                  textDecoration: 'underline',
                }}
              >
                Prefer to pay at counter with Cash or Card?
              </button>
            </div>
          )}

          {paymentStatus === 'PAID' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1rem' }}>
                Your payment was received. Directing you to your order status...
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => onPaymentSuccess(order)}
              >
                View Order Tracking
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
