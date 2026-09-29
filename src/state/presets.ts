import type { Dataset } from '../types/ir';

export interface PresetInfo {
  id: string;
  name: string;
  description: string;
  dataset: Dataset;
}

export const PRESET_ECOMMERCE: Dataset = {
  ir_version: '1.0',
  name: 'Ecommerce Store Demo',
  mode: 'schema_only',
  seed: 42,
  locale: 'en_IN',
  tables: [
    {
      name: 'customers',
      row_count: 500,
      columns: [
        {
          name: 'customer_id',
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 1, step: 1 },
          pk: true,
        },
        {
          name: 'name',
          semantic_type: 'person_name',
          dtype: 'str',
          generator: { kind: 'faker', provider: 'name' },
        },
        {
          name: 'email',
          semantic_type: 'email',
          dtype: 'str',
          generator: { kind: 'faker', provider: 'email' },
        },
        {
          name: 'phone',
          semantic_type: 'phone',
          dtype: 'str',
          generator: { kind: 'faker', provider: 'phone_number' },
          nullable: true,
          null_rate: 0.05,
        },
        {
          name: 'city',
          semantic_type: 'city',
          dtype: 'str',
          generator: { kind: 'faker', provider: 'city' },
        },
      ],
    },
    {
      name: 'products',
      row_count: 100,
      columns: [
        {
          name: 'product_id',
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 201, step: 1 },
          pk: true,
        },
        {
          name: 'product_name',
          semantic_type: 'product_name',
          dtype: 'str',
          generator: { kind: 'faker', provider: 'product_name' },
        },
        {
          name: 'unit_price',
          semantic_type: 'money',
          dtype: 'decimal',
          generator: { kind: 'numeric', dist: 'uniform', min_val: 15.0, max_val: 450.0 },
        },
        {
          name: 'in_stock',
          semantic_type: 'boolean',
          dtype: 'bool',
          generator: { kind: 'categorical', values: ['true', 'false'], weights: [0.85, 0.15] },
        },
      ],
    },
    {
      name: 'orders',
      row_count: 2000,
      columns: [
        {
          name: 'order_id',
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 1001, step: 1 },
          pk: true,
        },
        {
          name: 'customer_id',
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 1, step: 1 },
        },
        {
          name: 'total_amount',
          semantic_type: 'money',
          dtype: 'decimal',
          generator: { kind: 'numeric', dist: 'uniform', min_val: 25.0, max_val: 1250.0 },
        },
        {
          name: 'status',
          semantic_type: 'category',
          dtype: 'str',
          generator: { kind: 'categorical', values: ['completed', 'pending', 'cancelled', 'refunded'], weights: [0.7, 0.15, 0.1, 0.05] },
        },
        {
          name: 'order_date',
          semantic_type: 'date',
          dtype: 'date',
          generator: { kind: 'date_range', start: '2026-01-01', end: '2026-09-29' },
        },
      ],
    },
  ],
  relationships: [
    {
      parent: 'customers',
      parent_key: 'customer_id',
      child: 'orders',
      child_key: 'customer_id',
      kind: 'one_to_many',
      cardinality: { dist: 'poisson', params: { lam: 4 }, min_val: 1, max_val: 20 },
    },
  ],
  invariants: [],
  privacy: [],
  chaos: { enabled: false, null_injection_rate: 0.01, outlier_rate: 0.005 },
};

