import React from 'react';
import { Coffee, ShoppingBag, Search, LayoutDashboard, QrCode, Store, History } from 'lucide-react';
import { Cafe } from '../types';

interface NavbarProps {
  currentTab: 'menu' | 'dashboard';
  setCurrentTab: (tab: 'menu' | 'dashboard') => void;
  cartItemCount: number;
  openCart: () => void;
  openTrackModal: () => void;
  openQRModal: () => void;
  openOrderHistoryModal?: () => void;
  pastOrderCount?: number;
  cafeName?: string;
  availableCafes?: Cafe[];
  activeCafeSlug?: string;
  onSelectCafe?: (slug: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  cartItemCount,
  openCart,
  openTrackModal,
  openQRModal,
  openOrderHistoryModal,
  pastOrderCount = 0,
  cafeName = 'MenuMint',
  availableCafes = [],
  activeCafeSlug = 'daily-grind',
  onSelectCafe,
}) => {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <button
          className="brand"
          onClick={() => setCurrentTab('menu')}
          title="Return to Menu"
        >
          <Coffee size={24} color="#059669" />
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.15 }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>{cafeName}</span>
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>
              POWERED BY MENUMINT
            </span>
          </div>
        </button>

        <nav className="nav-links">
          {/* Quick Café Switcher Dropdown */}
          {availableCafes.length > 1 && currentTab === 'menu' && onSelectCafe && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Store size={14} color="#059669" />
              <select
                aria-label="Switch Café"
                value={activeCafeSlug}
                onChange={(e) => onSelectCafe(e.target.value)}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '0.3rem 0.5rem',
                  borderRadius: 6,
                  border: '1px solid #a7f3d0',
                  background: '#ecfdf5',
                  color: '#065f46',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {availableCafes.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className={`nav-link ${currentTab === 'menu' ? 'active' : ''}`}
            onClick={() => setCurrentTab('menu')}
          >
            Digital Menu
          </button>

          <button className="nav-link" onClick={openQRModal} title="Table QR Codes">
            <QrCode size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            Table QR
          </button>

          <button className="nav-link" onClick={openTrackModal} title="Check Order Status">
            <Search size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            Track Order
          </button>

          {openOrderHistoryModal && (
            <button className="nav-link" onClick={openOrderHistoryModal} title="View Past Orders & Reorder">
              <History size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Past Orders {pastOrderCount > 0 ? `(${pastOrderCount})` : ''}
            </button>
          )}

          <button
            className={`nav-link ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentTab('dashboard')}
          >
            <LayoutDashboard size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            Owner Portal
          </button>

          {currentTab === 'menu' && (
            <button className="btn btn-primary btn-sm" onClick={openCart} aria-label="View Cart">
              <ShoppingBag size={18} />
              <span>Cart</span>
              {cartItemCount > 0 && (
                <span
                  style={{
                    background: '#ffffff',
                    color: '#065f46',
                    borderRadius: 9999,
                    padding: '2px 7px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                  }}
                >
                  {cartItemCount}
                </span>
              )}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
