import React from 'react';
import { useAppStore } from '../state/store';
import { PRESETS } from '../state/presets';

export const Header: React.FC = () => {
  const { mode, setMode, selectedPreset, loadPreset, isOffline, theme, toggleTheme, dataset } = useAppStore();

  const tableCount = dataset?.tables?.length ?? 3;
  const relCount = dataset?.relationships?.length ?? 2;

  return (
    <header className="app-header" role="banner">
      {/* Mac Traffic Lights & Branding */}
      <div className="header-brand-group">
        <div className="mac-traffic-lights" aria-hidden="true">
          <span className="traffic-dot dot-close" title="Close" />
          <span className="traffic-dot dot-minimize" title="Minimize" />
          <span className="traffic-dot dot-maximize" title="Zoom" />
        </div>

        <div className="brand-logo" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>

        <div className="brand-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="brand-title">HackData</span>
            <span className="version-chip">v2.0</span>
          </div>
          <span className="brand-subtitle">Synthetic Data Studio</span>
        </div>
      </div>

      {/* Dribbble-Style Mac Segmented Mode Navigation with Micro-Badges */}
      <nav className="mode-tabs" aria-label="Workspace Modes">
        <button
          type="button"
          className={mode === 'agent' ? 'mode-tab active' : 'mode-tab'}
          onClick={() => setMode('agent')}
          aria-selected={mode === 'agent'}
          role="tab"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span>AI Agent</span>
          <span className="nav-pill-badge badge-ai">Agent</span>
        </button>

        <button
          type="button"
          className={mode === 'tabular' ? 'mode-tab active' : 'mode-tab'}
          onClick={() => setMode('tabular')}
          aria-selected={mode === 'tabular'}
          role="tab"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
            <path d="M9 3v18" />
          </svg>
          <span>Tabular</span>
          <span className="nav-pill-badge">{tableCount}</span>
        </button>

        <button
          type="button"
          className={mode === 'relational' ? 'mode-tab active' : 'mode-tab'}
          onClick={() => setMode('relational')}
          aria-selected={mode === 'relational'}
          role="tab"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="6" height="6" rx="1" />
            <rect x="16" y="3" width="6" height="6" rx="1" />
            <rect x="9" y="15" width="6" height="6" rx="1" />
            <path d="M5 9v3a2 2 0 0 0 2 2h5" />
            <path d="M19 9v3a2 2 0 0 1-2 2h-5" />
          </svg>
          <span>Relational</span>
          <span className="nav-pill-badge">{relCount}</span>
        </button>

        <button
          type="button"
          className={mode === 'documents' ? 'mode-tab active' : 'mode-tab'}
          onClick={() => setMode('documents')}
          aria-selected={mode === 'documents'}
          role="tab"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Documents</span>
          <span className="nav-pill-badge">PDF</span>
        </button>
      </nav>

      {/* Right Controls: Presets, Theme Toggle, Status */}
      <div className="header-actions">
        {/* Preset Selector */}
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

        {/* Dark / Light Mode Toggle Button */}
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <span className="theme-toggle-label">Light</span>
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span className="theme-toggle-label">Dark</span>
            </>
          )}
        </button>

        {/* Engine Status with Smooth Pulsing Dot */}
        <div className="status-pill" title={isOffline ? 'Deterministic Client Engine' : 'Backend Fast-API Engine Active'}>
          <span className={isOffline ? 'status-dot offline' : 'status-dot online'} aria-hidden="true" />
          <span className="status-text">{isOffline ? 'Local Engine' : 'In sync'}</span>
        </div>
      </div>
    </header>
  );
};
