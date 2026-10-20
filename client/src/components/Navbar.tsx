import React from 'react';
import { Coffee, ShoppingBag, Search, LayoutDashboard } from 'lucide-react';

interface NavbarProps {
  currentTab: 'menu' | 'dashboard';
  setCurrentTab: (tab: 'menu' | 'dashboard') => void;
  cartItemCount: number;
  openCart: () => void;
  openTrackModal: () => void;
  cafeName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  cartItemCount,
  openCart,
  openTrackModal,
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
          <span>{cafeName}</span>
        </button>

        <nav className="nav-links">
          <button
            className={`nav-link ${currentTab === 'menu' ? 'active' : ''}`}
            onClick={() => setCurrentTab('menu')}
          >
            Digital Menu
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

