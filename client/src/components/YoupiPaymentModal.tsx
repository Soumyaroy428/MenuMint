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

  // Standardized NPCI UPI URI with strict Indian Rupee (INR) currency formatting
  const qrData = upiId
    ? (order.qrPayload && order.qrPayload.includes(`pa=${encodeURIComponent(upiId)}`)
        ? order.qrPayload
        : `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${totalFormatted}&cu=INR&tr=${order.orderRef}&tn=${encodeURIComponent('MenuMint ' + order.orderRef)}`)
    : '';

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

              {/* Direct UPI Intent (for mobile devices: GPay, PhonePe, Paytm, CRED, BHIM) */}
              {upiId && qrData && (
                <a
                  href={qrData}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '0.75rem',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: '#059669',
                    borderRadius: 8,
                  }}
                >
                  <Smartphone size={18} />
                  <span>Pay via UPI App (PhonePe / GPay / Paytm)</span>
                </a>
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
