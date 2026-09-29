# PRD — HackDataV2 Synthetic Data Platform

Version 1.0 · 2026-09-29 · Status: accepted for build
Owners: P1 (UI) · P2 (engines, exports, documents) · P3 (AI layer, Trust, security)
Related: [TRD](TRD.md) · [ARCHITECTURE](ARCHITECTURE.md) · [DESIGN](DESIGN.md) · [DECISIONS](DECISIONS.md) · [ROADMAP](ROADMAP.md)

## 1. Problem
Teams need realistic data for development, testing, demos, and ML, but:
- **Real data is sensitive.** Production data can't be freely shared across environments, partners, or the cloud.
- **Real data is thin.** Datasets are small, skewed, and missing the edge cases engineers need.
- **Real data is slow.** A sanctioned extract can take weeks of sign-off.

Existing synthetic data tools generate tables in isolation and ask users to trust the output.

## 2. Vision
One workspace that generates a **coherent synthetic world** — customers, orders, invoices, and bank statements that agree with each other — and ships every dataset with a **Trust Report** proving it is correct, realistic, and safe.

Pitch line: *Synthetic data you don't have to take on faith.*

## 3. Users
| Persona | Needs | Key FRs |
|---|---|---|
| QA / test engineer | Edge cases, bad data with an answer key, reproducible fixtures | FR-11, FR-14 |
| Backend / fintech developer | Relational DB with integrity; invoices and statements that reconcile | FR-03 – FR-08 |
| Data scientist / ML engineer | Statistically faithful data; labeled documents for OCR/document AI | FR-01, FR-09, FR-12, FR-15 |
| Analyst / PM (non-technical) | Describe data in plain English and get a dataset | FR-10, FR-18 |
| Hackathon judge | See it work live and understand why to trust it | FR-12, all |

## 4. Goals and success metrics
| Goal | Metric | Target |
|---|---|---|
| Correctness | Integrity and invariant violations in any clean export | 0 |
| Reproducibility | Same recipe + seed with LLMs off → dataset hash | Identical |
| Realism (sample mode) | Realistic card on demo datasets | Pass |
| Privacy (sample mode) | Exact-match rate · DCR share | 0 · ≤ 55 % |
| Resilience | Full demo path with every LLM provider failing | Works, with degraded banner |
| Demo | End-to-end live flow on the deployed build | ≤ 4 min, rehearsed 3× |

## 5. Non-goals (this hackathon)
Deep generative models (CTGAN, TabDDPM, diffusion). Differential privacy for correlations or joint distributions. User accounts or server-side storage. Real bank or brand names. MySQL dialect, Parquet, RTL scripts, and C2PA are stretch only. Production SLAs.

## 6. Modes
- **Schema-only mode.** The user describes or defines a schema. No real data is ever used ("privacy by construction").
- **Sample mode.** The user uploads a small sample. The profiler learns types and statistics. The sample exists only in memory for the duration of a request (ADR-0012).

## 7. Functional requirements
Each FR has an EARS statement, acceptance criteria, a priority, and test IDs (TRD §12).
Priorities: **MVP** ships by the H12 checkpoint · **MVP+** by H19 · **Stretch** only after M5.

### Generation

**FR-01 Tabular generation** · MVP
When the user configures a table (columns, row count, seed, null and outlier rates), the system shall generate rows that match each column's semantic type, generator, and constraints.
- Given 10 columns with `null_rate = 0.05`, when 100k rows are generated, then each column's observed null rate is within ±1 percentage point.
- Given the same recipe, when generated twice with LLMs off, then the dataset hash is identical.
- Given sample mode, when generated, then numeric marginals and pairwise correlations follow a Gaussian copula fitted during planning.
- Given a request above the row cap (TRD §2), then it is rejected with `LIMIT_ROWS` before any generation.
Tests: T-01a null rate · T-01b rerun hash · T-01c copula fit · T-01d row cap

**FR-02 Column privacy controls** · MVP+
When the user assigns a privacy control to a column (Mask, HMAC-hash, Drop, Generalize, DP marginals), the system shall apply it and label it in the Trust Report with the exact wording in TRD §8.2.
- HMAC-hash is deterministic under one server key, so joins on hashed keys still work.
- DP marginals are available only in sample mode.
Tests: T-02a hashed join · T-02b DP wording · T-02c mask irreversibility

