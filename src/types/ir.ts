/**
 * TypeScript IR models mirroring synth.ir.models
 * Reference: TRD Section 4
 */

export type LocaleCode = 'en_US' | 'en_IN' | 'de_DE';

export type SemanticType =
  | 'id'
  | 'person_name'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'street_address'
  | 'city'
  | 'region'
  | 'postal_code'
  | 'country'
  | 'company'
  | 'job_title'
  | 'date'
  | 'datetime'
  | 'money'
  | 'quantity'
  | 'integer'
  | 'float'
  | 'percent'
  | 'category'
  | 'boolean'
  | 'text_short'
  | 'text_long'
  | 'sku'
  | 'product_name'
  | 'merchant'
  | 'mcc'
  | 'iban_fake'
  | 'card_fake'
  | 'url_fake';

export type DType = 'int' | 'float' | 'decimal' | 'str' | 'bool' | 'date' | 'datetime';

export type PrivacyMode = 'none' | 'mask' | 'hmac_hash' | 'drop' | 'generalize' | 'dp_marginals';

export interface FakerGenerator {
  kind: 'faker';
  provider: string;
  locale?: string | null;
}

export interface CategoricalGenerator {
  kind: 'categorical';
  values: string[];
  weights?: number[] | null;
}

export interface NumericGenerator {
  kind: 'numeric';
  dist: 'normal' | 'lognormal' | 'uniform' | 'poisson' | 'empirical';
  params?: Record<string, number>;
  min_val?: number | null;
  max_val?: number | null;
}

export interface SequenceGenerator {
  kind: 'sequence';
  start?: number;
  step?: number;
  prefix?: string;
}

export interface DateRangeGenerator {
  kind: 'date_range';
  start: string;
  end: string;
}

export interface CopulaRefGenerator {
  kind: 'copula_ref';
  column_index: number;
}

export interface DerivedGenerator {
  kind: 'derived';
  derivation: 'sum_children' | 'row_expr';
  expression?: string | null;
}

export interface ForeignKeyGenerator {
  kind: 'foreign_key';
  reference_table: string;
  reference_column: string;
}

export type Generator =
  | FakerGenerator
  | CategoricalGenerator
  | NumericGenerator
  | SequenceGenerator
  | DateRangeGenerator
  | CopulaRefGenerator
  | DerivedGenerator
  | ForeignKeyGenerator;

export interface Constraint {
  kind: 'min' | 'max' | 'regex' | 'one_of' | 'after_column';
  value: string | number | string[];
}

export interface Column {
  name: string;
  semantic_type: SemanticType;
  dtype: DType;
  generator: Generator;
  nullable?: boolean;
  null_rate?: number;
  outlier_rate?: number;
  unique?: boolean;
  pk?: boolean;
  constraints?: Constraint[];
}

export interface Table {
  name: string;
  row_count?: number | null;
  columns: Column[];
}

export interface Cardinality {
  dist: 'fixed' | 'uniform' | 'poisson' | 'negbin' | 'empirical';
  params?: Record<string, number>;
  min_val?: number;
  max_val?: number;
}

export interface Relationship {
  parent: string;
  parent_key: string;
  child: string;
  child_key: string;
  kind: 'one_to_one' | 'one_to_many' | 'many_to_many';
  cardinality: Cardinality;
  junction?: string | null;
  nullable_backfill?: boolean;
}

export interface SumChildrenInvariant {
  kind: 'sum_children';
  parent_table: string;
  parent_column: string;
  child_table: string;
  child_columns: string[];
  operation: string;
}

export interface TemporalOrderInvariant {
  kind: 'temporal_order';
  parent_table: string;
  parent_column: string;
  child_table: string;
  child_column: string;
}

export interface UniqueComboInvariant {
  kind: 'unique_combo';
  table: string;
  columns: string[];
}

export interface RunningBalanceInvariant {
  kind: 'running_balance';
  table: string;
  balance_column: string;
  debit_column: string;
  credit_column: string;
}

export type Invariant =
  | SumChildrenInvariant
  | TemporalOrderInvariant
  | UniqueComboInvariant
  | RunningBalanceInvariant;

export interface PrivacyRule {
  table: string;
  column: string;
  control: 'mask' | 'hmac_hash' | 'drop' | 'generalize' | 'dp_marginals';
}

export interface ChaosConfig {
  enabled: boolean;
  null_injection_rate?: number;
  outlier_rate?: number;
  duplicate_rate?: number;
  encoding_issues?: boolean;
  boundary_dates?: boolean;
}

export interface DocumentSpec {
  kind: 'invoice' | 'statement';
  template_id?: string;
  count: number;
  locale?: LocaleCode;
}

export interface WorldConfig {
  seller_name?: string;
  seller_address?: string;
  bank_name?: string;
  payment_terms_days?: number;
}

export interface Dataset {
  ir_version: '1.0';
  name: string;
  mode: 'schema_only' | 'sample';
  seed: number;
  locale: LocaleCode;
  tables: Table[];
  relationships?: Relationship[];
  invariants?: Invariant[];
  privacy?: PrivacyRule[];
  chaos?: ChaosConfig | null;
  documents?: DocumentSpec[];
  world?: WorldConfig | null;
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
