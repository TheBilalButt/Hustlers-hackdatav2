import React, { useState } from 'react';
import { useAppStore } from '../state/store';

export const AgentView: React.FC = () => {
  const { setMode, loadPreset, rollNewSeed } = useAppStore();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [activeChip, setActiveChip] = useState<string | null>(null);

  const samplePrompts = [
    {
      label: 'E-Commerce Orders & Customers',
      prompt: 'Synthesize an e-commerce platform with customers, orders, and products. Include Pakistani names, PKR/USD prices, and tax invoices.',
      preset: 'ecommerce',
    },
    {
      label: 'B2B SaaS Subscriptions',
      prompt: 'Generate a B2B SaaS dataset with organizations, users, and recurring subscription invoices with seats and usage tiers.',
      preset: 'saas',
    },
    {
      label: 'Fintech Banking Ledger',
      prompt: 'Create a commercial banking ledger with account holders, debit/credit transactions, and bank statements in USD and PKR.',
      preset: 'banking',
    },
    {
      label: 'Healthcare Patients & Encounters',
      prompt: 'Generate clinical patients, medical encounters, and lab test results with differential privacy guarantees.',
      preset: 'ecommerce',
    },
  ];

  const handleSelectChip = (chip: typeof samplePrompts[0]) => {
    setActiveChip(chip.label);
    setPrompt(chip.prompt);
  };

  const handleGenerateWorld = () => {
    if (!prompt.trim() && !activeChip) {
      setPrompt(samplePrompts[0].prompt);
    }
    setIsGenerating(true);
    setStepIndex(1);

    setTimeout(() => setStepIndex(2), 500);
    setTimeout(() => setStepIndex(3), 1000);
    setTimeout(() => setStepIndex(4), 1500);
    setTimeout(() => {
      setStepIndex(5);
      // Determine preset
      const p = prompt.toLowerCase();
      if (p.includes('saas') || p.includes('crm') || p.includes('organization')) {
        loadPreset('saas');
      } else if (p.includes('bank') || p.includes('ledger') || p.includes('account')) {
        loadPreset('banking');
      } else {
        loadPreset('ecommerce');
      }
      rollNewSeed();

      setTimeout(() => {
        setIsGenerating(false);
        setMode('tabular');
      }, 700);
    }, 2000);
  };

  const handleSelectTemplate = (presetId: string) => {
    loadPreset(presetId);
    rollNewSeed();
    setMode('tabular');
  };

  const handleUploadSample = (sampleType: string) => {
    setIsGenerating(true);
    setStepIndex(1);
    setPrompt(`Profiled sample data from ${sampleType}. Replicating statistical marginals and relational schema.`);
    setTimeout(() => setStepIndex(3), 700);
    setTimeout(() => {
      setStepIndex(5);
      if (sampleType.includes('transaction') || sampleType.includes('ledger')) {
        loadPreset('banking');
      } else {
        loadPreset('ecommerce');
      }
      rollNewSeed();
      setTimeout(() => {
        setIsGenerating(false);
        setMode('tabular');
      }, 600);
    }, 1500);
  };

  return (
    <div className="agent-view-scroll-container">
      <div className="agent-content-wrapper">
        {/* Hero Title (Figma Match) */}
        <div className="agent-hero-header">
          <div className="agent-sparkle-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span>Autonomous Schema & Data Agent</span>
          </div>
          <h1 className="agent-main-title">What data do you need?</h1>
          <p className="agent-subtitle">
            Describe the synthetic world, schema, or entities you want to synthesize. The agent generates relational tables, financial documents, and privacy proofs.
          </p>
        </div>

        {/* Section 1: Describe What You Need (Prompt Area) */}
        <div className="agent-section-card">
          <div className="section-label-row">
            <span className="section-step-label">Describe what you need</span>
            <span className="section-hint">Multi-modal & Relational</span>
          </div>

          <div className="agent-input-box">
            <textarea
              className="agent-textarea"
              rows={4}
              placeholder="e.g. A marketplace dataset with users, products, and orders. Orders should have payments, delivery status, and PKR/USD revenue..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />

            {/* Quick Prompt Chips */}
            <div className="agent-chips-bar">
              <span className="chips-label">Try:</span>
              <div className="chips-list">
                {samplePrompts.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    className={`agent-chip-btn ${activeChip === chip.label ? 'active' : ''}`}
                    onClick={() => handleSelectChip(chip)}
                    disabled={isGenerating}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Button & Stepper */}
            <div className="agent-action-bar">
              <button
                type="button"
                className="btn-agent-generate"
                onClick={handleGenerateWorld}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="2" x2="12" y2="6" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                      <line x1="2" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="22" y2="12" />
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                    </svg>
                    <span>Synthesizing World...</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Generate World</span>
                  </>
                )}
              </button>

              <span className="agent-guarantee-note">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Zero-orphan relational guarantee with Differential Privacy
              </span>
            </div>

            {/* Live Agent Execution Stepper */}
            {isGenerating && (
              <div className="agent-stepper-box">
                <div className="stepper-progress-track">
                  <div
                    className="stepper-progress-fill"
                    style={{ width: `${(stepIndex / 5) * 100}%` }}
                  />
                </div>
                <div className="stepper-feed">
                  <div className={`step-row ${stepIndex >= 1 ? 'done' : ''}`}>
                    <span className="step-circle">{stepIndex > 1 ? (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>) : '1'}</span>
                    <span className="step-text">Parsing domain entities, schema definitions, and locale attributes...</span>
                  </div>
                  <div className={`step-row ${stepIndex >= 2 ? 'done' : ''}`}>
                    <span className="step-circle">{stepIndex > 2 ? (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>) : '2'}</span>
                    <span className="step-text">Synthesizing relational foreign key constraints (1:N cardinalities)...</span>
                  </div>
                  <div className={`step-row ${stepIndex >= 3 ? 'done' : ''}`}>
                    <span className="step-circle">{stepIndex > 3 ? (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>) : '3'}</span>
                    <span className="step-text">Generating localized entities with authentic names (Pakistani & global in PKR/USD)...</span>
                  </div>
                  <div className={`step-row ${stepIndex >= 4 ? 'done' : ''}`}>
                    <span className="step-circle">{stepIndex > 4 ? (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>) : '4'}</span>
                    <span className="step-text">Enforcing Differential Privacy (ε ≤ 1.0) and document reconciliation...</span>
                  </div>
                  <div className={`step-row ${stepIndex >= 5 ? 'done' : ''}`}>
                    <span className="step-circle">{stepIndex >= 5 ? (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>) : '5'}</span>
                    <span className="step-text" style={{ fontWeight: 600, color: 'var(--pass)' }}>Synthetic World synthesized! Directing to workspace...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Or Upload Sample Data (Figma Match) */}
        <div className="agent-section-card">
          <div className="section-label-row">
            <span className="section-step-label">Or upload sample data</span>
            <span className="section-hint">Zero-Storage Privacy</span>
          </div>

          <div className="agent-upload-dropzone">
            <div className="upload-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="upload-text-content">
              <span className="upload-main-text">Choose a CSV or JSON file • Up to 5 MB</span>
              <span className="upload-sub-text">
                We will analyze columns, data types, and correlations to generate matching synthetic data without leaking private records.
              </span>
            </div>

            <div className="upload-sample-triggers">
              <span className="sample-trigger-label">Test with sample files:</span>
              <button
                type="button"
                className="sample-file-btn"
                onClick={() => handleUploadSample('sample_customers.csv')}
                disabled={isGenerating}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg><span>customers_sample.csv</span>
              </button>
              <button
                type="button"
                className="sample-file-btn"
                onClick={() => handleUploadSample('transactions_ledger.json')}
                disabled={isGenerating}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg><span>transactions_ledger.json</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Start From a Template (Figma Match) */}
        <div className="agent-section-card">
          <div className="section-label-row">
            <span className="section-step-label">Start from a template</span>
            <span className="section-hint">Verified Relational Worlds</span>
          </div>

          <div className="templates-grid">
            {/* Template 1: E-commerce */}
            <div
              className="template-card"
              onClick={() => handleSelectTemplate('ecommerce')}
              role="button"
              tabIndex={0}
            >
              <div className="template-card-header">
                <div className="template-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
                <div className="template-badge">Popular</div>
              </div>
              <h3 className="template-title">E-commerce & Retail</h3>
              <p className="template-desc">
                Customers, products, orders, items, and tax-reconciled invoices with PKR and USD support.
              </p>
              <div className="template-meta-footer">
                <span className="template-meta-pill">3 tables</span>
                <span className="template-meta-pill">Tax Invoices</span>
                <span className="template-arrow">→</span>
              </div>
            </div>

            {/* Template 2: SaaS */}
            <div
              className="template-card"
              onClick={() => handleSelectTemplate('saas')}
              role="button"
              tabIndex={0}
            >
              <div className="template-card-header">
                <div className="template-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
                <div className="template-badge">CRM</div>
              </div>
              <h3 className="template-title">B2B SaaS Platform</h3>
              <p className="template-desc">
                Organizations, user workspaces, tiered subscriptions, and usage analytics with zero orphans.
              </p>
              <div className="template-meta-footer">
                <span className="template-meta-pill">3 tables</span>
                <span className="template-meta-pill">Subscriptions</span>
                <span className="template-arrow">→</span>
              </div>
            </div>

            {/* Template 3: Banking */}
            <div
              className="template-card"
              onClick={() => handleSelectTemplate('banking')}
              role="button"
              tabIndex={0}
            >
              <div className="template-card-header">
                <div className="template-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="21" x2="21" y2="21" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <polyline points="5 6 12 3 19 6" />
                  <line x1="4" y1="10" x2="4" y2="21" />
                  <line x1="20" y1="10" x2="20" y2="21" />
                  <line x1="8" y1="14" x2="8" y2="17" />
                  <line x1="12" y1="14" x2="12" y2="17" />
                  <line x1="16" y1="14" x2="16" y2="17" />
                </svg>
              </div>
                <div className="template-badge">Fintech</div>
              </div>
              <h3 className="template-title">Commercial Banking & Ledger</h3>
              <p className="template-desc">
                Bank accounts, double-entry ledger transactions, debit cards, and monthly statements.
              </p>
              <div className="template-meta-footer">
                <span className="template-meta-pill">2 tables</span>
                <span className="template-meta-pill">Bank Statements</span>
                <span className="template-arrow">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
