import React, { useState, useMemo } from 'react';
import { calculateBillSplit } from '../utils/billSplitter';
import {
  X,
  Users,
  Copy,
  Check,
  Printer,
  Share2,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface BillSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol?: string;
  orderRef?: string;
  tableNumber?: string;
  cafeName?: string;
  totalCents: number;
  subtotalCents?: number;
  taxCents?: number;
  tipCents?: number;
  discountCents?: number;
}

export const BillSplitModal: React.FC<BillSplitModalProps> = ({
  isOpen,
  onClose,
  currencySymbol = '$',
  orderRef,
  tableNumber,
  cafeName,
  totalCents,
  subtotalCents = 0,
  taxCents = 0,
  tipCents = 0,
  discountCents = 0,
}) => {
  const [splitCount, setSplitCount] = useState<number>(2);
  const [guestNames, setGuestNames] = useState<Record<number, string>>({});
  const [paidGuests, setPaidGuests] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<boolean>(false);

  // Compute bill split breakdown
  const splitData = useMemo(() => {
    const namesArray = Array.from({ length: splitCount }, (_, i) => guestNames[i + 1] || `Guest ${i + 1}`);
    return calculateBillSplit({
      totalCents,
      subtotalCents,
      taxCents,
      tipCents,
      discountCents,
      splitCount,
      currencySymbol,
      orderRef,
      tableNumber,
      cafeName,
      guestNames: namesArray,
    });
  }, [
    totalCents,
    subtotalCents,
    taxCents,
    tipCents,
    discountCents,
    splitCount,
    currencySymbol,
    orderRef,
    tableNumber,
    cafeName,
    guestNames,
  ]);

  if (!isOpen) return null;

  const handleNameChange = (guestNum: number, name: string) => {
    setGuestNames((prev) => ({ ...prev, [guestNum]: name }));
  };

  const togglePaid = (guestNum: number) => {
    setPaidGuests((prev) => ({ ...prev, [guestNum]: !prev[guestNum] }));
  };

  const handleCopySummary = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(splitData.shareableSummary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        alert(splitData.shareableSummary);
      }
    } catch {
      alert(splitData.shareableSummary);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `MenuMint Bill Split - ${tableNumber || 'Table'}`,
          text: splitData.shareableSummary,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopySummary();
    }
  };

  const handlePrintSplitReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Split Bill Receipt - ${orderRef || 'Table Order'}</title>
          <style>
            body { font-family: monospace; padding: 16px; max-width: 320px; margin: 0 auto; color: #000; }
            .center { text-align: center; }
            .dashed { border-bottom: 2px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
            .bold { font-weight: bold; }
            .guest-card { background: #f4f4f4; border: 1px solid #ccc; padding: 6px 8px; margin: 6px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2 style="margin:0">${cafeName || 'MenuMint Café'}</h2>
            <h3 style="margin:4px 0">DINE-IN BILL SPLIT</h3>
            <div class="bold">${tableNumber ? tableNumber.toUpperCase() : 'SHARED TABLE'} ${orderRef ? '• #' + orderRef : ''}</div>
            <div>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div style="margin-top: 4px; font-weight: bold;">Split ${splitCount} Ways</div>
          </div>
          <div class="dashed"></div>
          <div class="row">
            <span>Table Subtotal:</span>
            <span>${currencySymbol}${(subtotalCents / 100).toFixed(2)}</span>
          </div>
          ${taxCents > 0 ? `
          <div class="row">
            <span>Tax:</span>
            <span>${currencySymbol}${(taxCents / 100).toFixed(2)}</span>
          </div>` : ''}
          ${tipCents > 0 ? `
          <div class="row">
            <span>Staff Gratuity:</span>
            <span>${currencySymbol}${(tipCents / 100).toFixed(2)}</span>
          </div>` : ''}
          <div class="row bold" style="font-size: 15px; margin-top: 6px;">
            <span>Grand Total:</span>
            <span>${currencySymbol}${(totalCents / 100).toFixed(2)}</span>
          </div>
          <div class="dashed"></div>
          <div class="bold" style="margin-bottom: 6px;">INDIVIDUAL GUEST CHECKS:</div>
          ${splitData.guestShares.map((g) => `
            <div class="guest-card">
              <div class="row bold">
                <span>${g.guestName}:</span>
                <span>${currencySymbol}${(g.amountCents / 100).toFixed(2)}</span>
              </div>
              <div class="row" style="font-size: 11px; color: #555;">
                <span>Items + Tax + Tip:</span>
                <span>${currencySymbol}${(g.baseCents / 100).toFixed(2)} + ${currencySymbol}${(g.taxCents / 100).toFixed(2)} + ${currencySymbol}${(g.tipCents / 100).toFixed(2)}</span>
              </div>
            </div>
          `).join('')}
          ${splitData.remainderCents > 0 ? `
            <div style="font-size: 11px; color: #555; text-align: center; margin-top: 6px;">
              * Includes +${splitData.remainderCents}¢ rounding on Guest 1
            </div>
          ` : ''}
          <div class="dashed"></div>
          <div class="center" style="font-size: 11px;">Thank you for dining with us!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const paidCount = Object.values(paidGuests).filter(Boolean).length;

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
          maxWidth: 520,
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
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Split Dine-In Bill
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {tableNumber ? `${tableNumber} • ` : ''}
                {orderRef ? `Order #${orderRef}` : 'Shared Table Order'}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '0.35rem 0.5rem' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
          {/* Quick Guest Selector Pills */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
              How many guests are splitting?
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {[2, 3, 4, 5, 6, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSplitCount(n)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    border: '1px solid',
                    cursor: 'pointer',
                    background: splitCount === n ? '#059669' : '#ffffff',
                    color: splitCount === n ? '#ffffff' : '#334155',
                    borderColor: splitCount === n ? '#059669' : '#cbd5e1',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {n} Guests
                </button>
              ))}

              {/* Custom Number Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                <button
                  type="button"
                  disabled={splitCount <= 2}
                  onClick={() => setSplitCount((c) => Math.max(2, c - 1))}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: splitCount <= 2 ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                  }}
                >
                  -
                </button>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', minWidth: 26, textAlign: 'center' }}>
                  {splitCount}
                </span>
                <button
                  type="button"
                  disabled={splitCount >= 20}
                  onClick={() => setSplitCount((c) => Math.min(20, c + 1))}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: splitCount >= 20 ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Featured Highlight Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
              color: '#ffffff',
              borderRadius: 12,
              padding: '1.15rem 1.25rem',
              marginBottom: '1.25rem',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.78rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Each Guest Pays
                </span>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.15, marginTop: 2 }}>
                  {currencySymbol}{(splitData.perPersonTotalCents / 100).toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.78rem', opacity: 0.8 }}>Table Total</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                  {currencySymbol}{(totalCents / 100).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Breakdown sub-row */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                borderTop: '1px solid rgba(255,255,255,0.2)',
                marginTop: '0.75rem',
                paddingTop: '0.65rem',
                fontSize: '0.76rem',
                opacity: 0.95,
              }}
            >
              <div>
                Base Food: <strong>{currencySymbol}{(splitData.basePerPersonCents / 100).toFixed(2)}</strong>
              </div>
              {taxCents > 0 && (
                <div>
                  Tax: <strong>{currencySymbol}{(splitData.taxPerPersonCents / 100).toFixed(2)}</strong>
                </div>
              )}
              {tipCents > 0 && (
                <div>
                  Tip: <strong>{currencySymbol}{(splitData.tipPerPersonCents / 100).toFixed(2)}</strong>
                </div>
              )}
            </div>

            {splitData.remainderCents > 0 && (
              <div
                style={{
                  marginTop: '0.55rem',
                  fontSize: '0.72rem',
                  background: 'rgba(255,255,255,0.15)',
                  padding: '3px 8px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Info size={12} />
                <span>
                  Exact penny rounding: Guest 1 covers +{splitData.remainderCents}¢ ({currencySymbol}{((splitData.perPersonTotalCents + splitData.remainderCents) / 100).toFixed(2)})
                </span>
              </div>
            )}
          </div>

          {/* Guest Breakdown & Settlement Tracker */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
                Guest Shares ({paidCount}/{splitCount} settled)
              </span>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Tap checkmark to track payment
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {splitData.guestShares.map((g) => {
                const isPaid = !!paidGuests[g.guestNumber];
                return (
                  <div
                    key={g.guestNumber}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 8,
                      border: `1px solid ${isPaid ? '#a7f3d0' : '#e2e8f0'}`,
                      background: isPaid ? '#f0fdf4' : '#f8fafc',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                      <input
                        type="text"
                        value={guestNames[g.guestNumber] || ''}
                        placeholder={g.guestName}
                        onChange={(e) => handleNameChange(g.guestNumber, e.target.value)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          color: '#1e293b',
                          outline: 'none',
                          width: '140px',
                        }}
                      />
                      {g.isPrimaryPayer && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: '#e0f2fe',
                            color: '#0369a1',
                            fontWeight: 700,
                          }}
                        >
                          Payer
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: isPaid ? '#047857' : '#0f172a' }}>
                        {currencySymbol}{(g.amountCents / 100).toFixed(2)}
                      </strong>

                      <button
                        type="button"
                        onClick={() => togglePaid(g.guestNumber)}
                        title={isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}
                        style={{
                          border: 'none',
                          background: isPaid ? '#10b981' : '#cbd5e1',
                          color: '#ffffff',
                          borderRadius: 6,
                          width: 28,
                          height: 28,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                      >
                        {isPaid ? <CheckCircle2 size={16} /> : <Check size={16} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrintSplitReceipt}
              title="Print itemized split receipt"
            >
              <Printer size={14} /> Print Checks
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleNativeShare}
              title="Share breakdown with table guests"
            >
              <Share2 size={14} /> Share
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleCopySummary}
            style={{ fontWeight: 700 }}
          >
            {copied ? (
              <>
                <Check size={14} /> Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy size={14} /> Copy Split Text
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
