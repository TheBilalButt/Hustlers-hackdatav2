import { create } from 'zustand';
import type { Dataset, TrustReport } from '../types/ir';

export type AppMode = 'tabular' | 'relational' | 'documents';

interface AppState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  dataset: Dataset;
  setDataset: (dataset: Dataset) => void;
  seed: number;
  setSeed: (seed: number) => void;
  datasetHash: string;
  setDatasetHash: (hash: string) => void;
  totalRowsEstimate: number;
  trustReport: TrustReport;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  previewRows: Record<string, unknown[]>;
  setPreviewRows: (rows: Record<string, unknown[]>) => void;
}

const defaultDataset: Dataset = {
  ir_version: '1.0.0',
  name: 'Ecommerce Store Demo',
  locale: 'en_IN',
  seed: 42,
  tables: [
    {
      name: 'customers',
      rows: 500,
      columns: [
        { name: 'customer_id', type: 'integer', nullable: false, null_rate: 0, privacy: 'none' },
        { name: 'name', type: 'string', nullable: false, null_rate: 0, privacy: 'none' },
        { name: 'email', type: 'string', nullable: false, null_rate: 0, privacy: 'none' },
        { name: 'phone', type: 'string', nullable: true, null_rate: 0.05, privacy: 'none' },
      ],
      primary_key: ['customer_id'],
    },
    {
      name: 'orders',
      rows: 2000,
      columns: [
        { name: 'order_id', type: 'integer', nullable: false, null_rate: 0, privacy: 'none' },
        { name: 'customer_id', type: 'integer', nullable: false, null_rate: 0, privacy: 'none' },
        { name: 'total_amount', type: 'decimal', nullable: false, null_rate: 0, privacy: 'none' },
        { name: 'created_at', type: 'date', nullable: false, null_rate: 0, privacy: 'none' },
      ],
      primary_key: ['order_id'],
    },
  ],
  relationships: [
    {
      name: 'customer_orders',
      parent_table: 'customers',
      child_table: 'orders',
      cardinality: '1:N',
      parent_keys: ['customer_id'],
      child_keys: ['customer_id'],
    },
  ],
  invariants: [],
};

const defaultTrustReport: TrustReport = {
  overall_verdict: 'pass',
  correct_verdict: 'pass',
  correct_reason: '0 orphan records; cross-table invariants hold.',
  realistic_verdict: 'pass',
  realistic_reason: 'Spec fidelity and distributions match declared schema.',
  safe_verdict: 'pass',
  safe_reason: 'Reserved domains and phone ranges validated.',
  metrics: {
    orphans: { name: 'Foreign key orphans', value: 0, threshold: '= 0', verdict: 'pass' },
    invariants: { name: 'Invariant violations', value: 0, threshold: '= 0', verdict: 'pass' },
    privacy_leak: { name: 'Exact match leaks', value: 0, threshold: '= 0', verdict: 'pass' },
  },
};

export const useAppStore = create<AppState>((set) => ({
  mode: 'tabular',
  setMode: (mode) => set({ mode }),
  dataset: defaultDataset,
  setDataset: (dataset) => set({ dataset }),
  seed: 42,
  setSeed: (seed) => set({ seed }),
  datasetHash: 'e3b0c44298fc1c149afbf4c8996fb924',
  setDatasetHash: (datasetHash) => set({ datasetHash }),
  totalRowsEstimate: 2500,
  trustReport: defaultTrustReport,
  isOffline: false,
  setIsOffline: (isOffline) => set({ isOffline }),
  previewRows: {},
  setPreviewRows: (previewRows) => set({ previewRows }),
}));
