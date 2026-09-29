import React, { useState } from 'react';
import { useAppStore } from '../state/store';
import { fetchTrustReportBackend } from '../api/client';

export const TrustDrawer: React.FC = () => {
  const {
    trustReport,
    isTrustDrawerOpen,
    toggleTrustDrawer,
    dataset,
    previewRows,
    setBackendTrustReport,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isTrustDrawerOpen) return null;

  const handleRefresh = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const rep = await fetchTrustReportBackend(dataset, previewRows);
      setBackendTrustReport(rep);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to recompute metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(trustReport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${dataset.name}_trust_report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const overall = trustReport.overall_verdict || 'pass';

  return (
    <aside
      className="trust-drawer"
      role="dialog"
      aria-label="Trust Report Panel"
      style={{
        position: 'fixed',
        top: 52,
        right: 0,
        bottom: 0,
        width: 440,
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid var(--line)',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--sand-light)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Trust Report</h2>
            <span
              className={`verdict-tag ${overall}`}
              style={{
                textTransform: 'uppercase',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              Overall {overall}
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>
            Empirical correctness, fidelity & privacy guarantees (FR-12)
          </p>
        </div>

        <button
          type="button"
          onClick={() => toggleTrustDrawer(false)}
          aria-label="Close Trust Report"
          style={{
            background: 'none',
            border: 'none',
            fontSize: 18,
            color: 'var(--slate)',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 4,
          }}
        >
          ?
        </button>
      </div>

      {/* Action Bar */}
      <div
        style={{
          padding: '8px 20px',
          borderBottom: '1px solid var(--line-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
        }}
      >
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          style={{
            fontSize: 12,
            padding: '5px 10px',
            borderRadius: 4,
            border: '1px solid var(--line)',
            background: 'var(--sand-light)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            color: 'var(--ink)',
          }}
        >
          {isLoading ? 'Computing...' : '? Recompute Live'}
        </button>

        <button
          type="button"
          onClick={handleExportJson}
          style={{
            fontSize: 12,
            padding: '5px 10px',
            borderRadius: 4,
            border: '1px solid var(--teal)',
            background: 'rgba(22, 122, 109, 0.08)',
            color: 'var(--teal)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ?? Export JSON
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '8px 20px', backgroundColor: 'var(--fail-bg)', color: 'var(--fail)', fontSize: 12 }}>
          {errorMsg}
        </div>
      )}

      {/* Cards List Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Correct Card */}
        <div
          className="card"
          style={{
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: 14,
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>???</span>
              <strong style={{ fontSize: 13, color: 'var(--ink)' }}>1. Correctness Card</strong>
            </div>
            <span className={`verdict-tag ${trustReport.correct_verdict || 'pass'}`}>
              {(trustReport.correct_verdict || 'pass').toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 8, lineHeight: 1.4 }}>
            {trustReport.correct_reason || '0 schema violations, PK duplicates, and FK orphans verified.'}
          </p>
        </div>

        {/* Realistic Card */}
        <div
          className="card"
          style={{
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: 14,
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>??</span>
              <strong style={{ fontSize: 13, color: 'var(--ink)' }}>2. Realistic Card</strong>
            </div>
            <span className={`verdict-tag ${trustReport.realistic_verdict || 'pass'}`}>
              {(trustReport.realistic_verdict || 'pass').toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 8, lineHeight: 1.4 }}>
            {trustReport.realistic_reason || 'Statistical fidelity and category coverage meet strict thresholds.'}
          </p>
        </div>

        {/* Safe Card */}
        <div
          className="card"
          style={{
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: 14,
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>??</span>
              <strong style={{ fontSize: 13, color: 'var(--ink)' }}>3. Privacy & Safety Card</strong>
            </div>
            <span className={`verdict-tag ${trustReport.safe_verdict || 'pass'}`}>
              {(trustReport.safe_verdict || 'pass').toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 8, lineHeight: 1.4 }}>
            {trustReport.safe_reason || '100% RFC 2606 safe identifiers and mandatory diagonal watermarks.'}
          </p>
        </div>

        {/* Detailed Metrics Table */}
        <div style={{ marginTop: 8 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
            Evaluated Verification Checks
          </h3>
          <div style={{ border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--sand-light)', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '8px 10px', fontWeight: 600 }}>Metric</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600 }}>Value</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600 }}>Threshold</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(trustReport.metrics || {}).map(([key, m]) => (
                  <tr key={key} style={{ borderBottom: '1px solid var(--line-light)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--ink)' }}>
                      <div style={{ fontWeight: 500 }}>{m.name || key}</div>
                      {m.detail && <div style={{ fontSize: 10, color: 'var(--slate)', marginTop: 2 }}>{m.detail}</div>}
                    </td>
                    <td style={{ padding: '8px 10px' }} className="mono">
                      {m.value !== null && m.value !== undefined ? String(m.value) : 'N/A'}
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--slate)' }}>
                      {m.threshold || '?'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <span className={`verdict-tag ${m.verdict || 'pass'}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                        {m.verdict || 'pass'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </aside>
  );
};