**FR-03 Relational generation** · MVP
When the user defines tables and relationships (1:1, 1:N, N:N) with cardinality distributions, the system shall generate all tables in topological order with zero orphaned foreign keys.
- N:N uses a junction table with a composite PK and no duplicate pairs.
- A self-referencing FK points only to earlier rows; roots are NULL.
- Given a plan whose total rows exceed the cap, then it is rejected with `LIMIT_FANOUT` and the row plan is shown.
Tests: T-03a zero orphans · T-03b cardinality bounds · T-03c N:N dedupe · T-03d self-FK · T-03e fan-out rejection

**FR-04 Cross-table invariants** · MVP
While generating related tables, the system shall enforce declared invariants: `sum_children` (order total = Σ qty × unit price − discount + tax), `temporal_order` (child date ≥ parent date), and `unique_combo`.
- All money uses `Decimal` with the locale pack's rounding mode. Validators recompute every invariant; violations = 0.
Tests: T-04a totals · T-04b temporal order · T-04c rounding mode

**FR-05 One synthetic world** · MVP · core differentiator
When documents are generated, the system shall derive them from relational entities, so the same customer, order, and payment appear consistently across tables, invoices, and bank statements.
- Given customer C with order O, then invoice(O).total equals O.total, and C's statement contains a debit of that amount dated between the invoice's issue and due dates (TRD §6.3).
Tests: T-05a invoice ↔ order · T-05b payment ↔ statement

### Documents

**FR-06 Invoices** · MVP
When the user generates invoices, the system shall produce line items, tax lines from the locale pack, reconciling totals, regional date/number/currency formats, and at least 3 templates.
Tests: T-06a arithmetic · T-06b tax per locale · T-06c locale formatting · T-06d template count

**FR-07 Bank statements** · MVP
When the user generates statements, the system shall produce transaction histories with fictional merchants tagged with ISO 18245 MCCs, realistic timing (payroll, recurring bills, weekend skew), and correct running balances, as PDF, JSON, or CSV.
- `balance_i = balance_{i−1} + credit_i − debit_i`; `closing = opening + Σ credits − Σ debits`.
Tests: T-07a running balance · T-07b timing patterns · T-07c export formats

**FR-08 Query-style generation** · MVP+
When the user enters a statement query (e.g., "last 90 days, balance over $500"), the system shall translate it into the allow-listed Query DSL (TRD §6.4), generate data that satisfies it by construction, and show "Query satisfied ✓" with evidence (e.g., the minimum balance and its date).
- Queries the DSL can't express, or unsatisfiable ones, are rejected with a readable message. No code or SQL is ever produced.
Tests: T-08a DSL parse · T-08b 100 % satisfaction · T-08c rejection

### AI layer

**FR-09 Schema inference from a sample** · MVP
When a user uploads a CSV or JSON sample (≤ 4 MB), the system shall profile it deterministically (types, ranges, patterns, FK candidates, PII flags) and use the LLM only to add semantic labels, returning an editable IR.
Tests: T-09a profiler accuracy on the golden set · T-09b no raw rows in any prompt

**FR-10 Prompt-to-dataset** · MVP
When a user describes a dataset in plain English, the system shall return a validated IR (tables, columns, relationships, invariants, documents) and an ER diagram, with provider provenance shown.
- If every provider fails, a template-based fallback returns a valid IR and the offline banner appears.
Tests: T-10a golden NL → IR · T-10b fallback

**FR-11 Edge cases and chaos manifest** · MVP+
When chaos mode is on, the system shall inject configured bad data (nulls, outliers, duplicates, encoding issues, boundary dates, timezone edges) into a separate dirty variant and export `chaos_manifest.json` listing every injected cell.
- The clean variant has 0 validity violations. The dirty variant has violations only at manifest cells, and every manifest entry is present (ADR-0014).
- LLM-proposed edge cases are accepted only if they map to a built-in catalog type.
Tests: T-11a manifest completeness · T-11b clean variant unaffected

### Trust, export, reproducibility

