import React, { useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import { trackOrder, submitOrderFeedback } from '../api';
import { Search, X, CheckCircle, AlertCircle, RefreshCw, Printer, Clock, Star } from 'lucide-react';

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
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>
                  {order.customerName} {order.tableNumber ? `• ${order.tableNumber}` : `• ${order.orderType}`}
                </div>
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
            </div>

            {/* Total and Print Actions */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Paid: </span>
                <strong style={{ fontSize: '1.1rem', color: '#059669' }}>
                  {currencySymbol}{(order.total / 100).toFixed(2)}
                </strong>
              </div>
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
    </div>
  );
};
