import React from 'react';
import { useAppStore } from '../state/store';

export const TrustDrawer: React.FC = () => {
  const { trustReport } = useAppStore();

  return (
    <aside className="trust-drawer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Trust Report</h2>
        <span className={`verdict-tag ${trustReport.overall_verdict}`}>
          Overall {trustReport.overall_verdict.toUpperCase()}
        </span>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <strong>Correct</strong>
          <span className={`verdict-tag ${trustReport.correct_verdict}`}>
            {trustReport.correct_verdict}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--slate)' }}>{trustReport.correct_reason}</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <strong>Realistic</strong>
          <span className={`verdict-tag ${trustReport.realistic_verdict}`}>
            {trustReport.realistic_verdict}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--slate)' }}>{trustReport.realistic_reason}</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <strong>Safe</strong>
          <span className={`verdict-tag ${trustReport.safe_verdict}`}>
            {trustReport.safe_verdict}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--slate)' }}>{trustReport.safe_reason}</p>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Expert Metrics</h3>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--slate)' }}>
              <th style={{ padding: '6px 0' }}>Metric</th>
              <th>Value</th>
              <th>Verdict</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(trustReport.metrics).map(([key, m]) => (
              <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px 0' }}>{m.name}</td>
                <td className="mono">{m.value}</td>
                <td>
                  <span className={`verdict-tag ${m.verdict}`} style={{ fontSize: 11 }}>
                    {m.verdict}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
};
