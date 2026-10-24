import React, { useState } from 'react';
import { Cafe, MenuCategory, MenuItem, DietaryTag, SupportedLanguage } from '../types';
import { Plus, Check, MapPin, Phone, Clock, Search, AlertCircle, RotateCcw, Award } from 'lucide-react';
import { t } from '../utils/i18n';

export const DIETARY_CONFIG: Record<DietaryTag, { label: string; emoji: string; bg: string; color: string; border: string }> = {
  VEGAN: { label: 'Vegan', emoji: '🌱', bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  VEGETARIAN: { label: 'Vegetarian', emoji: '🥗', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  GLUTEN_FREE: { label: 'Gluten-Free', emoji: '🌾', bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  NUT_FREE: { label: 'Nut-Free', emoji: '🥜', bg: '#f0f9ff', color: '#075985', border: '#bae6fd' },
  SPICY: { label: 'Spicy', emoji: '🌶️', bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  CHEF_SPECIAL: { label: "Chef's Pick", emoji: '⭐', bg: '#faf5ff', color: '#6b21a8', border: '#e9d5ff' },
};

interface MenuPageProps {
  cafe: Cafe | null;
  categories: MenuCategory[];
  items: MenuItem[];
  loading: boolean;
  error: string | null;
  onAddToCart: (item: MenuItem) => void;
  cartItemCounts: Record<string, number>;
  onRetry: () => void;
  openOrderHistoryModal?: () => void;
  openLoyaltyModal?: () => void;
  pastOrderCount?: number;
  currentLanguage?: SupportedLanguage;
}

export const MenuPage: React.FC<MenuPageProps> = ({
  cafe,
  categories,
  items,
  loading,
  error,
  onAddToCart,
  cartItemCounts,
  onRetry,
  openOrderHistoryModal,
  openLoyaltyModal,
  pastOrderCount = 0,
  currentLanguage = 'en',
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedDietaryFilter, setSelectedDietaryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: 40, height: 40, border: '3px solid #cbd5e1', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading fresh café menu...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !cafe) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 440, margin: '0 auto', background: '#ffffff', padding: '2rem', borderRadius: 12, border: '1px solid #fee2e2' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Menu Unavailable</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error || 'We could not find the requested café menu.'}
          </p>
          <button className="btn btn-primary" onClick={onRetry}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const formatPrice = (cents: number) => {
    return `${cafe.currencySymbol}${(cents / 100).toFixed(2)}`;
  };

  const getItemName = (item: MenuItem) => {
    return (currentLanguage !== 'en' && item.translations && item.translations[currentLanguage]?.name) || item.name;
  };

  const getItemDescription = (item: MenuItem) => {
    return (currentLanguage !== 'en' && item.translations && item.translations[currentLanguage]?.description !== undefined)
      ? item.translations[currentLanguage]!.description
      : item.description;
  };

  const getCategoryName = (cat: MenuCategory) => {
    return (currentLanguage !== 'en' && cat.translations && cat.translations[currentLanguage]) || cat.name;
  };

  const getDietaryLabel = (tag: DietaryTag) => {
    switch (tag) {
      case 'VEGAN': return t('dietary.vegan', currentLanguage);
      case 'VEGETARIAN': return t('dietary.vegetarian', currentLanguage);
      case 'GLUTEN_FREE': return t('dietary.gluten_free', currentLanguage);
      case 'NUT_FREE': return t('dietary.nut_free', currentLanguage);
      case 'SPICY': return t('dietary.spicy', currentLanguage);
      case 'CHEF_SPECIAL': return t('dietary.chef_special', currentLanguage);
      default: return (DIETARY_CONFIG as Record<string, any>)[tag]?.label || String(tag);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategoryId === 'all' || item.categoryId === selectedCategoryId;
    const itemName = getItemName(item).toLowerCase();
    const itemDesc = getItemDescription(item).toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      itemName.includes(query) ||
      itemDesc.includes(query);
    const matchesDietary =
      selectedDietaryFilter === 'all' ||
      (item.dietaryTags && item.dietaryTags.includes(selectedDietaryFilter as any));
    return matchesCategory && matchesSearch && matchesDietary;
  });

  return (
    <div>
      {/* Hero Café Header */}
      <section className="cafe-hero">
        <div className="container cafe-hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className={`badge ${cafe.isOpen ? 'badge-success' : 'badge-danger'}`}>
              <Clock size={12} />
              {cafe.isOpen ? t('hero.accepting_orders', currentLanguage) : t('hero.kitchen_paused', currentLanguage)}
            </span>
            <span className="badge badge-info">{t('hero.digital_qr_menu', currentLanguage)}</span>
          </div>

          <h1 className="cafe-title">{cafe.name}</h1>
          <p className="cafe-desc">{cafe.description}</p>

          <div className="cafe-meta">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={15} />
              {cafe.address}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Phone size={15} />
              {cafe.phone}
            </span>
          </div>
        </div>
      </section>

      <div className="container">
        {/* Ordering Paused Banner */}
        {!cafe.isOpen && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <AlertCircle size={20} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>
                {t('hero.kitchen_paused_title', currentLanguage)}
              </div>
              <div style={{ color: '#b45309', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                {cafe.pauseReason || t('hero.kitchen_paused_desc', currentLanguage)}
              </div>
            </div>
          </div>
        )}

        {/* Digital Loyalty Stamp Card Banner (CP-46) */}
        {cafe.loyaltyProgram?.enabled && openLoyaltyModal && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1px solid #fde68a',
              borderRadius: 10,
              padding: '0.65rem 1rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  background: '#fef08a',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Award size={18} color="#b45309" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', color: '#92400e', fontWeight: 700 }}>
                  {t('banner.stamp_card_active', currentLanguage)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#b45309' }}>
                  Collect {cafe.loyaltyProgram.stampsTarget} stamps with your phone number to earn {cafe.currencySymbol}{(cafe.loyaltyProgram.rewardDiscountCents / 100).toFixed(2)} off your order!
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.78rem',
                padding: '0.3rem 0.75rem',
                background: '#ffffff',
                borderColor: '#f59e0b',
                color: '#b45309',
                fontWeight: 700,
              }}
              onClick={openLoyaltyModal}
            >
              {t('banner.view_stamps', currentLanguage)}
            </button>
          </div>
        )}

        {/* Quick Reorder Banner (CP-41) */}
        {pastOrderCount > 0 && openOrderHistoryModal && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 10,
              padding: '0.6rem 0.9rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RotateCcw size={15} color="#16a34a" />
              <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
                {t('banner.reorder_title', currentLanguage)}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', background: '#16a34a', borderColor: '#16a34a' }}
              onClick={openOrderHistoryModal}
            >
              {t('banner.past_orders_btn', currentLanguage)} ({pastOrderCount})
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder={t('menu.search_placeholder', currentLanguage)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Categories Bar */}
        <div className="category-bar">
          <div className="category-pills">
            <button
              className={`category-pill ${selectedCategoryId === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategoryId('all')}
            >
              {t('menu.all_items', currentLanguage)} ({items.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-pill ${selectedCategoryId === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                {getCategoryName(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Filters Bar (CP-36) */}
        <div className="dietary-bar">
          <span className="dietary-label">{t('menu.dietary', currentLanguage)}</span>
          <button
            type="button"
            className={`btn btn-sm ${selectedDietaryFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap' }}
            onClick={() => setSelectedDietaryFilter('all')}
          >
            {t('menu.all', currentLanguage)}
          </button>
          {(['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'NUT_FREE', 'SPICY', 'CHEF_SPECIAL'] as DietaryTag[]).map((tag) => {
            const config = DIETARY_CONFIG[tag];
            const isSelected = selectedDietaryFilter === tag;
            return (
              <button
                key={tag}
                type="button"
                className="btn btn-sm"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: 20,
                  background: isSelected ? config.bg : '#ffffff',
                  color: isSelected ? config.color : '#475569',
                  border: `1px solid ${isSelected ? config.border : '#e2e8f0'}`,
                  fontWeight: isSelected ? 700 : 500,
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
                onClick={() => setSelectedDietaryFilter(isSelected ? 'all' : tag)}
              >
                <span>{config.emoji} {getDietaryLabel(tag)}</span>
              </button>
            );
          })}
        </div>

        {/* Menu Items Grid */}
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{t('menu.no_items_found', currentLanguage)}</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{t('menu.try_different', currentLanguage)}</p>
          </div>
        ) : (
          <div className="menu-grid">
            {filteredItems.map((item) => {
              const inCartCount = cartItemCounts[item.id] || 0;
              const displayName = getItemName(item);
              const displayDesc = getItemDescription(item);
              return (
                <article key={item.id} className="menu-card">
                  <div className="menu-card-img-wrap">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={displayName}
                        className="menu-card-img"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="menu-card-img-placeholder">
                        <span>No image</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: '4px' }}>
                      {!item.isAvailable ? (
                        <span className="badge badge-danger">{t('menu.sold_out', currentLanguage)}</span>
                      ) : item.trackInventory && item.inventoryCount !== undefined && item.inventoryCount <= (item.lowStockThreshold || 3) ? (
                        <span
                          style={{
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fcd34d',
                            borderRadius: 6,
                            padding: '2px 6px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                          }}
                        >
                          {t('menu.only_x_left', currentLanguage, { count: item.inventoryCount })}
                        </span>
                      ) : (
                        <span className="badge badge-success">{t('menu.available', currentLanguage)}</span>
                      )}
                    </div>
                  </div>

                  <div className="menu-card-body">
                    <h3 className="menu-card-title">{displayName}</h3>
                    {item.dietaryTags && item.dietaryTags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', margin: '0.25rem 0 0.4rem' }}>
                        {item.dietaryTags.map((tag) => {
                          const cfg = DIETARY_CONFIG[tag];
                          if (!cfg) return null;
                          return (
                            <span
                              key={tag}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                background: cfg.bg,
                                color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                                borderRadius: 6,
                                padding: '1px 5px',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                              }}
                            >
                              <span>{cfg.emoji}</span>
                              <span>{getDietaryLabel(tag)}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <p className="menu-card-desc">{displayDesc}</p>

                    <div className="menu-card-footer">
                      <span className="menu-card-price">{formatPrice(item.price)}</span>

                      <button
                        className={`btn btn-sm ${inCartCount > 0 ? 'btn-primary' : 'btn-secondary'}`}
                        disabled={
                          !item.isAvailable ||
                          !cafe.isOpen ||
                          (Boolean(item.trackInventory) && item.inventoryCount !== undefined && inCartCount >= item.inventoryCount)
                        }
                        onClick={() => onAddToCart(item)}
                        title={
                          !item.isAvailable
                            ? 'Item sold out'
                            : !cafe.isOpen
                            ? 'Café is currently closed'
                            : 'Add to cart'
                        }
                      >
                        {inCartCount > 0 ? (
                          <>
                            <Check size={14} /> {t('menu.added', currentLanguage)} ({inCartCount})
                          </>
                        ) : (
                          <>
                            <Plus size={14} /> {t('menu.add', currentLanguage)}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

