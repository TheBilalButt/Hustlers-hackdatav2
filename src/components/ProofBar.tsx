import React, { useState } from 'react';
import { useAppStore } from '../state/store';

export const ProofBar: React.FC = () => {
  const {
    trustReport,
    seed,
    rollNewSeed,
    datasetHash,
    previewLatency,
    isGenerating,
    getEstimates,
    toggleTrustDrawer,
    isTrustDrawerOpen,
  } = useAppStore();

  const [copied, setCopied] = useState(false);
  const estimates = getEstimates();

  const copyHash = () => {
    navigator.clipboard.writeText(datasetHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const truncatedHash = datasetHash.length > 16
    ? `${datasetHash.slice(0, 8)}...${datasetHash.slice(-8)}`
    : datasetHash;

  return (
    <aside className="proof-bar" aria-label="Proof and Invariants Bar">
      <div className="proof-verdicts" role="region" aria-label="Trust verdicts">
        <button
          type="button"
          className={`verdict-badge ${trustReport.correct_verdict || 'pass'}`}
          title={`${trustReport.correct_reason} (Click to open Trust Report)`}
          onClick={() => toggleTrustDrawer(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="verdict-text">Correct</span>
        </button>

        <button
          type="button"
          className={`verdict-badge ${trustReport.realistic_verdict || 'pass'}`}
          title={`${trustReport.realistic_reason} (Click to open Trust Report)`}
          onClick={() => toggleTrustDrawer(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span className="verdict-text">Realistic</span>
        </button>

        <button
          type="button"
          className={`verdict-badge ${trustReport.safe_verdict || 'pass'}`}
          title={`${trustReport.safe_reason} (Click to open Trust Report)`}
          onClick={() => toggleTrustDrawer(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="verdict-text">Safe</span>
        </button>

        <button
          type="button"
          className="btn-text-action"
          onClick={() => toggleTrustDrawer()}
          title="Toggle Trust Report drawer"
          style={{
            fontSize: 11,
            color: 'var(--teal)',
            fontWeight: 600,
            background: 'rgba(22, 122, 109, 0.08)',
            border: '1px solid rgba(22, 122, 109, 0.2)',
            padding: '3px 9px',
            borderRadius: 4,
            cursor: 'pointer',
            marginLeft: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>{isTrustDrawerOpen ? 'Close Report' : 'Trust Report'}</span>
          <span aria-hidden="true">{isTrustDrawerOpen ? '✕' : '→'}</span>
        </button>
      </div>

      <div className="proof-details">
        <div className="proof-item">
          <span className="proof-label">Seed</span>
          <span className="proof-value mono">{seed}</span>
          <button
            type="button"
            className="btn-seed-roll"
            onClick={rollNewSeed}
            title="Roll a new deterministic seed"
            aria-label="Roll a new deterministic seed"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
              <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>

        <div className="proof-item">
          <span className="proof-label">Dataset SHA-256</span>
          <button
            type="button"
            className="hash-pill mono"
            onClick={copyHash}
            title={`Full hash: ${datasetHash} (Click to copy)`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span>{truncatedHash}</span>
            <span className="copy-indicator" style={{ fontSize: 10 }}>
              {copied ? '✓ Copied' : '📋'}
            </span>
          </button>
        </div>

        <div className="proof-item">
          <span className="proof-label">Planned</span>
          <span className="proof-value mono">
            {estimates.totalRows.toLocaleString()} rows • ~{estimates.estCsvKb} KB
          </span>
        </div>

        <div className="proof-item live-indicator">
          {isGenerating ? (
            <span className="generating-chip">
              <span className="spinner-dot" /> Refreshing...
            </span>
          ) : (
            <span className="latency-chip mono" title="Generation latency">
              ⚡ {previewLatency !== null ? `${previewLatency} ms` : 'Synced'}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};
