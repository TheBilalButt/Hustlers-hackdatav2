import React, { useEffect } from 'react';
import { useAppStore } from './state/store';
import { Header } from './components/Header';
import { ProofBar } from './components/ProofBar';
import { TrustDrawer } from './components/TrustDrawer';
import { TabularView } from './views/TabularView';
import { RelationalView } from './views/RelationalView';
import { DocumentsView } from './views/DocumentsView';
import { AgentView } from './views/AgentView';
import { fetchHealth } from './api/client';
import { useLivePreview } from './hooks/useLivePreview';

export const App: React.FC = () => {
  const { mode, setIsOffline, theme } = useAppStore();

  // Wire live debounced preview generation
  useLivePreview();

  // Sync theme with document class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    fetchHealth()
      .then((data) => {
        setIsOffline(data.offline_mode);
      })
      .catch(() => {
        setIsOffline(true);
      });
  }, [setIsOffline]);

  return (
    <div className={`app-container ${theme}`}>
      <Header />
      <ProofBar />

      <div className="app-body">
        {mode === 'tabular' && <TabularView />}
        {mode === 'relational' && <RelationalView />}
        {mode === 'agent' && <AgentView />}
        {mode === 'documents' && <DocumentsView />}
        <TrustDrawer />
      </div>
      {mode !== 'agent' && (
        <button
          type="button"
          className="floating-agent-trigger-btn"
          onClick={() => useAppStore.getState().setMode('agent')}
          title="Open AI World Agent"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span>AI Agent</span>
        </button>
      )}
    </div>
  );
};
