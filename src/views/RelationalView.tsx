import React from 'react';
import { useAppStore } from '../state/store';

export const RelationalView: React.FC = () => {
  const { dataset } = useAppStore();

  return (
    <>
      <aside className="side-panel">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Relationships</h3>
        {dataset.relationships.map((r) => (
          <div key={r.name} className="card">
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: 'var(--slate)' }}>
              {r.parent_table} ({r.parent_keys.join(', ')}) → {r.child_table} ({r.child_keys.join(', ')})
            </div>
            <div style={{ marginTop: 6 }}>
              <span className="verdict-tag na" style={{ fontSize: 11 }}>
                Cardinality: {r.cardinality}
              </span>
            </div>
          </div>
        ))}

        <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 20, marginBottom: 12 }}>Invariants</h3>
        <p style={{ fontSize: 12, color: 'var(--slate)' }}>
          orders.total = sum(order_items.qty × unit_price) + tax
        </p>
      </aside>

      <main className="preview-canvas" style={{ display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Entity-Relationship Diagram</h2>
        <div style={{
          flex: 1,
          background: '#ffffff',
          border: '1px solid var(--line)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          padding: 40
        }}>
          <div style={{ display: 'flex', gap: 60, alignItems: 'center' }}>
            <div className="card" style={{ width: 220, border: '2px solid var(--ink)', padding: 0 }}>
              <div style={{ background: 'var(--ink)', color: '#fff', padding: '8px 12px', fontWeight: 600 }}>
                customers
              </div>
              <div style={{ padding: 10, fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>PK customer_id</div>
                <div>name</div>
                <div>email</div>
                <div>phone</div>
              </div>
            </div>

            <div style={{ color: 'var(--teal)', fontWeight: 600, fontSize: 18 }}>
              1 ─── 0..N ───▶
            </div>

            <div className="card" style={{ width: 220, border: '2px solid var(--ink)', padding: 0 }}>
              <div style={{ background: 'var(--ink)', color: '#fff', padding: '8px 12px', fontWeight: 600 }}>
                orders
              </div>
              <div style={{ padding: 10, fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>PK order_id</div>
                <div style={{ color: 'var(--teal)' }}>FK customer_id</div>
                <div>total_amount</div>
                <div>created_at</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 20 }}>
            Zero orphan foreign keys guaranteed by construction (topological seed DAG).
          </div>
        </div>
      </main>
    </>
  );
};
