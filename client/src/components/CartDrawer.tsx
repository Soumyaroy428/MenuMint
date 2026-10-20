import React, { useState } from 'react';
import { CartItem, OrderType, Order } from '../types';
import { X, Trash2, Plus, Minus, ShoppingBag, Info, AlertTriangle, ArrowRight } from 'lucide-react';
import { submitOrder } from '../api';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  currencySymbol: string;
  cafeSlug: string;
  onOrderSuccess: (order: Order) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  currencySymbol,
  cafeSlug,
  onOrderSuccess,
}) => {
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('Table 3');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, ci) => acc + ci.item.price * ci.quantity, 0);
  const estimatedTax = Math.round(subtotal * 0.05);
  const total = subtotal + estimatedTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim()) {
      setErrorMessage('Please provide your name for the order.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Your cart is empty.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        cafeSlug,
        orderType,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        tableNumber: orderType === 'dine-in' ? tableNumber.trim() : undefined,
        notes: notes.trim() || undefined,
        items: items.map((ci) => ({
          menuItemId: ci.item.id,
          quantity: ci.quantity,
        })),
      };

      const response = await submitOrder(payload);
      onClearCart();
      onClose();
      onOrderSuccess(response.order);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit order. Please check item availability.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cart-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={20} color="#059669" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Your Order Cart</h2>
            <span className="badge badge-neutral">{items.reduce((sum, i) => sum + i.quantity, 0)} items</span>
          </div>
          <button onClick={onClose} aria-label="Close cart" style={{ color: '#64748b' }}>
            <X size={22} />
          </button>
        </div>

        {/* Demo Mode Notice Banner */}
        <div style={{ background: '#ecfdf5', borderBottom: '1px solid #a7f3d0', padding: '0.6rem 1rem', fontSize: '0.8rem', color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Info size={16} />
          <span><strong>Demo Mode:</strong> No payment required. Order is sent directly to the café kitchen.</span>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{ margin: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.65rem 0.85rem', borderRadius: 8, fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Cart items list */}
        {items.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', padding: '2rem' }}>
            <ShoppingBag size={48} strokeWidth={1.5} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
            <p style={{ fontWeight: 600, fontSize: '1rem' }}>Your cart is empty</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Add delicious coffees and pastries to get started.</p>
          </div>
        ) : (
          <div className="cart-items-list">
            {items.map((cartItem) => (
              <div key={cartItem.item.id} className="cart-item-row">
                <div style={{ flex: 1, paddingRight: '0.75rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{cartItem.item.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {currencySymbol}{(cartItem.item.price / 100).toFixed(2)} each
                  </div>
                </div>

                <div className="qty-control">
                  <button
                    className="qty-btn"
                    onClick={() => onUpdateQuantity(cartItem.item.id, -1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="qty-display">{cartItem.quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => onUpdateQuantity(cartItem.item.id, 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div style={{ textAlign: 'right', minWidth: 64, marginLeft: '0.75rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {currencySymbol}{((cartItem.item.price * cartItem.quantity) / 100).toFixed(2)}
                  </div>
                  <button
                    onClick={() => onRemoveItem(cartItem.item.id)}
                    style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 2 }}
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Details Form & Footer */}
        {items.length > 0 && (
          <form onSubmit={handleSubmit} className="cart-footer">
            {/* Order Type Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${orderType === 'dine-in' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setOrderType('dine-in')}
              >
                🍽️ Dine-in
              </button>
              <button
                type="button"
                className={`btn btn-sm ${orderType === 'takeaway' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setOrderType('takeaway')}
              >
                🥡 Takeaway
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: orderType === 'dine-in' ? '1fr 1fr' : '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">Your Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  className="form-input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              {orderType === 'dine-in' ? (
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label">Table Number</label>
                  <input
                    type="text"
                    placeholder="e.g. Table 4"
                    className="form-input"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label">Phone (Optional)</label>
                  <input
                    type="tel"
                    placeholder="e.g. (555) 019-2834"
                    className="form-input"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <input
                type="text"
                placeholder="Kitchen notes (e.g. oat milk, extra hot, no cinnamon)"
                className="form-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Price Breakdown */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: 2 }}>
                <span>Subtotal</span>
                <span>{currencySymbol}{(subtotal / 100).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: 4 }}>
                <span>Estimated Tax (5%)</span>
                <span>{currencySymbol}{(estimatedTax / 100).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                <span>Total Due</span>
                <span>{currencySymbol}{(total / 100).toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
            >
              {submitting ? (
                'Transmitting Order to Kitchen...'
              ) : (
                <>
                  <span>Send Order to Café</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

