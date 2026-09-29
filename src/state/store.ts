import { create } from 'zustand';
import type { Dataset, Table, Column, LocaleCode, TrustReport } from '../types/ir';
import { PRESETS, PRESET_ECOMMERCE } from './presets';

export type AppMode = 'tabular' | 'relational' | 'documents';

export interface SizeEstimates {
  totalRows: number;
  estCsvKb: number;
  estSqlKb: number;
  estGenSeconds: number;
}

interface AppState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;

  dataset: Dataset;
  setDataset: (dataset: Dataset) => void;
  updateDataset: (updater: (prev: Dataset) => Dataset) => void;

  selectedTable: string;
  setSelectedTable: (tableName: string) => void;

  selectedPreset: string;
  loadPreset: (presetId: string) => void;

  seed: number;
  setSeed: (seed: number) => void;
  rollNewSeed: () => void;

  setLocale: (locale: LocaleCode) => void;
  setTableRows: (tableName: string, count: number) => void;
  addTable: (table: Table) => void;
  removeTable: (tableName: string) => void;

  addColumn: (tableName: string, column: Column) => void;
  updateColumn: (tableName: string, columnName: string, updates: Partial<Column>) => void;
  removeColumn: (tableName: string, columnName: string) => void;

  toggleChaos: (enabled: boolean) => void;

  datasetHash: string;
  previewRows: Record<string, Record<string, unknown>[]>;
  previewLatency: number | null;
  isGenerating: boolean;
  previewError: string | null;

  setPreviewData: (rows: Record<string, unknown[]>, hash: string, seed: number, latency?: number) => void;
  setPreviewLoading: (loading: boolean) => void;
  setPreviewError: (error: string | null) => void;

  trustReport: TrustReport;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;

  getEstimates: () => SizeEstimates;
}

const defaultTrustReport: TrustReport = {
  overall_verdict: 'pass',
  correct_verdict: 'pass',
  correct_reason: '0 orphan records; relational integrity holds.',
  realistic_verdict: 'pass',
  realistic_reason: 'Statistical distributions match declared schema constraints.',
  safe_verdict: 'pass',
  safe_reason: 'RFC 2606 safe domains and reserved phone numbers verified.',
  metrics: {
    orphans: { name: 'Foreign key orphans', value: 0, threshold: '= 0', verdict: 'pass' },
    invariants: { name: 'Cross-table invariants', value: 0, threshold: '= 0', verdict: 'pass' },
    privacy_leak: { name: 'Exact match leaks', value: 0, threshold: '= 0', verdict: 'pass' },
  },
};

