import React, { useState, useEffect, useRef } from 'react';
import { User, Order, MenuItem, MenuCategory, OrderStatus, AnalyticsSummary, PromoCode, Cafe, DietaryTag, OrderFeedback } from '../types';
import {
  loginOwner,
  fetchDashboardOrders,
  updateOrderStatus,
  fetchDashboardMenu,
  toggleItemAvailability,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  fetchDashboardAnalytics,
  fetchDashboardPromos,
  createDashboardPromo,
  toggleDashboardPromo,
  deleteDashboardPromo,
  fetchDashboardCafe,
  updateDashboardCafeStatus,
  fetchDashboardFeedbacks,
} from '../api';
import {
  Lock,
  LogOut,
  Coffee,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sliders,
  DollarSign,
  Package,
  QrCode,
  Printer,
  Volume2,
  VolumeX,
  Plus,
  Pencil,
  Trash2,
  X,
  Download,
  Search,
  TrendingUp,
  Award,
  UtensilsCrossed,
  Tag,
  Heart,
  Pause,
  Play,
  Star,
} from 'lucide-react';

interface DashboardPageProps {
  onBackToMenu: () => void;
  openQRModal?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onBackToMenu, openQRModal }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('menumint_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('menumint_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Login form state
  const [email, setEmail] = useState('owner@dailygrind.com');
  const [password, setPassword] = useState('password123');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dashboard content state
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'promos' | 'analytics'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [feedbacks, setFeedbacks] = useState<OrderFeedback[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Auto-refresh & Audio notifications
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
  const prevOrderCountRef = useRef<number>(0);

  // Item Management Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemDietaryTags, setItemDietaryTags] = useState<DietaryTag[]>([]);
  const [itemSaving, setItemSaving] = useState(false);

  // Promo Code Modal State
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoType, setNewPromoType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [newPromoValue, setNewPromoValue] = useState('');
  const [newPromoMinOrder, setNewPromoMinOrder] = useState('');
  const [promoSaving, setPromoSaving] = useState(false);

  // Store Operating Status (CP-35)
  const [cafeProfile, setCafeProfile] = useState<Cafe | null>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [pauseReasonInput, setPauseReasonInput] = useState('');
  const [updatingStoreStatus, setUpdatingStoreStatus] = useState(false);

  const playOrderChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.55);
    } catch {
      // AudioContext may be restricted before interaction
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboardData(token);
    }
  }, [token]);

  // Polling loop for live kitchen auto-refresh
  useEffect(() => {
    if (!token || !autoRefresh) return;

    const interval = setInterval(() => {
      loadDashboardData(token, true);
    }, 10000);

    return () => clearInterval(interval);
  }, [token, autoRefresh, soundEnabled]);

  const loadDashboardData = async (authToken: string, isPolling = false) => {
    if (!isPolling) setLoadingData(true);
    setActionError(null);
    try {
      const [fetchedOrders, fetchedMenu, fetchedAnalytics, fetchedPromos, fetchedCafe, fetchedFeedbacks] = await Promise.all([
        fetchDashboardOrders(authToken),
        fetchDashboardMenu(authToken),
        fetchDashboardAnalytics(authToken).catch(() => null),
        fetchDashboardPromos(authToken).catch(() => []),
        fetchDashboardCafe(authToken).catch(() => null),
        fetchDashboardFeedbacks(authToken).catch(() => []),
      ]);

      if (isPolling && prevOrderCountRef.current > 0 && fetchedOrders.length > prevOrderCountRef.current) {
        const newest = fetchedOrders[0];
        if (newest && newest.status === 'PENDING') {
          playOrderChime();
          setNewOrderAlert(`🔔 New Order Received: ${newest.orderRef} (${newest.customerName})`);
          setTimeout(() => setNewOrderAlert(null), 6000);
        }
      }

      prevOrderCountRef.current = fetchedOrders.length;
      setOrders(fetchedOrders);
      setCategories(fetchedMenu.categories);
      setMenuItems(fetchedMenu.items);
      setPromos(fetchedPromos);
      setFeedbacks(fetchedFeedbacks);
      if (fetchedCafe) {
        setCafeProfile(fetchedCafe);
      }
      if (fetchedAnalytics) {
        setAnalytics(fetchedAnalytics);
      }
    } catch (err: any) {
      if (!isPolling) setActionError(err.message || 'Failed to load dashboard data');
      if (err.message && err.message.includes('token')) {
        handleLogout();
      }
    } finally {
      if (!isPolling) setLoadingData(false);
    }
  };

  const handleToggleStore = async (isOpen: boolean, reason?: string) => {
    if (!token) return;
    setUpdatingStoreStatus(true);
    try {
      const updated = await updateDashboardCafeStatus(token, isOpen, reason);
      setCafeProfile(updated);
      setIsStoreModalOpen(false);
      setPauseReasonInput('');
    } catch (err: any) {
      alert(err.message || 'Failed to update store status');
    } finally {
      setUpdatingStoreStatus(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await loginOwner(email, password);
      localStorage.setItem('menumint_token', res.token);
      localStorage.setItem('menumint_user', JSON.stringify(res.user));
      setToken(res.token);
      setCurrentUser(res.user);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid email or password');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('menumint_token');
    localStorage.removeItem('menumint_user');
    setToken(null);
    setCurrentUser(null);
    setOrders([]);
    setMenuItems([]);
    prevOrderCountRef.current = 0;
  };

  const handleStatusUpdate = async (orderId: string, nextStatus: OrderStatus) => {
    if (!token) return;
    setActionError(null);
    try {
      const updated = await updateOrderStatus(token, orderId, nextStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err: any) {
      setActionError(err.message || `Failed to transition order status to ${nextStatus}`);
    }
  };

  const handleToggleAvailability = async (itemId: string, currentAvailability: boolean) => {
    if (!token) return;
    setActionError(null);
    try {
      const updated = await toggleItemAvailability(token, itemId, !currentAvailability);
      setMenuItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    } catch (err: any) {
      setActionError(err.message || 'Failed to update item availability');
    }
  };

  // Item Modal Handlers
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory(categories[0]?.id || '');
    setItemPrice('');
    setItemDescription('');
    setItemImageUrl('');
    setItemDietaryTags([]);
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.categoryId);
    setItemPrice((item.price / 100).toFixed(2));
    setItemDescription(item.description || '');
    setItemImageUrl(item.imageUrl || '');
    setItemDietaryTags(item.dietaryTags || []);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!itemName.trim()) {
      alert('Item name is required.');
      return;
    }

    const priceInCents = Math.round(parseFloat(itemPrice) * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      alert('Please enter a valid positive price.');
      return;
    }

    setItemSaving(true);
    setActionError(null);
    try {
      if (editingItem) {
        const updated = await updateMenuItem(token, editingItem.id, {
          name: itemName.trim(),
          categoryId: itemCategory,
          price: priceInCents,
          description: itemDescription.trim(),
          imageUrl: itemImageUrl.trim(),
          dietaryTags: itemDietaryTags,
        });
        setMenuItems((prev) => prev.map((i) => (i.id === editingItem.id ? updated : i)));
      } else {
        const created = await createMenuItem(token, {
          name: itemName.trim(),
          categoryId: itemCategory,
          price: priceInCents,
          description: itemDescription.trim(),
          imageUrl: itemImageUrl.trim(),
          dietaryTags: itemDietaryTags,
        });
        setMenuItems((prev) => [...prev, created]);
      }
      setIsItemModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save menu item');
    } finally {
      setItemSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to delete "${name}" from the menu?`)) return;

    setActionError(null);
    try {
      await deleteMenuItem(token, itemId);
      setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete menu item');
    }
  };

  const handleOpenCreatePromo = () => {
    setNewPromoCode('');
    setNewPromoType('PERCENTAGE');
    setNewPromoValue('');
    setNewPromoMinOrder('');
    setIsPromoModalOpen(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const val = Number(newPromoValue);
    if (newPromoType === 'PERCENTAGE' && (val <= 0 || val > 100)) {
      alert('Percentage discount must be between 1 and 100.');
      return;
    }
    if (newPromoType === 'FIXED' && val <= 0) {
      alert('Fixed discount must be greater than 0.');
      return;
    }

    const discountValue = newPromoType === 'PERCENTAGE' ? val : Math.round(val * 100);
    const minOrderAmount = newPromoMinOrder ? Math.round(Number(newPromoMinOrder) * 100) : undefined;

    setPromoSaving(true);
    try {
      const created = await createDashboardPromo(token, {
        code: newPromoCode.trim().toUpperCase(),
        discountType: newPromoType,
        discountValue,
        minOrderAmount,
      });
      setPromos((prev) => [...prev, created]);
      setIsPromoModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create promo code');
    } finally {
      setPromoSaving(false);
    }
  };

  const handleTogglePromoStatus = async (id: string, currentStatus: boolean) => {
    if (!token) return;
    try {
      const updated = await toggleDashboardPromo(token, id, !currentStatus);
      setPromos((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err: any) {
      alert(err.message || 'Failed to update promo code status');
    }
  };

  const handleDeletePromo = async (id: string, code: string) => {
    if (!token) return;
    if (!window.confirm(`Delete promo code "${code}"?`)) return;

    try {
      await deleteDashboardPromo(token, id);
      setPromos((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete promo code');
    }
  };

  const handlePrintTicket = (ord: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kitchen Ticket - ${ord.orderRef}</title>
          <style>
            body { font-family: monospace; padding: 16px; max-width: 280px; margin: 0 auto; color: #000; }
            .center { text-align: center; }
            .dashed { border-bottom: 2px dashed #000; margin: 10px 0; }
            .item-row { display: flex; justify-content: space-between; margin: 4px 0; }
            .bold { font-weight: bold; }
            .note-box { background: #eee; padding: 4px; margin: 6px 0; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2 style="margin:0">${currentUser?.cafeName || 'MenuMint'}</h2>
            <h1 style="margin:4px 0">${ord.orderRef}</h1>
            <div class="bold">${ord.orderType.toUpperCase()} ${ord.tableNumber ? '• ' + ord.tableNumber : ''}</div>
            <div>${new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div style="margin-top:4px">Customer: ${ord.customerName}</div>
          </div>
          <div class="dashed"></div>
          ${ord.notes ? `<div class="note-box"><strong>KITCHEN NOTE:</strong> ${ord.notes}</div>` : ''}
          <div>
            ${ord.items
              .map(
                (item) => `
              <div class="item-row">
                <div>
                  <span class="bold">${item.quantity}x ${item.name}</span>
                  ${item.dietaryTags && item.dietaryTags.length > 0 ? `<div style="font-size: 10px; color: #555; font-weight: normal;">[${item.dietaryTags.join(', ')}]</div>` : ''}
                </div>
                <span>${currentUser?.currencySymbol || '$'}${(item.lineTotal / 100).toFixed(2)}</span>
              </div>
            `
              )
              .join('')}
          </div>
          ${ord.discount && ord.discount > 0 ? `
            <div class="item-row" style="color: green;">
              <span>PROMO (${ord.promoCode || 'DISCOUNT'}):</span>
              <span>-${currentUser?.currencySymbol || '$'}${(ord.discount / 100).toFixed(2)}</span>
            </div>
          ` : ''}
          ${ord.tip && ord.tip > 0 ? `
            <div class="item-row" style="color: #059669;">
              <span>STAFF TIP:</span>
              <span>+${currentUser?.currencySymbol || '$'}${(ord.tip / 100).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="dashed"></div>
          <div class="item-row bold" style="font-size: 15px">
            <span>TOTAL:</span>
            <span>${currentUser?.currencySymbol || '$'}${(ord.total / 100).toFixed(2)}</span>
          </div>
          <div class="center" style="margin-top: 16px; font-size: 11px">
            *** KITCHEN COPY ***
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // If not logged in, display login screen
  if (!token || !currentUser) {
    return (
      <div className="container" style={{ padding: '3.5rem 1rem', maxWidth: 460 }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
              <Lock size={24} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>MenuMint Owner Portal</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
              Sign in to manage incoming orders and menu items.
            </p>
          </div>

          {loginError && (
            <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.65rem 0.85rem', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', gap: 6 }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loginLoading}>
              {loginLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '1.25rem', paddingTop: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem' }}>
              Quick Demo Accounts:
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem' }}
                onClick={() => {
                  setEmail('owner@dailygrind.com');
                  setPassword('password123');
                }}
              >
                ☕ The Daily Grind
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem' }}
                onClick={() => {
                  setEmail('owner@bellavista.com');
                  setPassword('password123');
                }}
              >
                🍕 Bella Vista Bistro
              </button>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={onBackToMenu}>
              ← Return to Public Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleExportCSV = () => {
    if (orders.length === 0) {
      alert('No orders to export.');
      return;
    }
    const headers = ['Order Ref', 'Date', 'Time', 'Customer', 'Type', 'Table/Phone', 'Status', 'Items', 'Subtotal', 'Promo Code', 'Discount', 'Tip', 'Tax', 'Total'];
    const rows = orders.map((o) => [
      o.orderRef,
      new Date(o.createdAt).toLocaleDateString(),
      new Date(o.createdAt).toLocaleTimeString(),
      `"${o.customerName.replace(/"/g, '""')}"`,
      o.orderType,
      `"${(o.tableNumber || o.customerPhone || '').replace(/"/g, '""')}"`,
      o.status,
      `"${o.items.map((i) => `${i.quantity}x ${i.name}`).join('; ')}"`,
      (o.subtotal / 100).toFixed(2),
      o.promoCode || 'NONE',
      o.discount ? (o.discount / 100).toFixed(2) : '0.00',
      o.tip ? (o.tip / 100).toFixed(2) : '0.00',
      (o.tax / 100).toFixed(2),
      (o.total / 100).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `menumint-${currentUser?.cafeSlug || 'orders'}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter orders with status and search term
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const q = orderSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      o.orderRef.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.tableNumber && o.tableNumber.toLowerCase().includes(q)) ||
      (o.customerPhone && o.customerPhone.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const totalRevenue = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.total, 0);

  const activeOrdersCount = orders.filter((o) => ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status)).length;

  return (
    <div className="container" style={{ padding: '1.5rem 1rem 4rem' }}>
      {/* Toast Alert for New Orders */}
      {newOrderAlert && (
        <div
          style={{
            position: 'fixed',
            top: '74px',
            right: '20px',
            background: '#065f46',
            color: '#ffffff',
            padding: '0.85rem 1.25rem',
            borderRadius: 10,
            boxShadow: 'var(--shadow-lg)',
            zIndex: 100,
            fontWeight: 700,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>{newOrderAlert}</span>
        </div>
      )}

      {/* Dashboard Header Banner */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: '#ffffff', padding: '1.25rem', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Coffee size={20} color="#059669" />
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{currentUser.cafeName}</h1>
            <span className="badge badge-success">{currentUser.role}</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 2 }}>
            Logged in as <strong>{currentUser.email}</strong> • Scoped Tenant: <code>{currentUser.cafeId}</code>
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          {openQRModal && (
            <button className="btn btn-secondary btn-sm" onClick={openQRModal} title="Generate Table QR Codes">
              <QrCode size={14} /> Table QRs
            </button>
          )}

          <button
            className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title="Toggle Kitchen Live Polling"
          >
            <RefreshCw size={14} className={autoRefresh ? 'spin-icon' : ''} />
            <span>{autoRefresh ? 'Live Polling: ON (10s)' : 'Live Polling: OFF'}</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Order sound alert ON' : 'Order sound alert OFF'}
          >
            {soundEnabled ? <Volume2 size={14} color="#059669" /> : <VolumeX size={14} color="#94a3b8" />}
          </button>

          <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ color: '#ef4444' }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* Store Operating Status Control Bar (CP-35) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          background: cafeProfile?.isOpen === false ? '#fffbeb' : '#f0fdf4',
          border: `1px solid ${cafeProfile?.isOpen === false ? '#fcd34d' : '#86efac'}`,
          borderRadius: 12,
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: cafeProfile?.isOpen === false ? '#d97706' : '#16a34a',
              boxShadow: cafeProfile?.isOpen === false ? '0 0 0 4px #fef3c7' : '0 0 0 4px #dcfce7',
            }}
          />
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: '0.95rem',
                color: cafeProfile?.isOpen === false ? '#92400e' : '#14532d',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{cafeProfile?.isOpen === false ? '⏸️ Ordering Currently Paused' : '🟢 Kitchen Accepting Orders (Live)'}</span>
              <span className={`badge ${cafeProfile?.isOpen === false ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.7rem' }}>
                {cafeProfile?.isOpen === false ? 'Store Paused' : 'Active'}
              </span>
            </div>
            {cafeProfile?.isOpen === false && cafeProfile.pauseReason && (
              <div style={{ fontSize: '0.8rem', color: '#b45309', marginTop: 2 }}>
                Customer Notice: <em>"{cafeProfile.pauseReason}"</em>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {cafeProfile?.isOpen === false ? (
            <button
              className="btn btn-primary btn-sm"
              style={{ background: '#16a34a', borderColor: '#16a34a' }}
              disabled={updatingStoreStatus}
              onClick={() => handleToggleStore(true)}
            >
              <Play size={14} /> Resume Accepting Orders
            </button>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              style={{ color: '#b45309', borderColor: '#fcd34d' }}
              disabled={updatingStoreStatus}
              onClick={() => setIsStoreModalOpen(true)}
            >
              <Pause size={14} /> Pause Incoming Orders
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.85rem' }}>
            <Clock size={16} /> Active Orders
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {activeOrdersCount}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.85rem' }}>
            <Package size={16} /> Total Orders
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {orders.length}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.85rem' }}>
            <DollarSign size={16} /> Recorded Volume
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669', marginTop: 4 }}>
            {currentUser.currencySymbol}{(totalRevenue / 100).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button
          className={`btn btn-sm ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('orders')}
        >
          <Clock size={16} /> Live Orders ({orders.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'menu' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('menu')}
        >
          <Sliders size={16} /> Menu Management ({menuItems.length} items)
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'promos' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('promos')}
        >
          <Tag size={16} /> Promo Codes ({promos.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('analytics')}
        >
          <TrendingUp size={16} /> Insights & Analytics
        </button>
      </div>

      {actionError && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', gap: 6 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{actionError}</span>
        </div>
      )}

      {loadingData ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
          <p>Syncing kitchen data...</p>
        </div>
      ) : activeTab === 'orders' ? (
        <div>
          {/* Order Search & Export Toolbar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 360 }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 11 }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.2rem', paddingRight: '0.75rem', height: 36, fontSize: '0.85rem' }}
                placeholder="Search customer, ref, or table..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleExportCSV}
              title="Download Orders CSV for Bookkeeping"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          {/* Status Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
            {['all', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem' }}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'all' ? 'All' : st}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
              <CheckCircle size={40} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontWeight: 600 }}>No orders match this filter.</p>
            </div>
          ) : (
            <div className="dashboard-grid">
              {filteredOrders.map((ord) => {
                const badgeColor =
                  ord.status === 'PENDING'
                    ? 'badge-warning'
                    : ord.status === 'ACCEPTED' || ord.status === 'PREPARING'
                    ? 'badge-info'
                    : ord.status === 'READY' || ord.status === 'COMPLETED'
                    ? 'badge-success'
                    : 'badge-danger';

                return (
                  <div key={ord.id} className="order-card">
                    <div className="order-card-header">
                      <div>
                        <strong style={{ fontSize: '1.1rem' }}>{ord.orderRef}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className={`badge ${badgeColor}`}>{ord.status}</span>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.5rem' }}
                          onClick={() => handlePrintTicket(ord)}
                          title="Print Kitchen Ticket"
                        >
                          <Printer size={13} />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      <strong>{ord.customerName}</strong>
                      <span style={{ color: '#64748b', marginLeft: 6 }}>
                        • {ord.orderType} {ord.tableNumber ? `(${ord.tableNumber})` : ''}
                      </span>
                      {ord.customerPhone && (
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{ord.customerPhone}</div>
                      )}
                    </div>

                    {ord.notes && (
                      <div style={{ background: '#fef3c7', padding: '0.35rem 0.6rem', borderRadius: 6, fontSize: '0.75rem', color: '#92400e', marginBottom: '0.5rem' }}>
                        Note: {ord.notes}
                      </div>
                    )}

                    <table className="order-items-table">
                      <tbody>
                        {ord.items.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600, verticalAlign: 'top' }}>{item.quantity}x</td>
                            <td>
                              <div>{item.name}</div>
                              {item.dietaryTags && item.dietaryTags.length > 0 && (
                                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
                                  {item.dietaryTags.map((t) => (
                                    <span key={t} style={{ fontSize: '0.62rem', padding: '0 4px', borderRadius: 4, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                                      {t === 'VEGAN' ? '🌱 Vegan' : t === 'VEGETARIAN' ? '🥗 Veg' : t === 'GLUTEN_FREE' ? '🌾 GF' : t === 'NUT_FREE' ? '🥜 Nut-Free' : t === 'SPICY' ? '🌶️ Spicy' : '⭐ Pick'}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, verticalAlign: 'top' }}>
                              {currentUser.currencySymbol}{(item.lineTotal / 100).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {ord.discount && ord.discount > 0 ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontSize: '0.8rem', fontWeight: 600, padding: '0.2rem 0' }}>
                        <span>Promo Discount ({ord.promoCode || 'PROMO'})</span>
                        <span>-{currentUser.currencySymbol}{(ord.discount / 100).toFixed(2)}</span>
                      </div>
                    ) : null}

                    {ord.tip && ord.tip > 0 ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontSize: '0.8rem', fontWeight: 600, padding: '0.2rem 0' }}>
                        <span>Staff Tip (Gratuity)</span>
                        <span>+{currentUser.currencySymbol}{(ord.tip / 100).toFixed(2)}</span>
                      </div>
                    ) : null}

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                      <span>Total Due</span>
                      <span style={{ color: '#059669' }}>
                        {currentUser.currencySymbol}{(ord.total / 100).toFixed(2)}
                      </span>
                    </div>

                    {/* Action buttons based on state machine */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                      {ord.status === 'PENDING' && (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1 }}
                            onClick={() => handleStatusUpdate(ord.id, 'ACCEPTED')}
                          >
                            Accept Order
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#ef4444' }}
                            onClick={() => handleStatusUpdate(ord.id, 'CANCELLED')}
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {ord.status === 'ACCEPTED' && (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1 }}
                            onClick={() => handleStatusUpdate(ord.id, 'PREPARING')}
                          >
                            Start Preparing
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#ef4444' }}
                            onClick={() => handleStatusUpdate(ord.id, 'CANCELLED')}
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {ord.status === 'PREPARING' && (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, background: '#0284c7' }}
                            onClick={() => handleStatusUpdate(ord.id, 'READY')}
                          >
                            Mark Ready
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#ef4444' }}
                            onClick={() => handleStatusUpdate(ord.id, 'CANCELLED')}
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {ord.status === 'READY' && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, background: '#16a34a' }}
                          onClick={() => handleStatusUpdate(ord.id, 'COMPLETED')}
                        >
                          Complete Order
                        </button>
                      )}

                      {['COMPLETED', 'CANCELLED'].includes(ord.status) && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No further actions (Final state)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'menu' ? (
        /* Menu Management */
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Café Menu Catalog</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Add new items, update prices, and control real-time inventory availability.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleOpenAddModal}>
              <Plus size={15} /> Add Menu Item
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {menuItems.map((item) => {
              const category = categories.find((c) => c.id === item.categoryId);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    background: item.isAvailable ? '#ffffff' : '#f8fafc',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1rem' }}>{item.name}</strong>
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                        {category?.name || 'Item'}
                      </span>
                      {item.dietaryTags && item.dietaryTags.map((tag) => (
                        <span key={tag} className="badge" style={{ fontSize: '0.65rem', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                          {tag === 'VEGAN' ? '🌱 Vegan' : tag === 'VEGETARIAN' ? '🥗 Veg' : tag === 'GLUTEN_FREE' ? '🌾 GF' : tag === 'NUT_FREE' ? '🥜 Nut-Free' : tag === 'SPICY' ? '🌶️ Spicy' : '⭐ Pick'}
                        </span>
                      ))}
                    </div>
                    {item.description && (
                      <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{item.description}</p>
                    )}
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#059669', marginTop: 4 }}>
                      {currentUser.currencySymbol}{(item.price / 100).toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className={`btn btn-sm ${item.isAvailable ? 'btn-primary' : 'btn-secondary'}`}
                      style={{
                        background: item.isAvailable ? '#10b981' : '#f1f5f9',
                        color: item.isAvailable ? '#ffffff' : '#64748b',
                        minWidth: 84,
                      }}
                      onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                      title="Toggle availability"
                    >
                      {item.isAvailable ? 'In Stock' : 'Sold Out'}
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenEditModal(item)}
                      title="Edit Item Details"
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#ef4444' }}
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      title="Delete Item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === 'promos' ? (
        /* Promo Codes View */
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={20} color="#059669" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Promotions & Discount Codes</h2>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 2 }}>
                Configure coupon codes for customer checkout with automated server validation.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleOpenCreatePromo}>
              <Plus size={15} /> Create Promo Code
            </button>
          </div>

          {promos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <Tag size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontWeight: 600 }}>No promo codes yet</p>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Create your first discount code to boost orders!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {promos.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '1rem',
                    background: p.isActive ? '#ffffff' : '#f8fafc',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        background: p.isActive ? '#d1fae5' : '#f1f5f9',
                        color: p.isActive ? '#065f46' : '#94a3b8',
                        padding: '0.4rem 0.75rem',
                        borderRadius: 8,
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        fontSize: '0.95rem',
                        border: '1px dashed #cbd5e1',
                      }}
                    >
                      {p.code}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {p.discountType === 'PERCENTAGE'
                          ? `${p.discountValue}% OFF Total Order`
                          : `${currentUser.currencySymbol}${(p.discountValue / 100).toFixed(2)} Flat Discount`}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {p.minOrderAmount
                          ? `Min. order ${currentUser.currencySymbol}${(p.minOrderAmount / 100).toFixed(2)} required`
                          : 'No minimum order required'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{
                        fontSize: '0.75rem',
                        color: p.isActive ? '#059669' : '#94a3b8',
                        borderColor: p.isActive ? '#a7f3d0' : '#e2e8f0',
                      }}
                      onClick={() => handleTogglePromoStatus(p.id, p.isActive)}
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#ef4444' }}
                      onClick={() => handleDeletePromo(p.id, p.code)}
                      title="Delete Promo Code"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Insights & Analytics View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={22} color="#059669" />
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Business Performance & Insights</h2>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 2 }}>
                Real-time calculated metrics scoped to <strong>{currentUser.cafeName}</strong>.
              </p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => token && loadDashboardData(token)}
              title="Refresh Analytics"
            >
              <RefreshCw size={14} /> Refresh Insights
            </button>
          </div>

          {analytics && (
            <>
              {/* Analytics Metric Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem' }}>
                    <span>Gross Revenue</span>
                    <DollarSign size={18} color="#059669" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669', marginTop: '0.5rem' }}>
                    {currentUser.currencySymbol}{(analytics.totalRevenue / 100).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    From {analytics.totalOrders} total recorded orders
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem' }}>
                    <span>Average Order Value</span>
                    <TrendingUp size={18} color="#0284c7" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0284c7', marginTop: '0.5rem' }}>
                    {currentUser.currencySymbol}{(analytics.averageOrderValue / 100).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Per active transaction
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem' }}>
                    <span>Active vs Completed</span>
                    <Package size={18} color="#d97706" />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>
                    {analytics.activeOrders} <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500 }}>active / {analytics.completedOrders} completed</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Kitchen fulfillment load
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem' }}>
                    <span>Fulfillment Split</span>
                    <UtensilsCrossed size={18} color="#8b5cf6" />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>
                    {analytics.dineInCount} Dine-In / {analytics.takeawayCount} To-Go
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, marginTop: '0.5rem', overflow: 'hidden', display: 'flex' }}>
                    <div
                      style={{
                        width: `${analytics.totalOrders > 0 ? (analytics.dineInCount / analytics.totalOrders) * 100 : 50}%`,
                        background: '#059669',
                      }}
                      title="Dine In %"
                    />
                    <div
                      style={{
                        width: `${analytics.totalOrders > 0 ? (analytics.takeawayCount / analytics.totalOrders) * 100 : 50}%`,
                        background: '#3b82f6',
                      }}
                      title="Takeaway %"
                    />
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem' }}>
                    <span>Staff Tips Collected</span>
                    <Heart size={18} color="#ec4899" fill="#fbcfe8" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ec4899', marginTop: '0.5rem' }}>
                    {currentUser.currencySymbol}{((analytics.totalTips || 0) / 100).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Total barista & kitchen gratuity
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem' }}>
                    <span>Customer Rating & CSAT</span>
                    <Star size={18} color="#f59e0b" fill="#fef3c7" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.5rem', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    {analytics.averageRating > 0 ? analytics.averageRating.toFixed(1) : 'N/A'}
                    <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 500 }}>/ 5.0</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    {analytics.totalFeedbackCount} {analytics.totalFeedbackCount === 1 ? 'review logged' : 'reviews logged'}
                  </div>
                </div>
              </div>

              {/* Two Column Section: Top Selling Items + Status Pipeline */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {/* Top Selling Items */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Award size={18} color="#f59e0b" />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Top-Selling Menu Items</h3>
                  </div>

                  {analytics.topSellingItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                      No sales recorded yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {analytics.topSellingItems.map((item, idx) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.65rem 0.85rem',
                            background: '#f8fafc',
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                background: idx === 0 ? '#fef3c7' : '#e2e8f0',
                                color: idx === 0 ? '#b45309' : '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                              }}
                            >
                              #{idx + 1}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {item.quantitySold} {item.quantitySold === 1 ? 'unit sold' : 'units sold'}
                              </div>
                            </div>
                          </div>
                          <strong style={{ color: '#059669', fontSize: '0.95rem' }}>
                            {currentUser.currencySymbol}{(item.revenue / 100).toFixed(2)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pipeline Status Breakdown */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Clock size={18} color="#059669" />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Order Pipeline Status</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    {Object.entries(analytics.statusDistribution).map(([statusKey, count]) => {
                      const isPending = statusKey === 'PENDING';
                      const isPreparing = statusKey === 'PREPARING';
                      const isReady = statusKey === 'READY';
                      const isCompleted = statusKey === 'COMPLETED';
                      const isCancelled = statusKey === 'CANCELLED';

                      return (
                        <div
                          key={statusKey}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                              {statusKey}
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isPending ? '#d97706' : isPreparing ? '#0284c7' : isReady ? '#16a34a' : isCompleted ? '#059669' : isCancelled ? '#ef4444' : '#334155' }}>
                              {count}
                            </div>
                          </div>
                          <span
                            className={`badge ${isCompleted || isReady ? 'badge-success' : isCancelled ? 'badge-error' : 'badge-warning'}`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {statusKey}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Customer Reviews & Feedback Feed (CP-37) */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Star size={18} color="#f59e0b" fill="#fef3c7" />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Recent Customer Reviews & Feedback</h3>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    {feedbacks.length} {feedbacks.length === 1 ? 'Review' : 'Reviews'}
                  </span>
                </div>

                {feedbacks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                    No customer reviews submitted yet. When customers complete an order, they can leave 1–5 star ratings and meal feedback.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {feedbacks.map((fb) => (
                      <div
                        key={fb.id}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 10,
                          padding: '0.85rem 1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 2 }}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={14}
                                  fill={s <= fb.rating ? '#f59e0b' : '#e2e8f0'}
                                  color={s <= fb.rating ? '#f59e0b' : '#cbd5e1'}
                                />
                              ))}
                            </div>
                            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{fb.customerName}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>• {fb.orderRef}</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {new Date(fb.createdAt).toLocaleDateString()} {new Date(fb.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {fb.comment && (
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#334155', fontStyle: 'italic', lineHeight: 1.4 }}>
                            "{fb.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Add / Edit Menu Item Modal */}
      {isItemModalOpen && (
        <div className="modal-overlay" onClick={() => setIsItemModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h2>
              <button onClick={() => setIsItemModalOpen(false)} style={{ color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveItem}>
              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Iced Pistachio Latte"
                  className="form-input"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category *</label>
                  <select
                    className="form-input"
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Price ({currentUser.currencySymbol}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.50"
                    required
                    placeholder="e.g. 5.50"
                    className="form-input"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sweet pistachio purée shaken with double espresso and whole milk."
                  className="form-input"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  className="form-input"
                  value={itemImageUrl}
                  onChange={(e) => setItemImageUrl(e.target.value)}
                />
              </div>

              {/* Dietary Tags Checkboxes (CP-36) */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ marginBottom: '0.4rem' }}>Dietary & Allergy Tags</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                  {[
                    { tag: 'VEGAN', label: '🌱 Vegan' },
                    { tag: 'VEGETARIAN', label: '🥗 Vegetarian' },
                    { tag: 'GLUTEN_FREE', label: '🌾 Gluten-Free' },
                    { tag: 'NUT_FREE', label: '🥜 Nut-Free' },
                    { tag: 'SPICY', label: '🌶️ Spicy' },
                    { tag: 'CHEF_SPECIAL', label: "⭐ Chef's Pick" },
                  ].map(({ tag, label }) => {
                    const isChecked = itemDietaryTags.includes(tag as any);
                    return (
                      <label
                        key={tag}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.35rem 0.5rem',
                          borderRadius: 6,
                          background: isChecked ? '#f0fdf4' : '#f8fafc',
                          border: `1px solid ${isChecked ? '#86efac' : '#e2e8f0'}`,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          fontWeight: isChecked ? 700 : 500,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setItemDietaryTags([...itemDietaryTags, tag as any]);
                            } else {
                              setItemDietaryTags(itemDietaryTags.filter((t) => t !== tag));
                            }
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsItemModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={itemSaving}
                >
                  {itemSaving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Promo Code Modal */}
      {isPromoModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPromoModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Create New Promo Code</h2>
              <button onClick={() => setIsPromoModalOpen(false)} style={{ color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePromo}>
              <div className="form-group">
                <label className="form-label">Promo Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER20"
                  className="form-input"
                  style={{ textTransform: 'uppercase' }}
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Discount Type *</label>
                  <select
                    className="form-input"
                    value={newPromoType}
                    onChange={(e) => setNewPromoType(e.target.value as any)}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ({currentUser.currencySymbol})</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Discount Value {newPromoType === 'PERCENTAGE' ? '(%)' : `(${currentUser.currencySymbol})`} *
                  </label>
                  <input
                    type="number"
                    step={newPromoType === 'PERCENTAGE' ? '1' : '0.01'}
                    min={newPromoType === 'PERCENTAGE' ? '1' : '0.50'}
                    max={newPromoType === 'PERCENTAGE' ? '100' : '500'}
                    required
                    placeholder={newPromoType === 'PERCENTAGE' ? 'e.g. 15' : 'e.g. 3.00'}
                    className="form-input"
                    value={newPromoValue}
                    onChange={(e) => setNewPromoValue(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Minimum Order Amount (Optional, {currentUser.currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 15.00"
                  className="form-input"
                  value={newPromoMinOrder}
                  onChange={(e) => setNewPromoMinOrder(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsPromoModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={promoSaving}
                >
                  {promoSaving ? 'Creating...' : 'Create Promo Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pause Store Modal (CP-35) */}
      {isStoreModalOpen && (
        <div className="modal-overlay" onClick={() => setIsStoreModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Pause size={20} color="#d97706" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Pause Incoming Orders</h2>
              </div>
              <button onClick={() => setIsStoreModalOpen(false)} style={{ color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
              Pausing will immediately stop new customers from placing orders on your digital menu. Current active orders can still be fulfilled.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ marginBottom: '0.4rem' }}>Quick Preset Notice</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {[
                  'Kitchen rush: Paused for 15 mins',
                  'High order volume: Paused for 30 mins',
                  'Sold out of fresh dough: Prepping now',
                  'Closed for the rest of today',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      borderColor: pauseReasonInput === preset ? '#d97706' : '#e2e8f0',
                      background: pauseReasonInput === preset ? '#fffbeb' : '#ffffff',
                      color: pauseReasonInput === preset ? '#92400e' : '#475569',
                    }}
                    onClick={() => setPauseReasonInput(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Customer Notice / Pause Reason (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Kitchen rush: Paused for 20 mins"
                value={pauseReasonInput}
                onChange={(e) => setPauseReasonInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setIsStoreModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, background: '#d97706', borderColor: '#d97706' }}
                disabled={updatingStoreStatus}
                onClick={() => handleToggleStore(false, pauseReasonInput || undefined)}
              >
                {updatingStoreStatus ? 'Pausing...' : 'Confirm Pause Orders'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
