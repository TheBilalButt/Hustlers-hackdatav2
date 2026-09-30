import { create } from 'zustand';
import type { Dataset, Table, Column, LocaleCode, BackendTrustReport, MetricDetail } from '../types/ir';
import { PRESETS, PRESET_ECOMMERCE } from './presets';
import { generateAllMockRows } from './mockGenerator';

export type AppMode = 'tabular' | 'relational' | 'documents';
export type ThemeMode = 'light' | 'dark';

export interface TrustReportSummary {
  overall_verdict: 'pass' | 'warn' | 'fail';
  correct_verdict: 'pass' | 'warn' | 'fail';
  correct_reason: string;
  realistic_verdict: 'pass' | 'warn' | 'fail';
  realistic_reason: string;
  safe_verdict: 'pass' | 'warn' | 'fail';
  safe_reason: string;
  metrics: Record<string, MetricDetail>;
}

interface AppState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;

  mode: AppMode;
  setMode: (mode: AppMode) => void;

  dataset: Dataset;
  selectedTable: string;
  selectedPreset: string;
  setDataset: (dataset: Dataset) => void;
  updateDataset: (updater: (prev: Dataset) => Dataset) => void;
  setSelectedTable: (tableName: string) => void;
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
  setPreviewData: (rows: unknown, hash: string, seed: number, latency?: number) => void;
  setPreviewLoading: (loading: boolean) => void;
  setPreviewError: (error: string | null) => void;

  trustReport: TrustReportSummary;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;

  isTrustDrawerOpen: boolean;
  toggleTrustDrawer: (open?: boolean) => void;
  setBackendTrustReport: (report: BackendTrustReport) => void;

  getEstimates: () => { totalRows: number; estCsvKb: number; estSqlKb: number; estGenSeconds: number };
}

const defaultTrustReport: TrustReportSummary = {
  overall_verdict: 'pass',
  correct_verdict: 'pass',
  correct_reason: 'Schema types, PK uniqueness, and foreign keys verified.',
  realistic_verdict: 'pass',
  realistic_reason: 'Statistical distributions match realistic production benchmarks.',
  safe_verdict: 'pass',
  safe_reason: 'RFC 2606 safe domains and reserved phone numbers verified.',
  metrics: {
    orphans: { name: 'Foreign key orphans', value: 0, threshold: '= 0', verdict: 'pass' },
    invariants: { name: 'Cross-table invariants', value: 0, threshold: '= 0', verdict: 'pass' },
    privacy_leak: { name: 'Exact match leaks', value: 0, threshold: '= 0', verdict: 'pass' },
  },
};

const initialMockRows = generateAllMockRows(PRESET_ECOMMERCE, 50);

const getInitialTheme = (): ThemeMode => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('hackdata_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  }
  return 'light';
};

