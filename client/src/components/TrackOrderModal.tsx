import React, { useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import { trackOrder, submitOrderFeedback } from '../api';
import { Search, X, CheckCircle, AlertCircle, RefreshCw, Printer, Clock, Star, Bell, BellRing, Users } from 'lucide-react';
import { BillSplitModal } from './BillSplitModal';
import {
  playOrderReadyChime,
  flashTabTitle,
  requestNotificationPermission,
  sendBrowserNotification,
} from '../utils/notifications';

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderRef?: string;
  currencySymbol?: string;
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  PENDING: 'Order received and queued. Waiting for barista/kitchen acceptance.',
  ACCEPTED: 'Order accepted! Assigned to prep station.',
  PREPARING: 'Your food & drinks are actively being prepared fresh.',
  READY: 'Order is ready! Collect at pickup counter or being served to your table.',
  COMPLETED: 'Order completed. Thank you for visiting MenuMint!',
  CANCELLED: 'This order was cancelled.',
};

export const TrackOrderModal: React.FC<TrackOrderModalProps> = ({
  isOpen,
  onClose,
  initialOrderRef = '',
  currencySymbol = '$',
}) => {
  const [orderRef, setOrderRef] = useState(initialOrderRef);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const pollIntervalRef = useRef<any>(null);

  // Customer Feedback State (CP-37)
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Live Timer for Countdown (CP-40)
  const [now, setNow] = useState<number>(Date.now());
  const prevStatusRef = useRef<string | null>(null);

  // Notification Permissions (CP-42)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  // Dine-In Bill Split Modal (CP-44)
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);

  const handleEnableAlerts = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      sendBrowserNotification('🔔 MenuMint Alerts Enabled', {
        body: 'We will notify you immediately when your order is ready for pickup!',
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && initialOrderRef) {
      setOrderRef(initialOrderRef);
      fetchStatus(initialOrderRef);
    }
  }, [isOpen, initialOrderRef]);

  // Auto-polling for active orders
  useEffect(() => {
    if (!isOpen || !order) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    const isActive = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status);
    if (isActive) {
      pollIntervalRef.current = setInterval(() => {
        fetchStatus(order.orderRef, true);
      }, 5000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, order?.status, order?.orderRef]);

  const fetchStatus = async (ref: string, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await trackOrder(ref.trim());

      // Audio-Visual Alerts on transition to READY (CP-42)
      if (prevStatusRef.current && prevStatusRef.current !== 'READY' && data.status === 'READY') {
        playOrderReadyChime();
        if (typeof document !== 'undefined' && document.hidden) {
          flashTabTitle(`🔔 (1) ORDER READY! - ${data.orderRef}`);
        }
        sendBrowserNotification(`🎉 Order Ready! (${data.orderRef})`, {
          body: `Your order is hot and ready for pickup at ${data.cafeName || 'the café'}.`,
        });
      }
      prevStatusRef.current = data.status;

      setOrder(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Order reference not found.');
        setOrder(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderRef.trim()) return;
    fetchStatus(orderRef.trim());
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      const res = await submitOrderFeedback(order.orderRef, rating, comment);
      setOrder((prev) => (prev ? { ...prev, feedback: res.feedback } : null));
    } catch (err: any) {
      setFeedbackError(err.message || 'Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!order) return;
    const printWin = window.open('', '_blank', 'width=450,height=600');
    if (!printWin) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${order.orderRef}</title>
          <style>
            body { font-family: monospace, sans-serif; padding: 20px; max-width: 380px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 12px; margin-bottom: 12px; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 15px; margin-top: 10px; border-top: 1px dashed #333; padding-top: 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0;">MenuMint</h2>
            <div>Customer Order Receipt</div>
            <div style="font-size: 12px; margin-top: 4px;">Ref: <strong>${order.orderRef}</strong></div>
            <div style="font-size: 11px; color: #666;">${new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div class="row"><span>Customer:</span><strong>${order.customerName}</strong></div>
          <div class="row"><span>Fulfillment:</span><strong>${order.orderType} ${order.tableNumber ? `(${order.tableNumber})` : ''}</strong></div>
          <div class="row"><span>Status:</span><strong>${order.status}</strong></div>
          ${order.pickupWindow ? `<div class="row" style="color: #0284c7; font-weight: bold;"><span>Pickup Window:</span><strong>${order.pickupWindow}</strong></div>` : ''}
          ${order.estimatedPrepMinutes ? `<div class="row"><span>Est. Prep Time:</span><strong>~${order.estimatedPrepMinutes} mins</strong></div>` : ''}
          <hr style="border: 0; border-top: 1px dashed #ccc; margin: 10px 0;" />
          ${order.items
            .map(
              (item) => `
            <div class="row">
              <span>${item.quantity}x ${item.name}${item.dietaryTags && item.dietaryTags.length > 0 ? ` [${item.dietaryTags.join(', ')}]` : ''}</span>
              <span>${currencySymbol}${(item.lineTotal / 100).toFixed(2)}</span>
            </div>
          `
            )
            .join('')}
          ${order.discount && order.discount > 0 ? `
            <div class="row" style="color: #059669;">
              <span>Promo Discount (${order.promoCode || 'PROMO'}):</span>
              <span>-${currencySymbol}${(order.discount / 100).toFixed(2)}</span>
            </div>
          ` : ''}
          ${order.tip && order.tip > 0 ? `
            <div class="row" style="color: #059669;">
              <span>Staff Tip (Gratuity):</span>
              <span>+${currencySymbol}${(order.tip / 100).toFixed(2)}</span>
            </div>
          ` : ''}
          ${order.tax && order.tax > 0 ? `
            <div class="row" style="color: #666;">
              <span>${order.taxName || 'Tax'} (${order.taxRate ? `${order.taxRate}%` : 'Tax'}):</span>
              <span>${currencySymbol}${(order.tax / 100).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-row">
            <span>TOTAL PAID:</span>
            <span>${currencySymbol}${(order.total / 100).toFixed(2)}</span>
          </div>
          <div class="footer">
            <p>Thank you for ordering with MenuMint!</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
    printWin.document.write(receiptHtml);
    printWin.document.close();
  };

  if (!isOpen) return null;

  const statusSteps = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'];
  const currentIndex = order ? statusSteps.indexOf(order.status) : -1;
  const isActive = order ? ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status) : false;

  // Real-Time Prep ETA & Countdown Calculations (CP-40)
  let countdownText = '';
  let prepProgressPct = 50;
  let isOverdue = false;

  if (order && order.estimatedReadyAt) {
    const readyMs = new Date(order.estimatedReadyAt).getTime();
    const createdMs = new Date(order.createdAt).getTime();
    const diffMs = readyMs - now;

    if (order.status === 'READY' || order.status === 'COMPLETED') {
      countdownText = 'Ready for pickup!';
      prepProgressPct = 100;
    } else if (diffMs <= 0) {
      isOverdue = true;
      const overdueMins = Math.floor(Math.abs(diffMs) / 60000);
      const overdueSecs = Math.floor((Math.abs(diffMs) % 60000) / 1000);
      countdownText = overdueMins > 0 ? `Finishing up (+${overdueMins}m ${overdueSecs}s)` : `Finishing touches (+${overdueSecs}s)`;
      prepProgressPct = 96;
    } else {
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      countdownText = mins > 0 ? `~${mins}m ${secs}s remaining` : `${secs}s remaining`;
      const totalDuration = Math.max(readyMs - createdMs, 1000);
      const elapsed = Math.max(now - createdMs, 0);
      prepProgressPct = Math.min(Math.max((elapsed / totalDuration) * 100, 8), 95);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Track Your Order</h2>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Real-time kitchen status & live order updates
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#64748b' }} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <input
            type="text"
            required
            placeholder="e.g. ORD-1001"
            className="form-input"
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Search size={16} />
            <span>{loading ? 'Searching...' : 'Track'}</span>
          </button>
        </form>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              border: '1px solid #f87171',
              color: '#991b1b',
              padding: '0.75rem',
              borderRadius: 8,
              fontSize: '0.85rem',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {order && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '1.25rem', letterSpacing: '0.04em' }}>{order.orderRef}</strong>
                  {isActive && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#059669',
                        background: '#d1fae5',
                        padding: '2px 8px',
                        borderRadius: 12,
                      }}
                    >
                      <RefreshCw size={10} className="spinning" /> Live Updates (5s)
                    </span>
                  )}
                  {isActive && typeof window !== 'undefined' && 'Notification' in window && (
                    notifPermission === 'granted' ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: '#0284c7',
                          background: '#e0f2fe',
                          padding: '2px 8px',
                          borderRadius: 12,
                        }}
                        title="Browser notifications active"
                      >
                        <BellRing size={10} /> Alerts On
                      </span>
                    ) : notifPermission === 'default' ? (
                      <button
                        type="button"
                        onClick={handleEnableAlerts}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#047857',
                          background: '#d1fae5',
                          border: '1px solid #6ee7b7',
                          padding: '2px 8px',
                          borderRadius: 12,
                          cursor: 'pointer',
                        }}
                        title="Get notified when order is ready"
                      >
                        <Bell size={10} /> Enable Alerts
                      </button>
                    ) : null
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>
                  {order.customerName} {order.tableNumber ? `• ${order.tableNumber}` : `• ${order.orderType}`}
                </div>
                {order.pickupWindow && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                    <Clock size={12} />
                    <span>Scheduled: {order.pickupWindow}</span>
                  </div>
                )}
              </div>
              <span className={`badge ${order.status === 'READY' || order.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                {order.status}
              </span>
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1.5rem 0 1rem', position: 'relative' }}>
              {statusSteps.map((step, idx) => {
                const isPassed = currentIndex >= idx;
                const isCurrent = currentIndex === idx;
                return (
                  <div key={step} style={{ textAlign: 'center', zIndex: 1, flex: 1 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: isPassed ? '#059669' : '#e2e8f0',
                        color: isPassed ? '#ffffff' : '#94a3b8',
                        margin: '0 auto 4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        boxShadow: isCurrent ? '0 0 0 4px rgba(16, 185, 129, 0.25)' : 'none',
                      }}
                    >
                      {isPassed ? <CheckCircle size={16} /> : idx + 1}
                    </div>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: isCurrent ? 800 : 500,
                        color: isCurrent ? '#059669' : '#64748b',
                        display: 'block',
                      }}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Live Kitchen Prep ETA & Countdown Banner (CP-40) */}
            {order.status === 'READY' ? (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: 10,
                  padding: '0.85rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#16a34a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#166534' }}>
                    🎉 Your Order Is Ready!
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                    {order.orderType === 'dine-in' && order.tableNumber
                      ? `Your food is being served to ${order.tableNumber}. Enjoy your meal!`
                      : 'Please proceed to the pickup counter to collect your order.'}
                  </div>
                </div>
              </div>
            ) : ['PENDING', 'ACCEPTED', 'PREPARING'].includes(order.status) && (order.estimatedPrepMinutes || order.estimatedReadyAt) ? (
              <div
                style={{
                  background: isOverdue ? '#fffbeb' : '#f0fdf4',
                  border: `1px solid ${isOverdue ? '#fde68a' : '#bbf7d0'}`,
                  borderRadius: 10,
                  padding: '0.85rem 1rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} color={isOverdue ? '#d97706' : '#16a34a'} />
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: isOverdue ? '#92400e' : '#14532d' }}>
                      Estimated Prep: ~{order.estimatedPrepMinutes || 10} mins
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: isOverdue ? '#b45309' : '#15803d',
                      background: isOverdue ? '#fef3c7' : '#dcfce7',
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}
                  >
                    ⏱️ {countdownText}
                  </span>
                </div>

                {/* Animated Progress Bar */}
                <div style={{ width: '100%', height: 6, background: isOverdue ? '#fde68a' : '#dcfce7', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${prepProgressPct}%`,
                      height: '100%',
                      background: isOverdue ? '#f59e0b' : '#16a34a',
                      borderRadius: 3,
                      transition: 'width 1s linear',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                  <span>Target: {order.estimatedReadyAt ? new Date(order.estimatedReadyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon'}</span>
                  <span>{order.status === 'PREPARING' ? '🔥 Actively in Prep Station' : '⏳ Queued for Preparation'}</span>
                </div>
              </div>
            ) : null}

            {/* Status Description Box */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                gap: '0.6rem',
                alignItems: 'center',
              }}
            >
              <Clock size={16} color="#059669" />
              <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                {STATUS_DESCRIPTIONS[order.status] || 'Processing order...'}
              </div>
            </div>

            {/* Items Summary */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
              {order.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '2px 0' }}>
                  <span style={{ color: '#475569' }}>
                    {item.quantity}x {item.name}
                    {item.dietaryTags && item.dietaryTags.length > 0 && (
                      <span style={{ fontSize: '0.7rem', color: '#059669', marginLeft: 6 }}>
                        ({item.dietaryTags.map((t) => t === 'VEGAN' ? '🌱 Vegan' : t === 'VEGETARIAN' ? '🥗 Veg' : t === 'GLUTEN_FREE' ? '🌾 GF' : t === 'NUT_FREE' ? '🥜 Nut-Free' : t === 'SPICY' ? '🌶️ Spicy' : '⭐ Pick').join(', ')})
                      </span>
                    )}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {currencySymbol}{(item.lineTotal / 100).toFixed(2)}
                  </span>
                </div>
              ))}
              {order.discount && order.discount > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '2px 0', color: '#059669', fontWeight: 600 }}>
                  <span>Promo Discount ({order.promoCode || 'PROMO'})</span>
                  <span>- {currencySymbol}{(order.discount / 100).toFixed(2)}</span>
                </div>
              ) : null}
              {order.tip && order.tip > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '2px 0', color: '#059669', fontWeight: 600 }}>
                  <span>Staff Tip</span>
                  <span>+ {currencySymbol}{(order.tip / 100).toFixed(2)}</span>
                </div>
              ) : null}
              {order.tax && order.tax > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '2px 0', color: '#64748b' }}>
                  <span>{order.taxName || 'Tax'} ({order.taxRate ? `${order.taxRate}%` : 'Regional'})</span>
                  <span>{currencySymbol}{(order.tax / 100).toFixed(2)}</span>
                </div>
              ) : null}
            </div>

            {/* Total and Print Actions */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Paid: </span>
                <strong style={{ fontSize: '1.1rem', color: '#059669' }}>
                  {currencySymbol}{(order.total / 100).toFixed(2)}
                </strong>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsSplitModalOpen(true)}
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.4rem 0.75rem',
                    color: '#0369a1',
                    borderColor: '#bae6fd',
                    background: '#f0f9ff',
                    fontWeight: 700,
                  }}
                  title="Split bill evenly with table guests (CP-44)"
                >
                  <Users size={14} />
                  <span>Split Bill</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePrintReceipt}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                >
                  <Printer size={14} />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>

            {/* Post-Meal Rating & Feedback (CP-37) */}
            {order.feedback ? (
              <div
                style={{
                  background: '#fefce8',
                  border: '1px solid #fef08a',
                  borderRadius: 10,
                  padding: '0.85rem 1rem',
                  marginTop: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={16}
                        fill={s <= order.feedback!.rating ? '#f59e0b' : '#e2e8f0'}
                        color={s <= order.feedback!.rating ? '#f59e0b' : '#cbd5e1'}
                      />
                    ))}
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309', marginLeft: 4 }}>
                      {order.feedback.rating}/5
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#059669',
                      background: '#d1fae5',
                      padding: '2px 8px',
                      borderRadius: 12,
                    }}
                  >
                    ✓ Review Logged
                  </span>
                </div>
                {order.feedback.comment && (
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: '#78350f', fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{order.feedback.comment}"
                  </p>
                )}
                <div style={{ fontSize: '0.7rem', color: '#92400e', marginTop: '0.35rem' }}>
                  Thank you for rating your meal experience!
                </div>
              </div>
            ) : order.status === 'COMPLETED' ? (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '1rem',
                  marginTop: '0.85rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: '0.2rem' }}>
                  Rate Your Meal Experience
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  How was everything? Leave a quick rating for our kitchen & baristas.
                </div>

                {feedbackError && (
                  <div
                    style={{
                      background: '#fee2e2',
                      color: '#991b1b',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {feedbackError}
                  </div>
                )}

                <form onSubmit={handleSubmitFeedback}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.65rem' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(s)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 2,
                          transition: 'transform 0.15s ease',
                          transform: (hoverRating || rating) >= s ? 'scale(1.15)' : 'scale(1)',
                        }}
                        aria-label={`Rate ${s} star${s > 1 ? 's' : ''}`}
                      >
                        <Star
                          size={24}
                          fill={(hoverRating || rating) >= s ? '#f59e0b' : '#f1f5f9'}
                          color={(hoverRating || rating) >= s ? '#f59e0b' : '#cbd5e1'}
                        />
                      </button>
                    ))}
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', marginLeft: 6 }}>
                      {hoverRating || rating} / 5 Stars
                    </span>
                  </div>

                  <div style={{ marginBottom: '0.65rem' }}>
                    <textarea
                      className="form-input"
                      rows={2}
                      maxLength={500}
                      placeholder="Optional comments (e.g. perfect microfoam, speedy pickup, crispy toast)..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      style={{ width: '100%', fontSize: '0.82rem', resize: 'vertical' }}
                    />
                    <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
                      {comment.length}/500
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingFeedback}
                    style={{ width: '100%', fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                  >
                    <Star size={14} />
                    <span>{submittingFeedback ? 'Submitting Review...' : 'Submit Meal Review'}</span>
                  </button>
                </form>
              </div>
            ) : null}

            {lastRefreshed && (
              <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.75rem' }}>
                Last updated at {lastRefreshed.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dine-In Bill Split Modal (CP-44) */}
      {order && (
        <BillSplitModal
          isOpen={isSplitModalOpen}
          onClose={() => setIsSplitModalOpen(false)}
          currencySymbol={currencySymbol}
          orderRef={order.orderRef}
          tableNumber={order.tableNumber}
          cafeName={order.cafeName}
          totalCents={order.total}
          subtotalCents={order.subtotal}
          taxCents={order.tax}
          tipCents={order.tip}
          discountCents={order.discount}
        />
      )}
    </div>
  );
};
