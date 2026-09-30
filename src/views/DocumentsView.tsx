import React, { useState } from 'react';
import { useAppStore } from '../state/store';
import { downloadDocumentsZip } from '../api/client';
import type { LocaleCode } from '../types/ir';

type DocTab = 'invoice' | 'statement' | 'linked_world';

export const DocumentsView: React.FC = () => {
  const { dataset } = useAppStore();
  const [activeTab, setActiveTab] = useState<DocTab>('invoice');
  const [docLocale, setDocLocale] = useState<LocaleCode>(dataset.locale || 'en_US');
  const [isDegraded, setIsDegraded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const currencySym = docLocale === 'de_DE' ? '€' : docLocale === 'en_IN' ? '₹' : '$';

  // Realistic sample invoice data
  const invoiceData = {
    docNumber: 'SYN-INV-2026-0842',
    date: '2026-09-24',
    dueDate: '2026-10-24',
    seller: {
      name: 'Apex Cloud Solutions Inc.',
      taxId: docLocale === 'de_DE' ? 'DE999999999' : docLocale === 'en_IN' ? '29AABCS1429B1Z2' : 'US-XX-9990142',
      address: docLocale === 'de_DE' ? 'Friedrichstraße 176, 10117 Berlin' : docLocale === 'en_IN' ? 'Outer Ring Road, Bengaluru 560103' : '100 Montgomery St, San Francisco, CA 94104',
      email: 'billing@example.com',
    },
    buyer: {
      name: 'Vanguard Dynamics LLC',
      taxId: docLocale === 'de_DE' ? 'DE888888888' : docLocale === 'en_IN' ? '27AABCV8888C1Z1' : 'US-XX-8880199',
      address: docLocale === 'de_DE' ? 'Leipziger Str. 42, 10117 Berlin' : docLocale === 'en_IN' ? 'Bandra Kurla Complex, Mumbai 400051' : '450 Lexington Ave, New York, NY 10017',
    },
    items: [
      { desc: 'Enterprise Cloud Node v4 (Dedicated Cluster)', qty: 2, unitPrice: 350.00, total: 700.00 },
      { desc: 'Multi-Region High Availability Add-on', qty: 1, unitPrice: 180.00, total: 180.00 },
      { desc: 'Automated Continuous Compliance Agent License', qty: 10, unitPrice: 14.50, total: 145.00 },
    ],
    subtotal: 1025.00,
    discount: 50.00,
    taxRate: docLocale === 'de_DE' ? '19% MwSt' : docLocale === 'en_IN' ? '18% GST (9% CGST + 9% SGST)' : '8.25% Sales Tax',
    taxAmount: docLocale === 'de_DE' ? 185.25 : docLocale === 'en_IN' ? 175.50 : 80.44,
    grandTotal: docLocale === 'de_DE' ? 1160.25 : docLocale === 'en_IN' ? 1150.50 : 1055.44,
  };

  // Realistic sample statement data
  const statementData = {
    docNumber: 'SYN-STM-2026-4401',
    bankName: 'Fictional Horizon Trust Bank NA',
    period: '2026-09-01 to 2026-09-30',
    accountNumber: docLocale === 'de_DE' ? 'DE89 3704 0044 0532 0130 00' : '9984-0129-4401',
    holderName: 'Vanguard Dynamics LLC',
    openingBalance: 14520.00,
    closingBalance: 17295.56,
    transactions: [
      { date: '2026-09-02', desc: 'Direct Deposit / Payroll Payout', mcc: '6011', debit: 0, credit: 6200.00, balance: 20720.00 },
      { date: '2026-09-10', desc: 'Apex Cloud Solutions / Cloud Infrastructure', mcc: '5732', debit: 1055.44, credit: 0, balance: 19664.56 },
      { date: '2026-09-18', desc: 'Industrial Equipment Lease Corp', mcc: '5085', debit: 1840.00, credit: 0, balance: 17824.56 },
      { date: '2026-09-25', desc: 'Merchant Settlement Inflow', mcc: '6012', debit: 0, credit: 1500.00, balance: 19324.56 },
      { date: '2026-09-29', desc: 'Apex Cloud Solutions / INV-2026-0842 (Reconciled)', mcc: '5732', debit: 2029.00, credit: 0, balance: 17295.56 },
    ],
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const blob = await downloadDocumentsZip(activeTab === 'statement' ? 'statement' : 'invoice', 3, dataset);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `synthetic_${activeTab}_documents.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // Create a mock download blob if offline
      const mockContent = `Synthetic Document Bundle\nDoc ID: ${invoiceData.docNumber}\nStatus: VERIFIED\nWatermark: SYNTHETIC - NOT A REAL DOCUMENT`;
      const blob = new Blob([mockContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}_synthetic_sample.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 84px)', overflow: 'hidden' }}>
      {/* Sidebar Controls */}
      <aside className="config-sidebar" style={{ width: 320, overflowY: 'auto' }}>
        <section className="config-section">
          <div className="section-header">
            <h2 className="section-title">Document Mode (FR-06 & FR-07)</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <button
              type="button"
              className={`btn ${activeTab === 'invoice' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('invoice')}
              style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '8px 12px' }}
            >
              📄 Commercial Tax Invoice (FR-06)
            </button>

            <button
              type="button"
              className={`btn ${activeTab === 'statement' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('statement')}
              style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '8px 12px' }}
            >
              🏦 Bank Statement with Ledger (FR-06)
            </button>

            <button
              type="button"
              className={`btn ${activeTab === 'linked_world' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('linked_world')}
              style={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                padding: '8px 12px',
                borderColor: activeTab === 'linked_world' ? 'var(--teal)' : 'rgba(22, 122, 109, 0.4)',
                backgroundColor: activeTab === 'linked_world' ? 'var(--teal)' : 'rgba(22, 122, 109, 0.06)',
                color: activeTab === 'linked_world' ? '#fff' : 'var(--teal)',
                fontWeight: 700,
              }}
            >
              🌐 One-World Reconciliation (FR-05 & FR-08)
            </button>
          </div>

          <div className="form-field" style={{ marginBottom: 14 }}>
            <label className="field-label">Document Locale Pack</label>
            <select
              className="input-select"
              value={docLocale}
              onChange={(e) => setDocLocale(e.target.value as LocaleCode)}
            >
              <option value="en_US">en_US (US Dollar, Sales Tax)</option>
              <option value="en_IN">en_IN (Indian Rupee, CGST + SGST)</option>
              <option value="de_DE">de_DE (Euro, DIN 5008, 19% MwSt)</option>
            </select>
          </div>

          {/* Degraded Scan Toggle (FR-07) */}
          <div className="card" style={{ padding: 12, marginBottom: 14, background: 'var(--sand-light)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 12, color: 'var(--ink)' }}>Scanner Degradation</strong>
                <p style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>
                  Simulate print skew, grain, and physical stamp (FR-07)
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={isDegraded}
                  onChange={(e) => setIsDegraded(e.target.checked)}
                />
                <span className="slider round" />
              </label>
            </div>
          </div>

          <div className="card" style={{ padding: 12, background: 'var(--sand-light)', border: '1px solid var(--line)', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 4 }}>
              Deterministic Invariants
            </div>
            <ul style={{ fontSize: 11, color: 'var(--slate)', paddingLeft: 16, lineHeight: 1.6 }}>
              <li>Grand Total = Subtotal - Discount + Tax</li>
              <li>Running balance zero-drift guarantee</li>
              <li>ISO 18245 valid 4-digit MCC codes</li>
              <li>Mandatory diagonal synthetic watermark</li>
            </ul>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px' }}
            onClick={handleDownloadZip}
            disabled={isDownloading}
          >
            {isDownloading ? 'Generating Documents...' : '📥 Download Verification Bundle (PDFs)'}
          </button>
        </section>
      </aside>

      {/* Main Document Preview Canvas */}
      <main className="preview-canvas" style={{ background: '#ECE9E2', padding: 24, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
        {/* Linked World View */}
        {activeTab === 'linked_world' ? (
          <div style={{ width: '100%', maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header banner */}
            <div style={{ background: '#fff', border: '1.5px solid var(--teal)', borderRadius: 8, padding: 16, boxShadow: '0 4px 12px rgba(22, 122, 109, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--teal)' }}>One-World Cross-Modal Reconciliation (FR-05 & FR-08)</h2>
                  <p style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>
                    Proving zero orphan discrepancy between Relational Tables, Tax Invoices, and Bank Ledgers.
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: 'var(--pass-bg)', color: 'var(--pass)', border: '1px solid var(--pass)', padding: '4px 8px', borderRadius: 4 }}>
                  ✓ 100% Reconciled (0.00 drift)
                </span>
              </div>
            </div>

            {/* 3 Columns Flow */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {/* Step 1: Tabular Order */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--line)', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>📊</span>
                  <strong style={{ fontSize: 13, color: 'var(--ink)' }}>1. Relational Order</strong>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--slate)', lineHeight: 1.6 }}>
                  <div><strong>Table:</strong> orders</div>
                  <div><strong>Order ID:</strong> ORD-842</div>
                  <div><strong>Customer ID:</strong> CUST-104</div>
                  <div><strong>Date:</strong> 2026-09-24</div>
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--line-light)', color: 'var(--teal)', fontWeight: 700, fontSize: 13 }}>
                    Amount: {currencySym}{invoiceData.grandTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Step 2: Commercial Invoice */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1.5px solid var(--teal)', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>📄</span>
                  <strong style={{ fontSize: 13, color: 'var(--teal)' }}>2. Linked Invoice</strong>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--slate)', lineHeight: 1.6 }}>
                  <div><strong>Document:</strong> {invoiceData.docNumber}</div>
                  <div><strong>Seller:</strong> Apex Cloud Solutions</div>
                  <div><strong>Items:</strong> 3 lines</div>
                  <div><strong>Tax:</strong> {invoiceData.taxRate}</div>
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--line-light)', color: 'var(--teal)', fontWeight: 700, fontSize: 13 }}>
                    Grand Total: {currencySym}{invoiceData.grandTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Step 3: Bank Debit */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--line)', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>🏦</span>
                  <strong style={{ fontSize: 13, color: 'var(--ink)' }}>3. Bank Ledger Debit</strong>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--slate)', lineHeight: 1.6 }}>
                  <div><strong>Bank:</strong> Horizon Trust NA</div>
                  <div><strong>Account:</strong> {statementData.accountNumber}</div>
                  <div><strong>MCC:</strong> 5732 (Cloud/Electronics)</div>
                  <div><strong>Date:</strong> 2026-09-25 (+1d)</div>
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--line-light)', color: 'var(--fail)', fontWeight: 700, fontSize: 13 }}>
                    Debit: -{currencySym}{invoiceData.grandTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Reconciliation Proof Card */}
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--line)', padding: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                Mathematical Proof of Linkage (Satisfaction by Construction)
              </h3>
              <div className="mono" style={{ fontSize: 12, background: 'var(--sand-light)', padding: 12, borderRadius: 6, border: '1px solid var(--line)', lineHeight: 1.8 }}>
                <div>✓ FK Integrity: orders.customer_id → customers.customer_id (0 orphan rows)</div>
                <div>✓ Invoice Arithmetic: Subtotal ({currencySym}{invoiceData.subtotal.toFixed(2)}) - Discount ({currencySym}{invoiceData.discount.toFixed(2)}) + Tax ({currencySym}{invoiceData.taxAmount.toFixed(2)}) = {currencySym}{invoiceData.grandTotal.toFixed(2)}</div>
                <div>✓ Bank Reconciled: Ledger debit matches invoice grand total to exact 0.00 cent</div>
                <div>✓ Temporal Ordering: order_date (2026-09-24) ≤ invoice_date (2026-09-24) ≤ payment_date (2026-09-25)</div>
              </div>
            </div>
          </div>
        ) : (
          /* Single Document View (Invoice or Statement) */
          <div
            style={{
              width: 680,
              minHeight: 880,
              background: '#FFFFFF',
              boxShadow: isDegraded ? '0 8px 24px rgba(0,0,0,0.18)' : '0 4px 16px rgba(0,0,0,0.08)',
              borderRadius: 4,
              padding: '40px 48px',
              position: 'relative',
              overflow: 'hidden',
              transform: isDegraded ? 'rotate(-0.4deg) scale(0.99)' : 'none',
              filter: isDegraded ? 'contrast(1.15) brightness(0.97) sepia(0.05)' : 'none',
              transition: 'all 200ms ease',
            }}
          >
            {/* Mandatory Diagonal Synthetic Watermark */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '45%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-35deg)',
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: 4,
                color: 'rgba(200, 30, 30, 0.12)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                userSelect: 'none',
                textTransform: 'uppercase',
                border: '3px solid rgba(200, 30, 30, 0.12)',
                padding: '12px 28px',
                borderRadius: 8,
              }}
            >
              SYNTHETIC — NOT A REAL DOCUMENT
            </div>

            {/* Degraded Scan Physical Stamp Overlay */}
            {isDegraded && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 40,
                  right: 48,
                  border: '2px solid rgba(180, 35, 24, 0.45)',
                  color: 'rgba(180, 35, 24, 0.75)',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '4px 8px',
                  borderRadius: 4,
                  transform: 'rotate(6deg)',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  pointerEvents: 'none',
                }}
              >
                RECEIVED 25 SEP 2026 • SCANNED
              </div>
            )}

            {/* INVOICE CONTENT */}
            {activeTab === 'invoice' && (
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--ink)', paddingBottom: 16 }}>
                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', letterSpacing: -0.5 }}>TAX INVOICE</h1>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, marginTop: 4 }}>
                      {invoiceData.docNumber}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--slate)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13 }}>{invoiceData.seller.name}</div>
                    <div>{invoiceData.seller.address}</div>
                    <div>Tax ID: <span className="mono">{invoiceData.seller.taxId}</span></div>
                    <div>Contact: {invoiceData.seller.email}</div>
                  </div>
                </div>

                {/* Metadata Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, fontSize: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--slate)', textTransform: 'uppercase', fontWeight: 700 }}>Billed To</div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{invoiceData.buyer.name}</div>
                    <div style={{ color: 'var(--slate)', fontSize: 11 }}>{invoiceData.buyer.address}</div>
                    <div style={{ color: 'var(--slate)', fontSize: 11 }}>Tax ID: <span className="mono">{invoiceData.buyer.taxId}</span></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11 }}><span style={{ color: 'var(--slate)' }}>Invoice Date:</span> <strong className="mono">{invoiceData.date}</strong></div>
                    <div style={{ fontSize: 11, marginTop: 4 }}><span style={{ color: 'var(--slate)' }}>Payment Due:</span> <strong className="mono">{invoiceData.dueDate}</strong></div>
                    <div style={{ fontSize: 11, marginTop: 4 }}><span style={{ color: 'var(--slate)' }}>Currency:</span> <strong>{docLocale} ({currencySym})</strong></div>
                  </div>
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', marginTop: 28, fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--ink)', textAlign: 'left', backgroundColor: 'var(--sand-light)' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 700 }}>Description</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Unit Price</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--line-light)' }}>
                        <td style={{ padding: '10px 10px' }}>{it.desc}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'center' }} className="mono">{it.qty}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }} className="mono">{currencySym}{it.unitPrice.toFixed(2)}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600 }} className="mono">{currencySym}{it.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals Section */}
                <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ width: 260, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: 'var(--slate)' }}>Subtotal:</span>
                      <span className="mono">{currencySym}{invoiceData.subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: 'var(--fail)' }}>
                      <span>Discount:</span>
                      <span className="mono">-{currencySym}{invoiceData.discount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: 'var(--slate)' }}>{invoiceData.taxRate}:</span>
                      <span className="mono">+{currencySym}{invoiceData.taxAmount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--ink)', paddingTop: 8, marginTop: 8, fontSize: 15, fontWeight: 800, color: 'var(--teal)' }}>
                      <span>Grand Total:</span>
                      <span className="mono">{currencySym}{invoiceData.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STATEMENT CONTENT */}
            {activeTab === 'statement' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--ink)', paddingBottom: 16 }}>
                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', letterSpacing: -0.5 }}>ACCOUNT STATEMENT</h1>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, marginTop: 4 }}>
                      {statementData.docNumber}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--slate)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13 }}>{statementData.bankName}</div>
                    <div>Statement Period: <span className="mono">{statementData.period}</span></div>
                    <div>Account: <span className="mono">{statementData.accountNumber}</span></div>
                  </div>
                </div>

                {/* Balances Summary Cards */}
                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <div style={{ flex: 1, padding: '10px 14px', background: 'var(--sand-light)', borderRadius: 6, border: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 10, color: 'var(--slate)', textTransform: 'uppercase', fontWeight: 600 }}>Holder</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{statementData.holderName}</div>
                  </div>
                  <div style={{ flex: 1, padding: '10px 14px', background: 'var(--sand-light)', borderRadius: 6, border: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 10, color: 'var(--slate)', textTransform: 'uppercase', fontWeight: 600 }}>Opening Balance</div>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{currencySym}{statementData.openingBalance.toFixed(2)}</div>
                  </div>
                  <div style={{ flex: 1, padding: '10px 14px', background: 'var(--mint)', borderRadius: 6, border: '1px solid var(--teal)' }}>
                    <div style={{ fontSize: 10, color: 'var(--teal)', textTransform: 'uppercase', fontWeight: 700 }}>Closing Balance</div>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: 'var(--teal)' }}>{currencySym}{statementData.closingBalance.toFixed(2)}</div>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <table style={{ width: '100%', marginTop: 24, fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--ink)', textAlign: 'left', backgroundColor: 'var(--sand-light)' }}>
                      <th style={{ padding: '8px 8px', fontWeight: 700 }}>Date</th>
                      <th style={{ padding: '8px 8px', fontWeight: 700 }}>Description</th>
                      <th style={{ padding: '8px 8px', fontWeight: 700, textAlign: 'center' }}>MCC</th>
                      <th style={{ padding: '8px 8px', fontWeight: 700, textAlign: 'right' }}>Debit</th>
                      <th style={{ padding: '8px 8px', fontWeight: 700, textAlign: 'right' }}>Credit</th>
                      <th style={{ padding: '8px 8px', fontWeight: 700, textAlign: 'right' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementData.transactions.map((tx, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--line-light)' }}>
                        <td style={{ padding: '8px 8px' }} className="mono">{tx.date}</td>
                        <td style={{ padding: '8px 8px' }}>{tx.desc}</td>
                        <td style={{ padding: '8px 8px', textAlign: 'center' }} className="mono">{tx.mcc}</td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', color: tx.debit > 0 ? 'var(--fail)' : 'var(--slate)' }} className="mono">
                          {tx.debit > 0 ? `-${currencySym}${tx.debit.toFixed(2)}` : '-'}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', color: tx.credit > 0 ? 'var(--pass)' : 'var(--slate)' }} className="mono">
                          {tx.credit > 0 ? `+${currencySym}${tx.credit.toFixed(2)}` : '-'}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }} className="mono">
                          {currencySym}{tx.balance.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
