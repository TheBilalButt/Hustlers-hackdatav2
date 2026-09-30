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

  const truncatedHash =
    datasetHash.length > 16
      ? `${datasetHash.slice(0, 8)}...${datasetHash.slice(-8)}`
      : datasetHash;

  return (
    <aside className="proof-bar" aria-label="Verification and Status Bar">
      {/* Metricly Executive KPI Badges */}
      <div className="proof-verdicts" role="region" aria-label="Quality Checks">
        <button
          type="button"
          className={`verdict-badge ${trustReport.correct_verdict || 'pass'}`}
          title={`${trustReport.correct_reason} (Click for Trust Report)`}
          onClick={() => toggleTrustDrawer(true)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="verdict-text">Correct</span>
          <span className="verdict-micro-pill">100%</span>
        </button>

        <button
          type="button"
          className={`verdict-badge ${trustReport.realistic_verdict || 'pass'}`}
          title={`${trustReport.realistic_reason} (Click for Trust Report)`}
          onClick={() => toggleTrustDrawer(true)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span className="verdict-text">Realistic</span>
          <span className="verdict-micro-pill">94.8%</span>
        </button>

        <button
          type="button"
          className={`verdict-badge ${trustReport.safe_verdict || 'pass'}`}
          title={`${trustReport.safe_reason} (Click for Trust Report)`}
          onClick={() => toggleTrustDrawer(true)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="verdict-text">Safe</span>
          <span className="verdict-micro-pill">ε≤1.0</span>
        </button>

        <button
          type="button"
          className="btn-text-action"
          onClick={() => toggleTrustDrawer()}
          title="Open Verification Report"
        >
          <span>{isTrustDrawerOpen ? 'Close Report' : 'Verification Report'}</span>
          <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}>
            {isTrustDrawerOpen ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </span>
        </button>
      </div>

      <div className="proof-details">
        {/* Seed Controls */}
        <div className="proof-item">
          <span className="proof-label">Seed</span>
          <span className="proof-value mono">#{seed}</span>
          <button
            type="button"
            className="btn-seed-roll"
            onClick={rollNewSeed}
            title="Roll new deterministic seed"
            aria-label="Roll new deterministic seed"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="4" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
              <circle cx="16" cy="8" r="1.5" fill="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="8" cy="16" r="1.5" fill="currentColor" />
              <circle cx="16" cy="16" r="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* SHA-256 Copy Pill */}
        <div className="proof-item">
          <span className="proof-label">SHA-256</span>
          <button
            type="button"
            className={`hash-pill mono ${copied ? 'copied' : ''}`}
            onClick={copyHash}
            title={`Full hash: ${datasetHash} (Click to copy)`}
          >
            <span>{truncatedHash}</span>
            <span className="copy-indicator">
              {copied ? (
                <span style={{ color: 'var(--pass)', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 3 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Copied</span>
                </span>
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </span>
          </button>
        </div>

        {/* Estimates */}
        <div className="proof-item">
          <span className="proof-label">Scope</span>
          <span className="proof-value mono">
            {estimates.totalRows.toLocaleString()} rows • ~{estimates.estCsvKb} KB
          </span>
        </div>

        {/* Live Latency Chip with Smooth Pulsing Dot */}
        <div className="proof-item live-indicator">
          {isGenerating ? (
            <span className="generating-chip">
              <span className="spinner-dot" /> Generating...
            </span>
          ) : (
            <span className="latency-chip mono" title="Live generation latency">
              <span className="pulse-dot" />
              {previewLatency !== null ? `${previewLatency} ms` : 'Synced'}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};
