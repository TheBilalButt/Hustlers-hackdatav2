import React, { useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppStore } from '../state/store';
import type { Cardinality, Invariant, Relationship } from '../types/ir';

// Custom Table Node for ER Diagram (DESIGN §2, §4.3)
interface TableNodeData {
  name: string;
  rowCount: number;
  columns: Array<{ name: string; type: string; pk?: boolean }>;
  isSelected: boolean;
}

const TableNodeComponent: React.FC<NodeProps<TableNodeData>> = ({ data }) => {
  return (
    <div
      className={`er-table-node ${data.isSelected ? 'selected' : ''}`}
      style={{
        background: '#fff',
        border: data.isSelected ? '2px solid var(--teal)' : '1px solid var(--line)',
        borderRadius: 8,
        minWidth: 220,
        boxShadow: data.isSelected
          ? '0 4px 12px rgba(22, 122, 109, 0.25)'
          : '0 2px 6px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
        fontSize: 12,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'var(--teal)' }} />
      <Handle type="target" position={Position.Left} style={{ background: 'var(--teal)' }} />

      <div
        className="er-node-header"
        style={{
          background: 'var(--ink)',
          color: '#fff',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
          <span>▦</span>
          <span className="mono">{data.name}</span>
        </div>
        <span
          className="mono"
          style={{ fontSize: 10, background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: 4 }}
        >
          {data.rowCount.toLocaleString()}
        </span>
      </div>

      <div className="er-node-columns" style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.columns.map((c) => (
          <div
            key={c.name}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2px 4px',
              borderRadius: 3,
              background: c.pk ? 'var(--sand-light)' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {c.pk && (
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    background: 'var(--ink)',
                    color: '#fff',
                    padding: '1px 3px',
                    borderRadius: 2,
                  }}
                >
                  PK
                </span>
              )}
              <span className="mono" style={{ fontWeight: c.pk ? 600 : 400 }}>
                {c.name}
              </span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--slate)' }}>{c.type}</span>
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--teal)' }} />
      <Handle type="source" position={Position.Right} style={{ background: 'var(--teal)' }} />
    </div>
  );
};

const nodeTypes = { tableNode: TableNodeComponent };

