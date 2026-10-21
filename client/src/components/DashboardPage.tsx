import React, { useState, useEffect, useRef } from 'react';
import { User, Order, MenuItem, MenuCategory, OrderStatus } from '../types';
import {
  loginOwner,
  fetchDashboardOrders,
  updateOrderStatus,
  fetchDashboardMenu,
  toggleItemAvailability,
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
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionError, setActionError] = useState<string | null>(null);

  // Auto-refresh & Audio notifications
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
  const prevOrderCountRef = useRef<number>(0);

  const playOrderChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.15); // A5 note
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
      const [fetchedOrders, fetchedMenu] = await Promise.all([
        fetchDashboardOrders(authToken),
        fetchDashboardMenu(authToken),
      ]);

      // Check if new order arrived during polling
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
    } catch (err: any) {
      if (!isPolling) setActionError(err.message || 'Failed to load dashboard data');
      if (err.message && err.message.includes('token')) {
        handleLogout();
      }
    } finally {
      if (!isPolling) setLoadingData(false);
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

  const handlePrintTicket = (ord: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kitchen Ticket - ${ord.orderRef}</title>
          <style>
            body {
              font-family: monospace;
              padding: 16px;
              max-width: 280px;
              margin: 0 auto;
              color: #000;
            }
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
                <span class="bold">${item.quantity}x ${item.name}</span>
                <span>${currentUser?.currencySymbol || '$'}${(item.lineTotal / 100).toFixed(2)}</span>
              </div>
            `
              )
              .join('')}
          </div>

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
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
              Demo Credentials Pre-filled: <code>owner@dailygrind.com</code> / <code>password123</code>
            </p>
            <button className="btn btn-secondary btn-sm" onClick={onBackToMenu}>
              ← Return to Public Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    return o.status === statusFilter;
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
            animation: 'slideUp 0.2s ease-out',
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
          <Sliders size={16} /> Menu Availability ({menuItems.length} items)
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
                            <td style={{ fontWeight: 600 }}>{item.quantity}x</td>
                            <td>{item.name}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              {currentUser.currencySymbol}{(item.lineTotal / 100).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

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
      ) : (
        /* Menu Availability Management */
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>Menu Item Availability</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Quickly toggle items between Available and Sold Out. Changes reflect instantly on your customer's digital menu.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {menuItems.map((item) => {
              const category = categories.find((c) => c.id === item.categoryId);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    border: '1px solid #f1f5f9',
                    borderRadius: 8,
                    background: item.isAvailable ? '#ffffff' : '#f8fafc',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {category?.name || 'Item'} • {currentUser.currencySymbol}{(item.price / 100).toFixed(2)}
                    </div>
                  </div>

                  <button
                    className={`btn btn-sm ${item.isAvailable ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      background: item.isAvailable ? '#10b981' : '#f1f5f9',
                      color: item.isAvailable ? '#ffffff' : '#64748b',
                    }}
                    onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                  >
                    {item.isAvailable ? 'In Stock' : 'Sold Out'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
