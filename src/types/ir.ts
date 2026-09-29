/**
 * TypeScript IR models mirroring synth.ir.models
 * Reference: TRD Section 4
 */

export type LocaleCode = 'en_US' | 'en_IN' | 'de_DE';

export type PrivacyMode = 'none' | 'mask' | 'hmac' | 'drop' | 'generalize' | 'dp_marginal';

export interface Column {
  name: string;
  type: 'integer' | 'decimal' | 'string' | 'date' | 'timestamp' | 'boolean' | 'enum';
  nullable: boolean;
  null_rate: number;
  privacy: PrivacyMode;
  generator?: Record<string, unknown>;
  constraints?: string[];
}

export interface Table {
  name: string;
  rows: number;
  columns: Column[];
  primary_key: string[];
}

export interface Relationship {
  name: string;
  parent_table: string;
  child_table: string;
  cardinality: '1:1' | '1:N' | 'N:N';
  parent_keys: string[];
  child_keys: string[];
  min_cardinality?: number;
  max_cardinality?: number;
}

export interface Invariant {
  type: 'sum_children' | 'temporal_order' | 'unique_combo';
  params: Record<string, unknown>;
}

export interface Dataset {
  ir_version: string;
  name: string;
  locale: LocaleCode;
  seed: number;
  tables: Table[];
  relationships: Relationship[];
  invariants: Invariant[];
}

export type Verdict = 'pass' | 'warn' | 'fail' | 'n_a';

export interface MetricDetail {
  name: string;
  value: number | string;
  threshold: string;
  verdict: Verdict;
  details?: string;
}

export interface TrustReport {
  overall_verdict: Verdict;
  correct_verdict: Verdict;
  correct_reason: string;
  realistic_verdict: Verdict;
  realistic_reason: string;
  safe_verdict: Verdict;
  safe_reason: string;
  metrics: Record<string, MetricDetail>;
}
