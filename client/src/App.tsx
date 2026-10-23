import { useState, useEffect } from 'react';
import { Cafe, MenuCategory, MenuItem, CartItem, Order } from './types';
import { fetchMenu, fetchCafes, trackOrder } from './api';
import { Navbar } from './components/Navbar';
import { MenuPage } from './components/MenuPage';
import { CartDrawer } from './components/CartDrawer';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';
import { TrackOrderModal } from './components/TrackOrderModal';
import { QRCodeModal } from './components/QRCodeModal';
import { DashboardPage } from './components/DashboardPage';
import { OrderHistoryModal } from './components/OrderHistoryModal';
import { LoyaltyCardModal } from './components/LoyaltyCardModal';
import { saveOrderToHistory, getCustomerOrderHistory } from './utils/orderHistory';
import { playOrderReadyChime, flashTabTitle, sendBrowserNotification } from './utils/notifications';
import { ShoppingBag, ArrowRight } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<'menu' | 'dashboard'>('menu');

  // Parse URL query parameters if opened via QR code or direct link
  const [cafeSlug, setCafeSlug] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('cafe') || 'daily-grind';
    }
    return 'daily-grind';
  });

  const [tableParam] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('table') || '';
    }
    return '';
  });

  const [availableCafes, setAvailableCafes] = useState<Cafe[]>([]);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cart & Modal states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackingOrderRef, setTrackingOrderRef] = useState<string>('');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [orderReadyAlert, setOrderReadyAlert] = useState<{ orderRef: string; cafeName: string } | null>(null);

  useEffect(() => {
    setHistoryCount(getCustomerOrderHistory(cafeSlug).length);
  }, [cafeSlug, isHistoryModalOpen, confirmedOrder]);

  // Background polling for active customer orders to trigger audio-visual ready alert (CP-42)
  useEffect(() => {
    const activeOrders = getCustomerOrderHistory(cafeSlug).filter((o) =>
      ['PENDING', 'ACCEPTED', 'PREPARING'].includes(o.status)
    );
    if (activeOrders.length === 0) return;

    const interval = setInterval(async () => {
      for (const ord of activeOrders) {
        try {
          const fresh = await trackOrder(ord.orderRef);
          if (fresh.status === 'READY') {
            playOrderReadyChime();
            if (typeof document !== 'undefined' && document.hidden) {
              flashTabTitle(`🔔 (1) ORDER READY! - ${fresh.orderRef}`);
            }
            sendBrowserNotification(`🎉 Order Ready! (${fresh.orderRef})`, {
              body: `Your order is hot and ready for pickup at ${fresh.cafeName || 'the café'}.`,
            });
            setOrderReadyAlert({ orderRef: fresh.orderRef, cafeName: fresh.cafeName || 'MenuMint Café' });
            saveOrderToHistory(fresh, cafeSlug, fresh.cafeName || 'MenuMint Café');
            setHistoryCount(getCustomerOrderHistory(cafeSlug).length);
          }
        } catch {
          // ignore transient polling errors
        }
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [cafeSlug, confirmedOrder]);

  useEffect(() => {
    fetchCafes()
      .then((cafes) => setAvailableCafes(cafes))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadMenu();
  }, [cafeSlug]);

  const handleSelectCafe = (slug: string) => {
    if (slug === cafeSlug) return;
    setCafeSlug(slug);
    setCart([]);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('cafe', slug);
      window.history.pushState({}, '', url.toString());
    }
  };

  const loadMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMenu(cafeSlug);
      setCafe(data.cafe);
      setCategories(data.categories);
      setItems(data.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load café menu.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    if (!item.isAvailable) return;
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => {
          if (ci.item.id === itemId) {
            const nextQty = ci.quantity + delta;
            return nextQty > 0 ? { ...ci, quantity: nextQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.item.id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleReorderSuccess = (itemsToAdd: { item: MenuItem; quantity: number }[], skippedNotice?: string) => {
    setCart((prev) => {
      const newCart = [...prev];
      for (const entry of itemsToAdd) {
        const existingIndex = newCart.findIndex((ci) => ci.item.id === entry.item.id);
        if (existingIndex !== -1) {
          newCart[existingIndex] = {
            ...newCart[existingIndex],
            quantity: newCart[existingIndex].quantity + entry.quantity,
          };
        } else {
          newCart.push({ item: entry.item, quantity: entry.quantity });
        }
      }
      return newCart;
    });

    if (skippedNotice) {
      alert(skippedNotice);
    }
    setIsCartOpen(true);
  };

  const totalCartCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);
  const totalCartAmount = cart.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);

  const cartItemCounts = cart.reduce((acc, ci) => {
    acc[ci.item.id] = ci.quantity;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Live Order Ready Audio-Visual Banner (CP-42) */}
      {orderReadyAlert && (
        <aside
          style={{
            position: 'fixed',
            top: 72,
            right: 20,
            zIndex: 1000,
            background: '#16a34a',
            color: '#ffffff',
            padding: '0.85rem 1.25rem',
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            maxWidth: 420,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>
              🎉 Order Ready: {orderReadyAlert.orderRef}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#dcfce7', marginTop: 2 }}>
              Your order is ready for pickup at {orderReadyAlert.cafeName}!
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ color: '#166534', background: '#ffffff', borderColor: '#ffffff', fontWeight: 700 }}
            onClick={() => {
              setTrackingOrderRef(orderReadyAlert.orderRef);
              setIsTrackModalOpen(true);
              setOrderReadyAlert(null);
            }}
          >
            View
          </button>
          <button
            onClick={() => setOrderReadyAlert(null)}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 2 }}
            aria-label="Dismiss Alert"
          >
            ✕
          </button>
        </aside>
      )}

      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        cartItemCount={totalCartCount}
        openCart={() => setIsCartOpen(true)}
        openTrackModal={() => {
          setTrackingOrderRef('');
          setIsTrackModalOpen(true);
        }}
        openQRModal={() => setIsQRModalOpen(true)}
        openOrderHistoryModal={() => setIsHistoryModalOpen(true)}
        openLoyaltyModal={() => setIsLoyaltyModalOpen(true)}
        pastOrderCount={historyCount}
        cafeName={cafe?.name || 'MenuMint'}
        availableCafes={availableCafes}
        activeCafeSlug={cafeSlug}
        onSelectCafe={handleSelectCafe}
      />

      <main style={{ flex: 1 }}>
        {currentTab === 'menu' ? (
          <MenuPage
            cafe={cafe}
            categories={categories}
            items={items}
            loading={loading}
            error={error}
            onAddToCart={handleAddToCart}
            cartItemCounts={cartItemCounts}
            onRetry={loadMenu}
            openOrderHistoryModal={() => setIsHistoryModalOpen(true)}
            openLoyaltyModal={() => setIsLoyaltyModalOpen(true)}
            pastOrderCount={historyCount}
          />
        ) : (
          <DashboardPage
            onBackToMenu={() => setCurrentTab('menu')}
            openQRModal={() => setIsQRModalOpen(true)}
          />
        )}
      </main>

      {/* Floating cart bar for mobile & quick checkout */}
      {currentTab === 'menu' && totalCartCount > 0 && !isCartOpen && (
        <aside
          className="floating-cart-bar"
          onClick={() => setIsCartOpen(true)}
          role="button"
          aria-label="View Cart"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsCartOpen(true);
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                background: '#059669',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingBag size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'} in Cart
              </div>
              <div style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
                {cafe?.currencySymbol || '$'}{(totalCartAmount / 100).toFixed(2)} subtotal
                {tableParam ? ` • ${tableParam}` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
            <span>View Order</span>
            <ArrowRight size={16} />
          </div>
        </aside>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        currencySymbol={cafe?.currencySymbol || '$'}
        cafeSlug={cafeSlug}
        defaultTable={tableParam}
        taxRate={cafe?.taxRate}
        taxName={cafe?.taxName}
        isStoreOpen={cafe?.isOpen ?? true}
        storePauseReason={cafe?.pauseReason}
        onOrderSuccess={(order) => {
          saveOrderToHistory(order, cafeSlug, cafe?.name || 'MenuMint Café');
          setConfirmedOrder(order);
          setHistoryCount(getCustomerOrderHistory(cafeSlug).length);
          loadMenu();
        }}
      />

      {/* Order Confirmation Modal */}
      <OrderConfirmationModal
        order={confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
        currencySymbol={cafe?.currencySymbol || '$'}
        onTrackOrder={(orderRef) => {
          setConfirmedOrder(null);
          setTrackingOrderRef(orderRef);
          setIsTrackModalOpen(true);
        }}
      />

      {/* Order Tracking Modal */}
      <TrackOrderModal
        isOpen={isTrackModalOpen}
        onClose={() => {
          setIsTrackModalOpen(false);
          setTrackingOrderRef('');
        }}
        initialOrderRef={trackingOrderRef}
        currencySymbol={cafe?.currencySymbol || '$'}
      />

      {/* Table QR Code Modal */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        cafeName={cafe?.name || 'MenuMint'}
        cafeSlug={cafeSlug}
      />

      {/* Customer Order History & 1-Click Reorder Modal (CP-41) */}
      <OrderHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        cafeSlug={cafeSlug}
        cafeName={cafe?.name || 'MenuMint'}
        currencySymbol={cafe?.currencySymbol || '$'}
        onTrackOrder={(orderRef) => {
          setTrackingOrderRef(orderRef);
          setIsTrackModalOpen(true);
        }}
        onReorderSuccess={handleReorderSuccess}
      />

      {/* Customer Loyalty & Digital Stamp Card Modal (CP-46) */}
      <LoyaltyCardModal
        isOpen={isLoyaltyModalOpen}
        onClose={() => setIsLoyaltyModalOpen(false)}
        cafeSlug={cafeSlug}
        cafeName={cafe?.name || 'MenuMint'}
        currencySymbol={cafe?.currencySymbol || '$'}
        onSelectReward={() => {
          setIsLoyaltyModalOpen(false);
          setIsCartOpen(true);
        }}
      />
    </div>
  );
}

export default App;