export const PRESET_SAAS: Dataset = {
  ir_version: '1.0',
  name: 'SaaS CRM & Subscriptions',
  mode: 'schema_only',
  seed: 101,
  locale: 'en_US',
  tables: [
    {
      name: 'organizations',
      row_count: 250,
      columns: [
        {
          name: 'org_id',
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 1, step: 1 },
          pk: true,
        },
        {
          name: 'org_name',
          semantic_type: 'company',
          dtype: 'str',
          generator: { kind: 'faker', provider: 'company' },
        },
        {
          name: 'plan_tier',
          semantic_type: 'category',
          dtype: 'str',
          generator: { kind: 'categorical', values: ['starter', 'growth', 'enterprise'], weights: [0.5, 0.35, 0.15] },
        },
        {
          name: 'seats',
          semantic_type: 'quantity',
          dtype: 'int',
          generator: { kind: 'numeric', dist: 'poisson', params: { lam: 12 }, min_val: 1, max_val: 200 },
        },
      ],
    },
    {
      name: 'users',
      row_count: 1500,
      columns: [
        {
          name: 'user_id',
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 5001, step: 1 },
          pk: true,
        },
        {
          name: 'org_id',
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 1, step: 1 },
        },
        {
          name: 'full_name',
          semantic_type: 'person_name',
          dtype: 'str',
          generator: { kind: 'faker', provider: 'name' },
        },
        {
          name: 'work_email',
          semantic_type: 'email',
          dtype: 'str',
          generator: { kind: 'faker', provider: 'email' },
        },
        {
          name: 'role',
          semantic_type: 'job_title',
          dtype: 'str',
          generator: { kind: 'faker', provider: 'job' },
        },
      ],
    },
    {
      name: 'invoices',
      row_count: 3000,
      columns: [
        {
          name: 'invoice_id',
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 90001, step: 1 },
          pk: true,
        },
        {
          name: 'org_id',
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 1, step: 1 },
        },
        {
          name: 'mrr_amount',
          semantic_type: 'money',
          dtype: 'decimal',
          generator: { kind: 'numeric', dist: 'uniform', min_val: 49.0, max_val: 1200.0 },
        },
        {
          name: 'billing_date',
          semantic_type: 'date',
          dtype: 'date',
          generator: { kind: 'date_range', start: '2026-01-01', end: '2026-09-29' },
        },
      ],
    },
  ],
  relationships: [
    {
      parent: 'organizations',
      parent_key: 'org_id',
      child: 'users',
      child_key: 'org_id',
      kind: 'one_to_many',
      cardinality: { dist: 'poisson', params: { lam: 6 }, min_val: 1, max_val: 50 },
    },
  ],
  invariants: [],
  privacy: [],
};

export const PRESET_BANKING: Dataset = {
  ir_version: '1.0',
  name: 'Retail Banking & Transactions',
  mode: 'schema_only',
  seed: 777,
  locale: 'de_DE',
  tables: [
    {
      name: 'account_holders',
      row_count: 600,
      columns: [
        {
          name: 'holder_id',
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 10001, step: 1 },
          pk: true,
        },
        {
          name: 'name',
          semantic_type: 'person_name',
          dtype: 'str',
          generator: { kind: 'faker', provider: 'name' },
        },
        {
          name: 'city',
          semantic_type: 'city',
          dtype: 'str',
          generator: { kind: 'faker', provider: 'city' },
        },
        {
          name: 'email',
          semantic_type: 'email',
          dtype: 'str',
          generator: { kind: 'faker', provider: 'email' },
        },
      ],
    },
    {
      name: 'accounts',
      row_count: 850,
      columns: [
        {
          name: 'account_id',
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 40001, step: 1 },
          pk: true,
        },
        {
          name: 'holder_id',
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 10001, step: 1 },
        },
        {
          name: 'account_type',
          semantic_type: 'category',
          dtype: 'str',
          generator: { kind: 'categorical', values: ['checking', 'savings', 'business'], weights: [0.6, 0.3, 0.1] },
        },
        {
          name: 'balance',
          semantic_type: 'money',
          dtype: 'decimal',
          generator: { kind: 'numeric', dist: 'uniform', min_val: 100.0, max_val: 45000.0 },
        },
      ],
    },
    {
      name: 'transactions',
      row_count: 5000,
      columns: [
        {
          name: 'txn_id',
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 700001, step: 1 },
          pk: true,
        },
        {
          name: 'account_id',
          semantic_type: 'id',
          dtype: 'int',
          generator: { kind: 'sequence', start: 40001, step: 1 },
        },
        {
          name: 'amount',
          semantic_type: 'money',
          dtype: 'decimal',
          generator: { kind: 'numeric', dist: 'uniform', min_val: 5.0, max_val: 2500.0 },
        },
        {
          name: 'booking_date',
          semantic_type: 'date',
          dtype: 'date',
          generator: { kind: 'date_range', start: '2026-06-01', end: '2026-09-29' },
        },
      ],
    },
  ],
  relationships: [
    {
      parent: 'account_holders',
      parent_key: 'holder_id',
      child: 'accounts',
      child_key: 'holder_id',
      kind: 'one_to_many',
      cardinality: { dist: 'fixed', min_val: 1, max_val: 3 },
    },
  ],
  invariants: [],
  privacy: [],
};

export const PRESETS: Record<string, PresetInfo> = {
  ecommerce: {
    id: 'ecommerce',
    name: 'Retail & E-commerce',
    description: 'Customers, products, and orders with regional addresses & currencies',
    dataset: PRESET_ECOMMERCE,
  },
  saas: {
    id: 'saas',
    name: 'SaaS CRM',
    description: 'B2B Organizations, seats, team members, and subscription invoices',
    dataset: PRESET_SAAS,
  },
  banking: {
    id: 'banking',
    name: 'Retail Banking',
    description: 'Holders, multi-currency accounts, and ledger transactions',
    dataset: PRESET_BANKING,
  },
};
