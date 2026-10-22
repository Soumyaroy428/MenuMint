import React, { useState } from 'react';
import { CartItem, OrderType, Order } from '../types';
import { X, Trash2, Plus, Minus, ShoppingBag, Info, AlertTriangle, ArrowRight, Tag, Heart } from 'lucide-react';
import { submitOrder, validatePromoCode } from '../api';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  currencySymbol: string;
  cafeSlug: string;
  defaultTable?: string;
  isStoreOpen?: boolean;
  storePauseReason?: string;
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
  defaultTable,
  isStoreOpen = true,
  storePauseReason,
  onOrderSuccess,
}) => {
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState(defaultTable || 'Table 3');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Promo Code State
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
    message: string;
  } | null>(null);
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Tip / Gratuity State
  const [tipType, setTipType] = useState<'none' | '10' | '15' | '20' | 'custom'>('none');
  const [customTipInput, setCustomTipInput] = useState('');

  if (!isOpen) return null;

  const rawSubtotal = items.reduce((acc, ci) => acc + ci.item.price * ci.quantity, 0);
  const discountAmount = appliedPromo ? Math.min(rawSubtotal, appliedPromo.discountAmount) : 0;
  const subtotal = Math.max(0, rawSubtotal - discountAmount);
  const estimatedTax = Math.round(subtotal * 0.05);

  let tipAmount = 0;
  if (tipType === '10') {
    tipAmount = Math.round(subtotal * 0.10);
  } else if (tipType === '15') {
    tipAmount = Math.round(subtotal * 0.15);
  } else if (tipType === '20') {
    tipAmount = Math.round(subtotal * 0.20);
  } else if (tipType === 'custom') {
    const parsed = Number(customTipInput);
    if (!isNaN(parsed) && parsed > 0) {
      tipAmount = Math.round(parsed * 100);
    }
  }

  const total = subtotal + estimatedTax + tipAmount;

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;

    setPromoValidating(true);
    setPromoError(null);
    try {
      const res = await validatePromoCode(cafeSlug, promoInput.trim(), rawSubtotal);
      setAppliedPromo({
        code: res.code,
        discountAmount: res.discountAmount,
        message: res.message,
      });
      setPromoInput('');
    } catch (err: any) {
      setPromoError(err.message || 'Invalid promo code');
      setAppliedPromo(null);
    } finally {
      setPromoValidating(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim()) {
      setErrorMessage('Please provide your name for the order.');
      return;
    }

    if (!isStoreOpen) {
      setErrorMessage(storePauseReason || 'This café is currently taking a short pause for incoming orders.');
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
        promoCode: appliedPromo ? appliedPromo.code : undefined,
        tip: tipAmount > 0 ? tipAmount : undefined,
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

            {/* Promo Code Input / Applied Badge */}
            <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              {appliedPromo ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Tag size={15} color="#059669" />
                    <div>
                      <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.85rem' }}>{appliedPromo.code}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 6 }}>({appliedPromo.message})</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                    title="Remove Promo Code"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Tag size={13} color="#94a3b8" style={{ position: 'absolute', left: 8, top: 10 }} />
                      <input
                        type="text"
                        placeholder="Promo code (e.g. MINT10)"
                        className="form-input"
                        style={{ paddingLeft: '1.8rem', height: 32, fontSize: '0.8rem', textTransform: 'uppercase' }}
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ height: 32, padding: '0 0.75rem', fontSize: '0.75rem' }}
                      disabled={promoValidating || !promoInput.trim()}
                      onClick={handleApplyPromo}
                    >
                      {promoValidating ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                  {promoError && (
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4 }}>
                      {promoError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Staff Gratuity / Tip Selector */}
            <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  <Heart size={14} color="#ec4899" fill="#fbcfe8" />
                  <span>Tip Barista & Kitchen Staff</span>
                </div>
                {tipAmount > 0 && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669' }}>
                    +{currencySymbol}{(tipAmount / 100).toFixed(2)}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {[
                  { id: 'none', label: 'None' },
                  { id: '10', label: '10%' },
                  { id: '15', label: '15%' },
                  { id: '20', label: '20%' },
                  { id: 'custom', label: 'Custom' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setTipType(btn.id as any)}
                    className={`btn btn-sm ${tipType === btn.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      flex: 1,
                      padding: '0.35rem 0',
                      fontSize: '0.75rem',
                      justifyContent: 'center',
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {tipType === 'custom' && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0.50"
                    max="500.00"
                    placeholder="Custom tip (e.g. 3.00)"
                    className="form-input"
                    style={{ height: 32, fontSize: '0.8rem' }}
                    value={customTipInput}
                    onChange={(e) => setCustomTipInput(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: 2 }}>
                <span>Subtotal</span>
                <span>{currencySymbol}{(rawSubtotal / 100).toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600, marginBottom: 2 }}>
                  <span>Discount ({appliedPromo?.code})</span>
                  <span>- {currencySymbol}{(discountAmount / 100).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: 4 }}>
                <span>Estimated Tax (5%)</span>
                <span>{currencySymbol}{(estimatedTax / 100).toFixed(2)}</span>
              </div>
              {tipAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600, marginBottom: 4 }}>
                  <span>Staff Tip</span>
                  <span>+{currencySymbol}{(tipAmount / 100).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                <span>Total Due</span>
                <span>{currencySymbol}{(total / 100).toFixed(2)}</span>
              </div>
            </div>

            {/* Store Paused Banner */}
            {!isStoreOpen && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '0.6rem 0.75rem',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#991b1b',
                  fontSize: '0.8rem',
                }}
              >
                <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                <span>{storePauseReason || 'Kitchen ordering is currently paused.'}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !isStoreOpen}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                opacity: !isStoreOpen ? 0.6 : 1,
                cursor: !isStoreOpen ? 'not-allowed' : 'pointer',
              }}
            >
              {!isStoreOpen ? (
                'Store Ordering Paused'
              ) : submitting ? (
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

