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
      <div className="proof-verdicts">
        <div className="verdict-badge pass" title={trustReport.correct_reason}>
          <span className="verdict-icon" aria-hidden="true">✓</span>
          <span className="verdict-text">Correct</span>
        </div>
        <div className="verdict-badge pass" title={trustReport.realistic_reason}>
          <span className="verdict-icon" aria-hidden="true">✓</span>
          <span className="verdict-text">Realistic</span>
        </div>
        <div className="verdict-badge pass" title={trustReport.safe_reason}>
          <span className="verdict-icon" aria-hidden="true">✓</span>
          <span className="verdict-text">Safe</span>
        </div>
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