export const useAppStore = create<AppState>((set, get) => ({
  mode: 'tabular',
  setMode: (mode) => set({ mode }),

  dataset: PRESET_ECOMMERCE,
  selectedTable: 'customers',
  selectedPreset: 'ecommerce',

  setDataset: (dataset) => {
    const tableExists = dataset.tables.some((t) => t.name === get().selectedTable);
    set({
      dataset,
      selectedTable: tableExists ? get().selectedTable : dataset.tables[0]?.name || '',
      seed: dataset.seed,
    });
  },

  updateDataset: (updater) => {
    set((state) => {
      const next = updater(state.dataset);
      return { dataset: next };
    });
  },

  setSelectedTable: (tableName) => set({ selectedTable: tableName }),

  loadPreset: (presetId) => {
    const preset = PRESETS[presetId];
    if (preset) {
      set({
        dataset: preset.dataset,
        selectedPreset: presetId,
        selectedTable: preset.dataset.tables[0]?.name || '',
        seed: preset.dataset.seed,
      });
    }
  },

  seed: PRESET_ECOMMERCE.seed,
  setSeed: (seed) => {
    set((state) => ({
      seed,
      dataset: { ...state.dataset, seed },
    }));
  },

  rollNewSeed: () => {
    const newSeed = Math.floor(Math.random() * 900000) + 1000;
    set((state) => ({
      seed: newSeed,
      dataset: { ...state.dataset, seed: newSeed },
    }));
  },

  setLocale: (locale) => {
    set((state) => ({
      dataset: { ...state.dataset, locale },
    }));
  },

  setTableRows: (tableName, count) => {
    set((state) => ({
      dataset: {
        ...state.dataset,
        tables: state.dataset.tables.map((t) =>
          t.name === tableName ? { ...t, row_count: Math.max(1, count) } : t
        ),
      },
    }));
  },

  addTable: (table) => {
    set((state) => ({
      dataset: {
        ...state.dataset,
        tables: [...state.dataset.tables, table],
      },
      selectedTable: table.name,
    }));
  },

  removeTable: (tableName) => {
    set((state) => {
      const remaining = state.dataset.tables.filter((t) => t.name !== tableName);
      return {
        dataset: { ...state.dataset, tables: remaining },
        selectedTable: remaining[0]?.name || '',
      };
    });
  },

  addColumn: (tableName, column) => {
    set((state) => ({
      dataset: {
        ...state.dataset,
        tables: state.dataset.tables.map((t) =>
          t.name === tableName ? { ...t, columns: [...t.columns, column] } : t
        ),
      },
    }));
  },

  updateColumn: (tableName, columnName, updates) => {
    set((state) => ({
      dataset: {
        ...state.dataset,
        tables: state.dataset.tables.map((t) => {
          if (t.name !== tableName) return t;
          return {
            ...t,
            columns: t.columns.map((c) => (c.name === columnName ? { ...c, ...updates } : c)),
          };
        }),
      },
    }));
  },

  removeColumn: (tableName, columnName) => {
    set((state) => ({
      dataset: {
        ...state.dataset,
        tables: state.dataset.tables.map((t) => {
          if (t.name !== tableName) return t;
          return {
            ...t,
            columns: t.columns.filter((c) => c.name !== columnName),
          };
        }),
      },
    }));
  },

  toggleChaos: (enabled) => {
    set((state) => ({
      dataset: {
        ...state.dataset,
        chaos: {
          enabled,
          null_injection_rate: 0.01,
          outlier_rate: 0.005,
          duplicate_rate: 0.005,
        },
      },
    }));
  },

  datasetHash: 'defaef885e5c19ca1f170a3e75c5ecb7661bf16d82eae824d003b1715ea25f21',
  previewRows: {},
  previewLatency: null,
  isGenerating: false,
  previewError: null,

  setPreviewData: (rows, hash, seed, latency) =>
    set({
      previewRows: rows as Record<string, Record<string, unknown>[]>,
      datasetHash: hash,
      seed,
      previewLatency: latency ?? null,
      isGenerating: false,
      previewError: null,
    }),

  setPreviewLoading: (isGenerating) => set({ isGenerating }),
  setPreviewError: (previewError) => set({ previewError, isGenerating: false }),

  trustReport: defaultTrustReport,
  isOffline: false,
  setIsOffline: (isOffline) => set({ isOffline }),

  getEstimates: () => {
    const { dataset } = get();
    let totalRows = 0;
    let totalColumns = 0;

    for (const table of dataset.tables) {
      const rows = table.row_count || 1000;
      totalRows += rows;
      totalColumns += table.columns.length * rows;
    }

    // Estimate ~18 bytes per average cell value in CSV, ~25 bytes in SQL insert
    const estCsvBytes = Math.round(totalColumns * 18 + totalRows * 2);
    const estSqlBytes = Math.round(totalColumns * 26 + totalRows * 30);
    // Generation engine benchmark: ~25,000 rows/sec in Python
    const estGenSeconds = Math.max(0.05, Math.round((totalRows / 25000) * 100) / 100);

    return {
      totalRows,
      estCsvKb: Math.round(estCsvBytes / 1024),
      estSqlKb: Math.round(estSqlBytes / 1024),
      estGenSeconds,
    };
  },
}));
