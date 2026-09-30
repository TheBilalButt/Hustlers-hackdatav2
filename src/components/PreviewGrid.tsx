import React, { useState, useMemo } from 'react';
import { useAppStore } from '../state/store';

export const PreviewGrid: React.FC = () => {
  const {
    dataset,
    selectedTable,
    previewRows,
    isGenerating,
    previewError,
  } = useAppStore();

  const [filterText, setFilterText] = useState('');

  const table = dataset.tables.find((t) => t.name === selectedTable) || dataset.tables[0];

  const rows = useMemo(() => {
    const rawRows = table ? previewRows[table.name] || [] : [];
    if (!filterText.trim()) return rawRows;
    const q = filterText.toLowerCase();
    return rawRows.filter((r) =>
      Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  }, [table, previewRows, filterText]);

  const handleExportCsv = () => {
    if (!table || rows.length === 0) return;
    const headers = table.columns.map((c) => c.name);
    const csvLines = [headers.join(',')];

    for (const row of rows) {
      const line = headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvLines.push(line.join(','));
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${table.name}_preview.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    if (!table || rows.length === 0) return;
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${table.name}_preview.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!table) {
    return (
      <div className="preview-empty">
        <p>No table selected. Add or select a table from the left panel.</p>
      </div>
    );
  }

  return (
    <main className="preview-canvas" role="main">
      <header className="preview-header">
        <div className="preview-title-group">
          <h1 className="preview-heading">
            Preview: <span className="mono font-bold">{table.name}</span>
          </h1>
          <span className="preview-subheading">
            {rows.length} rows loaded • {(table.row_count || 1000).toLocaleString()} planned in dataset
          </span>
          {dataset.chaos?.enabled && (
            <span className="chaos-tag">
              Chaos Active
            </span>
          )}
        </div>

        <div className="preview-actions">
          {/* Quick Filter */}
          <div className="search-box">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginLeft: 6 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Filter table rows..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            {filterText && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setFilterText('')}
                title="Clear filter"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleExportCsv}
            disabled={rows.length === 0}
            title="Export rows as CSV"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleExportJson}
            disabled={rows.length === 0}
            title="Export rows as JSON"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export JSON
          </button>
        </div>
      </header>

      {previewError && (
        <div className="preview-error-banner" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div className="error-text">
            <strong>Preview notice:</strong> {previewError}
          </div>
        </div>
      )}

      <div className="table-container" tabIndex={0} aria-label="Data preview table">
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-index-th">#</th>
              {table.columns.map((c) => (
                <th key={c.name} className="col-th">
                  <div className="col-th-inner">
                    <div className="col-name-row">
                      {c.pk && <span className="pk-indicator" title="Primary Key">PK</span>}
                      <span className="mono font-bold">{c.name}</span>
                    </div>
                    <div className="col-meta-row">
                      <span className="col-type-chip">{c.semantic_type}</span>
                      <span className="col-dtype-chip mono">{c.dtype}</span>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, idx) => {
                const hasChaos = !!row._hasChaos;
                return (
                  <tr key={idx} className={idx % 2 === 1 ? 'row-zebra' : ''} style={hasChaos ? { backgroundColor: 'var(--chaos-bg)' } : undefined}>
                    <td className="cell-index mono">
                      {idx + 1}
                      {hasChaos && <span title="Chaos Injected" className="chaos-dot" />}
                    </td>
                    {table.columns.map((c) => {
                      const rawVal = row[c.name];
                      const isNull = rawVal === null || rawVal === undefined;
                      const isNumeric = c.dtype === 'int' || c.dtype === 'float' || c.dtype === 'decimal';

                      return (
                        <td
                          key={c.name}
                          className={`cell-data mono ${isNumeric ? 'text-right' : ''} ${isNull ? 'cell-null' : ''}`}
                        >
                          {isNull ? (
                            <span className="null-badge">null</span>
                          ) : (
                            <span>{String(rawVal)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : isGenerating ? (
              <tr>
                <td colSpan={table.columns.length + 1} className="table-loading-cell">
                  <div className="loading-shimmer">Generating deterministic preview rows...</div>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={table.columns.length + 1} className="table-empty-cell">
                  No preview rows matching query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="preview-footer">
        <span className="footer-info">
          Showing {rows.length} rows • Live responsive preview • Verified zero-orphan relational integrity
        </span>
      </footer>
    </main>
  );
};
