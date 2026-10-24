import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, PrepStation } from '../types';
import { playBumpSound } from '../utils/notifications';
import {
  Maximize2,
  Minimize2,
  X,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Volume2,
  VolumeX,
  RefreshCw,
  Check,
} from 'lucide-react';

interface KitchenDisplaySystemProps {
  orders: Order[];
  cafeName: string;
  currencySymbol: string;
  onUpdateStatus: (orderId: string, nextStatus: OrderStatus) => Promise<void>;
  onClose: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const KitchenDisplaySystem: React.FC<KitchenDisplaySystemProps> = ({
  orders,
  cafeName,
  currencySymbol,
  onUpdateStatus,
  onClose,
  autoRefresh,
  onToggleAutoRefresh,
  soundEnabled,
  onToggleSound,
}) => {
  const [stationFilter, setStationFilter] = useState<'all' | PrepStation>('all');
  const [statusFilter, setStatusFilter] = useState<'queue' | 'ready' | 'all'>('queue');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [bumpingId, setBumpingId] = useState<string | null>(null);
  const [lastBumped, setLastBumped] = useState<{ id: string; prevStatus: OrderStatus; ref: string } | null>(null);

  // Live timer for elapsed ticks
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const handleBump = async (order: Order) => {
    let nextStatus: OrderStatus | null = null;
    if (order.status === 'PENDING') nextStatus = 'ACCEPTED';
    else if (order.status === 'ACCEPTED') nextStatus = 'PREPARING';
    else if (order.status === 'PREPARING') nextStatus = 'READY';
    else if (order.status === 'READY') nextStatus = 'COMPLETED';

    if (!nextStatus) return;

    setBumpingId(order.id);
    try {
      if (soundEnabled) {
        playBumpSound();
      }
      await onUpdateStatus(order.id, nextStatus);
      setLastBumped({ id: order.id, prevStatus: order.status, ref: order.orderRef });
    } catch (err: any) {
      alert(err.message || 'Failed to bump order status');
    } finally {
      setBumpingId(null);
    }
  };

  const handleRecall = async () => {
    if (!lastBumped) return;
    try {
      if (soundEnabled) {
        playBumpSound();
      }
      await onUpdateStatus(lastBumped.id, lastBumped.prevStatus);
      setLastBumped(null);
    } catch (err: any) {
      alert(err.message || 'Failed to recall order');
    }
  };

  // Filter orders according to station and queue status
  const activeOrders = orders.filter((o) => {
    if (['COMPLETED', 'CANCELLED'].includes(o.status)) return false;

    // Status filter
    if (statusFilter === 'queue' && o.status === 'READY') return false;
    if (statusFilter === 'ready' && o.status !== 'READY') return false;

    // Station filter
    if (stationFilter !== 'all') {
      const hasStationItem = o.items.some((i) => (i.prepStation || 'BARISTA') === stationFilter);
      if (!hasStationItem) return false;
    }

    return true;
  });

  // Calculate station counts
  const baristaCount = orders.filter((o) =>
    ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status) &&
    o.items.some((i) => (i.prepStation || 'BARISTA') === 'BARISTA')
  ).length;

