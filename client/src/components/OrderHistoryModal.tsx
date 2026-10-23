import React, { useState, useEffect } from 'react';
import { CustomerPastOrder, MenuItem } from '../types';
import { getCustomerOrderHistory, clearCustomerOrderHistory } from '../utils/orderHistory';
import { checkReorderAvailability } from '../api';
import { History, X, RotateCcw, Search, Clock, Trash2, AlertCircle } from 'lucide-react';

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cafeSlug: string;
  cafeName: string;
  currencySymbol: string;
  onTrackOrder: (orderRef: string) => void;
  onReorderSuccess: (itemsToAdd: { item: MenuItem; quantity: number }[], skippedNotice?: string) => void;
}

export const OrderHistoryModal: React.FC<OrderHistoryModalProps> = ({
  isOpen,
  onClose,
  cafeSlug,
  cafeName,
  currencySymbol,
  onTrackOrder,
  onReorderSuccess,
}) => {
  const [history, setHistory] = useState<CustomerPastOrder[]>([]);
  const [filterScope, setFilterScope] = useState<'current' | 'all'>('current');
  const [reorderingRef, setReorderingRef] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      setReorderError(null);
    }
  }, [isOpen, filterScope, cafeSlug]);

  const loadHistory = () => {
    const list = getCustomerOrderHistory(filterScope === 'current' ? cafeSlug : undefined);
    setHistory(list);
  };

  const handleClear = () => {
    if (window.confirm('Clear your entire local order history?')) {
      clearCustomerOrderHistory();
      setHistory([]);
    }
  };

  const handleReorder = async (pastOrder: CustomerPastOrder) => {
    setReorderingRef(pastOrder.orderRef);
    setReorderError(null);
    try {
      const checkRes = await checkReorderAvailability(pastOrder.cafeSlug || cafeSlug, pastOrder.items);

      if (!checkRes.isStoreOpen) {
        setReorderError(`Ordering is currently paused at this café. Please try again shortly.`);
        return;
      }

      if (checkRes.availableItems.length === 0) {
        setReorderError(`All items from this past order are currently unavailable or sold out.`);
        return;
      }

      // Map available items with their previous quantities
      const itemsToAdd: { item: MenuItem; quantity: number }[] = [];
      for (const avail of checkRes.availableItems) {
        const pastItem = pastOrder.items.find((i) => i.menuItemId === avail.id);
        const qty = pastItem ? pastItem.quantity : 1;
        itemsToAdd.push({ item: avail, quantity: qty });
      }

      let notice: string | undefined = undefined;
      if (checkRes.unavailableItems.length > 0) {
        const skippedNames = checkRes.unavailableItems
          .map((u) => u.name || 'Discontinued Item')
          .join(', ');
        notice = `Added available items to cart. Skipped sold out items: ${skippedNames}.`;
      }

      onReorderSuccess(itemsToAdd, notice);
      onClose();
    } catch (err: any) {
      setReorderError(err.message || 'Failed to check item availability for reordering.');
    } finally {
      setReorderingRef(null);
    }
  };

  if (!isOpen) return null;

  const currentCafeHistory = getCustomerOrderHistory(cafeSlug);
  const allHistory = getCustomerOrderHistory();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 540, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <History size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Recent Orders & Reorder</h2>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Your order receipts & 1-click repeat orders
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#64748b' }} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Scope Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              className={`btn btn-sm ${filterScope === 'current' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
              onClick={() => setFilterScope('current')}
            >
              {cafeName} ({currentCafeHistory.length})
            </button>
            <button
              className={`btn btn-sm ${filterScope === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
              onClick={() => setFilterScope('all')}
            >
              All Cafés ({allHistory.length})
            </button>
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
              title="Clear Local History"
            >
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>

        {/* Error message */}
        {reorderError && (
          <div
            style={{
              background: '#fee2e2',
              border: '1px solid #f87171',
              color: '#991b1b',
              padding: '0.65rem 0.85rem',
              borderRadius: 8,
              fontSize: '0.82rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{reorderError}</span>
          </div>
        )}

        {/* History List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <Clock size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>No past orders found</p>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', maxWidth: 300, margin: '0.25rem auto 0' }}>
                Orders you place on this browser will appear here for seamless 1-click reordering!
              </p>
            </div>
          ) : (
            history.map((ord) => {
              const isCurrentCafe = ord.cafeSlug === cafeSlug;
              const dateStr = new Date(ord.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
              const timeStr = new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={ord.orderRef}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '0.85rem 1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <strong style={{ fontSize: '0.95rem', letterSpacing: '0.03em' }}>{ord.orderRef}</strong>
                        {!isCurrentCafe && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                            {ord.cafeName}
                          </span>
                        )}
                        <span className={`badge ${ord.status === 'READY' || ord.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                          {ord.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 1 }}>
                        {dateStr} at {timeStr}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '1rem', color: '#059669' }}>
                        {ord.currencySymbol || currencySymbol}{(ord.total / 100).toFixed(2)}
                      </strong>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {ord.itemCount} {ord.itemCount === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                  </div>

                  {/* Items list preview */}
                  <div style={{ background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: 6, margin: '0.5rem 0', fontSize: '0.78rem', color: '#475569' }}>
                    {ord.items.map((i, idx) => (
                      <span key={idx}>
                        {i.quantity}x {i.name}
                        {idx < ord.items.length - 1 ? ' • ' : ''}
                      </span>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, fontSize: '0.78rem' }}
                      onClick={() => {
                        onTrackOrder(ord.orderRef);
                        onClose();
                      }}
                    >
                      <Search size={13} /> Track Receipt
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1.2, fontSize: '0.78rem', background: '#059669', borderColor: '#059669' }}
                      disabled={reorderingRef === ord.orderRef}
                      onClick={() => handleReorder(ord)}
                    >
                      <RotateCcw size={13} className={reorderingRef === ord.orderRef ? 'spinning' : ''} />
                      <span>{reorderingRef === ord.orderRef ? 'Checking...' : 'Reorder Items'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
