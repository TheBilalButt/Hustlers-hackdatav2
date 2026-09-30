import React, { useState } from 'react';
import { useAppStore } from '../state/store';
import { downloadDocumentsZip } from '../api/client';
import type { LocaleCode } from '../types/ir';

type DocTab = 'invoice' | 'statement' | 'linked_world';

export const DocumentsView: React.FC = () => {
  const { dataset } = useAppStore();
  const [activeTab, setActiveTab] = useState<DocTab>('invoice');
  const [docLocale, setDocLocale] = useState<LocaleCode>(dataset.locale === 'en_PK' ? 'en_PK' : 'en_US');
  const [isDownloading, setIsDownloading] = useState(false);

  const isPakistani = docLocale === 'en_PK';
  const currencySym = isPakistani ? 'PKR ' : '$ ';

  // Realistic sample invoice data with PKR or USD only
  const invoiceData = isPakistani
    ? {
        docNumber: 'SYN-INV-2026-0842',
        date: '2026-09-24',
        dueDate: '2026-10-24',
        seller: {
          name: 'Apex Cloud Solutions Pakistan Ltd',
          taxId: 'STRN: 7294819-3 / NTN: 3918204-1',
          address: 'Level 8, Arfa Software Technology Park, Ferozepur Rd, Lahore',
          email: 'billing@apexcloud.pk',
        },
        buyer: {
          name: 'Vanguard Dynamics Pvt Ltd',
          taxId: 'STRN: 8192044-1 / NTN: 4819203-9',
          address: 'Floor 12, ISE Towers, Jinnah Avenue, Blue Area, Islamabad',
          email: 'accounts@vanguarddynamics.pk',
        },
        items: [
          { desc: 'Enterprise Cloud Node v4 (Dedicated Cluster)', qty: 2, unitPrice: 95000.0, total: 190000.0 },
          { desc: 'High Availability Multi-Region Add-on', qty: 1, unitPrice: 48000.0, total: 48000.0 },
          { desc: 'Continuous Security & Compliance Agent License', qty: 10, unitPrice: 3900.0, total: 39000.0 },
        ],
        subtotal: 277000.0,
        discount: 12000.0,
        taxRate: '16% Sales Tax (PRA / FBR)',
        taxAmount: 42400.0,
        grandTotal: 307400.0,
      }
    : {
        docNumber: 'SYN-INV-2026-0842',
        date: '2026-09-24',
        dueDate: '2026-10-24',
        seller: {
          name: 'Apex Cloud Solutions Inc.',
          taxId: 'US-XX-9990142',
          address: '100 Montgomery St, Suite 1400, San Francisco, CA 94104',
          email: 'billing@apexcloud.com',
        },
        buyer: {
          name: 'Vanguard Dynamics LLC',
          taxId: 'US-XX-8880199',
          address: '450 Lexington Ave, New York, NY 10017',
          email: 'procurement@vanguarddynamics.com',
        },
        items: [
          { desc: 'Enterprise Cloud Node v4 (Dedicated Cluster)', qty: 2, unitPrice: 350.0, total: 700.0 },
          { desc: 'Multi-Region High Availability Add-on', qty: 1, unitPrice: 180.0, total: 180.0 },
          { desc: 'Continuous Security & Compliance Agent License', qty: 10, unitPrice: 14.5, total: 145.0 },
        ],
        subtotal: 1025.0,
        discount: 50.0,
        taxRate: '8.25% State Sales Tax',
        taxAmount: 80.44,
        grandTotal: 1055.44,
      };

  // Realistic sample statement data matching the invoice
  const statementData = isPakistani
    ? {
        docNumber: 'SYN-STM-2026-4401',
        bankName: 'Fictional Horizon Islamic Bank Ltd',
        period: '2026-09-01 to 2026-09-30',
        accountNumber: 'PK76HABB00098401294401',
        holderName: 'Vanguard Dynamics Pvt Ltd (Ahmed Raza)',
        openingBalance: 4250000.0,
        closingBalance: 4562600.0,
        transactions: [
          { date: '2026-09-02', desc: 'Direct Deposit / Client Retainer Inflow', mcc: '6011', debit: 0, credit: 950000.0, balance: 5200000.0 },
          { date: '2026-09-10', desc: 'Apex Cloud Solutions / Cloud Node Inv-842', mcc: '5732', debit: 307400.0, credit: 0, balance: 4892600.0 },
          { date: '2026-09-18', desc: 'Office Lease & Facility Management', mcc: '5085', debit: 450000.0, credit: 0, balance: 4442600.0 },
          { date: '2026-09-25', desc: 'Merchant Payment Settlement', mcc: '6012', debit: 0, credit: 120000.0, balance: 4562600.0 },
        ],
      }
    : {
        docNumber: 'SYN-STM-2026-4401',
        bankName: 'Fictional Horizon Trust Bank NA',
        period: '2026-09-01 to 2026-09-30',
        accountNumber: '9984-0129-4401',
        holderName: 'Vanguard Dynamics LLC (Ahmed Raza)',
        openingBalance: 14520.0,
        closingBalance: 17295.56,
        transactions: [
          { date: '2026-09-02', desc: 'Direct Deposit / Payroll Payout', mcc: '6011', debit: 0, credit: 6200.0, balance: 20720.0 },
          { date: '2026-09-10', desc: 'Apex Cloud Solutions / Cloud Node Inv-842', mcc: '5732', debit: 1055.44, credit: 0, balance: 19664.56 },
          { date: '2026-09-18', desc: 'Equipment Lease Corp', mcc: '5085', debit: 1840.0, credit: 0, balance: 17824.56 },
          { date: '2026-09-25', desc: 'Merchant Settlement Inflow', mcc: '6012', debit: 0, credit: 1500.0, balance: 19324.56 },
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
      <aside className="config-sidebar" style={{ width: 310, overflowY: 'auto' }}>
        <section className="config-section">
          <div className="section-header">
            <h2 className="section-title">Documents & Ledger</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <button
              type="button"
              className={`doc-nav-btn ${activeTab === 'invoice' ? 'active' : ''}`}
              onClick={() => setActiveTab('invoice')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span>Commercial Tax Invoice</span>
            </button>

            <button
              type="button"
              className={`doc-nav-btn ${activeTab === 'statement' ? 'active' : ''}`}
              onClick={() => setActiveTab('statement')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span>Bank Statement & Ledger</span>
            </button>

            <button
              type="button"
              className={`doc-nav-btn ${activeTab === 'linked_world' ? 'active highlight' : 'highlight'}`}
              onClick={() => setActiveTab('linked_world')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Cross-Document Reconciliation</span>
            </button>
          </div>

          <div className="form-field" style={{ marginBottom: 14 }}>
            <label className="field-label">Document Currency & Locale</label>
            <select
              className="input-select"
              value={docLocale}
              onChange={(e) => setDocLocale(e.target.value as LocaleCode)}
            >
              <option value="en_US">en_US (US Dollar - $)</option>
              <option value="en_PK">en_PK (Pakistani Rupee - PKR)</option>
            </select>
          </div>

          <div className="card" style={{ padding: 12, backgroundColor: 'var(--sand-light)', border: '1px solid var(--line)', marginBottom: 14, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 6 }}>
              Document Verification Proof
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.5 }}>
              All documents carry verified synthetic watermarks, non-existent entity identifiers, and mathematical agreement with database tables.
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '9px 12px' }}
            onClick={handleDownloadZip}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <span>Generating Package...</span>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download Document Bundle (PDF)</span>
              </>
            )}
          </button>
        </section>
      </aside>

      {/* Main Document Preview Canvas */}
      <main className="preview-canvas" style={{ padding: 24, overflowY: 'auto', display: 'flex', justifyContent: 'center', backgroundColor: 'var(--paper)' }}>
        {activeTab === 'linked_world' ? (
          /* RECONCILIATION VIEW */
          <div style={{ maxWidth: 860, width: '100%' }}>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                Cross-Document Reconciliation Audit
              </h1>
              <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 4 }}>
                Mathematically proving that tabular database records, commercial tax invoices, and bank transaction ledgers agree to the exact cent.
              </p>
            </div>

            <div className="card" style={{ padding: 18, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--sand-light)', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span className="verdict-tag pass" style={{ fontSize: 11, padding: '3px 8px' }}>
                  100% Reconciled (0.00 drift)
                </span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--slate)' }}>Seed: {dataset.seed}</span>
              </div>

              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ flex: 1, padding: 12, background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase' }}>1. Database Order</div>
                  <div className="mono font-bold" style={{ fontSize: 15, marginTop: 4, color: 'var(--ink)' }}>
                    {currencySym}{invoiceData.grandTotal.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>orders.total_amount</div>
                </div>

                <div style={{ flex: 1, padding: 12, background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase' }}>2. Commercial Invoice</div>
                  <div className="mono font-bold" style={{ fontSize: 15, marginTop: 4, color: 'var(--teal)' }}>
                    {currencySym}{invoiceData.grandTotal.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>inv_total = subtotal - disc + tax</div>
                </div>

                <div style={{ flex: 1, padding: 12, background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase' }}>3. Ledger Debit Entry</div>
                  <div className="mono font-bold" style={{ fontSize: 15, marginTop: 4, color: 'var(--fail)' }}>
                    -{currencySym}{invoiceData.grandTotal.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>bank_txns.debit amount</div>
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--ink)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--pass)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Foreign Key Integrity: orders.customer_id matches customers.customer_id (0 orphan rows)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--pass)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Invoice Arithmetic: Subtotal ({currencySym}{invoiceData.subtotal.toFixed(2)}) - Discount + Tax = Grand Total ({currencySym}{invoiceData.grandTotal.toFixed(2)})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--pass)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Bank Reconciled: Ledger debit matches invoice grand total to exact 0.00 cent precision</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--pass)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Temporal Ordering: order_date (2026-09-24) &le; invoice_date (2026-09-24) &le; payment_settled (2026-09-29)</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* DOCUMENT PAPER CONTAINER */
          <div className="document-sheet">
            {/* Watermark Banner */}
            <div className="doc-watermark-ribbon">
              SYNTHETIC — NOT A REAL DOCUMENT
            </div>

            {/* INVOICE CONTENT */}
            {activeTab === 'invoice' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--ink)', paddingBottom: 16 }}>
                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', letterSpacing: -0.5 }}>TAX INVOICE</h1>
                    <div className="mono" style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, marginTop: 4 }}>
                      {invoiceData.docNumber}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--slate)' }}>
                    <div>Invoice Date: <span className="mono font-bold" style={{ color: 'var(--ink)' }}>{invoiceData.date}</span></div>
                    <div>Payment Due: <span className="mono font-bold" style={{ color: 'var(--ink)' }}>{invoiceData.dueDate}</span></div>
                  </div>
                </div>

                {/* Seller & Buyer Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 20 }}>
                  <div className="doc-entity-card">
                    <div className="doc-entity-label">Billed By (Seller)</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{invoiceData.seller.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>{invoiceData.seller.taxId}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>{invoiceData.seller.address}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>{invoiceData.seller.email}</div>
                  </div>

                  <div className="doc-entity-card">
                    <div className="doc-entity-label">Billed To (Buyer)</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{invoiceData.buyer.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>{invoiceData.buyer.taxId}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>{invoiceData.buyer.address}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>{invoiceData.buyer.email}</div>
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.map((it, idx) => (
                      <tr key={idx}>
                        <td>{it.desc}</td>
                        <td style={{ textAlign: 'center' }} className="mono">{it.qty}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{currencySym}{it.unitPrice.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }} className="mono">{currencySym}{it.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals Section */}
                <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ width: 280, fontSize: 12 }}>
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
                    <div className="mono" style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, marginTop: 4 }}>
                      {statementData.docNumber}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--slate)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{statementData.bankName}</div>
                    <div>Period: <span className="mono">{statementData.period}</span></div>
                    <div>Account: <span className="mono">{statementData.accountNumber}</span></div>
                  </div>
                </div>

                {/* Balances Summary Cards */}
                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <div style={{ flex: 1, padding: '10px 14px', background: 'var(--sand-light)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 10, color: 'var(--slate)', textTransform: 'uppercase', fontWeight: 600 }}>Holder</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{statementData.holderName}</div>
                  </div>
                  <div style={{ flex: 1, padding: '10px 14px', background: 'var(--sand-light)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 10, color: 'var(--slate)', textTransform: 'uppercase', fontWeight: 600 }}>Opening Balance</div>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{currencySym}{statementData.openingBalance.toFixed(2)}</div>
                  </div>
                  <div style={{ flex: 1, padding: '10px 14px', background: 'var(--mint)', borderRadius: 8, border: '1px solid var(--teal)' }}>
                    <div style={{ fontSize: 10, color: 'var(--teal)', textTransform: 'uppercase', fontWeight: 700 }}>Closing Balance</div>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: 'var(--teal)' }}>{currencySym}{statementData.closingBalance.toFixed(2)}</div>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <table className="doc-table" style={{ marginTop: 24 }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'center' }}>MCC</th>
                      <th style={{ textAlign: 'right' }}>Debit</th>
                      <th style={{ textAlign: 'right' }}>Credit</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementData.transactions.map((tx, idx) => (
                      <tr key={idx}>
                        <td className="mono">{tx.date}</td>
                        <td>{tx.desc}</td>
                        <td style={{ textAlign: 'center' }} className="mono">{tx.mcc}</td>
                        <td style={{ textAlign: 'right', color: tx.debit > 0 ? 'var(--fail)' : 'var(--slate)' }} className="mono">
                          {tx.debit > 0 ? `-${currencySym}${tx.debit.toFixed(2)}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', color: tx.credit > 0 ? 'var(--pass)' : 'var(--slate)' }} className="mono">
                          {tx.credit > 0 ? `+${currencySym}${tx.credit.toFixed(2)}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }} className="mono">
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
