import React from 'react';
import { useAppStore, type AppMode } from '../state/store';
import { PRESETS } from '../state/presets';

export const Header: React.FC = () => {
  const { mode, setMode, selectedPreset, loadPreset, isOffline } = useAppStore();

  return (
    <header className="app-header" role="banner">
      <div className="header-brand">
        <div className="brand-logo" aria-hidden="true">HD</div>
        <div className="brand-text">
          <span className="brand-title">HackData</span>
          <span className="brand-badge">Synthetic World Platform</span>
        </div>
      </div>

      <nav className="mode-tabs" aria-label="Platform Modes">
        {(['tabular', 'relational', 'documents'] as AppMode[]).map((m) => {
          const isActive = mode === m;
          return (
            <button
              key={m}
              type="button"
              className={isActive ? 'mode-tab active' : 'mode-tab'}
              onClick={() => setMode(m)}
              aria-selected={isActive}
              role="tab"
            >
              {m === 'tabular' && <span className="tab-icon">▦</span>}
              {m === 'relational' && <span className="tab-icon">☍</span>}
              {m === 'documents' && <span className="tab-icon">▤</span>}
              <span style={{ textTransform: 'capitalize' }}>{m}</span>
            </button>
          );
        })}
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
          <span className="status-text">{isOffline ? 'Deterministic Mode' : 'AI Engine Ready'}</span>
        </div>
      </div>
    </header>
  );
};