import React, { useState } from 'react';
import { X, QrCode, Copy, Check, Printer, ExternalLink } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cafeName: string;
  cafeSlug: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  cafeName,
  cafeSlug,
}) => {
  const [tableSelection, setTableSelection] = useState<string>('Table 1');
  const [customTable, setCustomTable] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://menu-ordering-saas.vercel.app';
  const activeTable = isCustom ? customTable.trim() : tableSelection;
  
  const qrTargetUrl = activeTable
    ? `${currentOrigin}/?cafe=${cafeSlug}&table=${encodeURIComponent(activeTable)}`
    : `${currentOrigin}/?cafe=${cafeSlug}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(qrTargetUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrTargetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${cafeName} - Table QR Stand</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #ffffff;
            }
            .stand-card {
              border: 3px solid #059669;
              border-radius: 20px;
              padding: 40px;
              text-align: center;
              max-width: 340px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.08);
            }
            h1 { font-size: 24px; color: #065f46; margin: 0 0 8px; }
            .table-badge {
              display: inline-block;
              background: #ecfdf5;
              color: #059669;
              font-weight: 800;
              font-size: 18px;
              padding: 6px 16px;
              border-radius: 9999px;
              margin-bottom: 24px;
            }
            .qr-img {
              width: 220px;
              height: 220px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              margin-bottom: 20px;
            }
            p { font-size: 14px; color: #475569; margin: 0 0 6px; }
            .url { font-size: 11px; color: #94a3b8; word-break: break-all; margin-top: 14px; }
          </style>
        </head>
        <body>
          <div class="stand-card">
            <h1>${cafeName}</h1>
            <div class="table-badge">${activeTable || 'Counter / Takeaway'}</div>
            <div>
              <img class="qr-img" src="${qrImageUrl}" alt="QR Code" />
            </div>
            <p><strong>Point your camera to scan</strong></p>
            <p>Browse digital menu & submit order</p>
            <div class="url">${qrTargetUrl}</div>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={22} color="#059669" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Table QR Code Generator</h2>
          </div>
          <button onClick={onClose} style={{ color: '#94a3b8' }} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Generate a QR code for customer tables or café counters. Customers scanning this will automatically have their table number pre-selected!
        </p>

        {/* Table Selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Select Table or Location</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
            {['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Bar Seat', 'No Table (Counter)'].map((tbl) => (
              <button
                key={tbl}
                type="button"
                className={`btn btn-sm ${!isCustom && tableSelection === (tbl === 'No Table (Counter)' ? '' : tbl) ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem' }}
                onClick={() => {
                  setIsCustom(false);
                  setTableSelection(tbl === 'No Table (Counter)' ? '' : tbl);
                }}
              >
                {tbl}
              </button>
            ))}
            <button
              type="button"
              className={`btn btn-sm ${isCustom ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem' }}
              onClick={() => setIsCustom(true)}
            >
              Custom...
            </button>
          </div>

          {isCustom && (
            <input
              type="text"
              placeholder="e.g. Patio Table 9, Upstairs Booth 2"
              className="form-input"
              value={customTable}
              onChange={(e) => setCustomTable(e.target.value)}
              autoFocus
            />
          )}
        </div>

        {/* QR Code Card Preview */}
        <div
          style={{
            background: '#f8fafc',
            border: '2px dashed #cbd5e1',
            borderRadius: 16,
            padding: '1.5rem',
            textAlign: 'center',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#065f46', marginBottom: 2 }}>
            {cafeName}
          </div>
          <div className="badge badge-success" style={{ marginBottom: '1rem' }}>
            {activeTable || 'General Counter'}
          </div>

          <div style={{ display: 'inline-block', background: '#ffffff', padding: 12, borderRadius: 12, boxShadow: 'var(--shadow-sm)' }}>
            <img
              src={qrImageUrl}
              alt="Café Menu QR Code"
              style={{ width: 180, height: 180, display: 'block' }}
            />
          </div>

          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b', wordBreak: 'break-all' }}>
            <code>{qrTargetUrl}</code>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handleCopy}>
            {copied ? <Check size={16} color="#059669" /> : <Copy size={16} />}
            <span>{copied ? 'URL Copied!' : 'Copy Link'}</span>
          </button>

          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print Stand Card</span>
          </button>
        </div>

        <a
          href={qrTargetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', fontSize: '0.8rem' }}
        >
          <ExternalLink size={14} /> Test Open Link in New Tab
        </a>
      </div>
    </div>
  );
};

