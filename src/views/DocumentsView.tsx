import React from 'react';

export const DocumentsView: React.FC = () => {
  return (
    <>
      <aside className="side-panel">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Document Generator</h3>
        <div className="card">
          <label style={{ fontSize: 12, color: 'var(--slate)', display: 'block', marginBottom: 4 }}>Type</label>
          <select style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid var(--line)' }}>
            <option>GST Tax Invoice (India)</option>
            <option>Commercial Invoice (US)</option>
            <option>Bank Account Statement</option>
          </select>
        </div>

        <div className="card">
          <label style={{ fontSize: 12, color: 'var(--slate)', display: 'block', marginBottom: 4 }}>Query DSL</label>
          <input
            type="text"
            placeholder="e.g. balance over ₹5,000"
            defaultValue="last 90 days, balance over ₹5,000"
            style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--line)', fontSize: 12 }}
          />
          <div style={{ marginTop: 8 }}>
            <span className="verdict-tag pass" style={{ fontSize: 11 }}>
              ✓ Query satisfied (min balance ₹5,420.00)
            </span>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn btn-outline" style={{ width: '100%', marginBottom: 8 }}>
            Show Linked Records
          </button>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" defaultChecked />
            Watermark all pages
          </label>
        </div>
      </aside>

      <main className="preview-canvas" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Document Preview: SYN-INV-2026-0042</h2>
          <span className="verdict-tag pass">One-World Linkage Active</span>
        </div>

        <div style={{
          flex: 1,
          background: 'var(--sand)',
          borderRadius: 8,
          border: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            width: 500,
            height: 650,
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            padding: 30,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            {/* Watermark */}
            <div style={{
              position: 'absolute',
              top: '40%',
              left: '5%',
              transform: 'rotate(-45deg)',
              fontSize: 28,
              fontWeight: 700,
              color: 'rgba(107, 114, 128, 0.15)',
              pointerEvents: 'none',
              letterSpacing: 2,
              textAlign: 'center',
              width: '90%'
            }}>
              SYNTHETIC — NOT A REAL DOCUMENT
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--ink)', paddingBottom: 10 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>SYNTHETIC D2C RETAIL</h3>
                  <p style={{ fontSize: 11, color: 'var(--slate)' }}>GSTIN: 27AAAAA0000A1Z5</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--teal)' }}>TAX INVOICE</div>
                  <div className="mono" style={{ fontSize: 12 }}>SYN-INV-2026-0042</div>
                </div>
              </div>

              <div style={{ marginTop: 20, fontSize: 12 }}>
                <p><strong>Billed To:</strong> Rajesh Sharma</p>
                <p><strong>Order ID:</strong> ORD-99214</p>
                <p><strong>Date:</strong> 29 Sep 2026</p>
              </div>

              <table style={{ width: '100%', marginTop: 20, fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                    <th style={{ padding: '4px 0' }}>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 0' }}>Wireless Earbuds</td>
                    <td>1</td>
                    <td>₹2,499.00</td>
                    <td style={{ textAlign: 'right' }}>₹2,499.00</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0' }}>Fast Charger 65W</td>
                    <td>1</td>
                    <td>₹1,299.00</td>
                    <td style={{ textAlign: 'right' }}>₹1,299.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Subtotal</span>
                <span className="mono">₹3,798.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>CGST (9%) + SGST (9%)</span>
                <span className="mono">₹683.64</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
                <span>Total Amount</span>
                <span className="mono" style={{ color: 'var(--teal)' }}>₹4,481.64</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};
