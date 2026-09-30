import React, { useEffect } from 'react';
import { useAppStore } from './state/store';
import { Header } from './components/Header';
import { ProofBar } from './components/ProofBar';
import { TrustDrawer } from './components/TrustDrawer';
import { TabularView } from './views/TabularView';
import { RelationalView } from './views/RelationalView';
import { DocumentsView } from './views/DocumentsView';
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
        {mode === 'documents' && <DocumentsView />}
        <TrustDrawer />
      </div>
    </div>
  );
};
