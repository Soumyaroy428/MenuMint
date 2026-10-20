import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface DashboardPageProps {
  onBackToMenu: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onBackToMenu }) => {
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

  useEffect(() => {
    if (token) {
      loadDashboardData(token);
    }
  }, [token]);

  const loadDashboardData = async (authToken: string) => {
    setLoadingData(true);
    setActionError(null);
    try {
      const [fetchedOrders, fetchedMenu] = await Promise.all([
        fetchDashboardOrders(authToken),
        fetchDashboardMenu(authToken),
      ]);
      setOrders(fetchedOrders);
      setCategories(fetchedMenu.categories);
      setMenuItems(fetchedMenu.items);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load dashboard data');
      if (err.message && err.message.includes('token')) {
        handleLogout();
      }
    } finally {
      setLoadingData(false);
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

  // If not logged in, display login screen
  if (!token || !currentUser) {
    return (
      <div className="container" style={{ padding: '3.5rem 1rem', maxWidth: 460 }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
              <Lock size={24} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Café Owner Portal</h2>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => loadDashboardData(token)} title="Refresh Data">
            <RefreshCw size={14} /> Refresh
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
                      <span className={`badge ${badgeColor}`}>{ord.status}</span>
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

