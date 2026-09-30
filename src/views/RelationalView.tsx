import React, { useState, useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap, type Node, type Edge, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppStore } from '../state/store';
import type { Relationship } from '../types/ir';

const TableNodeComponent: React.FC<{ data: { label: string; columns: string[]; rowCount: number; isSelected: boolean } }> = ({ data }) => {
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        background: '#fff',
        border: data.isSelected ? '2.5px solid var(--teal)' : '1.5px solid var(--line)',
        boxShadow: data.isSelected ? '0 4px 12px rgba(22, 122, 109, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)',
        minWidth: 160,
        fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: 6, marginBottom: 6 }}>
        <strong style={{ fontSize: 13, color: 'var(--ink)' }}>{data.label}</strong>
        <span className="mono" style={{ fontSize: 10, color: 'var(--slate)', background: 'var(--sand)', padding: '1px 5px', borderRadius: 3 }}>
          {data.rowCount} rows
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {data.columns.slice(0, 5).map((col, idx) => (
          <div key={idx} className="mono" style={{ fontSize: 11, color: idx === 0 ? 'var(--teal)' : 'var(--slate)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {idx === 0 && <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--ink)', color: '#fff', padding: '0 3px', borderRadius: 2 }}>PK</span>}
            <span>{col}</span>
          </div>
        ))}
        {data.columns.length > 5 && (
          <div style={{ fontSize: 10, color: 'var(--slate)', fontStyle: 'italic', marginTop: 2 }}>
            +{data.columns.length - 5} more columns
          </div>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  tableNode: TableNodeComponent,
};

export const RelationalView: React.FC = () => {
  const { dataset, selectedTable, setSelectedTable, previewRows, updateDataset } = useAppStore();
  const [showAddRel, setShowAddRel] = useState(false);

  const [parentTable, setParentTable] = useState('');
  const [parentKey, setParentKey] = useState('');
  const [childTable, setChildTable] = useState('');
  const [childKey, setChildKey] = useState('');
  const [relMin, setRelMin] = useState(1);
  const [relMax, setRelMax] = useState(5);

  const relationships: Relationship[] = useMemo(() => dataset.relationships || [], [dataset.relationships]);

  const nodes: Node[] = useMemo(() => {
    const spacingX = 260;
    const spacingY = 160;

    return dataset.tables.map((table, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);

      return {
        id: table.name,
        type: 'tableNode',
        position: { x: 50 + col * spacingX, y: 50 + row * spacingY },
        data: {
          label: table.name,
          columns: table.columns.map((c) => c.name),
          rowCount: table.row_count || 1000,
          isSelected: table.name === selectedTable,
        },
      };
    });
  }, [dataset.tables, selectedTable]);

  const edges: Edge[] = useMemo(() => {
    return relationships.map((r, idx) => ({
      id: `rel-${idx}-${r.parent}-${r.child}`,
      source: r.parent,
      target: r.child,
      animated: true,
      label: `${r.cardinality.min_val}..${r.cardinality.max_val}`,
      labelStyle: { fill: 'var(--teal)', fontWeight: 600, fontSize: 11 },
      style: { stroke: 'var(--teal)', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'var(--teal)',
      },
    }));
  }, [relationships]);

  const handleAddRelationship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentTable || !childTable || !parentKey || !childKey) return;

    const newRel: Relationship = {
      parent: parentTable,
      parent_key: parentKey,
      child: childTable,
      child_key: childKey,
      kind: 'one_to_many',
      cardinality: {
        dist: 'uniform',
        min_val: relMin,
        max_val: relMax,
      },
    };

    updateDataset((prev) => ({
      ...prev,
      relationships: [...(prev.relationships || []), newRel],
    }));

    setShowAddRel(false);
  };

  const handleRemoveRelationship = (idx: number) => {
    updateDataset((prev) => ({
      ...prev,
      relationships: (prev.relationships || []).filter((_, i) => i !== idx),
    }));
  };

  const activeTable = dataset.tables.find((t) => t.name === selectedTable) || dataset.tables[0];
  const activeRows = activeTable ? previewRows[activeTable.name] || [] : [];

  return (
    <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 84px)', overflow: 'hidden' }}>
      {/* Sidebar: Relationships & Invariants */}
      <aside className="config-sidebar" style={{ width: 340, overflowY: 'auto' }}>
        <section className="config-section">
          <div className="section-header">
            <h2 className="section-title">Relationships (Foreign Keys)</h2>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                if (dataset.tables.length >= 2) {
                  setParentTable(dataset.tables[0].name);
                  setParentKey(dataset.tables[0].columns[0]?.name || '');
                  setChildTable(dataset.tables[1].name);
                  setChildKey(dataset.tables[1].columns[0]?.name || '');
                }
                setShowAddRel(!showAddRel);
              }}
            >
              + Link
            </button>
          </div>

          {showAddRel && (
            <form onSubmit={handleAddRelationship} className="card" style={{ marginBottom: 12, padding: 10, background: 'var(--sand-light)' }}>
              <div className="form-row" style={{ marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Parent Table</label>
                  <select
                    className="input-select"
                    value={parentTable}
                    onChange={(e) => {
                      setParentTable(e.target.value);
                      const t = dataset.tables.find((x) => x.name === e.target.value);
                      if (t?.columns[0]) setParentKey(t.columns[0].name);
                    }}
                  >
                    {dataset.tables.map((t) => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="field-label">PK Column</label>
                  <select
                    className="input-select"
                    value={parentKey}
                    onChange={(e) => setParentKey(e.target.value)}
                  >
                    {dataset.tables.find((t) => t.name === parentTable)?.columns.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Child Table</label>
                  <select
                    className="input-select"
                    value={childTable}
                    onChange={(e) => {
                      setChildTable(e.target.value);
                      const t = dataset.tables.find((x) => x.name === e.target.value);
                      if (t?.columns[0]) setChildKey(t.columns[0].name);
                    }}
                  >
                    {dataset.tables.map((t) => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="field-label">FK Column</label>
                  <select
                    className="input-select"
                    value={childKey}
                    onChange={(e) => setChildKey(e.target.value)}
                  >
                    {dataset.tables.find((t) => t.name === childTable)?.columns.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: 8 }}>
                <div style={{ width: 60 }}>
                  <label className="field-label">Min</label>
                  <input
                    type="number"
                    className="input-text mono"
                    value={relMin}
                    min={0}
                    max={50}
                    onChange={(e) => setRelMin(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div style={{ width: 60 }}>
                  <label className="field-label">Max</label>
                  <input
                    type="number"
                    className="input-text mono"
                    value={relMax}
                    min={1}
                    max={100}
                    onChange={(e) => setRelMax(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button type="submit" className="btn btn-primary btn-sm">Save Link</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddRel(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {relationships.map((r, idx) => (
              <div key={idx} className="column-card" style={{ padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    <span className="mono" style={{ color: 'var(--ink)' }}>{r.parent}</span>
                    <span style={{ margin: '0 4px', color: 'var(--teal)' }}>→</span>
                    <span className="mono" style={{ color: 'var(--ink)' }}>{r.child}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-delete-chip"
                    onClick={() => handleRemoveRelationship(idx)}
                    title="Remove link"
                  >
                    ✕
                  </button>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--slate)', marginTop: 4 }}>
                  {r.parent}.{r.parent_key} = {r.child}.{r.child_key}
                </div>
                <div style={{ marginTop: 4, fontSize: 10, color: 'var(--teal)', fontWeight: 500 }}>
                  Cardinality: {r.cardinality.min_val}..{r.cardinality.max_val} ({r.cardinality.dist})
                </div>
              </div>
            ))}
            {relationships.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--slate)', padding: '10px 0' }}>
                No relationships defined. Click &quot;+ Link&quot; to define foreign keys.
              </div>
            )}
          </div>
        </section>

        {/* Invariants Section */}
        <section className="config-section">
          <div className="section-header">
            <h2 className="section-title">Cross-Table Invariants (FR-04)</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="card" style={{ padding: 8, margin: 0, background: 'var(--sand-light)', border: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--teal)' }}>∑ Sum Children Invariant</div>
              <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>
                orders.total_amount = ∑(order_items.line_total)
              </div>
            </div>
            <div className="card" style={{ padding: 8, margin: 0, background: 'var(--sand-light)', border: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--teal)' }}>⏱ Temporal Order Invariant</div>
              <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>
                orders.shipped_date ≥ orders.order_date
              </div>
            </div>
            <div className="card" style={{ padding: 8, margin: 0, background: 'var(--sand-light)', border: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--teal)' }}>⚖ Running Balance Invariant</div>
              <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>
                accounts.balance = balance(t-1) + credit - debit
              </div>
            </div>
          </div>
        </section>
      </aside>

      {/* Main Canvas: React Flow ER Diagram + Split Preview */}
      <main className="preview-canvas" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedTable(node.id)}
            fitView
          >
            <Background color="#D1D5DB" gap={16} />
            <Controls />
            <MiniMap
              nodeColor={() => 'var(--teal)'}
              style={{ background: 'var(--sand-light)', border: '1px solid var(--line)' }}
            />
          </ReactFlow>
        </div>

        {/* Lower Split Preview Grid for selected table */}
        {activeTable && (
          <div
            style={{
              height: 220,
              borderTop: '2px solid var(--line)',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              padding: '8px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Table Preview:</span>
                <span className="mono font-bold" style={{ color: 'var(--teal)' }}>{activeTable.name}</span>
                <span style={{ fontSize: 11, color: 'var(--slate)' }}>({activeRows.length} rows loaded)</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {dataset.tables.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setSelectedTable(t.name)}
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 3,
                      border: t.name === selectedTable ? '1.5px solid var(--teal)' : '1px solid var(--line)',
                      background: t.name === selectedTable ? 'var(--mint)' : '#fff',
                      color: t.name === selectedTable ? 'var(--teal)' : 'var(--slate)',
                      cursor: 'pointer',
                      fontWeight: t.name === selectedTable ? 700 : 500,
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 4 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="col-index-th">#</th>
                    {activeTable.columns.map((c) => (
                      <th key={c.name} className="col-th" style={{ padding: '4px 8px' }}>
                        <span className="mono font-bold">{c.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeRows.slice(0, 15).map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'row-zebra' : ''}>
                      <td className="cell-index mono" style={{ padding: '3px 6px' }}>{idx + 1}</td>
                      {activeTable.columns.map((c) => (
                        <td key={c.name} className="cell-data mono" style={{ padding: '3px 8px' }}>
                          {row[c.name] !== null && row[c.name] !== undefined ? String(row[c.name]) : <span className="null-badge">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
