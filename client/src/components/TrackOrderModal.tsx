import React, { useState } from 'react';
import { Order } from '../types';
import { trackOrder } from '../api';
import { Search, X, CheckCircle, AlertCircle } from 'lucide-react';

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrackOrderModal: React.FC<TrackOrderModalProps> = ({ isOpen, onClose }) => {
  const [orderRef, setOrderRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderRef.trim()) return;

    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const data = await trackOrder(orderRef.trim());
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Order reference not found.');
    } finally {
      setLoading(false);
    }
  };

  const statusSteps = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'];
  const currentIndex = order ? statusSteps.indexOf(order.status) : -1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Track Your Order</h2>
          <button onClick={onClose} style={{ color: '#64748b' }}>
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
          <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', display: 'flex', gap: 6 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {order && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <strong style={{ fontSize: '1.1rem' }}>{order.orderRef}</strong>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{order.customerName}</div>
              </div>
              <span className={`badge ${order.status === 'READY' || order.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                {order.status}
              </span>
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1.5rem 0', position: 'relative' }}>
              {statusSteps.map((step, idx) => {
                const isPassed = currentIndex >= idx;
                const isCurrent = currentIndex === idx;
                return (
                  <div key={step} style={{ textAlign: 'center', zIndex: 1, flex: 1 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: isPassed ? '#059669' : '#e2e8f0',
                        color: isPassed ? '#ffffff' : '#94a3b8',
                        margin: '0 auto 4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      {isPassed ? <CheckCircle size={14} /> : idx + 1}
                    </div>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: isCurrent ? 700 : 500,
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

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Service:</span>
                <span style={{ fontWeight: 600 }}>{order.orderType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Total:</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>
                  {order.currencySymbol || '$'}{(order.total / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
