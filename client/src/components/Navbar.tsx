import React, { useState } from 'react';
import {
  Coffee,
  ShoppingBag,
  Search,
  LayoutDashboard,
  QrCode,
  Store,
  History,
  Award,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { Cafe, SupportedLanguage } from '../types';
import { LanguageSwitcher } from './LanguageSwitcher';
import { t, LANGUAGES } from '../utils/i18n';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (action: () => void) => {
    setIsMobileMenuOpen(false);
    action();
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        {/* Brand */}
        <button
          className="brand"
          onClick={() => handleNavClick(() => setCurrentTab('menu'))}
          title="Return to Menu"
        >
          <Coffee size={24} color="#059669" style={{ flexShrink: 0 }} />
          <div className="brand-text-container">
            <span className="brand-title">{cafeName}</span>
            <span className="brand-subtitle">
              {t('nav.powered_by', currentLanguage)}
            </span>
          </div>
        </button>

        {/* Desktop Navigation (>= 1024px) */}
        <nav className="nav-links nav-links-desktop">
          {/* Language Switcher */}
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
                className="cafe-select-desktop"
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
            <button className="nav-link" onClick={openLoyaltyModal} title="Digital Stamp Card & Rewards">
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
                <span className="cart-badge-pill">
                  {cartItemCount}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* Mobile / Tablet Action Bar (< 1024px) */}
        <div className="nav-mobile-bar">
          {/* Compact Language Selector */}
          {onLanguageChange && (
            <LanguageSwitcher
              currentLanguage={currentLanguage}
              onLanguageChange={onLanguageChange}
              variant="compact"
            />
          )}

          {/* Quick Cart Button on Mobile */}
          {currentTab === 'menu' && (
            <button
              className="btn btn-primary btn-sm mobile-cart-trigger"
              onClick={openCart}
              aria-label="View Cart"
            >
              <ShoppingBag size={18} />
              {cartItemCount > 0 && (
                <span className="cart-badge-pill">
                  {cartItemCount}
                </span>
              )}
            </button>
          )}

          {/* Hamburger Menu Button */}
          <button
            className="mobile-hamburger-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={22} color="#0f172a" /> : <Menu size={22} color="#0f172a" />}
          </button>
        </div>
      </div>

      {/* Slide-out Mobile Navigation Drawer (< 1024px) */}
      {isMobileMenuOpen && (
        <>
          <div
            className="mobile-drawer-backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="mobile-drawer" aria-label="Mobile navigation drawer">
            <div className="mobile-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Coffee size={22} color="#059669" />
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                  {cafeName}
                </span>
              </div>
              <button
                className="mobile-drawer-close"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Café Switcher in Drawer */}
            {availableCafes.length > 1 && onSelectCafe && (
              <div className="mobile-drawer-section">
                <div className="mobile-drawer-section-label">
                  <Store size={14} color="#059669" />
                  <span>{t('nav.switch_cafe', currentLanguage)}</span>
                </div>
                <select
                  aria-label={t('nav.switch_cafe', currentLanguage)}
                  value={activeCafeSlug}
                  onChange={(e) => {
                    onSelectCafe(e.target.value);
                    setIsMobileMenuOpen(false);
                  }}
                  className="mobile-drawer-select"
                >
                  {availableCafes.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name} {c.slug === activeCafeSlug ? '✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Navigation Links */}
            <div className="mobile-drawer-links">
              <button
                className={`mobile-drawer-item ${currentTab === 'menu' ? 'active' : ''}`}
                onClick={() => handleNavClick(() => setCurrentTab('menu'))}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Coffee size={18} color="#059669" />
                  <span>{t('nav.digital_menu', currentLanguage)}</span>
                </div>
                <ChevronRight size={16} color="#94a3b8" />
              </button>

              <button
                className="mobile-drawer-item"
                onClick={() => handleNavClick(openQRModal)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <QrCode size={18} color="#059669" />
                  <span>{t('nav.table_qr', currentLanguage)}</span>
                </div>
                <ChevronRight size={16} color="#94a3b8" />
              </button>

              <button
                className="mobile-drawer-item"
                onClick={() => handleNavClick(openTrackModal)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Search size={18} color="#059669" />
                  <span>{t('nav.track_order', currentLanguage)}</span>
                </div>
                <ChevronRight size={16} color="#94a3b8" />
              </button>

              {openOrderHistoryModal && (
                <button
                  className="mobile-drawer-item"
                  onClick={() => handleNavClick(openOrderHistoryModal)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <History size={18} color="#059669" />
                    <span>{t('nav.past_orders', currentLanguage)}</span>
                  </div>
                  {pastOrderCount > 0 ? (
                    <span className="mobile-drawer-badge">{pastOrderCount}</span>
                  ) : (
                    <ChevronRight size={16} color="#94a3b8" />
                  )}
                </button>
              )}

              {openLoyaltyModal && (
                <button
                  className="mobile-drawer-item"
                  onClick={() => handleNavClick(openLoyaltyModal)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Award size={18} color="#d97706" />
                    <span>{t('nav.stamp_card', currentLanguage)}</span>
                  </div>
                  <ChevronRight size={16} color="#94a3b8" />
                </button>
              )}

              <button
                className={`mobile-drawer-item ${currentTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNavClick(() => setCurrentTab('dashboard'))}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <LayoutDashboard size={18} color="#059669" />
                  <span>{t('nav.owner_portal', currentLanguage)}</span>
                </div>
                <ChevronRight size={16} color="#94a3b8" />
              </button>
            </div>

            {/* Language Selection Grid */}
            {onLanguageChange && (
              <div className="mobile-drawer-section" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <div className="mobile-drawer-section-label">
                  <span>Language / Idioma</span>
                </div>
                <div className="mobile-lang-grid">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      className={`mobile-lang-btn ${currentLanguage === lang.code ? 'active' : ''}`}
                      onClick={() => {
                        onLanguageChange(lang.code);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </header>
  );
};
