import React, { useState } from 'react';
import { Cafe, MenuCategory, MenuItem, DietaryTag } from '../types';
import { Plus, Check, MapPin, Phone, Clock, Search, AlertCircle } from 'lucide-react';

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

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategoryId === 'all' || item.categoryId === selectedCategoryId;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
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
              {cafe.isOpen ? 'Accepting Orders' : 'Kitchen Paused'}
            </span>
            <span className="badge badge-info">Digital QR Menu</span>
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
                Kitchen Ordering Temporarily Paused
              </div>
              <div style={{ color: '#b45309', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                {cafe.pauseReason || 'This café is taking a short pause for incoming orders. You may still browse items and check back shortly!'}
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search coffee, drinks, bakery items..."
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
              All Items ({items.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-pill ${selectedCategoryId === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Filters Bar (CP-36) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginRight: '0.2rem' }}>Dietary:</span>
          <button
            type="button"
            className={`btn btn-sm ${selectedDietaryFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: 20 }}
            onClick={() => setSelectedDietaryFilter('all')}
          >
            All
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
                  padding: '0.25rem 0.65rem',
                  borderRadius: 20,
                  background: isSelected ? config.bg : '#ffffff',
                  color: isSelected ? config.color : '#475569',
                  border: `1px solid ${isSelected ? config.border : '#e2e8f0'}`,
                  fontWeight: isSelected ? 700 : 500,
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setSelectedDietaryFilter(isSelected ? 'all' : tag)}
              >
                <span>{config.emoji} {config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Menu Items Grid */}
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>No items found</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Try selecting a different category or search term.</p>
          </div>
        ) : (
          <div className="menu-grid">
            {filteredItems.map((item) => {
              const inCartCount = cartItemCounts[item.id] || 0;
              return (
                <article key={item.id} className="menu-card">
                  <div className="menu-card-img-wrap">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
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
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      {item.isAvailable ? (
                        <span className="badge badge-success">Available</span>
                      ) : (
                        <span className="badge badge-danger">Sold Out</span>
                      )}
                    </div>
                  </div>

                  <div className="menu-card-body">
                    <h3 className="menu-card-title">{item.name}</h3>
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
                              <span>{cfg.label}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <p className="menu-card-desc">{item.description}</p>

                    <div className="menu-card-footer">
                      <span className="menu-card-price">{formatPrice(item.price)}</span>

                      <button
                        className={`btn btn-sm ${inCartCount > 0 ? 'btn-primary' : 'btn-secondary'}`}
                        disabled={!item.isAvailable || !cafe.isOpen}
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
                            <Check size={14} /> Added ({inCartCount})
                          </>
                        ) : (
                          <>
                            <Plus size={14} /> Add
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

