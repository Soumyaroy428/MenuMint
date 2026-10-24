import React from 'react';
import { Coffee, ShoppingBag, Search, LayoutDashboard, QrCode, Store, History, Award } from 'lucide-react';
import { Cafe, SupportedLanguage } from '../types';
import { LanguageSwitcher } from './LanguageSwitcher';
import { t } from '../utils/i18n';

interface NavbarProps {
  currentTab: 'menu' | 'dashboard';
  setCurrentTab: (tab: 'menu' | 'dashboard') => void;
  cartItemCount: number;
  openCart: () => void;
  openTrackModal: () => void;
  openQRModal: () => void;
  openOrderHistoryModal?: () => void;
  openLoyaltyModal?: () => void;
  pastOrderCount?: number;
  cafeName?: string;
  availableCafes?: Cafe[];
  activeCafeSlug?: string;
  onSelectCafe?: (slug: string) => void;
  currentLanguage?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  cartItemCount,
  openCart,
  openTrackModal,
  openQRModal,
  openOrderHistoryModal,
  openLoyaltyModal,
  pastOrderCount = 0,
  cafeName = 'MenuMint',
  availableCafes = [],
  activeCafeSlug = 'daily-grind',
  onSelectCafe,
  currentLanguage = 'en',
  onLanguageChange,
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
              {t('nav.powered_by', currentLanguage)}
            </span>
          </div>
        </button>

        <nav className="nav-links">
          {/* Language Switcher (CP-48) */}
          {onLanguageChange && (
            <LanguageSwitcher
              currentLanguage={currentLanguage}
              onLanguageChange={onLanguageChange}
            />
          )}

          {/* Quick Café Switcher Dropdown */}
          {availableCafes.length > 1 && currentTab === 'menu' && onSelectCafe && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Store size={14} color="#059669" />
              <select
                aria-label={t('nav.switch_cafe', currentLanguage)}
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
            {t('nav.digital_menu', currentLanguage)}
          </button>

          <button className="nav-link" onClick={openQRModal} title="Table QR Codes">
            <QrCode size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            {t('nav.table_qr', currentLanguage)}
          </button>

          <button className="nav-link" onClick={openTrackModal} title="Check Order Status">
            <Search size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            {t('nav.track_order', currentLanguage)}
          </button>

          {openOrderHistoryModal && (
            <button className="nav-link" onClick={openOrderHistoryModal} title="View Past Orders & Reorder">
              <History size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              {t('nav.past_orders', currentLanguage)} {pastOrderCount > 0 ? `(${pastOrderCount})` : ''}
            </button>
          )}

          {openLoyaltyModal && (
            <button className="nav-link" onClick={openLoyaltyModal} title="Digital Stamp Card & Rewards (CP-46)">
              <Award size={16} color="#d97706" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              {t('nav.stamp_card', currentLanguage)}
            </button>
          )}

          <button
            className={`nav-link ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentTab('dashboard')}
          >
            <LayoutDashboard size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            {t('nav.owner_portal', currentLanguage)}
          </button>

          {currentTab === 'menu' && (
            <button className="btn btn-primary btn-sm" onClick={openCart} aria-label="View Cart">
              <ShoppingBag size={18} />
              <span>{t('nav.cart', currentLanguage)}</span>
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
