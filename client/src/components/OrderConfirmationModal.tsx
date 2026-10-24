import React from 'react';
import { Order } from '../types';
import { CheckCircle2, Clock, MapPin, Receipt, X, Activity } from 'lucide-react';

interface OrderConfirmationModalProps {
  order: Order | null;
  onClose: () => void;
  currencySymbol: string;
  onTrackOrder?: (orderRef: string) => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  onClose,
  currencySymbol,
  onTrackOrder,
}) => {
  if (!order) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ color: '#94a3b8' }} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div style={{ textAlign: 'center', padding: '0.5rem 0 1.5rem' }}>
          <CheckCircle2 size={56} color="#059669" style={{ margin: '0 auto 0.75rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#065f46' }}>Order Placed!</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            The barista has received your order and started preparing it.
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#f1f5f9',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              marginTop: '1rem',
              border: '1px dashed #cbd5e1',
            }}
          >
            <Receipt size={16} color="#475569" />
            <span style={{ fontSize: '0.85rem', color: '#475569' }}>Order Reference:</span>
            <strong style={{ fontSize: '1.1rem', color: '#0f172a', letterSpacing: '0.05em' }}>
              {order.orderRef}
            </strong>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={14} /> Status:
            </span>
            <span className="badge badge-warning">{order.status}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={14} /> Service:
            </span>
            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
              {order.orderType} {order.tableNumber ? `(${order.tableNumber})` : ''}
            </span>
          </div>

          {order.pickupWindow && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: '#0369a1', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                <Clock size={14} color="#0284c7" /> Pickup Window:
              </span>
              <span className="badge badge-info" style={{ fontWeight: 800 }}>
                🕒 {order.pickupWindow}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: '#64748b' }}>Customer:</span>
            <span style={{ fontWeight: 600 }}>{order.customerName}</span>
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Order Items Summary
          </h4>
          <div style={{ borderTop: '1px solid #e2e8f0' }}>
            {order.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0',
                  fontSize: '0.85rem',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {currencySymbol}{(item.lineTotal / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {order.discount && order.discount > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>Promo Discount ({order.promoCode || 'PROMO'})</span>
              <span>- {currencySymbol}{(order.discount / 100).toFixed(2)}</span>
            </div>
          ) : null}

          {order.tip && order.tip > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>Staff Tip (Gratuity)</span>
              <span>+ {currencySymbol}{(order.tip / 100).toFixed(2)}</span>
            </div>
          ) : null}

          {order.tax > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', color: '#64748b', fontSize: '0.85rem' }}>
              <span>{order.taxName || 'Tax'} ({order.taxRate ? `${order.taxRate}%` : 'Regional'})</span>
              <span>{currencySymbol}{(order.tax / 100).toFixed(2)}</span>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontWeight: 800, fontSize: '1.05rem' }}>
            <span>Total Confirmed</span>
            <span style={{ color: '#059669' }}>
              {currencySymbol}{(order.total / 100).toFixed(2)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {onTrackOrder && (
            <button
              className="btn btn-primary"
              onClick={() => onTrackOrder(order.orderRef)}
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              <Activity size={18} />
              <span>Track Live Order Status</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
            Done / Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

