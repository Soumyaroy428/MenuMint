import React, { useState, useEffect } from 'react';
import { LoyaltyProgramConfig } from '../types';
import { fetchCafeLoyalty } from '../api';
import { X, Award, Check, Gift, Sparkles, Phone, RefreshCw } from 'lucide-react';

interface LoyaltyCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cafeSlug: string;
  cafeName: string;
  currencySymbol?: string;
  initialPhone?: string;
  onSelectReward?: () => void;
}

export const LoyaltyCardModal: React.FC<LoyaltyCardModalProps> = ({
  isOpen,
  onClose,
  cafeSlug,
  cafeName,
  currencySymbol = '$',
  initialPhone = '',
  onSelectReward,
}) => {
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [program, setProgram] = useState<LoyaltyProgramConfig | null>(null);
  const [account, setAccount] = useState<{
    stampsCount: number;
    stampsTarget: number;
    rewardsAvailable: number;
    totalStampsEarned: number;
    totalRewardsRedeemed: number;
    customerName?: string;
    progressPct: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const savedPhone = initialPhone || localStorage.getItem('menumint_customer_phone') || '';
      if (savedPhone) {
        setPhone(savedPhone);
        loadLoyalty(savedPhone);
      } else {
        loadLoyalty('');
      }
    }
  }, [isOpen, initialPhone, cafeSlug]);

  const loadLoyalty = async (phoneVal: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCafeLoyalty(cafeSlug, phoneVal || undefined);
      setProgram(data.program);
      setAccount(data.account);
    } catch (err: any) {
      setError(err.message || 'Failed to load loyalty card');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    localStorage.setItem('menumint_customer_phone', phone.trim());
    loadLoyalty(phone.trim());
  };

  if (!isOpen) return null;

  const target = account?.stampsTarget || program?.stampsTarget || 5;
  const currentStamps = account?.stampsCount || 0;
  const rewardAmount = program ? (program.rewardDiscountCents / 100).toFixed(2) : '5.00';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          maxWidth: 480,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fde047',
              }}
            >
              <Award size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Digital Stamp Card
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>
                {cafeName} • VIP Rewards
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.2)', color: '#ffffff', border: 'none' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
          {/* Phone Lookup Input */}
          <form onSubmit={handleLookup} style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>
              Enter your phone number to check or track your stamps:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Phone size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
                <input
                  type="tel"
                  placeholder="e.g. (555) 321-7890"
                  className="form-input"
                  style={{ paddingLeft: 32, height: 36, fontSize: '0.85rem' }}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={loading || !phone.trim()}
                style={{ fontWeight: 700, padding: '0 1rem' }}
              >
                {loading ? <RefreshCw size={14} className="spin-animation" /> : 'Look Up'}
              </button>
            </div>
          </form>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.6rem 0.85rem', borderRadius: 8, fontSize: '0.8rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {/* Visual Digital Stamp Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '2px dashed #cbd5e1',
              borderRadius: 16,
              padding: '1.25rem',
              marginBottom: '1.25rem',
              position: 'relative',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700 }}>
                  Stamp Progress
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {account ? `${account.stampsCount} of ${account.stampsTarget} Stamps Collected` : `Collect ${target} Stamps`}
                </div>
              </div>
              <div
                style={{
                  background: '#ecfdf5',
                  color: '#059669',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Sparkles size={12} />
                <span>{account ? `${account.progressPct}%` : '0%'}</span>
              </div>
            </div>

            {/* Stamp Slots Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${target}, 1fr)`, gap: '0.5rem', marginBottom: '1rem' }}>
              {Array.from({ length: target }, (_, i) => {
                const isCollected = i < currentStamps;
                const isFinalReward = i === target - 1;

                return (
                  <div
                    key={i}
                    style={{
                      aspectRatio: '1 / 1',
                      borderRadius: 12,
                      border: isCollected
                        ? '2px solid #059669'
                        : isFinalReward
                        ? '2px dashed #f59e0b'
                        : '2px dashed #cbd5e1',
                      background: isCollected
                        ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                        : isFinalReward
                        ? '#fffbeb'
                        : '#ffffff',
                      color: isCollected ? '#ffffff' : isFinalReward ? '#f59e0b' : '#94a3b8',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      boxShadow: isCollected ? '0 2px 6px rgba(5, 150, 105, 0.25)' : 'none',
                    }}
                  >
                    {isCollected ? (
                      <Check size={20} strokeWidth={3} />
                    ) : isFinalReward ? (
                      <Gift size={20} />
                    ) : (
                      <span style={{ fontSize: '1.1rem', opacity: 0.4 }}>☕</span>
                    )}
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, marginTop: 2 }}>
                      #{i + 1}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${account?.progressPct || 0}%`,
                  height: '100%',
                  background: '#059669',
                  borderRadius: 3,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>

            <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '0.65rem' }}>
              {account
                ? currentStamps >= target - 1
                  ? '🎉 Just 1 more stamp to unlock your next free reward!'
                  : `${target - currentStamps} more stamps to unlock ${currencySymbol}${rewardAmount} off!`
                : `Enter your phone number above to sync your digital stamp card.`}
            </div>
          </div>

          {/* Unlocked Reward Available Banner */}
          {account && account.rewardsAvailable > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '1px solid #f59e0b',
                borderRadius: 12,
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Gift size={24} color="#b45309" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#92400e' }}>
                    🎁 {account.rewardsAvailable} Reward Voucher Ready!
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#b45309' }}>
                    {program?.rewardDescription || `Worth ${currencySymbol}${rewardAmount} off your order`}
                  </div>
                </div>
              </div>

              {onSelectReward && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    onSelectReward();
                    onClose();
                  }}
                  style={{ background: '#b45309', borderColor: '#b45309', fontWeight: 800, fontSize: '0.75rem' }}
                >
                  Use Now
                </button>
              )}
            </div>
          )}

          {/* How It Works Explainer */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '0.45rem' }}>
              How MenuMint Stamp Cards Work:
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.6 }}>
              <li>Enter your phone number during checkout on each visit.</li>
              <li>Every order automatically awards <strong>+1 digital stamp</strong>.</li>
              <li>Collect <strong>{target} stamps</strong> to unlock a <strong>{currencySymbol}{rewardAmount} voucher</strong>.</li>
              <li>Vouchers automatically apply at checkout with 1 tap!</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', textAlign: 'right' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ fontWeight: 700 }}
          >
            Close Stamp Card
          </button>
        </div>
      </div>
    </div>
  );
};

