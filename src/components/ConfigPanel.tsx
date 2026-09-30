import React, { useState } from 'react';
import { useAppStore } from '../state/store';
import type { Column, DType, LocaleCode, PrivacyMode, SemanticType } from '../types/ir';

export const ConfigPanel: React.FC = () => {
  const {
    dataset,
    selectedTable,
    setSelectedTable,
    setTableRows,
    addTable,
    removeTable,
    addColumn,
    updateColumn,
    removeColumn,
    setLocale,
    toggleChaos,
    getEstimates,
  } = useAppStore();

  const [expandedCol, setExpandedCol] = useState<string | null>(null);
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<SemanticType>('text_short');

  const table = dataset.tables.find((t) => t.name === selectedTable) || dataset.tables[0];
  const estimates = getEstimates();

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    const name = newTableName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    addTable({
      name,
      row_count: 500,
      columns: [
        {
          name: `${name}_id`,
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 1, step: 1 },
          pk: true,
        },
      ],
    });
    setNewTableName('');
    setShowAddTable(false);
  };

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!table || !newColName.trim()) return;
    const colName = newColName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    let dtype: DType = 'str';
    if (newColType === 'id' || newColType === 'quantity' || newColType === 'integer') dtype = 'int';
    else if (newColType === 'money' || newColType === 'float' || newColType === 'percent') dtype = 'decimal';
    else if (newColType === 'date' || newColType === 'datetime') dtype = 'date';
    else if (newColType === 'boolean') dtype = 'bool';

    const col: Column = {
      name: colName,
      semantic_type: newColType,
      dtype,
      generator: { kind: 'faker', provider: newColType },
      nullable: false,
      null_rate: 0,
      outlier_rate: 0,
    };

    addColumn(table.name, col);
    setNewColName('');
    setShowAddCol(false);
    setExpandedCol(colName);
  };

  return (
    <aside className="config-sidebar" aria-label="Schema Configuration">
      {/* Primary Action Button */}
      <div style={{ padding: '12px 14px 4px 14px' }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', padding: '8px 12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onClick={() => useAppStore.getState().rollNewSeed()}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>Generate Synthetic World</span>
        </button>
      </div>
      {/* Tables Selection Section */}
      <section className="config-section">
        <div className="section-header">
          <h2 className="section-title">Tables ({dataset.tables.length})</h2>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => setShowAddTable(!showAddTable)}
          >
            {showAddTable ? 'Cancel' : '+ Add Table'}
          </button>
        </div>

        {showAddTable && (
          <form onSubmit={handleAddTable} className="add-table-form">
            <input
              type="text"
              placeholder="Table name (e.g. shipments)"
              className="input-text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button type="submit" className="btn btn-sm btn-primary">Create</button>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowAddTable(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="table-list">
          {dataset.tables.map((t) => {
            const isSelected = t.name === table?.name;
            return (
              <div
                key={t.name}
                className={`table-item ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedTable(t.name)}
                role="button"
                tabIndex={0}
              >
                <div className="table-item-name">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: isSelected ? 1 : 0.6 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                  <span className="mono">{t.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="table-item-rows mono">{t.row_count || 1000}</span>
                  {dataset.tables.length > 1 && (
                    <button
                      type="button"
                      className="btn-delete-chip"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTable(t.name);
                      }}
                      title="Delete table"
                      aria-label={`Delete table ${t.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Selected Table Row Count Controls */}
      {table && (
        <section className="config-section">
          <div className="section-header">
            <h2 className="section-title">Row Count: <span className="mono">{table.name}</span></h2>
            <span className="mono font-bold" style={{ fontSize: 12 }}>
              {(table.row_count || 1000).toLocaleString()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <input
              type="range"
              min={10}
              max={10000}
              step={50}
              value={table.row_count || 1000}
              onChange={(e) => setTableRows(table.name, parseInt(e.target.value, 10))}
              className="range-slider"
            />
            <div className="preset-chips">
              {[100, 500, 1000, 5000].map((num) => (
                <button
                  key={num}
                  type="button"
                  className="chip-sm"
                  onClick={() => setTableRows(table.name, num)}
                >
                  {num >= 1000 ? `${num / 1000}k` : num}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Columns List & Schema Config */}
      {table && (
        <section className="config-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="section-header">
            <h2 className="section-title">Columns ({table.columns.length})</h2>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setShowAddCol(!showAddCol)}
            >
              {showAddCol ? 'Cancel' : '+ Add Column'}
            </button>
          </div>

          {showAddCol && (
            <form onSubmit={handleAddColumn} className="add-table-form" style={{ marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Column name (e.g. status)"
                className="input-text"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                autoFocus
                style={{ marginBottom: 6 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  className="input-select"
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value as SemanticType)}
                  style={{ flex: 1 }}
                >
                  <option value="text_short">Short Text</option>
                  <option value="person_name">Person Name</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="city">City</option>
                  <option value="money">Money / Price</option>
                  <option value="date">Date</option>
                  <option value="category">Category</option>
                  <option value="company">Company</option>
                  <option value="integer">Integer</option>
                  <option value="boolean">Boolean</option>
                </select>
                <button type="submit" className="btn btn-sm btn-primary">Add</button>
              </div>
            </form>
          )}

          <div className="column-list-scroll">
            {table.columns.map((col) => {
              const isExpanded = expandedCol === col.name;
              return (
                <div key={col.name} className={`column-card ${isExpanded ? 'expanded' : ''}`}>
                  <div
                    className="column-card-header"
                    onClick={() => setExpandedCol(isExpanded ? null : col.name)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {col.pk && <span className="pk-badge">PK</span>}
                      <span className="mono font-bold" style={{ fontSize: 12 }}>{col.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="type-tag">{col.semantic_type}</span>
                      <span className="caret-icon">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="column-edit-body">
                      <div className="form-row">
                        <div className="form-field" style={{ flex: 1 }}>
                          <label className="field-label">Semantic Type</label>
                          <select
                            className="input-select"
                            value={col.semantic_type}
                            onChange={(e) =>
                              updateColumn(table.name, col.name, {
                                semantic_type: e.target.value as SemanticType,
                              })
                            }
                          >
                            <option value="id">ID / Identifier</option>
                            <option value="person_name">Person Name</option>
                            <option value="first_name">First Name</option>
                            <option value="last_name">Last Name</option>
                            <option value="email">Email Address</option>
                            <option value="phone">Phone Number</option>
                            <option value="city">City</option>
                            <option value="country">Country</option>
                            <option value="company">Company</option>
                            <option value="job_title">Job Title</option>
                            <option value="money">Money Amount</option>
                            <option value="date">Date</option>
                            <option value="category">Category / Status</option>
                            <option value="product_name">Product Name</option>
                            <option value="quantity">Quantity</option>
                            <option value="integer">Integer</option>
                            <option value="float">Float</option>
                            <option value="boolean">Boolean</option>
                          </select>
                        </div>
                      </div>

                      {/* Null rate slider */}
                      <div className="form-field">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <label className="field-label">Null Rate</label>
                          <span className="mono" style={{ fontSize: 11 }}>
                            {Math.round((col.null_rate || 0) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={0.5}
                          step={0.01}
                          value={col.null_rate || 0}
                          onChange={(e) => {
                            const rate = parseFloat(e.target.value);
                            updateColumn(table.name, col.name, {
                              null_rate: rate,
                              nullable: rate > 0,
                            });
                          }}
                          className="range-slider"
                        />
                      </div>

                      {/* Outlier rate slider */}
                      <div className="form-field">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <label className="field-label">Outlier Injection Rate</label>
                          <span className="mono" style={{ fontSize: 11 }}>
                            {((col.outlier_rate || 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={0.1}
                          step={0.005}
                          value={col.outlier_rate || 0}
                          onChange={(e) =>
                            updateColumn(table.name, col.name, {
                              outlier_rate: parseFloat(e.target.value),
                            })
                          }
                          className="range-slider"
                        />
                      </div>

                      {/* Privacy Rule */}
                      <div className="form-field">
                        <label className="field-label">Privacy Rule</label>
                        <select
                          className="input-select"
                          value={
                            dataset.privacy?.find(
                              (p) => p.table === table.name && p.column === col.name
                            )?.control || 'none'
                          }
                          onChange={(e) => {
                            const control = e.target.value as PrivacyMode;
                            const existing = dataset.privacy || [];
                            const filtered = existing.filter(
                              (p) => !(p.table === table.name && p.column === col.name)
                            );
                            if (control !== 'none') {
                              filtered.push({
                                table: table.name,
                                column: col.name,
                                control: control as 'mask' | 'hmac_hash' | 'drop' | 'generalize' | 'dp_marginals',
                              });
                            }
                            useAppStore.getState().updateDataset((prev) => ({
                              ...prev,
                              privacy: filtered,
                            }));
                          }}
                        >
                          <option value="none">None (Direct synthesis)</option>
                          <option value="mask">Mask (Anonymize text)</option>
                          <option value="hmac_hash">Deterministic Hash (Pseudonyms)</option>
                          <option value="drop">Omit Column</option>
                          <option value="generalize">Generalize Ranges</option>
                          <option value="dp_marginals">Differential Privacy Noise</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={!!col.pk}
                            onChange={(e) =>
                              updateColumn(table.name, col.name, { pk: e.target.checked })
                            }
                          />
                          Primary Key
                        </label>
                        <button
                          type="button"
                          className="btn-delete-text"
                          onClick={() => removeColumn(table.name, col.name)}
                        >
                          Delete column
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Global Settings & Size Estimates */}
      <section className="config-section meta-section">
        <div className="form-row">
          <div className="form-field" style={{ flex: 1 }}>
            <label htmlFor="locale-select" className="field-label">Currency & Locale</label>
            <select
              id="locale-select"
              className="input-select"
              value={dataset.locale}
              onChange={(e) => setLocale(e.target.value as LocaleCode)}
            >
              <option value="en_US">en_US (US Dollar, USD - $)</option>
              <option value="en_PK">en_PK (Pakistani Rupee, PKR - ₨)</option>
            </select>
          </div>

          <div className="form-field" style={{ width: 110 }}>
            <label className="field-label">Chaos Test</label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={!!dataset.chaos?.enabled}
                onChange={(e) => toggleChaos(e.target.checked)}
              />
              <span className="slider round" />
              <span style={{ fontSize: 11, marginLeft: 6 }}>
                {dataset.chaos?.enabled ? 'Active' : 'Off'}
              </span>
            </label>
          </div>
        </div>

        {/* Size Estimate Card */}
        <div className="estimates-card">
          <div className="estimates-title">Planned Output Summary</div>
          <div className="estimates-grid">
            <div className="estimate-col">
              <div className="estimate-val mono">{estimates.totalRows.toLocaleString()}</div>
              <div className="estimate-lbl">Total Rows</div>
            </div>
            <div className="estimate-col">
              <div className="estimate-val mono">~{estimates.estCsvKb} KB</div>
              <div className="estimate-lbl">CSV Export</div>
            </div>
            <div className="estimate-col">
              <div className="estimate-val mono">~{estimates.estSqlKb} KB</div>
              <div className="estimate-lbl">SQL Inserts</div>
            </div>
            <div className="estimate-col">
              <div className="estimate-val mono">&lt; {estimates.estGenSeconds}s</div>
              <div className="estimate-lbl">Engine Time</div>
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
};