export const RelationalView: React.FC = () => {
  const { dataset, updateDataset, previewRows } = useAppStore();
  const [selectedTable, setSelectedTable] = useState<string>(dataset.tables[0]?.name || '');
  const [showAddRel, setShowAddRel] = useState(false);

  // Form states for adding a relationship
  const [relParent, setRelParent] = useState(dataset.tables[0]?.name || '');
  const [relChild, setRelChild] = useState(dataset.tables[1]?.name || dataset.tables[0]?.name || '');
  const [relParentKey, setRelParentKey] = useState('');
  const [relChildKey, setRelChildKey] = useState('');
  const [relDist, setRelDist] = useState<Cardinality['dist']>('poisson');
  const [relMin, setRelMin] = useState(1);
  const [relMax, setRelMax] = useState(5);

  const relationships = useMemo(() => dataset.relationships || [], [dataset.relationships]);
  const invariants = dataset.invariants || [];

  // Compute graph nodes
  const nodes: Node<TableNodeData>[] = useMemo(() => {
    return dataset.tables.map((table, idx) => {
      // Auto-layout coordinates
      const colIdx = idx % 2;
      const rowIdx = Math.floor(idx / 2);
      const x = colIdx * 320 + 40;
      const y = rowIdx * 300 + 40;

      return {
        id: table.name,
        type: 'tableNode',
        position: { x, y },
        data: {
          name: table.name,
          rowCount: table.row_count || 1000,
          columns: table.columns.map((c) => ({
            name: c.name,
            type: c.semantic_type,
            pk: c.pk,
          })),
          isSelected: table.name === selectedTable,
        },
      };
    });
  }, [dataset.tables, selectedTable]);

  // Compute graph edges
  const edges: Edge[] = useMemo(() => {
    return relationships.map((rel, idx) => {
      const distInfo =
        rel.kind === 'one_to_one'
          ? '1:1'
          : `${rel.cardinality.min_val ?? 0}..${rel.cardinality.max_val ?? 10} (${rel.cardinality.dist})`;

      return {
        id: `e-${rel.parent}-${rel.child}-${idx}`,
        source: rel.parent,
        target: rel.child,
        animated: true,
        label: `${rel.parent}.${rel.parent_key} → ${rel.child}.${rel.child_key} [${distInfo}]`,
        style: { stroke: 'var(--teal)', strokeWidth: 2 },
        labelStyle: { fill: 'var(--ink)', fontWeight: 600, fontSize: 11, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#fff', fillOpacity: 0.9, rx: 4, ry: 4 },
      };
    });
  }, [relationships]);

  const handleAddRelationship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relParent || !relChild || !relParentKey || !relChildKey) {
      alert('Please fill all relationship keys.');
      return;
    }

    const newRel: Relationship = {
      parent: relParent,
      parent_key: relParentKey,
      child: relChild,
      child_key: relChildKey,
      kind: 'one_to_many',
      cardinality: {
        dist: relDist,
        params: relDist === 'poisson' ? { lam: 3 } : {},
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

  const activeTable = dataset.tables.find((t) => t.name === selectedTable);
  const activeRows = activeTable ? previewRows[activeTable.name] || [] : [];

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Left Panel: Relationships & Invariants (360px) */}
      <aside className="config-panel" style={{ width: 380, minWidth: 380, maxWidth: 380 }}>
        {/* Relationships Section */}
        <section className="config-section">
          <div className="section-header">
            <h2 className="section-title">Relationships ({relationships.length})</h2>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddRel(!showAddRel)}
            >
              {showAddRel ? '✕' : '+ Link'}
            </button>
          </div>

          {showAddRel && (
            <form onSubmit={handleAddRelationship} className="add-table-form" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Parent Table</label>
                  <select
                    className="input-select"
                    value={relParent}
                    onChange={(e) => {
                      setRelParent(e.target.value);
                      const t = dataset.tables.find((tbl) => tbl.name === e.target.value);
                      setRelParentKey(t?.columns.find((c) => c.pk)?.name || t?.columns[0]?.name || '');
                    }}
                  >
                    {dataset.tables.map((t) => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Child Table</label>
                  <select
                    className="input-select"
                    value={relChild}
                    onChange={(e) => {
                      setRelChild(e.target.value);
                      const t = dataset.tables.find((tbl) => tbl.name === e.target.value);
                      setRelChildKey(t?.columns.find((c) => c.name.includes('id'))?.name || t?.columns[0]?.name || '');
                    }}
                  >
                    {dataset.tables.map((t) => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Parent Key</label>
                  <input
                    type="text"
                    className="input-text mono"
                    placeholder="id"
                    value={relParentKey}
                    onChange={(e) => setRelParentKey(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Child FK</label>
                  <input
                    type="text"
                    className="input-text mono"
                    placeholder="parent_id"
                    value={relChildKey}
                    onChange={(e) => setRelChildKey(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Distribution</label>
                  <select
                    className="input-select"
                    value={relDist}
                    onChange={(e) => setRelDist(e.target.value as Cardinality['dist'])}
                  >
                    <option value="poisson">Poisson (Natural)</option>
                    <option value="uniform">Uniform</option>
                    <option value="fixed">Fixed</option>
                    <option value="negbin">Negative Binomial</option>
                  </select>
                </div>
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

              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
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
                    ×
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

        {/* Invariants Section (FR-04) */}
        <section className="config-section">
          <div className="section-header">
            <h2 className="section-title">Cross-Table Invariants (FR-04)</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {invariants.map((inv: Invariant, idx: number) => (
              <div key={idx} className="card" style={{ padding: 8, margin: 0, background: 'var(--sand-light)', border: '1px solid var(--line)' }}>
                {inv.kind === 'sum_children' && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--teal)' }}>Σ Sum Children</div>
                    <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>
                      {inv.parent_table}.{inv.parent_column} = Σ({inv.operation})
                    </div>
                  </div>
                )}
                {inv.kind === 'temporal_order' && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--teal)' }}>⏳ Temporal Order</div>
                    <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>
                      {inv.child_table}.{inv.child_column} ≥ {inv.parent_table}.{inv.parent_column}
                    </div>
                  </div>
                )}
                {inv.kind === 'running_balance' && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--teal)' }}>⚖ Running Balance</div>
                    <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>
                      {inv.table}.{inv.balance_column} reconciles debits &amp; credits
                    </div>
                  </div>
                )}
              </div>
            ))}
            {invariants.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--slate)' }}>
                Cross-table invariants automatically verified during generation (0 orphan guarantee).
              </div>
            )}
          </div>
        </section>
      </aside>

      {/* Main Canvas: React Flow ER Diagram + Bottom Split Preview */}
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
              <span className="mono" style={{ fontSize: 10, color: 'var(--slate)' }}>
                Click nodes above to inspect related tables
              </span>
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