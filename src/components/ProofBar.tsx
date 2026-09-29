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
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
        >
          <span className="verdict-icon" aria-hidden="true">
            {trustReport.correct_verdict === 'fail' ? '✗' : trustReport.correct_verdict === 'warn' ? '!' : '✓'}
          </span>
          <span className="verdict-text">Correct</span>
        </button>
        <button
          type="button"
          className={`verdict-badge ${trustReport.realistic_verdict || 'pass'}`}
          title={`${trustReport.realistic_reason} (Click to open Trust Report)`}
          onClick={() => toggleTrustDrawer(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
        >
          <span className="verdict-icon" aria-hidden="true">
            {trustReport.realistic_verdict === 'fail' ? '✗' : trustReport.realistic_verdict === 'warn' ? '!' : '✓'}
          </span>
          <span className="verdict-text">Realistic</span>
        </button>
        <button
          type="button"
          className={`verdict-badge ${trustReport.safe_verdict || 'pass'}`}
          title={`${trustReport.safe_reason} (Click to open Trust Report)`}
          onClick={() => toggleTrustDrawer(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
        >
          <span className="verdict-icon" aria-hidden="true">
            {trustReport.safe_verdict === 'fail' ? '✗' : trustReport.safe_verdict === 'warn' ? '!' : '✓'}
          </span>
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
            padding: '2px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            marginLeft: 4,
          }}
        >
          {isTrustDrawerOpen ? 'Close Report ✕' : 'Trust Report ↗'}
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
          >
            🎲
          </button>
        </div>

        <div className="proof-item">
          <span className="proof-label">Dataset SHA-256</span>
          <button
            type="button"
            className="hash-pill mono"
            onClick={copyHash}
            title={`Full hash: ${datasetHash} (Click to copy)`}
          >
            <span>{truncatedHash}</span>
            <span className="copy-indicator">{copied ? '✓' : '⧉'}</span>
          </button>
        </div>

        <div className="proof-item">
          <span className="proof-label">Planned</span>
          <span className="proof-value mono">
            {estimates.totalRows.toLocaleString()} rows · ~{estimates.estCsvKb} KB
          </span>
        </div>

        <div className="proof-item live-indicator">
          {isGenerating ? (
            <span className="generating-chip">
              <span className="spinner-dot" /> Refreshing...
            </span>
          ) : (
            <span className="latency-chip mono" title="Debounced roundtrip generation latency">
              ⚡ {previewLatency !== null ? `${previewLatency} ms` : 'Synced'}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};
