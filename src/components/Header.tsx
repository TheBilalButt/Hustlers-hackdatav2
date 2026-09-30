import React from 'react';
import { useAppStore } from '../state/store';
import { PRESETS } from '../state/presets';

export const Header: React.FC = () => {
  const { mode, setMode, selectedPreset, loadPreset, isOffline } = useAppStore();

  return (
    <header className="app-header" role="banner">
      <div className="header-brand">
        <div className="brand-logo" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </div>
        <div className="brand-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="brand-title">HackData</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, backgroundColor: 'rgba(22, 122, 109, 0.15)', color: 'var(--teal)' }}>v2.0</span>
          </div>
          <span className="brand-badge">Coherent Synthetic World Platform</span>
        </div>
      </div>

      <nav className="mode-tabs" aria-label="Platform Modes">
        <button
          type="button"
          className={mode === 'tabular' ? 'mode-tab active' : 'mode-tab'}
          onClick={() => setMode('tabular')}
          aria-selected={mode === 'tabular'}
          role="tab"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
            <path d="M9 3v18" />
          </svg>
          <span>Tabular</span>
        </button>

        <button
          type="button"
          className={mode === 'relational' ? 'mode-tab active' : 'mode-tab'}
          onClick={() => setMode('relational')}
          aria-selected={mode === 'relational'}
          role="tab"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <rect x="2" y="3" width="6" height="6" rx="1" />
            <rect x="16" y="3" width="6" height="6" rx="1" />
            <rect x="9" y="15" width="6" height="6" rx="1" />
            <path d="M5 9v3a2 2 0 0 0 2 2h5" />
            <path d="M19 9v3a2 2 0 0 1-2 2h-5" />
          </svg>
          <span>Relational</span>
        </button>

        <button
          type="button"
          className={mode === 'documents' ? 'mode-tab active' : 'mode-tab'}
          onClick={() => setMode('documents')}
          aria-selected={mode === 'documents'}
          role="tab"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span>Documents</span>
        </button>
      </nav>

      <div className="header-actions">
        <div className="preset-selector-group">
          <label htmlFor="preset-select" className="sr-only">Data Preset</label>
          <span className="preset-label">Preset:</span>
          <select
            id="preset-select"
            className="preset-select"
            value={selectedPreset}
            onChange={(e) => loadPreset(e.target.value)}
          >
            {Object.values(PRESETS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="status-pill">
          <span className={isOffline ? 'status-dot offline' : 'status-dot online'} aria-hidden="true" />
          <span className="status-text">{isOffline ? 'Deterministic Client Engine' : 'Engine Ready'}</span>
        </div>
      </div>
    </header>
  );
};