  const kitchenCount = orders.filter((o) =>
    ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status) &&
    o.items.some((i) => i.prepStation === 'KITCHEN')
  ).length;

  const bakeryCount = orders.filter((o) =>
    ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status) &&
    o.items.some((i) => i.prepStation === 'BAKERY')
  ).length;

  const readyCount = orders.filter((o) => o.status === 'READY').length;
  const queueCount = orders.filter((o) => ['PENDING', 'ACCEPTED', 'PREPARING'].includes(o.status)).length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#090d16',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top KDS Control Bar */}
      <header
        style={{
          background: '#0f172a',
          borderBottom: '2px solid #1e293b',
          padding: '0.65rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              background: '#059669',
              color: '#ffffff',
              padding: '0.2rem 0.55rem',
              borderRadius: 6,
              fontWeight: 900,
              fontSize: '0.82rem',
              letterSpacing: '0.05em',
            }}
          >
            KDS LIVE
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
              {cafeName}
            </h1>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Kitchen Display System • {activeOrders.length} Active Tickets
            </div>
          </div>
        </div>

        {/* Station Navigation Touch Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: stationFilter === 'all' ? '#059669' : '#1e293b',
              color: '#ffffff',
              borderColor: stationFilter === 'all' ? '#059669' : '#334155',
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
            }}
            onClick={() => setStationFilter('all')}
          >
            All Stations
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: stationFilter === 'BARISTA' ? '#0284c7' : '#1e293b',
              color: '#ffffff',
              borderColor: stationFilter === 'BARISTA' ? '#0284c7' : '#334155',
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
            }}
            onClick={() => setStationFilter('BARISTA')}
          >
            ☕ Barista ({baristaCount})
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: stationFilter === 'KITCHEN' ? '#ea580c' : '#1e293b',
              color: '#ffffff',
              borderColor: stationFilter === 'KITCHEN' ? '#ea580c' : '#334155',
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
            }}
            onClick={() => setStationFilter('KITCHEN')}
          >
            🍳 Kitchen Grill ({kitchenCount})
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: stationFilter === 'BAKERY' ? '#ca8a04' : '#1e293b',
              color: '#ffffff',
              borderColor: stationFilter === 'BAKERY' ? '#ca8a04' : '#334155',
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
            }}
            onClick={() => setStationFilter('BAKERY')}
          >
            🥐 Bakery ({bakeryCount})
          </button>
        </div>

        {/* Status Mode & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {lastBumped && (
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: '#3b82f6', color: '#ffffff', borderColor: '#3b82f6', fontSize: '0.75rem', fontWeight: 700 }}
              onClick={handleRecall}
              title={`Recall last bumped order ${lastBumped.ref}`}
            >
              <RotateCcw size={13} /> Recall {lastBumped.ref}
            </button>
          )}

          <div style={{ display: 'flex', background: '#1e293b', borderRadius: 8, padding: 2 }}>
            <button
              type="button"
              style={{
                background: statusFilter === 'queue' ? '#059669' : 'transparent',
                color: '#ffffff',
                border: 'none',
                padding: '0.3rem 0.65rem',
                borderRadius: 6,
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={() => setStatusFilter('queue')}
            >
              Prep Queue ({queueCount})
            </button>
            <button
              type="button"
              style={{
                background: statusFilter === 'ready' ? '#16a34a' : 'transparent',
                color: '#ffffff',
                border: 'none',
                padding: '0.3rem 0.65rem',
                borderRadius: 6,
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={() => setStatusFilter('ready')}
            >
              Ready / Pickup ({readyCount})
            </button>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            style={{
              background: '#1e293b',
              color: autoRefresh ? '#10b981' : '#94a3b8',
              borderColor: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            onClick={onToggleAutoRefresh}
            title={autoRefresh ? 'Live Auto-Polling: ON (10s)' : 'Live Auto-Polling: PAUSED'}
          >
            <RefreshCw size={13} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>
              {autoRefresh ? 'Live' : 'Paused'}
            </span>
          </button>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            style={{ background: '#1e293b', color: '#ffffff', borderColor: '#334155' }}
            onClick={onToggleSound}
            title={soundEnabled ? 'Bump chime ON' : 'Bump chime OFF'}
          >
            {soundEnabled ? <Volume2 size={14} color="#10b981" /> : <VolumeX size={14} color="#94a3b8" />}
          </button>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            style={{ background: '#1e293b', color: '#ffffff', borderColor: '#334155' }}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen KDS'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            style={{ background: '#ef4444', color: '#ffffff', borderColor: '#ef4444', fontWeight: 700 }}
            onClick={onClose}
            title="Exit KDS View"
          >
            <X size={14} /> Close KDS
          </button>
        </div>
      </header>

      {/* Main KDS Grid View */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: '1rem',
          alignContent: 'start',
        }}
      >
        {activeOrders.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '6rem 1rem',
              color: '#64748b',
            }}
          >
            <CheckCircle size={56} color="#10b981" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
              All Orders Cleared!
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              Kitchen prep queue is caught up. New orders will appear here automatically with live audio alerts.
            </p>
          </div>
        ) : (
          activeOrders.map((ord) => {
            const elapsedMs = Math.max(now - new Date(ord.createdAt).getTime(), 0);
            const elapsedMins = Math.floor(elapsedMs / 60000);
            const elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);

            // Urgency color coding:
            // Green (< 5m), Amber (5-10m), Red (> 10m or past ETA)
            const isUrgent = elapsedMins >= 10;
            const isWarning = elapsedMins >= 5 && elapsedMins < 10;

            const headerBg = isUrgent
              ? '#7f1d1d' // Deep crimson
              : isWarning
              ? '#78350f' // Deep amber
              : ord.status === 'READY'
              ? '#14532d' // Forest green
              : '#1e293b'; // Slate dark

            const borderHighlight = isUrgent
              ? '#ef4444'
              : isWarning
              ? '#f59e0b'
              : ord.status === 'READY'
              ? '#22c55e'
              : '#334155';

            return (
              <div
                key={ord.id}
                style={{
                  background: '#0f172a',
                  border: `2px solid ${borderHighlight}`,
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  boxShadow: isUrgent ? '0 0 15px rgba(239, 68, 68, 0.25)' : 'none',
                }}
              >
                {/* Ticket Header */}
                <div
                  style={{
                    background: headerBg,
                    padding: '0.65rem 0.85rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '1.25rem', letterSpacing: '0.04em', color: '#ffffff' }}>
                        {ord.orderRef}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(255,255,255,0.15)',
                          color: '#ffffff',
                          fontWeight: 700,
                        }}
                      >
                        {ord.orderType.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#e2e8f0', marginTop: 2 }}>
                      {ord.tableNumber ? `Table: ${ord.tableNumber} • ` : ''}
                      {ord.customerName} • {ord.currencySymbol || currencySymbol}{(ord.total / 100).toFixed(2)}
                    </div>
                    {ord.pickupWindow && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 3,
                          background: '#0284c7',
                          color: '#ffffff',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: '0.68rem',
                          fontWeight: 800,
                        }}
                      >
                        <Clock size={10} />
                        <span>Pickup: {ord.pickupWindow}</span>
                      </div>
                    )}
                  </div>

                  {/* Elapsed Timer */}
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 900,
                        color: isUrgent ? '#fca5a5' : isWarning ? '#fde68a' : '#86efac',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        justifyContent: 'flex-end',
                      }}
                    >
                      <Clock size={13} />
                      <span>{elapsedMins}m {elapsedSecs}s</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 1 }}>
                      ETA: ~{ord.estimatedPrepMinutes || 10}m
                    </div>
                  </div>
                </div>

                {/* Notes (if any) */}
                {ord.notes && (
                  <div
                    style={{
                      background: '#451a03',
                      borderBottom: '1px solid #78350f',
                      color: '#fde68a',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      display: 'flex',
                      gap: 4,
                      alignItems: 'center',
                    }}
                  >
                    <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                    <span>NOTE: {ord.notes}</span>
                  </div>
                )}

                {/* Order Items List */}
                <div style={{ flex: 1, padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {ord.items.map((item, idx) => {
                    const isStationMatch = stationFilter === 'all' || (item.prepStation || 'BARISTA') === stationFilter;
                    const stationLabel =
                      item.prepStation === 'KITCHEN'
                        ? '🍳 KITCHEN'
                        : item.prepStation === 'BAKERY'
                        ? '🥐 BAKERY'
                        : '☕ BARISTA';

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          opacity: isStationMatch ? 1 : 0.35,
                          borderBottom: idx < ord.items.length - 1 ? '1px dashed #1e293b' : 'none',
                          paddingBottom: idx < ord.items.length - 1 ? '0.45rem' : 0,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '1.1rem',
                              fontWeight: 900,
                              color: '#38bdf8',
                              minWidth: 26,
                            }}
                          >
                            {item.quantity}x
                          </span>
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                              {item.name}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  background: '#1e293b',
                                  color: '#cbd5e1',
                                  fontWeight: 700,
                                }}
                              >
                                {stationLabel}
                              </span>
                              {item.dietaryTags && item.dietaryTags.map((tag) => (
                                <span
                                  key={tag}
                                  style={{
                                    fontSize: '0.62rem',
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    background: '#064e3b',
                                    color: '#6ee7b7',
                                    fontWeight: 700,
                                  }}
                                >
                                  {tag === 'VEGAN' ? '🌱 VEGAN' : tag === 'VEGETARIAN' ? '🥗 VEG' : tag === 'GLUTEN_FREE' ? '🌾 GF' : tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Big One-Tap Bump Button */}
                <div style={{ padding: '0.65rem 0.85rem', background: '#090d16', borderTop: '1px solid #1e293b' }}>
                  <button
                    type="button"
                    disabled={bumpingId === ord.id}
                    onClick={() => handleBump(ord)}
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      fontSize: '0.95rem',
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      background:
                        ord.status === 'PENDING'
                          ? '#0284c7'
                          : ord.status === 'ACCEPTED'
                          ? '#d97706'
                          : ord.status === 'PREPARING'
                          ? '#16a34a'
                          : '#059669',
                      color: '#ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    {bumpingId === ord.id ? (
                      <span>BUMPING...</span>
                    ) : ord.status === 'PENDING' ? (
                      <>
                        <span>➔ ACCEPT TICKET</span>
                      </>
                    ) : ord.status === 'ACCEPTED' ? (
                      <>
                        <span>➔ START PREPARING</span>
                      </>
                    ) : ord.status === 'PREPARING' ? (
                      <>
                        <Check size={18} />
                        <span>➔ BUMP TO READY</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        <span>➔ COMPLETE & CLEAR</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
};
