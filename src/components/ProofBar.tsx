import React from 'react';
import { useAppStore } from '../state/store';

export const ProofBar: React.FC = () => {
  const { trustReport, seed, setSeed, datasetHash, totalRowsEstimate } = useAppStore();

  const rollSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  return (
    <div className="proof-bar">
      <div className="proof-verdicts">
        <span className={`verdict-tag ${trustReport.correct_verdict}`}>
          ✓ Correct
        </span>
        <span className={`verdict-tag ${trustReport.realistic_verdict}`}>
          ✓ Realistic
        </span>
        <span className={`verdict-tag ${trustReport.safe_verdict}`}>
          ✓ Safe
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--slate)', fontSize: 12 }}>seed:</span>
          <code className="mono" style={{ background: 'var(--sand)', padding: '2px 6px', borderRadius: 4 }}>
            {seed}
          </code>
          <button
            onClick={rollSeed}
            style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: 12 }}
            title="Roll new seed"
          >
            ↻
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--slate)', fontSize: 12 }}>hash:</span>
          <code className="mono" style={{ background: 'var(--sand)', padding: '2px 6px', borderRadius: 4 }}>
            {datasetHash.slice(0, 12)}
          </code>
        </div>

        <div>
          <span style={{ color: 'var(--slate)', fontSize: 12 }}>rows:</span>{' '}
          <strong className="mono">{totalRowsEstimate.toLocaleString()}</strong>
        </div>
      </div>
    </div>
  );
};
