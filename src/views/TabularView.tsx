import React from 'react';
import { ConfigPanel } from '../components/ConfigPanel';
import { PreviewGrid } from '../components/PreviewGrid';

export const TabularView: React.FC = () => {
  return (
    <>
      <ConfigPanel />
      <PreviewGrid />
    </>
  );
};
