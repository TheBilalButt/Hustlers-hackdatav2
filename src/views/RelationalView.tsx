import React from 'react';
import { useAppStore } from '../state/store';

export const RelationalView: React.FC = () => {
  const { dataset } = useAppStore();
  const relationships = dataset.relationships || [];

  return (
    <div style={{ display: 'flex', flex: 1, padding: 20, gap: 20 }}>
      <aside className="side-panel" style={{ width: 340 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Foreign Key Relationships</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {relationships.map((r, idx) => (
            <div key={`${r.parent}_${r.child}_${idx}`} className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                {r.parent} → {r.child}
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--slate)' }}>
                {r.parent}.{r.parent_key} = {r.child}.{r.child_key}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--teal)' }}>
                Kind: {r.kind} (dist: {r.cardinality.dist})
              </div>
            </div>
          ))}
          {relationships.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--slate)' }}>No relationships configured.</div>
          )}
        </div>
      </aside>

      <main className="preview-canvas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--slate)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>☍</div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>Interactive ER Diagram</h2>
          <p style={{ fontSize: 13, maxWidth: 400, marginTop: 4 }}>
            Visual topological DAG with crow&apos;s-foot cardinalities and zero-orphan guarantee (M2).
          </p>
        </div>
      </main>
    </div>
  );
};