export const useAppStore = create<AppState>((set, get) => ({
  theme: getInitialTheme(),
  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    if (typeof window !== 'undefined') {
      localStorage.setItem('hackdata_theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    }
    set({ theme: next });
  },
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hackdata_theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
    set({ theme });
  },

  mode: 'tabular',
  setMode: (mode) => set({ mode }),

  dataset: PRESET_ECOMMERCE,
  selectedTable: 'customers',
  selectedPreset: 'ecommerce',

  setDataset: (dataset) => {
    const tableExists = dataset.tables.some((t) => t.name === get().selectedTable);
    const mock = generateAllMockRows(dataset, 50);
    set({
      dataset,
      previewRows: mock,
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
      const rows = generateAllMockRows(preset.dataset, 50);
      set({
        dataset: preset.dataset,
        selectedPreset: presetId,
        selectedTable: preset.dataset.tables[0]?.name || '',
        seed: preset.dataset.seed,
        previewRows: rows,
        previewLatency: 8,
      });
    }
  },

  seed: PRESET_ECOMMERCE.seed,
  setSeed: (seed) => {
    set((state) => {
      const nextDs = { ...state.dataset, seed };
      const rows = generateAllMockRows(nextDs, 50);
      return {
        seed,
        dataset: nextDs,
        previewRows: rows,
      };
    });
  },

  rollNewSeed: () => {
    const newSeed = Math.floor(Math.random() * 900000) + 1000;
    set((state) => {
      const nextDs = { ...state.dataset, seed: newSeed };
      const rows = generateAllMockRows(nextDs, 50);
      return {
        seed: newSeed,
        dataset: nextDs,
        previewRows: rows,
        previewLatency: 12,
      };
    });
  },

  setLocale: (locale) => {
    set((state) => {
      const nextDs = { ...state.dataset, locale };
      const rows = generateAllMockRows(nextDs, 50);
      return {
        dataset: nextDs,
        previewRows: rows,
      };
    });
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
    set((state) => {
      const nextTables = [...state.dataset.tables, table];
      const nextDs = { ...state.dataset, tables: nextTables };
      const rows = generateAllMockRows(nextDs, 50);
      return {
        dataset: nextDs,
        previewRows: rows,
        selectedTable: table.name,
      };
    });
  },

  removeTable: (tableName) => {
    set((state) => {
      const remaining = state.dataset.tables.filter((t) => t.name !== tableName);
      const nextDs = { ...state.dataset, tables: remaining };
      const rows = generateAllMockRows(nextDs, 50);
      return {
        dataset: nextDs,
        previewRows: rows,
        selectedTable: remaining[0]?.name || '',
      };
    });
  },

  addColumn: (tableName, column) => {
    set((state) => {
      const nextTables = state.dataset.tables.map((t) =>
        t.name === tableName ? { ...t, columns: [...t.columns, column] } : t
      );
      const nextDs = { ...state.dataset, tables: nextTables };
      const rows = generateAllMockRows(nextDs, 50);
      return {
        dataset: nextDs,
        previewRows: rows,
      };
    });
  },

  updateColumn: (tableName, columnName, updates) => {
    set((state) => {
      const nextTables = state.dataset.tables.map((t) => {
        if (t.name !== tableName) return t;
        return {
          ...t,
          columns: t.columns.map((c) => (c.name === columnName ? { ...c, ...updates } : c)),
        };
      });
      const nextDs = { ...state.dataset, tables: nextTables };
      const rows = generateAllMockRows(nextDs, 50);
      return {
        dataset: nextDs,
        previewRows: rows,
      };
    });
  },

  removeColumn: (tableName, columnName) => {
    set((state) => {
      const nextTables = state.dataset.tables.map((t) => {
        if (t.name !== tableName) return t;
        return {
          ...t,
          columns: t.columns.filter((c) => c.name !== columnName),
        };
      });
      const nextDs = { ...state.dataset, tables: nextTables };
      const rows = generateAllMockRows(nextDs, 50);
      return {
        dataset: nextDs,
        previewRows: rows,
      };
    });
  },

  toggleChaos: (enabled) => {
    set((state) => {
      const nextDs = {
        ...state.dataset,
        chaos: {
          enabled,
          null_injection_rate: 0.01,
          outlier_rate: 0.005,
          duplicate_rate: 0.005,
        },
      };
      const rows = generateAllMockRows(nextDs, 50);
      return {
        dataset: nextDs,
        previewRows: rows,
      };
    });
  },

  datasetHash: 'defaef885e5c19ca1f170a3e75c5ecb7661bf16d82eae824d003b1715ea25f21',
  previewRows: initialMockRows,
  previewLatency: 14,
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

  isTrustDrawerOpen: false,
  toggleTrustDrawer: (open) => set((s) => ({ isTrustDrawerOpen: open !== undefined ? open : !s.isTrustDrawerOpen })),
  setBackendTrustReport: (report: BackendTrustReport) => {
    if (!report || !report.cards) return;
    const correctCard = report.cards.find((c) => c.name === 'correct');
    const realisticCard = report.cards.find((c) => c.name === 'realistic');
    const safeCard = report.cards.find((c) => c.name === 'safe');
    const metricsMap: Record<string, MetricDetail> = {};
    report.cards.forEach((c) => {
      c.metrics.forEach((m) => {
        metricsMap[m.name] = m;
      });
    });
    set({
      trustReport: {
        overall_verdict: report.cards.some((c) => c.verdict === 'fail') ? 'fail' : report.cards.some((c) => c.verdict === 'warn') ? 'warn' : 'pass',
        correct_verdict: correctCard?.verdict === 'fail' ? 'fail' : correctCard?.verdict === 'warn' ? 'warn' : 'pass',
        correct_reason: correctCard?.reason || '',
        realistic_verdict: realisticCard?.verdict === 'fail' ? 'fail' : realisticCard?.verdict === 'warn' ? 'warn' : 'pass',
        realistic_reason: realisticCard?.reason || '',
        safe_verdict: safeCard?.verdict === 'fail' ? 'fail' : safeCard?.verdict === 'warn' ? 'warn' : 'pass',
        safe_reason: safeCard?.reason || '',
        metrics: metricsMap,
      },
    });
  },

  getEstimates: () => {
    const { dataset } = get();
    let totalRows = 0;
    let totalColumns = 0;

    for (const table of dataset.tables) {
      const rows = table.row_count || 1000;
      totalRows += rows;
      totalColumns += table.columns.length * rows;
    }

    const estCsvBytes = Math.round(totalColumns * 18 + totalRows * 2);
    const estSqlBytes = Math.round(totalColumns * 26 + totalRows * 30);
    const estGenSeconds = Math.max(0.05, Math.round((totalRows / 25000) * 100) / 100);

    return {
      totalRows,
      estCsvKb: Math.round(estCsvBytes / 1024),
      estSqlKb: Math.round(estSqlBytes / 1024),
      estGenSeconds,
    };
  },
}));
