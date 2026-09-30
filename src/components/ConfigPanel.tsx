import React, { useState } from 'react';
import { useAppStore } from '../state/store';
import type { Column, DType, LocaleCode, PrivacyMode, SemanticType } from '../types/ir';
import { validateIdentifier } from '../schemas/dataset';

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

  const [newTableName, setNewTableName] = useState('');
  const [showAddTable, setShowAddTable] = useState(false);
  const [editingColName, setEditingColName] = useState<string | null>(null);

  const table = dataset.tables.find((t) => t.name === selectedTable) || dataset.tables[0];
  const estimates = getEstimates();

  const handleCreateNewTable = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTableName.trim().toLowerCase();
    if (!validateIdentifier(clean)) {
      alert('Invalid table name. Use alphanumeric characters and underscores, starting with a letter.');
      return;
    }
    if (dataset.tables.some((t) => t.name === clean)) {
      alert('A table with this name already exists.');
      return;
    }

    addTable({
      name: clean,
      row_count: 500,
      columns: [
        {
          name: `${clean}_id`,
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

  const handleCreateNewColumn = () => {
    if (!table) return;
    let colIndex = table.columns.length + 1;
    let colName = `col_${colIndex}`;
    while (table.columns.some((c) => c.name === colName)) {
      colIndex++;
      colName = `col_${colIndex}`;
    }

    const newCol: Column = {
      name: colName,
      semantic_type: 'text_short',
      dtype: 'str',
      generator: { kind: 'faker', provider: 'text_short' },
      nullable: false,
      null_rate: 0,
      outlier_rate: 0,
      pk: false,
    };

    addColumn(table.name, newCol);
    setEditingColName(colName);
  };

  return (
    <aside className="config-panel" aria-label="Dataset Configuration Panel">
      {/* Tables Section */}
      <section className="config-section">
        <div className="section-header">
          <h2 className="section-title">Tables</h2>
          <button
            type="button"
            className="btn-icon-subtle"
            onClick={() => setShowAddTable(!showAddTable)}
            title="Add a new table"
          >
            {showAddTable ? '✕' : '+ Table'}
          </button>
        </div>

        {showAddTable && (
          <form onSubmit={handleCreateNewTable} className="add-table-form">
            <input
              type="text"
              className="input-text"
              placeholder="table_name"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button type="submit" className="btn btn-primary btn-sm">Add</button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowAddTable(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="table-pill-list">
          {dataset.tables.map((t) => {
            const isSelected = t.name === selectedTable;
            return (
              <div
                key={t.name}
                className={`table-item ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedTable(t.name);
                  setEditingColName(null);
                }}
              >
                <div className="table-item-name">
                  <span className="table-icon">▦</span>
                  <span className="mono font-bold">{t.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="table-item-rows mono">
                    {(t.row_count || 1000).toLocaleString()} rows
                  </span>
                  {dataset.tables.length > 1 && (
                    <button
                      type="button"
                      className="btn-delete-chip"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove table ${t.name}?`)) {
                          removeTable(t.name);
                        }
                      }}
                      title="Delete table"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Row Count Controller */}
      {table && (
        <section className="config-section">
          <div className="section-header">
            <label htmlFor="row-count-input" className="section-title">Planned Rows</label>
            <span className="mono font-bold" style={{ fontSize: 13, color: 'var(--teal)' }}>
              {(table.row_count || 1000).toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id="row-count-input"
              type="range"
              min={50}
              max={10000}
              step={50}
              value={table.row_count || 1000}
              onChange={(e) => setTableRows(table.name, parseInt(e.target.value, 10))}
              className="range-slider"
            />
            <input
              type="number"
              className="input-number-compact mono"
              min={1}
              max={50000}
              value={table.row_count || 1000}
              onChange={(e) => setTableRows(table.name, parseInt(e.target.value, 10) || 100)}
            />
          </div>
          <div className="preset-chips">
            {[500, 1000, 2500, 5000, 10000].map((count) => (
              <button
                key={count}
                type="button"
                className="chip-sm"
                onClick={() => setTableRows(table.name, count)}
              >
                {count >= 1000 ? `${count / 1000}k` : count}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Columns Section */}
      {table && (
        <section className="config-section" style={{ flex: 1 }}>
          <div className="section-header">
            <h2 className="section-title">Columns ({table.columns.length})</h2>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleCreateNewColumn}
            >
              + Column
            </button>
          </div>

          <div className="column-list-scroll">
            {table.columns.map((col) => {
              const isEditing = editingColName === col.name;
              return (
                <div
                  key={col.name}
                  className={`column-card ${isEditing ? 'expanded' : ''}`}
                >
                  <div
                    className="column-card-header"
                    onClick={() => setEditingColName(isEditing ? null : col.name)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {col.pk && <span className="pk-badge" title="Primary Key">PK</span>}
                      <span className="mono font-bold" style={{ fontSize: 13 }}>{col.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="type-tag">{col.semantic_type}</span>
                      <span className="caret-icon">{isEditing ? '▾' : '▸'}</span>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="column-edit-body">
                      <div className="form-field">
                        <label className="field-label">Name</label>
                        <input
                          type="text"
                          className="input-text mono"
                          value={col.name}
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                            updateColumn(table.name, col.name, { name: val });
                            setEditingColName(val);
                          }}
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-field" style={{ flex: 1 }}>
                          <label className="field-label">Semantic Type</label>
                          <select
                            className="input-select"
                            value={col.semantic_type}
                            onChange={(e) => {
                              const sem = e.target.value as SemanticType;
                              let gen = col.generator;
                              let dt: DType = col.dtype;

                              if (sem === 'id') {
                                gen = { kind: 'sequence', start: 1, step: 1 };
                                dt = 'int';
                              } else if (sem === 'money') {
                                gen = { kind: 'numeric', dist: 'uniform', min_val: 10, max_val: 500 };
                                dt = 'decimal';
                              } else if (sem === 'date' || sem === 'datetime') {
                                gen = { kind: 'date_range', start: '2026-01-01', end: '2026-09-29' };
                                dt = sem === 'date' ? 'date' : 'datetime';
                              } else if (sem === 'boolean') {
                                gen = { kind: 'categorical', values: ['true', 'false'] };
                                dt = 'bool';
                              } else {
                                gen = { kind: 'faker', provider: sem };
                                dt = 'str';
                              }

                              updateColumn(table.name, col.name, {
                                semantic_type: sem,
                                generator: gen,
                                dtype: dt,
                              });
                            }}
                          >
                            <optgroup label="Identifiers">
                              <option value="id">id</option>
                              <option value="sku">sku</option>
                            </optgroup>
                            <optgroup label="Personal">
                              <option value="person_name">person_name</option>
                              <option value="first_name">first_name</option>
                              <option value="last_name">last_name</option>
                              <option value="email">email</option>
                              <option value="phone">phone</option>
                              <option value="job_title">job_title</option>
                            </optgroup>
                            <optgroup label="Organization / Geo">
                              <option value="company">company</option>
                              <option value="street_address">street_address</option>
                              <option value="city">city</option>
                              <option value="country">country</option>
                              <option value="postal_code">postal_code</option>
                            </optgroup>
                            <optgroup label="Financial & Numeric">
                              <option value="money">money</option>
                              <option value="quantity">quantity</option>
                              <option value="integer">integer</option>
                              <option value="float">float</option>
                              <option value="percent">percent</option>
                            </optgroup>
                            <optgroup label="Dates & Categorical">
                              <option value="date">date</option>
                              <option value="datetime">datetime</option>
                              <option value="category">category</option>
                              <option value="boolean">boolean</option>
                              <option value="product_name">product_name</option>
                              <option value="text_short">text_short</option>
                            </optgroup>
                          </select>
                        </div>

                        <div className="form-field" style={{ width: 90 }}>
                          <label className="field-label">Data Type</label>
                          <select
                            className="input-select mono"
                            value={col.dtype}
                            onChange={(e) =>
                              updateColumn(table.name, col.name, {
                                dtype: e.target.value as DType,
                              })
                            }
                          >
                            <option value="int">int</option>
                            <option value="decimal">decimal</option>
                            <option value="float">float</option>
                            <option value="str">str</option>
                            <option value="bool">bool</option>
                            <option value="date">date</option>
                            <option value="datetime">datetime</option>
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

                      {/* Privacy Mode */}
                      <div className="form-field">
                        <label className="field-label">Privacy Control (FR-02)</label>
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
                          <option value="mask">Mask (*** anonymization)</option>
                          <option value="hmac_hash">HMAC Hash (Deterministic pseudonyms)</option>
                          <option value="drop">Drop (Omit from output)</option>
                          <option value="generalize">Generalize (Bucket ranges)</option>
                          <option value="dp_marginals">εε-DP Marginals (Laplace noise)</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
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
            <label htmlFor="locale-select" className="field-label">Locale Pack</label>
            <select
              id="locale-select"
              className="input-select"
              value={dataset.locale}
              onChange={(e) => setLocale(e.target.value as LocaleCode)}
            >
              <option value="en_US">en_US (US Dollar, RFC 2606)</option>
              <option value="en_IN">en_IN (Indian Rupee, GST)</option>
              <option value="de_DE">de_DE (Euro, DIN 5008)</option>
            </select>
          </div>

          <div className="form-field" style={{ width: 110 }}>
            <label className="field-label">Chaos Injection</label>
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

        {/* Size Estimate Card (FR-18) */}
        <div className="estimates-card">
          <div className="estimates-title">Estimated Generation Output</div>
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
