import React from 'react';
import { Coffee, ShoppingBag, Search, LayoutDashboard, QrCode } from 'lucide-react';

interface NavbarProps {
  currentTab: 'menu' | 'dashboard';
  setCurrentTab: (tab: 'menu' | 'dashboard') => void;
  cartItemCount: number;
  openCart: () => void;
  openTrackModal: () => void;
  openQRModal: () => void;
  cafeName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  cartItemCount,
  openCart,
  openTrackModal,
  openQRModal,
  cafeName = 'MenuMint',
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
