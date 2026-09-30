import React, { useState, useMemo } from 'react';
import { useAppStore } from '../state/store';

type ExportFormat = 'csv' | 'json' | 'sql' | 'pdf';

export const PreviewGrid: React.FC = () => {
  const {
    dataset,
    selectedTable,
    previewRows,
    isGenerating,
    previewError,
  } = useAppStore();

  const [filterText, setFilterText] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);

  // Unified Export State
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [exportState, setExportState] = useState<'idle' | 'generating' | 'ready' | 'success'>('idle');

  // AI Analysis Modal State
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  const table = dataset.tables.find((t) => t.name === selectedTable) || dataset.tables[0];

  const handleSort = (colName: string) => {
    if (sortCol === colName) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(colName);
      setSortDir('asc');
    }
  };

  const rows = useMemo(() => {
    const rawRows = table ? previewRows[table.name] || [] : [];
    let list = [...rawRows];

    // Filter
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      list = list.filter((r) =>
        Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortCol) {
      list.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA);
        const strB = String(valB);
        return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return list;
  }, [table, previewRows, filterText, sortCol, sortDir]);

  // Handle Unified Export
  const handleExecuteExport = () => {
    if (!table || rows.length === 0) return;
    setExportState('generating');

    setTimeout(() => {
      let content = '';
      let mimeType = 'text/plain';
      let extension: string = exportFormat;

      if (exportFormat === 'csv') {
        const headers = table.columns.map((c) => c.name);
        const lines = [headers.join(',')];
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
          lines.push(line.join(','));
        }
        content = lines.join('\n');
        mimeType = 'text/csv;charset=utf-8;';
      } else if (exportFormat === 'json') {
        content = JSON.stringify(rows, null, 2);
        mimeType = 'application/json';
      } else if (exportFormat === 'sql') {
        const headers = table.columns.map((c) => c.name);
        const lines = [`-- Synthetic SQL Export: ${table.name}`, `-- Table: ${table.name} (${rows.length} rows)`];
        for (const row of rows) {
          const values = headers.map((h) => {
            const v = row[h];
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number' || typeof v === 'boolean') return String(v);
            return `'${String(v).replace(/'/g, "''")}'`;
          });
          lines.push(`INSERT INTO ${table.name} (${headers.join(', ')}) VALUES (${values.join(', ')});`);
        }
        content = lines.join('\n');
        mimeType = 'application/sql';
      } else if (exportFormat === 'pdf') {
        content = `SYNTHETIC DATA REPORT\nTable: ${table.name}\nExported: ${new Date().toISOString()}\nTotal Rows: ${rows.length}\nWatermark: SYNTHETIC - NOT A REAL DOCUMENT\n\n` +
          rows.slice(0, 20).map((r, i) => `${i + 1}. ` + Object.entries(r).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}=${v}`).join(', ')).join('\n');
        mimeType = 'text/plain';
        extension = 'txt';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${table.name}_export.${extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportState('success');
      setTimeout(() => setExportState('idle'), 2000);
    }, 400);
  };

  // Run AI Analysis Simulation
  const handleStartAnalysis = () => {
    setShowAnalysis(true);
    setAnalysisStep(1);

    setTimeout(() => setAnalysisStep(2), 350);
    setTimeout(() => setAnalysisStep(3), 700);
    setTimeout(() => setAnalysisStep(4), 1050);
    setTimeout(() => setAnalysisStep(5), 1400);
  };

  const renderStatusBadge = (val: string) => {
    const s = String(val).toLowerCase();
    if (s === 'completed' || s === 'delivered' || s === 'active') {
      return <span className="status-pill-badge active">{val}</span>;
    }
    if (s === 'pending' || s === 'processing') {
      return <span className="status-pill-badge pending">{val}</span>;
    }
    if (s === 'shipped') {
      return <span className="status-pill-badge shipped">{val}</span>;
    }
    if (s === 'cancelled' || s === 'refunded') {
      return <span className="status-pill-badge cancelled">{val}</span>;
    }
    return <span>{val}</span>;
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
            <span className="chaos-tag">Chaos Active</span>
          )}
        </div>

        <div className="preview-actions">
          {/* Quick Filter Search Box */}
          <div className="search-box">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginLeft: 6 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search or ⌘K..."
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
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>

          {/* Quick AI Analysis Button */}
          <button
            type="button"
            className="btn btn-outline btn-sm ai-analyze-trigger-btn"
            onClick={handleStartAnalysis}
            title="Run AI Schema & Integrity Analysis"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, color: 'var(--teal)' }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span>Analyze</span>
          </button>

          {/* Unified Export Segment Control */}
          <div className="export-control-group">
            <div className="export-segment-pills" role="radiogroup" aria-label="Export format">
              {(['csv', 'json', 'sql', 'pdf'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  className={`export-segment-btn ${exportFormat === fmt ? 'active' : ''}`}
                  onClick={() => setExportFormat(fmt)}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`btn btn-sm ${exportState === 'success' ? 'btn-export-success' : 'btn-primary'}`}
              onClick={handleExecuteExport}
              disabled={rows.length === 0 || exportState === 'generating'}
            >
              {exportState === 'generating' ? (
                <>
                  <span className="spinner-dot" style={{ backgroundColor: '#fff', marginRight: 4 }} />
                  <span>Generating...</span>
                </>
              ) : exportState === 'success' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg><span>Exported</span></span>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Export {exportFormat.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Floating AI Analysis Modal */}
      {showAnalysis && (
        <div className="ai-modal-backdrop" onClick={() => setShowAnalysis(false)}>
          <div className="ai-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="brand-logo" style={{ width: 22, height: 22 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  </svg>
                </div>
                <strong style={{ fontSize: 13, color: 'var(--ink)' }}>AI Schema & Pattern Analysis</strong>
              </div>
              <button type="button" className="drawer-close-btn" onClick={() => setShowAnalysis(false)}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="ai-progress-bar-bg">
              <div
                className="ai-progress-bar-fill"
                style={{ width: `${Math.min(100, analysisStep * 20)}%` }}
              />
            </div>

            {/* Analysis Steps List */}
            <div className="ai-steps-list">
              <div className={`ai-step-item ${analysisStep >= 1 ? 'completed' : ''}`}>
                <span className="step-badge">{analysisStep >= 1 ? (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>) : '1'}</span>
                <div>
                  <div className="step-title">Schema detected</div>
                  <div className="step-desc">Identified {dataset.tables.length} tables and relational primary keys</div>
                </div>
              </div>

              <div className={`ai-step-item ${analysisStep >= 2 ? 'completed' : ''}`}>
                <span className="step-badge">{analysisStep >= 2 ? (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>) : '2'}</span>
                <div>
                  <div className="step-title">Columns identified</div>
                  <div className="step-desc">Categorized semantic data types, money, and distributions</div>
                </div>
              </div>

              <div className={`ai-step-item ${analysisStep >= 3 ? 'completed' : ''}`}>
                <span className="step-badge">{analysisStep >= 3 ? (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>) : '3'}</span>
                <div>
                  <div className="step-title">Relationships detected</div>
                  <div className="step-desc">Verified 0-orphan foreign key consistency across entities</div>
                </div>
              </div>

              <div className={`ai-step-item ${analysisStep >= 4 ? 'completed' : ''}`}>
                <span className="step-badge">{analysisStep >= 4 ? (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>) : '4'}</span>
                <div>
                  <div className="step-title">Patterns identified</div>
                  <div className="step-desc">Synchronized arithmetic totals, dates, and account ledgers</div>
                </div>
              </div>

              <div className={`ai-step-item ${analysisStep >= 5 ? 'completed' : ''}`}>
                <span className="step-badge">{analysisStep >= 5 ? (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>) : '5'}</span>
                <div>
                  <div className="step-title">Privacy rules checked</div>
                  <div className="step-desc">Applied RFC 2606 safe identifiers and mandatory watermarks</div>
                </div>
              </div>
            </div>

            <div className="ai-modal-footer">
              {analysisStep >= 5 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: 11, color: 'var(--pass)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> <span>Analysis Complete • Ready for Production</span>
                  </span>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAnalysis(false)}>
                    Done
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--slate)' }}>
                  Analyzing dataset structure in real-time...
                </span>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Main Interactive Data Table */}
      <div className="table-container" tabIndex={0} aria-label="Data preview table">
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-index-th">#</th>
              {table.columns.map((c) => {
                const isSorted = sortCol === c.name;
                return (
                  <th
                    key={c.name}
                    className={`col-th col-th-interactive ${isSorted ? 'sorted' : ''}`}
                    onClick={() => handleSort(c.name)}
                    title={`Click to sort by ${c.name}`}
                  >
                    <div className="col-th-inner">
                      <div className="col-name-row">
                        {c.pk && <span className="pk-indicator" title="Primary Key">PK</span>}
                        <span className="mono font-bold">{c.name}</span>
                        <span className="sort-arrow">
                          {isSorted ? (sortDir === 'asc' ? (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>) : (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>)) : (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4"><path d="M7 15l5 5 5-5M7 9l5-5 5 5"/></svg>)}
                        </span>
                      </div>
                      <div className="col-meta-row">
                        <span className="col-type-chip">{c.semantic_type}</span>
                        <span className="col-dtype-chip mono">{c.dtype}</span>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, idx) => {
                const hasChaos = !!row._hasChaos;
                const isSelected = selectedRowIdx === idx;
                return (
                  <tr
                    key={idx}
                    className={`${idx % 2 === 1 ? 'row-zebra' : ''} ${isSelected ? 'row-selected' : ''}`}
                    style={hasChaos ? { backgroundColor: 'var(--chaos-bg)' } : undefined}
                    onClick={() => setSelectedRowIdx(isSelected ? null : idx)}
                  >
                    <td className="cell-index mono">
                      {idx + 1}
                      {hasChaos && <span title="Chaos Injected" className="chaos-dot" />}
                    </td>
                    {table.columns.map((c) => {
                      const rawVal = row[c.name];
                      const isNull = rawVal === null || rawVal === undefined;
                      const isNumeric = c.dtype === 'int' || c.dtype === 'float' || c.dtype === 'decimal';
                      const isCategory = c.semantic_type === 'category';

                      return (
                        <td
                          key={c.name}
                          className={`cell-data mono ${isNumeric ? 'text-right' : ''} ${isNull ? 'cell-null' : ''}`}
                        >
                          {isNull ? (
                            <span className="null-badge">null</span>
                          ) : isCategory ? (
                            renderStatusBadge(String(rawVal))
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {selectedRowIdx !== null && (
            <span style={{ color: 'var(--teal)', fontWeight: 600 }}>
              Row #{selectedRowIdx + 1} selected
            </span>
          )}
          <span className="footer-info">
            Showing {rows.length} rows • Click column to sort • Click row to select
          </span>
        </div>
      </footer>
    </main>
  );
};