**FR-12 Trust Report** · MVP
When a dataset is generated, the system shall compute a Trust Report with three cards — Correct, Realistic, Safe — each with a Pass/Warn/Fail/N-A verdict, a one-line reason, and an expandable expert table, using TRD §7 thresholds.
- In schema-only mode, fidelity metrics show "N/A — no reference data" and spec fidelity, coverage, and validity are shown instead.
- `trust_report.json` is included in every ZIP export.
Tests: T-12a parity with SDMetrics · T-12b N/A behavior · T-12c thresholds and verdict aggregation

**FR-13 Exports** · MVP
When the user exports, the system shall provide formula-safe CSV, JSONL, PostgreSQL-compatible `.sql` (DDL + INSERT), SQLite when the estimate is ≤ 4 MB, PDFs, and a ZIP bundle with data, recipe, Trust Report, and manifests.
Tests: T-13a CSV formula escaping · T-13b SQL round-trip in sqlite3 · T-13c ZIP contents

**FR-14 Recipes and reproducibility** · MVP (save/load) · MVP+ (share)
The system shall represent every dataset as a versioned recipe (IR + frozen LLM plan + provenance + seed + engine version + hash) that can be saved, loaded, and shared, and that regenerates identical data without calling an LLM.
- "Re-plan with AI" calls the LLM again and increments `recipe_version`.
- Sharing a sample-mode recipe shows a warning first (ADR-0012).
Tests: T-14a load → identical hash · T-14b no LLM call on rerun · T-14c share warning

**FR-15 Ground-truth labels and degraded scans** · MVP+ (JSON + 1 variant)
When documents are generated, the system shall export `ground_truth.jsonl` with every field value and bounding box and, on request, a degraded "scanned" image variant with its parameters recorded.
Tests: T-15a extraction round-trip = 100 % on clean PDFs · T-15b degradation parameters recorded

**FR-16 Offline / deterministic mode** · MVP
While no LLM provider is available (or `OFFLINE_MODE=1`), the system shall keep every MVP feature working through the profiler, templates, static pools, and the built-in edge-case catalog, and show the degraded banner.
Tests: T-16a full demo path offline

**FR-17 Watermark and provenance** · MVP
The system shall stamp every document page with a visible diagonal "SYNTHETIC — NOT A REAL DOCUMENT" watermark and footer, embed `Synthetic=true` and the recipe hash in PDF metadata, use `SYN-` document numbers and fictional banks/sellers, replace real bank and brand names, and ignore any parameter that tries to disable this.
Tests: T-17a every page watermarked · T-17b metadata · T-17c disable parameter ignored · T-17d real names replaced

**FR-18 Live preview and size estimate** · MVP
When any configuration changes, the system shall refresh a 50-row preview within 1 s after a 300 ms debounce, and show estimated total rows and export size before full generation.
Tests: T-18a preview latency · T-18b estimate equals the row plan

### Stretch
- FR-S1 Planted scenarios (fraud ring, churn) with answer keys
- FR-S2 Anonymeter attack-based privacy scores
- FR-S3 OCR character error rate on degraded scans
- FR-S4 MySQL dialect and Parquet export
- FR-S5 RTL locale (ar_SA)
- FR-S6 TSTR utility score with a user-selected target column

## 8. Judging criteria map
| Criterion | How we win it | FRs |
|---|---|---|
| System design | One IR, row-addressable determinism, validated LLM plans, stateless chunks, offline mode | FR-14, FR-16 |
| Features | Tabular + relational + documents unified as one world, with query-style generation | FR-01 – FR-08 |
| UI | One workspace, live preview, ER diagram, proof bar, Trust drawer | FR-18, FR-12 |
| AI | Schema inference, prompt-to-dataset, query parsing, edge cases — all validated | FR-08 – FR-11 |
| Problem approach | Measurable correctness, realism, and safety; misuse prevention | FR-12, FR-17 |

## 9. Locale packs (MVP)
| Pack | Currency | Tax (demo defaults) | Notes |
|---|---|---|---|
| en_US | USD | State sales tax | 555-01xx phones |
| en_IN | INR | GST: CGST + SGST within a state, IGST across states | Lakh grouping |
| de_DE | EUR | 19 % VAT | `1.234,56 €` |

Tax rules are labeled "demo defaults" in the UI and on documents.
