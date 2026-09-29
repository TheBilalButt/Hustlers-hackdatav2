import React, { useState } from 'react';
import { useAppStore } from '../state/store';

export const TabularView: React.FC = () => {
  const { dataset } = useAppStore();
  const [selectedTable, setSelectedTable] = useState(dataset.tables[0]?.name || '');

  const table = dataset.tables.find((t) => t.name === selectedTable) || dataset.tables[0];

  return (
    <>
      <aside className="side-panel">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Tables</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {dataset.tables.map((t) => (
            <button
              key={t.name}
              onClick={() => setSelectedTable(t.name)}
              className="btn btn-outline"
              style={{
                justifyContent: 'space-between',
                borderColor: t.name === selectedTable ? 'var(--teal)' : 'var(--line)',
                background: t.name === selectedTable ? 'var(--mint)' : '#fff',
              }}
            >
              <span>{t.name}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--slate)' }}>
                {t.rows} rows
              </span>
            </button>
          ))}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Columns</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {table?.columns.map((c) => (
            <div key={c.name} className="card" style={{ padding: 8, margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500 }}>
                <span>{c.name}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--slate)' }}>
                  {c.type}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11, color: 'var(--slate)' }}>
                <span>nulls: {(c.null_rate * 100).toFixed(0)}%</span>
                <span>privacy: {c.privacy}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="preview-canvas">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>
            Preview: {table?.name} (first 50 rows)
          </h2>
          <span style={{ fontSize: 12, color: 'var(--slate)' }}>
            Total planned: {table?.rows.toLocaleString()} rows
          </span>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--sand)', borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', width: 50, color: 'var(--slate)' }}>#</th>
                {table?.columns.map((c) => (
                  <th key={c.name} style={{ padding: '8px 12px', borderLeft: '1px solid var(--line)' }}>
                    <div>{c.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--slate)', fontWeight: 400 }}>{c.type}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 15 }).map((_, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="mono" style={{ padding: '6px 12px', color: 'var(--slate)' }}>{idx + 1}</td>
                  {table?.columns.map((c) => (
                    <td key={c.name} className="mono" style={{ padding: '6px 12px', borderLeft: '1px solid #f0f0f0' }}>
                      {c.name === 'customer_id' ? idx + 101 :
                       c.name === 'order_id' ? idx + 5001 :
                       c.name === 'total_amount' ? (Math.random() * 5000 + 100).toFixed(2) :
                       c.name === 'created_at' ? '2026-09-29' :
                       `sample_${c.name}_${idx + 1}`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
};
