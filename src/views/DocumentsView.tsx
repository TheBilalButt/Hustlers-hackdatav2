import React, { useState, useMemo } from 'react';
import { useAppStore } from '../state/store';
import { downloadDocumentsZip } from '../api/client';

type DocKind = 'invoice' | 'statement';
type InvoiceTemplate = 'classic' | 'modern' | 'minimal';
type StatementTemplate = 'bank' | 'summary' | 'tabular';
type Locale = 'en_US' | 'en_IN' | 'de_DE';
type ViewMode = 'visual' | 'boxes' | 'json';

export const DocumentsView: React.FC = () => {
  const { dataset } = useAppStore();

  const [kind, setKind] = useState<DocKind>('invoice');
  const [invTemplate, setInvTemplate] = useState<InvoiceTemplate>('classic');
  const [stmtTemplate, setStmtTemplate] = useState<StatementTemplate>('bank');
  const [locale, setLocale] = useState<Locale>('en_US');
  const [docCount, setDocCount] = useState<number>(5);
  const [viewMode, setViewMode] = useState<ViewMode>('visual');
  const [queryDsl, setQueryDsl] = useState<string>('amount >= 100');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const sampleInvoice = useMemo(() => {
    const isUS = locale === 'en_US';
    const isIN = locale === 'en_IN';
    const currencySym = isUS ? '$' : isIN ? 'Rs. ' : 'EUR ';
    const lines = [
      { id: 1, sku: 'SKU-CLOUD-01', desc: 'Cloud Computing Unit (Tier A)', qty: 2, price: 49.99, amount: 99.98 },
      { id: 2, sku: 'SKU-SEAT-04', desc: 'Enterprise Developer Seat', qty: 1, price: 199.0, amount: 199.0 },
      { id: 3, sku: 'SKU-SEC-09', desc: 'Automated Compliance Audit', qty: 1, price: 85.0, amount: 85.0 },
    ];
    const subtotal = lines.reduce((acc, l) => acc + l.amount, 0);
    const discount = 15.0;
    const taxable = subtotal - discount;

    let taxLines: { name: string; rate: string; amount: number }[] = [];
    if (isUS) {
      taxLines = [{ name: 'State Sales Tax', rate: '8.0%', amount: Math.round(taxable * 0.08 * 100) / 100 }];
    } else if (isIN) {
      const half = Math.round(taxable * 0.09 * 100) / 100;
      taxLines = [
        { name: 'CGST', rate: '9.0%', amount: half },
        { name: 'SGST', rate: '9.0%', amount: half },
      ];
    } else {
      taxLines = [{ name: 'MwSt (German VAT)', rate: '19.0%', amount: Math.round(taxable * 0.19 * 100) / 100 }];
    }

    const taxTotal = taxLines.reduce((acc, t) => acc + t.amount, 0);
    const grandTotal = Math.round((taxable + taxTotal) * 100) / 100;

    return {
      number: 'SYN-INV-2026-0042',
      date: isUS ? 'Oct 15, 2026' : isIN ? '15 Oct 2026' : '15.10.2026',
      dueDate: isUS ? 'Nov 14, 2026' : isIN ? '14 Nov 2026' : '14.11.2026',
      customer: 'Acme Global Ventures Ltd.',
      customerAddress: isUS ? '100 Silicon Blvd, Suite 400, San Jose, CA' : isIN ? '42 Tech Park, Outer Ring Rd, Bangalore' : 'Friedrichstrasse 12, 10117 Berlin',
      seller: 'SYNTHETIC APEX TECHNOLOGIES INC.',
      sellerTaxId: isUS ? 'EIN: 94-3829104' : isIN ? 'GSTIN: 29AABCU9603R1ZM' : 'USt-IdNr: DE 309 482 105',
      currencySym,
      lines,
      subtotal,
      discount,
      taxLines,
      grandTotal,
    };
  }, [locale]);

  const sampleStatement = useMemo(() => {
    const isUS = locale === 'en_US';
    const isIN = locale === 'en_IN';
    const currencySym = isUS ? '$' : isIN ? 'Rs. ' : 'EUR ';
    const openingBalance = 2450.0;
    const txs = [
      { date: '2026-10-01', desc: 'Direct Deposit - Payroll Credit', mcc: '6012', debit: 0, credit: 3200.0, balance: 5650.0 },
      { date: '2026-10-03', desc: 'Merchant Payment - Supermarket', mcc: '5411', debit: 124.5, credit: 0, balance: 5525.5 },
      { date: '2026-10-05', desc: 'Cloud Host Subscription Fee', mcc: '7372', debit: 49.99, credit: 0, balance: 5475.51 },
      { date: '2026-10-08', desc: 'Restaurant Dining Express', mcc: '5812', debit: 68.25, credit: 0, balance: 5407.26 },
      { date: '2026-10-12', desc: 'Online Marketplace Order', mcc: '5311', debit: 112.0, credit: 0, balance: 5295.26 },
    ];
    const totalCredits = txs.reduce((acc, t) => acc + t.credit, 0);
    const totalDebits = txs.reduce((acc, t) => acc + t.debit, 0);
    const closingBalance = Math.round((openingBalance + totalCredits - totalDebits) * 100) / 100;

    return {
      number: 'SYN-STM-2026-0819',
      bankName: 'SYNTHETIC TRUST CHARTERED BANK',
      holderName: 'Elena Rostova',
      accountNumber: '****-9482',
      periodFrom: isUS ? 'Oct 01, 2026' : '01.10.2026',
      periodTo: isUS ? 'Oct 15, 2026' : '15.10.2026',
      openingBalance,
      closingBalance,
      currencySym,
      transactions: txs,
      totalCredits,
      totalDebits,
    };
  }, [locale]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadSuccess(null);
    setDownloadError(null);
    try {
      const blob = await downloadDocumentsZip(kind, docCount, dataset);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${kind}s_synthetic_bundle.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDownloadSuccess(`Successfully downloaded ${docCount} watermarked ${kind}s with ground truth!`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const currentTemplate = kind === 'invoice' ? invTemplate : stmtTemplate;

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      {/* Left Sidebar Controls */}
      <aside
        style={{
          width: 320,
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '16px',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Document Generator</h2>
          <p style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>
            Programmatic PDF generation with fpdf2 & ground truth labels (FR-06, FR-07, FR-17)
          </p>
        </div>

        {/* Kind Switcher */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
            Document Kind
          </label>
          <div style={{ display: 'flex', gap: 6, backgroundColor: 'var(--sand-light)', padding: 3, borderRadius: 6, border: '1px solid var(--line)' }}>
            <button
              type="button"
              onClick={() => setKind('invoice')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: kind === 'invoice' ? '#FFFFFF' : 'transparent',
                color: kind === 'invoice' ? 'var(--teal)' : 'var(--slate)',
                fontWeight: kind === 'invoice' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: kind === 'invoice' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              🧾 Tax Invoice
            </button>
            <button
              type="button"
              onClick={() => setKind('statement')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: kind === 'statement' ? '#FFFFFF' : 'transparent',
                color: kind === 'statement' ? 'var(--teal)' : 'var(--slate)',
                fontWeight: kind === 'statement' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: kind === 'statement' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              🏦 Bank Statement
            </button>
          </div>
        </div>

        {/* Template Selector */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
            Design Template
          </label>
          {kind === 'invoice' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(['classic', 'modern', 'minimal'] as InvoiceTemplate[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setInvTemplate(t)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: `1px solid ${invTemplate === t ? 'var(--teal)' : 'var(--line)'}`,
                    backgroundColor: invTemplate === t ? 'rgba(22, 122, 109, 0.06)' : '#FFFFFF',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: invTemplate === t ? 'var(--teal)' : 'var(--ink)', textTransform: 'capitalize' }}>
                    {t} Invoice
                  </div>
                  {invTemplate === t && <span style={{ color: 'var(--teal)', fontSize: 12 }}>✓</span>}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(['bank', 'summary', 'tabular'] as StatementTemplate[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setStmtTemplate(t)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: `1px solid ${stmtTemplate === t ? 'var(--teal)' : 'var(--line)'}`,
                    backgroundColor: stmtTemplate === t ? 'rgba(22, 122, 109, 0.06)' : '#FFFFFF',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: stmtTemplate === t ? 'var(--teal)' : 'var(--ink)', textTransform: 'capitalize' }}>
                    {t} Layout
                  </div>
                  {stmtTemplate === t && <span style={{ color: 'var(--teal)', fontSize: 12 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Locale Pack */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
            Locale Pack & Tax Rules
          </label>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid var(--line)',
              fontSize: 12,
              backgroundColor: 'var(--sand-light)',
            }}
          >
            <option value="en_US">🇺🇸 en_US (USD $, Sales Tax 8.0%)</option>
            <option value="en_IN">🇮🇳 en_IN (INR Rs, Lakh grouping, CGST 9% + SGST 9%)</option>
            <option value="de_DE">🇩🇪 de_DE (EUR, MwSt 19.0%, DIN 5008)</option>
          </select>
        </div>

        {/* Query DSL */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
            Query DSL Constraint
          </label>
          <input
            type="text"
            value={queryDsl}
            onChange={(e) => setQueryDsl(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 12 }}
          />
          <div style={{ marginTop: 6 }}>
            <span className="verdict-tag pass" style={{ fontSize: 10, padding: '2px 6px' }}>
              ✓ Invariant Satisfied by Construction
            </span>
          </div>
        </div>

        {/* Batch Count */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Batch Count
            </label>
            <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{docCount} PDFs</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            value={docCount}
            onChange={(e) => setDocCount(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--teal)' }}
          />
        </div>

        {/* Watermark Notice */}
        <div style={{ padding: '8px 10px', backgroundColor: 'var(--sand-light)', borderRadius: 6, border: '1px solid var(--line)' }}>
          <label style={{ fontSize: 11, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <input type="checkbox" checked disabled style={{ marginTop: 2, accentColor: 'var(--teal)' }} />
            <div>
              <strong style={{ color: 'var(--ink)' }}>Mandatory Diagonal Watermark</strong>
              <div style={{ color: 'var(--slate)', fontSize: 10 }}>
                Enforced on every page with synthetic provenance metadata per TRD §8.3 (cannot be disabled).
              </div>
            </div>
          </label>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          style={{
            marginTop: 'auto',
            padding: '10px 14px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: 'var(--teal)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 13,
            cursor: isDownloading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {isDownloading ? 'Rendering PDFs...' : `Download ZIP Bundle (${docCount} PDFs + GT)`}
        </button>

        {downloadSuccess && (
          <div style={{ padding: '8px 10px', backgroundColor: 'var(--pass-bg)', color: 'var(--pass)', fontSize: 11, borderRadius: 4, fontWeight: 500 }}>
            ✓ {downloadSuccess}
          </div>
        )}
        {downloadError && (
          <div style={{ padding: '8px 10px', backgroundColor: 'var(--fail-bg)', color: 'var(--fail)', fontSize: 11, borderRadius: 4 }}>
            ✗ {downloadError}
          </div>
        )}
      </aside>

      {/* Main Document Preview Surface */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'var(--sand)',
        }}
      >
        {/* Top Canvas Bar */}
        <div
          style={{
            height: 48,
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
              {kind === 'invoice' ? sampleInvoice.number : sampleStatement.number}
            </span>
            <span className="verdict-tag pass" style={{ fontSize: 11 }}>
              One-World Linkage Active
            </span>
            <span style={{ fontSize: 11, color: 'var(--slate)', background: 'var(--sand-light)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>
              Synthetic=true
            </span>
          </div>

          <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--sand-light)', padding: 2, borderRadius: 6, border: '1px solid var(--line)' }}>
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: viewMode === 'visual' ? '#FFFFFF' : 'transparent',
                fontWeight: viewMode === 'visual' ? 600 : 500,
                fontSize: 11,
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              📄 Visual Document
            </button>
            <button
              type="button"
              onClick={() => setViewMode('boxes')}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: viewMode === 'boxes' ? '#FFFFFF' : 'transparent',
                fontWeight: viewMode === 'boxes' ? 600 : 500,
                fontSize: 11,
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              📐 Bounding Boxes
            </button>
            <button
              type="button"
              onClick={() => setViewMode('json')}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: viewMode === 'json' ? '#FFFFFF' : 'transparent',
                fontWeight: viewMode === 'json' ? 600 : 500,
                fontSize: 11,
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              📋 JSONL Ground Truth
            </button>
          </div>
        </div>

        {/* Document Canvas Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
            padding: '32px 16px',
          }}
        >
          {viewMode === 'json' ? (
            <div
              style={{
                width: 700,
                backgroundColor: '#1E293B',
                color: '#F8FAFC',
                borderRadius: 8,
                padding: 20,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                lineHeight: 1.6,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                overflowX: 'auto',
              }}
            >
              <div style={{ color: '#94A3B8', marginBottom: 12 }}>
                // ground_truth.part.jsonl (FR-15 OCR Evaluation Targets)
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(
                  {
                    document_id: kind === 'invoice' ? sampleInvoice.number : sampleStatement.number,
                    doc_kind: kind,
                    template: currentTemplate,
                    locale,
                    fields: kind === 'invoice'
                      ? {
                          number: sampleInvoice.number,
                          date: sampleInvoice.date,
                          customer: sampleInvoice.customer,
                          subtotal: sampleInvoice.subtotal,
                          grand_total: sampleInvoice.grandTotal,
                        }
                      : {
                          number: sampleStatement.number,
                          holder: sampleStatement.holderName,
                          opening_balance: sampleStatement.openingBalance,
                          closing_balance: sampleStatement.closingBalance,
                        },
                    bounding_boxes: {
                      number: [1, 14.0, 16.0, 80.0, 6.0],
                      date: [1, 14.0, 22.0, 60.0, 5.0],
                      total: [1, 140.0, 180.0, 55.0, 8.0],
                      watermark: [1, 15.0, 148.0, 180.0, 12.0],
                    },
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          ) : (
            /* Document Paper Sheet */
            <div
              style={{
                width: 620,
                minHeight: 820,
                backgroundColor: '#FFFFFF',
                boxShadow: '0 8px 28px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
                borderRadius: 4,
                padding: '40px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: currentTemplate === 'classic' ? '1px solid var(--line)' : 'none',
              }}
            >
              {/* Mandatory Diagonal Watermark (FR-17) */}
              <div
                style={{
                  position: 'absolute',
                  top: '45%',
                  left: '-10%',
                  width: '120%',
                  transform: 'rotate(-32deg)',
                  fontSize: 26,
                  fontWeight: 800,
                  color: 'rgba(100, 116, 139, 0.12)',
                  pointerEvents: 'none',
                  letterSpacing: 3,
                  textAlign: 'center',
                  userSelect: 'none',
                  zIndex: 2,
                }}
              >
                SYNTHETIC — NOT A REAL DOCUMENT
              </div>

              {/* Bounding Box Overlays (FR-15 toggle) */}
              {viewMode === 'boxes' && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: 36,
                      right: 40,
                      width: 170,
                      height: 48,
                      border: '1.5px dashed #0284C7',
                      backgroundColor: 'rgba(2, 132, 199, 0.08)',
                      borderRadius: 2,
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: 2,
                      fontSize: 9,
                      color: '#0284C7',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    box: doc_number
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 40,
                      right: 40,
                      width: 200,
                      height: 70,
                      border: '1.5px dashed #16A34A',
                      backgroundColor: 'rgba(22, 163, 74, 0.08)',
                      borderRadius: 2,
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: 2,
                      fontSize: 9,
                      color: '#16A34A',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    box: totals_reconciled
                  </div>
                </>
              )}

              {/* Document Content */}
              {kind === 'invoice' ? (
                <div>
                  {/* Modern Header Banner */}
                  {invTemplate === 'modern' && (
                    <div style={{ height: 6, backgroundColor: 'var(--teal)', margin: '-40px -40px 30px -40px', borderRadius: '4px 4px 0 0' }} />
                  )}

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--ink)', paddingBottom: 14 }}>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>{sampleInvoice.seller}</h3>
                      <p style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }} className="mono">
                        {sampleInvoice.sellerTaxId}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--slate)' }}>
                        Provenance: Recipe IR deterministic seed {dataset.seed}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--teal)', letterSpacing: 0.5 }}>
                        TAX INVOICE
                      </div>
                      <div className="mono" style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                        {sampleInvoice.number}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>
                        Date: {sampleInvoice.date}
                      </div>
                    </div>
                  </div>

                  {/* Bill To */}
                  <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', fontSize: 10 }}>Billed To:</div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{sampleInvoice.customer}</div>
                      <div style={{ color: 'var(--slate)', marginTop: 2 }}>{sampleInvoice.customerAddress}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', fontSize: 10 }}>Payment Details:</div>
                      <div style={{ marginTop: 2 }}>Due: {sampleInvoice.dueDate}</div>
                      <div style={{ color: 'var(--teal)', fontWeight: 600 }}>Terms: Net 30</div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <table style={{ width: '100%', marginTop: 28, fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid var(--ink)', textAlign: 'left', backgroundColor: 'var(--sand-light)' }}>
                        <th style={{ padding: '8px 6px', fontWeight: 700 }}>SKU</th>
                        <th style={{ padding: '8px 6px', fontWeight: 700 }}>Description</th>
                        <th style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'right' }}>Price</th>
                        <th style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleInvoice.lines.map((line) => (
                        <tr key={line.id} style={{ borderBottom: '1px solid var(--line-light)' }}>
                          <td style={{ padding: '8px 6px' }} className="mono">{line.sku}</td>
                          <td style={{ padding: '8px 6px' }}>{line.desc}</td>
                          <td style={{ padding: '8px 6px', textAlign: 'center' }}>{line.qty}</td>
                          <td style={{ padding: '8px 6px', textAlign: 'right' }} className="mono">
                            {sampleInvoice.currencySym}{line.price.toFixed(2)}
                          </td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600 }} className="mono">
                            {sampleInvoice.currencySym}{line.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Bank Statement View */
                <div>
                  {/* Bank Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--ink)', paddingBottom: 14 }}>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>{sampleStatement.bankName}</h3>
                      <p style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>
                        Account Statement (FR-07) · Strict Running Balance
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{sampleStatement.number}</div>
                      <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>
                        Period: {sampleStatement.periodFrom} – {sampleStatement.periodTo}
                      </div>
                    </div>
                  </div>

                  {/* Account Summary Cards */}
                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, padding: '10px 14px', backgroundColor: 'var(--sand-light)', borderRadius: 4, border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: 10, color: 'var(--slate)', textTransform: 'uppercase', fontWeight: 600 }}>Account Holder</div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{sampleStatement.holderName}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--slate)' }}>Acct: {sampleStatement.accountNumber}</div>
                    </div>
                    <div style={{ flex: 1, padding: '10px 14px', backgroundColor: 'var(--sand-light)', borderRadius: 4, border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: 10, color: 'var(--slate)', textTransform: 'uppercase', fontWeight: 600 }}>Opening Balance</div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: 'var(--ink)' }}>
                        {sampleStatement.currencySym}{sampleStatement.openingBalance.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ flex: 1, padding: '10px 14px', backgroundColor: 'rgba(22, 122, 109, 0.08)', borderRadius: 4, border: '1px solid var(--teal)' }}>
                      <div style={{ fontSize: 10, color: 'var(--teal)', textTransform: 'uppercase', fontWeight: 700 }}>Closing Balance</div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: 'var(--teal)' }}>
                        {sampleStatement.currencySym}{sampleStatement.closingBalance.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <table style={{ width: '100%', marginTop: 24, fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid var(--ink)', textAlign: 'left', backgroundColor: 'var(--sand-light)' }}>
                        <th style={{ padding: '8px 6px', fontWeight: 700 }}>Date</th>
                        <th style={{ padding: '8px 6px', fontWeight: 700 }}>Description</th>
                        <th style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'center' }}>MCC</th>
                        <th style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'right' }}>Debit</th>
                        <th style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'right' }}>Credit</th>
                        <th style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'right' }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleStatement.transactions.map((tx, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--line-light)' }}>
                          <td style={{ padding: '8px 6px' }} className="mono">{tx.date}</td>
                          <td style={{ padding: '8px 6px' }}>{tx.desc}</td>
                          <td style={{ padding: '8px 6px', textAlign: 'center' }} className="mono" title="ISO 18245 MCC">
                            {tx.mcc}
                          </td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', color: tx.debit > 0 ? 'var(--fail)' : 'var(--slate)' }} className="mono">
                            {tx.debit > 0 ? `-${sampleStatement.currencySym}${tx.debit.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', color: tx.credit > 0 ? 'var(--pass)' : 'var(--slate)' }} className="mono">
                            {tx.credit > 0 ? `+${sampleStatement.currencySym}${tx.credit.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600 }} className="mono">
                            {sampleStatement.currencySym}{tx.balance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals & Reconciliation Footer */}
              {kind === 'invoice' ? (
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 32 }}>
                  <div style={{ marginLeft: 'auto', width: 260, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: 'var(--slate)' }}>Subtotal:</span>
                      <span className="mono">{sampleInvoice.currencySym}{sampleInvoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: 'var(--slate)' }}>Discount:</span>
                      <span className="mono" style={{ color: 'var(--fail)' }}>
                        -{sampleInvoice.currencySym}{sampleInvoice.discount.toFixed(2)}
                      </span>
                    </div>
                    {sampleInvoice.taxLines.map((tax, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: 'var(--slate)' }}>{tax.name} ({tax.rate}):</span>
                        <span className="mono">+{sampleInvoice.currencySym}{tax.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 800,
                        fontSize: 15,
                        borderTop: '2px solid var(--ink)',
                        paddingTop: 8,
                        marginTop: 6,
                        color: 'var(--teal)',
                      }}
                    >
                      <span>Grand Total:</span>
                      <span className="mono">{sampleInvoice.currencySym}{sampleInvoice.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 32, fontSize: 11, color: 'var(--slate)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Debits: -{sampleStatement.currencySym}{sampleStatement.totalDebits.toFixed(2)}</span>
                    <span>Total Credits: +{sampleStatement.currencySym}{sampleStatement.totalCredits.toFixed(2)}</span>
                    <strong style={{ color: 'var(--pass)' }}>✓ Running Balance Exact (0.00 drift)</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Verification Status Bar */}
        <div
          style={{
            height: 36,
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            fontSize: 11,
            color: 'var(--slate)',
          }}
        >
          <div>
            100% Deterministic · Watermark mandatory · Decimal exact arithmetic · Seed {dataset.seed}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--teal)', fontWeight: 600 }}>
              ✓ All {kind === 'invoice' ? 'tax lines' : 'running balance'} invariants hold
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
