import React, { useState, useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppStore } from '../state/store';
import type { Relationship } from '../types/ir';

// Custom Interactive Table Node for ReactFlow
const TableNode: React.FC<{
  data: {
    label: string;
    columns: { name: string; pk?: boolean; type: string }[];
    isSelected: boolean;
    isDimmed: boolean;
    connectedKeyCols: string[];
  };
}> = ({ data }) => {
  return (
    <div
      className={`table-flow-node ${data.isSelected ? 'selected' : ''} ${data.isDimmed ? 'dimmed' : ''}`}
    >
      <div className="node-header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
        <span className="mono font-bold" style={{ fontSize: 12 }}>{data.label}</span>
      </div>
      <div className="node-body">
        {data.columns.map((col) => {
          const isKeyHighlighted = data.connectedKeyCols.includes(col.name);
          return (
            <div
              key={col.name}
              className={`node-col-row ${isKeyHighlighted ? 'col-highlight' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {col.pk && <span className="pk-badge-xs">PK</span>}
                <span className="mono" style={{ fontSize: 11, fontWeight: isKeyHighlighted ? 700 : 400 }}>
                  {col.name}
                </span>
              </div>
              <span className="node-col-type">{col.type}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const nodeTypes = { tableNode: TableNode };

export const RelationalView: React.FC = () => {
  const { dataset, updateDataset, selectedTable, setSelectedTable, previewRows } = useAppStore();

  const [showAddRel, setShowAddRel] = useState(false);
  const [parentTable, setParentTable] = useState(dataset.tables[0]?.name || '');
  const [childTable, setChildTable] = useState(dataset.tables[1]?.name || dataset.tables[0]?.name || '');
  const [parentCol, setParentCol] = useState('');
  const [childCol, setChildCol] = useState('');
  const [relMin, setRelMin] = useState(1);
  const [relMax, setRelMax] = useState(5);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const relationships = useMemo(() => dataset.relationships || [], [dataset.relationships]);

  // Determine connected tables and keys for the selected table
  const connectedInfo = useMemo(() => {
    const connectedTables = new Set<string>();
    const tableKeysMap: Record<string, string[]> = {};

    connectedTables.add(selectedTable);

    relationships.forEach((r) => {
      if (r.parent === selectedTable) {
        connectedTables.add(r.child);
        tableKeysMap[selectedTable] = [...(tableKeysMap[selectedTable] || []), r.parent_key];
        tableKeysMap[r.child] = [...(tableKeysMap[r.child] || []), r.child_key];
      }
      if (r.child === selectedTable) {
        connectedTables.add(r.parent);
        tableKeysMap[selectedTable] = [...(tableKeysMap[selectedTable] || []), r.child_key];
        tableKeysMap[r.parent] = [...(tableKeysMap[r.parent] || []), r.parent_key];
      }
    });

    return { connectedTables, tableKeysMap };
  }, [relationships, selectedTable]);

  const handleAddRelationship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentTable || !childTable || !parentCol || !childCol) return;

    const newRel: Relationship = {
      parent: parentTable,
      parent_key: parentCol,
      child: childTable,
      child_key: childCol,
      kind: 'one_to_many',
      cardinality: {
        dist: 'poisson',
        params: { lam: Math.round((relMin + relMax) / 2) },
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

  const nodes = useMemo(() => {
    const spacing = 280;
    return dataset.tables.map((t, idx) => {
      const isSelected = t.name === selectedTable;
      const isConnected = connectedInfo.connectedTables.has(t.name);
      const isDimmed = selectedTable !== '' && !isConnected;
      const connectedKeyCols = connectedInfo.tableKeysMap[t.name] || [];

      return {
        id: t.name,
        type: 'tableNode',
        position: { x: 50 + (idx % 3) * spacing, y: 50 + Math.floor(idx / 3) * 220 },
        data: {
          label: t.name,
          isSelected,
          isDimmed,
          connectedKeyCols,
          columns: t.columns.map((c) => ({
            name: c.name,
            pk: c.pk,
            type: c.semantic_type,
          })),
        },
      };
    });
  }, [dataset.tables, selectedTable, connectedInfo]);

  const edges = useMemo(() => {
    return relationships.map((r, idx) => {
      const edgeId = `e-${r.parent}-${r.child}-${idx}`;
      const isConnectedToSelected = r.parent === selectedTable || r.child === selectedTable;
      const isHovered = hoveredEdgeId === edgeId;

      const strokeColor = isConnectedToSelected || isHovered ? 'var(--teal)' : 'var(--line)';
      const strokeWidth = isConnectedToSelected || isHovered ? 3 : 1.5;

      return {
        id: edgeId,
        source: r.parent,
        target: r.child,
        label: `${r.parent_key} -> ${r.child_key} (1:N)`,
        animated: isConnectedToSelected || isHovered,
        style: { stroke: strokeColor, strokeWidth },
        labelStyle: { fill: 'var(--ink)', fontWeight: 600, fontSize: 11, fontFamily: 'var(--font-mono)' },
        labelBgStyle: { fill: 'var(--card-bg)', fillOpacity: 0.95 },
      };
    });
  }, [relationships, selectedTable, hoveredEdgeId]);

  const activeTable = dataset.tables.find((t) => t.name === selectedTable) || dataset.tables[0];
  const activeRows = activeTable ? previewRows[activeTable.name] || [] : [];

  return (
    <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 84px)', overflow: 'hidden' }}>
      {/* Relational Sidebar Controls */}
      <aside className="config-sidebar" style={{ width: 330, overflowY: 'auto' }}>
        <section className="config-section">
          <div className="section-header">
            <h2 className="section-title">Relationships ({relationships.length})</h2>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                setShowAddRel(!showAddRel);
                if (dataset.tables.length >= 2) {
                  setParentTable(dataset.tables[0].name);
                  setChildTable(dataset.tables[1].name);
                  setParentCol(dataset.tables[0].columns[0]?.name || '');
                  setChildCol(dataset.tables[1].columns[0]?.name || '');
                }
              }}
            >
              {showAddRel ? 'Cancel' : '+ Link'}
            </button>
          </div>

          {showAddRel && (
            <form onSubmit={handleAddRelationship} className="add-table-form" style={{ marginBottom: 12 }}>
              <div className="form-field" style={{ marginBottom: 6 }}>
                <label className="field-label">Parent Table & Key</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <select
                    className="input-select"
                    value={parentTable}
                    onChange={(e) => {
                      setParentTable(e.target.value);
                      const t = dataset.tables.find((tbl) => tbl.name === e.target.value);
                      if (t) setParentCol(t.columns[0]?.name || '');
                    }}
                    style={{ flex: 1 }}
                  >
                    {dataset.tables.map((t) => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                  <select
                    className="input-select mono"
                    value={parentCol}
                    onChange={(e) => setParentCol(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {(dataset.tables.find((t) => t.name === parentTable)?.columns || []).map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field" style={{ marginBottom: 6 }}>
                <label className="field-label">Child Table & Foreign Key</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <select
                    className="input-select"
                    value={childTable}
                    onChange={(e) => {
                      setChildTable(e.target.value);
                      const t = dataset.tables.find((tbl) => tbl.name === e.target.value);
                      if (t) setChildCol(t.columns[0]?.name || '');
                    }}
                    style={{ flex: 1 }}
                  >
                    {dataset.tables.map((t) => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                  <select
                    className="input-select mono"
                    value={childCol}
                    onChange={(e) => setChildCol(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {(dataset.tables.find((t) => t.name === childTable)?.columns || []).map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: 8 }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label className="field-label">Min Children</label>
                  <input
                    type="number"
                    className="input-text mono"
                    value={relMin}
                    min={1}
                    max={50}
                    onChange={(e) => setRelMin(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label className="field-label">Max Children</label>
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
            {relationships.map((r, idx) => {
              const edgeId = `e-${r.parent}-${r.child}-${idx}`;
              const isSelectedRel = r.parent === selectedTable || r.child === selectedTable;
              return (
                <div
                  key={idx}
                  className={`column-card ${isSelectedRel ? 'expanded' : ''}`}
                  style={{ padding: 10, cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredEdgeId(edgeId)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                  onClick={() => setSelectedTable(r.parent)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      <span className="mono" style={{ color: 'var(--ink)' }}>{r.parent}</span>
                      <span style={{ margin: '0 4px', color: 'var(--teal)' }}>→</span>
                      <span className="mono" style={{ color: 'var(--ink)' }}>{r.child}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-delete-chip"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRelationship(idx);
                      }}
                      title="Remove link"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--slate)', marginTop: 4 }}>
                    {r.parent}.{r.parent_key} = {r.child}.{r.child_key}
                  </div>
                  <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--teal)', fontWeight: 600 }}>
                      1:N (Cardinality: {r.cardinality.min_val}..{r.cardinality.max_val})
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--slate)', textTransform: 'uppercase' }}>
                      {r.cardinality.dist}
                    </span>
                  </div>
                </div>
              );
            })}
            {relationships.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--slate)', padding: '10px 0' }}>
                No relationships defined. Click &quot;+ Link&quot; to define foreign keys.
              </div>
            )}
          </div>
        </section>

        {/* Cross-Table Invariants Section */}
        <section className="config-section">
          <div className="section-header">
            <h2 className="section-title">Relationships & Invariants</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="card" style={{ padding: 10, margin: 0, background: 'var(--sand-light)', border: '1px solid var(--line)', borderRadius: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--teal)' }}>Sum of Items Rule</div>
              <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>
                orders.total_amount = sum(order_items.line_total)
              </div>
            </div>
            <div className="card" style={{ padding: 10, margin: 0, background: 'var(--sand-light)', border: '1px solid var(--line)', borderRadius: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--teal)' }}>Temporal Sequence Rule</div>
              <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>
                orders.shipped_date &ge; orders.order_date
              </div>
            </div>
            <div className="card" style={{ padding: 10, margin: 0, background: 'var(--sand-light)', border: '1px solid var(--line)', borderRadius: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--teal)' }}>Running Balance Rule</div>
              <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>
                accounts.balance = balance(t-1) + credit - debit
              </div>
            </div>
          </div>
        </section>
      </aside>

      {/* Main Canvas: React Flow ER Diagram + Split Preview */}
      <main className="preview-canvas" style={{ padding: 0, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--paper)' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedTable(node.id)}
            fitView
          >
            <Background color="var(--line)" gap={16} />
            <Controls />
            <MiniMap
              nodeColor={() => 'var(--teal)'}
              style={{ background: 'var(--card-bg)', border: '1px solid var(--line)' }}
            />
          </ReactFlow>
        </div>

        {/* Lower Split Preview Grid for selected table */}
        {activeTable && (
          <div className="relational-preview-panel">
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
                    className={`tab-btn-pill ${t.name === selectedTable ? 'active' : ''}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 6 }}>
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
                      <td className="cell-index mono" style={{ padding: '4px 8px' }}>{idx + 1}</td>
                      {activeTable.columns.map((c) => (
                        <td key={c.name} className="cell-data mono" style={{ padding: '4px 8px' }}>
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
