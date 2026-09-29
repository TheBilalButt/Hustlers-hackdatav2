import React, { useEffect } from 'react';
import { useAppStore } from './state/store';
import { Header } from './components/Header';
import { ProofBar } from './components/ProofBar';
import { TrustDrawer } from './components/TrustDrawer';
import { TabularView } from './views/TabularView';
import { RelationalView } from './views/RelationalView';
import { DocumentsView } from './views/DocumentsView';
import { fetchHealth } from './api/client';

export const App: React.FC = () => {
  const { mode, isOffline, setIsOffline } = useAppStore();

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
    <div className="app-container">
      <Header />
      <ProofBar />

      {isOffline && (
        <div className="degraded-banner">
          AI drafting is offline. Built-in templates, rules, and generators are active; all core generation and export features work.
        </div>
      )}

      <div className="app-body">
        {mode === 'tabular' && <TabularView />}
        {mode === 'relational' && <RelationalView />}
        {mode === 'documents' && <DocumentsView />}
        <TrustDrawer />
      </div>
    </div>
  );
};
