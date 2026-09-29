import React from 'react';
import { useAppStore, AppMode } from '../state/store';

export const Header: React.FC = () => {
  const { mode, setMode } = useAppStore();

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <h1 className="display-title" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
          HackDataV2
        </h1>
        <span style={{ fontSize: 12, opacity: 0.7, borderLeft: '1px solid #334155', paddingLeft: 12 }}>
          Synthetic Data Platform
        </span>
      </div>

      <nav style={{ display: 'flex', gap: 4, background: '#0e1726', padding: 3, borderRadius: 6 }}>
        {(['tabular', 'relational', 'documents'] as AppMode[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setMode(tab)}
            style={{
              padding: '6px 14px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 13,
              textTransform: 'capitalize',
              backgroundColor: mode === tab ? 'var(--teal)' : 'transparent',
              color: '#ffffff',
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn btn-outline" style={{ color: '#fff', borderColor: '#334155', background: 'transparent' }}>
          Recipe ▾
        </button>
        <button className="btn btn-primary">
          Export ZIP
        </button>
      </div>
    </header>
  );
};
