import { z } from 'zod';

export const identifierRegex = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

export const identifierSchema = z
  .string()
  .min(1, 'Identifier cannot be empty')
  .max(63, 'Identifier cannot exceed 63 characters')
  .regex(identifierRegex, 'Identifier must start with a letter/underscore and contain only alphanumeric or underscore');

export const semanticTypeSchema = z.enum([
  'id',
  'person_name',
  'first_name',
  'last_name',
  'email',
  'phone',
  'street_address',
  'city',
  'region',
  'postal_code',
  'country',
  'company',
  'job_title',
  'date',
  'datetime',
  'money',
  'quantity',
  'integer',
  'float',
  'percent',
  'category',
  'boolean',
  'text_short',
  'text_long',
  'sku',
  'product_name',
  'merchant',
  'mcc',
  'iban_fake',
  'card_fake',
  'url_fake',
]);

export const dtypeSchema = z.enum(['int', 'float', 'decimal', 'str', 'bool', 'date', 'datetime']);

export const fakerGeneratorSchema = z.object({
  kind: z.literal('faker'),
  provider: z.string().min(1),
  locale: z.string().nullable().optional(),
});

export const categoricalGeneratorSchema = z.object({
  kind: z.literal('categorical'),
  values: z.array(z.string()).min(1),
  weights: z.array(z.number()).nullable().optional(),
});

export const numericGeneratorSchema = z.object({
  kind: z.literal('numeric'),
  dist: z.enum(['normal', 'lognormal', 'uniform', 'poisson', 'empirical']),
  params: z.record(z.number()).optional(),
  min_val: z.number().nullable().optional(),
  max_val: z.number().nullable().optional(),
});

export const sequenceGeneratorSchema = z.object({
  kind: z.literal('sequence'),
  start: z.number().int().optional().default(1),
  step: z.number().int().optional().default(1),
  prefix: z.string().optional().default(''),
});

export const dateRangeGeneratorSchema = z.object({
  kind: z.literal('date_range'),
  start: z.string(),
  end: z.string(),
});

export const copulaRefGeneratorSchema = z.object({
  kind: z.literal('copula_ref'),
  column_index: z.number().int(),
});

export const derivedGeneratorSchema = z.object({
  kind: z.literal('derived'),
  derivation: z.enum(['sum_children', 'row_expr']),
  expression: z.string().nullable().optional(),
});

export const foreignKeyGeneratorSchema = z.object({
  kind: z.literal('foreign_key'),
  reference_table: identifierSchema,
  reference_column: identifierSchema,
});

export const generatorSchema = z.discriminatedUnion('kind', [
  fakerGeneratorSchema,
  categoricalGeneratorSchema,
  numericGeneratorSchema,
  sequenceGeneratorSchema,
  dateRangeGeneratorSchema,
  copulaRefGeneratorSchema,
  derivedGeneratorSchema,
  foreignKeyGeneratorSchema,
]);

export const columnSchema = z.object({
  name: identifierSchema,
  semantic_type: semanticTypeSchema,
  dtype: dtypeSchema,
  generator: generatorSchema,
  nullable: z.boolean().optional().default(false),
  null_rate: z.number().min(0).max(0.5).optional().default(0),
  outlier_rate: z.number().min(0).max(0.1).optional().default(0),
  unique: z.boolean().optional().default(false),
  pk: z.boolean().optional().default(false),
  constraints: z.array(z.any()).optional().default([]),
});

export const tableSchema = z.object({
  name: identifierSchema,
  row_count: z.number().int().min(1).max(50000).nullable().optional(),
  columns: z.array(columnSchema).min(1).max(64),
});

export const localeSchema = z.enum(['en_US', 'en_PK', 'en_IN', 'de_DE']);

export const datasetSchema = z.object({
  ir_version: z.literal('1.0'),
  name: z.string().min(1).max(80),
  mode: z.enum(['schema_only', 'sample']),
  seed: z.number().int().min(0),
  locale: localeSchema,
  tables: z.array(tableSchema).min(1).max(12),
  relationships: z.array(z.any()).optional().default([]),
  invariants: z.array(z.any()).optional().default([]),
  privacy: z.array(z.any()).optional().default([]),
  chaos: z.any().nullable().optional(),
  documents: z.array(z.any()).optional().default([]),
  world: z.any().nullable().optional(),
});

export function validateIdentifier(id: string): boolean {
  return identifierRegex.test(id);
}

export function validateDataset(data: unknown): { success: boolean; errors?: string[] } {
  const result = datasetSchema.safeParse(data);
  if (result.success) {
    return { success: true };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
