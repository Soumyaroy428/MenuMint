import { useState, useEffect } from 'react';
import { Cafe, MenuCategory, MenuItem, CartItem, Order } from './types';
import { fetchMenu, fetchCafes } from './api';
import { Navbar } from './components/Navbar';
import { MenuPage } from './components/MenuPage';
import { CartDrawer } from './components/CartDrawer';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';
import { TrackOrderModal } from './components/TrackOrderModal';
import { QRCodeModal } from './components/QRCodeModal';
import { DashboardPage } from './components/DashboardPage';
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

  const totalCartCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);
  const totalCartAmount = cart.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);

  const cartItemCounts = cart.reduce((acc, ci) => {
    acc[ci.item.id] = ci.quantity;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
        isStoreOpen={cafe?.isOpen ?? true}
        storePauseReason={cafe?.pauseReason}
        onOrderSuccess={(order) => {
          setConfirmedOrder(order);
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
    </div>
  );
}

export default App;
