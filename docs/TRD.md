# TRD — HackDataV2 Synthetic Data Platform

Version 1.0 · 2026-09-29 · Section numbers are stable; cite them as "TRD §n".
Related: [PRD](PRD.md) · [ARCHITECTURE](ARCHITECTURE.md) · [DECISIONS](DECISIONS.md)

## 1. Scope
Contracts, limits, schemas, and thresholds that code and tests must follow. If code and this document disagree, fix one of them in the same change and log it in PROGRESS.md.

## 2. Platform constraints and hard limits
Platform values come from the Phase 1 research (Sept 2026). **Verify them in H0** and record actuals in PROGRESS.md.

| Platform constraint | Value |
|---|---|
| Vercel Hobby function duration | 300 s max |
| Vercel function memory / CPU | 2 GB / 1 vCPU |
| Request and response body | 4.5 MB |
| Uncompressed function bundle | 500 MB |

Our own limits stay well inside them:

| Limit | Value | Error code |
|---|---|---|
| Time budget per request | 60 s | `TIMEOUT` |
| Response size per request | ≤ 4.0 MB (else chunk) | — |
| Runtime bundle | ≤ 450 MB | CI failure |
| Total rows per dataset | 200,000 | `LIMIT_ROWS` / `LIMIT_FANOUT` |
| Tables per dataset | 12 | `LIMIT_SCHEMA` |
| Columns per table | 64 | `LIMIT_SCHEMA` |
| Generation block size | 10,000 rows (fixed; part of `engine_version`) | — |
| Upload size | 4 MB (CSV or JSON only) | `UPLOAD_TOO_LARGE` / `UPLOAD_REJECTED` |
| Rows profiled from an upload | 50,000 (rest ignored, with a warning) | — |
| JSON nesting depth | 32 | `UPLOAD_REJECTED` |
| CSV field size | 64 KB | `UPLOAD_REJECTED` |
| Prompt / rule / query text | 4,000 chars (truncated, with a warning) | — |
| PDFs per request | 50 | `LIMIT_DOCS` |
| Documents per recipe | 2,000 | `LIMIT_DOCS` |
| Requests per IP | 60/min, best-effort per instance (ADR-0011) | `RATE_LIMITED` |

## 3. Non-functional requirements
| ID | Requirement | Measure |
|---|---|---|
| NFR-01 | Preview speed | 50 rows × ≤ 12 tables in ≤ 1 s p95 server time |
| NFR-02 | Throughput | 100k rows × 10 columns generated and exported in ≤ 30 s wall (heuristic; measure in M1) |
| NFR-03 | Reproducibility | Same recipe + `engine_version` → identical dataset hash, LLMs off |
| NFR-04 | Degradation | Every MVP FR works with `OFFLINE_MODE=1` |
| NFR-05 | LLM budgets | ≤ 2k input tokens, ≤ 1.5k output tokens, 20 s per call, 45 s per task |
| NFR-06 | Security | RT-01 … RT-32 pass in CI |
| NFR-07 | Privacy | Samples processed in memory only; never logged, persisted, or sent raw to an LLM |
| NFR-08 | Accessibility | WCAG 2.2 AA (DESIGN §8) |
| NFR-09 | Demo availability | Vercel primary + warm Render standby + local Docker + backup video |
| NFR-10 | Observability | JSON logs with request ID, route, duration, status, degraded flag; never bodies, samples, prompts, headers, or keys |
| NFR-11 | Browsers | Latest Chrome, Edge, Firefox; ≥ 1280 px primary, ≥ 768 px usable |

## 4. Intermediate representation (IR v1)
Source of truth: `synth/ir/models.py`. The JSON Schema is exported to `synth/ir/ir.schema.json`, and TS types are generated to `src/types/ir.ts`. Every model uses `ConfigDict(extra="forbid", frozen=True)`.

```python
Identifier = Annotated[str, StringConstraints(pattern=r"^[A-Za-z_][A-Za-z0-9_]{0,62}$")]
# plus a validator rejecting SQL reserved words (case-insensitive)

class Dataset(BaseModel):
    ir_version: Literal["1.0"]
    name: str                              # display only, ≤ 80 chars
    mode: Literal["schema_only", "sample"]
    seed: int                              # 0 ≤ seed < 2**63
    locale: Literal["en_US", "en_IN", "de_DE"]
    tables: list[Table]                    # 1..12; FK graph must be topologically sortable
    relationships: list[Relationship]
    invariants: list[Invariant]
    privacy: list[PrivacyRule]
    chaos: ChaosConfig | None
    documents: list[DocumentSpec]
    world: WorldConfig | None              # fictional seller, bank, payment terms (FR-05)

class Table(BaseModel):
    name: Identifier
    row_count: int | None                  # required for root tables; derived for child tables
    columns: list[Column]                  # 1..64

class Column(BaseModel):
    name: Identifier
    semantic_type: SemanticType
    dtype: Literal["int", "float", "decimal", "str", "bool", "date", "datetime"]
    generator: Generator                   # discriminated union on "kind"
    nullable: bool = False
    null_rate: float = 0                   # 0..0.5
    outlier_rate: float = 0                # 0..0.1
    unique: bool = False
    pk: bool = False
    constraints: list[Constraint] = []     # min, max, regex (≤ 200 chars, linear-time engine), one_of, after_column

Generator = Faker | Categorical | Numeric | Sequence | DateRange | CopulaRef | Derived | ForeignKey
#  Faker:    provider from an allow-list per semantic_type — never an arbitrary method name
#  Numeric:  dist ∈ {normal, lognormal, uniform, poisson, empirical}, params, min, max
#  Derived:  kind ∈ {sum_children, row_expr}; row_expr is an allow-listed expression tree, never eval

class Relationship(BaseModel):
    parent: Identifier; parent_key: Identifier
    child: Identifier;  child_key: Identifier
    kind: Literal["one_to_one", "one_to_many", "many_to_many"]
    cardinality: Cardinality               # dist ∈ {fixed, uniform, poisson, negbin, empirical}, params, min, max
    junction: Identifier | None            # required for many_to_many
    nullable_backfill: bool = False        # breaks cycles

Invariant = SumChildren | TemporalOrder | UniqueCombo | RunningBalance
```

`SemanticType` v1: `id, person_name, first_name, last_name, email, phone, street_address, city, region, postal_code, country, company, job_title, date, datetime, money, quantity, integer, float, percent, category, boolean, text_short, text_long, sku, product_name, merchant, mcc, iban_fake, card_fake, url_fake`.

To change the IR: bump `ir_version`, run `pnpm gen:types`, update this section, and add an ADR if the change isn't purely additive.

## 5. Recipe and determinism

### 5.1 Recipe
```json
{
  "recipe_version": 1,
  "engine_version": "0.1.0",
  "ir": { "...": "Dataset" },
  "llm_plan": [
    {"task": "nl_to_ir", "provider": "groq", "model": "<from providers.yaml>",
     "prompt_version": "nl2ir-v1", "input_hash": "sha256:…", "repairs": 0}
  ],
  "fitted": {
    "derived_from_sample": true,
    "copula": {"columns": [], "corr": [], "marginals": {}},
    "dp": {"epsilon": 1.0, "delta": 0}
  },
  "hash": "sha256:…"
}
```
- `hash` = SHA-256 of canonical JSON (sorted keys, no whitespace, UTF-8) of every field except `hash`.
- Rerunning a recipe never calls an LLM. "Re-plan with AI" calls it and increments `recipe_version`.
- `fitted` exists only in sample mode; sharing rules are in ADR-0012.

### 5.2 Random streams
- Every draw comes from `np.random.Generator(np.random.PCG64(np.random.SeedSequence(seed, spawn_key=(table_idx, stream_id, block_idx))))`.
- Stream IDs: 0 values · 1 nulls · 2 outliers · 3 child counts · 4 chaos · 5 privacy redraws · 6 documents · 7 pool selection.
- Faker only builds value pools: 5,000 values per (locale, provider), `Faker.seed_instance(seed)`, pinned Faker version. Rows index pools with NumPy integers.
- Forbidden inside generation: `random`, global `np.random.*`, `datetime.now()`, `uuid4`, set iteration order, dict order from untrusted input.

### 5.3 Row-addressable generation (ADR-0010)
- Block *b* of table *t* holds rows `[b × 10,000, (b + 1) × 10,000)` and depends only on `(recipe, t, b)`.
- Child counts per parent come from stream 3 of the parent's block, clipped to [min, max]. Offsets are prefix sums over all parents (counts only, cheap). Child row *j*'s parent = `searchsorted(offsets, j, side="right")`.
- Child columns that need parent values (dates, currency) regenerate the needed parent block, memoized within the request.
- A parent's `sum_children` total is computed by generating that parent's children from the same streams.

### 5.4 Dataset hash
SHA-256 over each table in IR order, serialized as canonical CSV (UTF-8, LF, header row, sorted by PK, `Decimal` as plain strings). The UI shows the first 12 hex characters.

## 6. Documents

### 6.1 Models (`synth/documents/models.py`)
- `InvoiceDoc`: number `SYN-INV-{year}-{6 digits}`, issue_date, due_date, seller (fictional, from `world`), buyer (customer entity), lines[{sku, description, qty, unit_price, tax_code, amount}], tax_lines[{label, rate, base, amount}], subtotal, discount, tax_total, total, currency, locale, template_id, recipe_hash.
- `StatementDoc`: number `SYN-STM-…`, bank (fictional), holder (customer), period{from, to}, opening_balance, transactions[{date, description, mcc, debit, credit, balance}], closing_balance, template_id, recipe_hash.

### 6.2 Invariants (Decimal; rounding mode from the locale pack)
- Invoice: `line.amount = round(qty × unit_price)`; `subtotal = Σ line.amount`; `tax_total = Σ tax_line.amount`; `total = subtotal − discount + tax_total`.
- Statement: `balance_i = balance_{i−1} + credit_i − debit_i`; `closing = opening + Σ credit − Σ debit`; transactions ordered by (date, sequence).

### 6.3 One-world linkage (FR-05)
- Invoice `issue_date` = order date; `due_date` = issue + payment terms from `world` (0, 7, 14, or 30 days).
- Payment date is uniform in [issue, due] from stream 6. It is posted as a debit on the buyer's statement with description `"{seller} INV {number}"` and the seller's MCC.
- A statement includes every linked payment that falls inside its period.

### 6.4 Query DSL (FR-08)
```json
{
  "period": {"days": 90},
  "constraints": [{"field": "running_balance", "op": ">", "value": "500.00"}],
  "include_mcc": [],
  "exclude_mcc": [],
  "min_transactions": 10
}
```
- `period` is `{"days": n}` (n ≤ 366) or `{"from": "YYYY-MM-DD", "to": "YYYY-MM-DD"}`.
- Fields: `running_balance | opening_balance | closing_balance | debit | credit | txn_count`. Ops: `> >= < <= ==`. At most 5 constraints.
- A pre-check rejects contradictory sets (e.g., `> 500` and `< 100` on one field) with `DSL_UNSATISFIABLE`.
- Satisfaction by construction: generate transactions, compute the minimum prefix sum *m*, then set `opening = threshold + margin − m` (margin from stream 6). Evidence shown: the minimum balance and its date.

### 6.5 Rendering
- fpdf2 only, with embedded Noto Sans subsets; ≥ 3 templates per document type (DESIGN §9).
- Watermark: diagonal 45°, repeated, 12 % opacity, every page. Footer: "Synthetic document · recipe {hash12} · not valid for any financial or legal purpose".
- PDF metadata: `Synthetic=true`, `RecipeHash`, `Generator`.
- Ground truth: `ground_truth.jsonl`, one line per document, with every field value and bounding box `[page, x, y, w, h]` in PDF points (known because we place the text).
- Degraded variant: rasterize with pypdfium2 at 150 dpi, then rotation (±3°), Gaussian blur (σ ≤ 1.2), JPEG quality 40–70, and noise via Pillow. Parameters are recorded per document.

## 7. Evaluation spec (Trust Report)
Verdicts: Pass / Warn / Fail / N-A. A card's verdict is the worst of its metrics, ignoring N-A.
(Conv.) = convention or hard invariant. (Heur.) = our heuristic; say so if asked.

### 7.1 Correct card (all modes)
| Metric | Threshold | Runs on |
|---|---|---|
| Schema conformance violations | 0, else Fail (Conv.) | preview, export, CI |
| PK uniqueness violations | 0 (Conv.) | preview, export, CI |
| FK orphans | 0 (Conv.) | preview, export, CI |
| Cardinality min/max violations | 0 (Conv.) | export, CI |
| Invariant violations (totals, temporal order, running balance) | 0 (Conv.) | preview, export, CI |
| Query satisfaction | 100 % (Conv.) | preview, export |
| Dirty variant vs chaos manifest | violations exactly equal manifest entries (Conv.) | export, CI |

### 7.2 Realistic card
Sample mode compares a synthetic evaluation subset (≤ 5,000 rows) against the training split.

| Metric | Pass | Warn | Otherwise |
|---|---|---|---|
| KSComplement (numeric, mean over columns) | ≥ 0.90 | ≥ 0.80 | Fail (Heur.) |
| TVComplement (categorical) | ≥ 0.90 | ≥ 0.80 | Fail (Heur.) |
| Correlation similarity (Pearson; Cramér's V for categorical) | ≥ 0.90 | ≥ 0.80 | Fail (Heur.) |
| Contingency similarity | ≥ 0.85 | ≥ 0.75 | Fail (Heur.) |
| Detection AUC (logistic regression, 5-fold; N/A if < 100 rows per side) | ≤ 0.65 | ≤ 0.80 | Fail (Heur.; 0.5 = indistinguishable is Conv.) |
| Child-count KS (relational) | ≥ 0.90 | ≥ 0.80 | Fail (Heur.) |
| TSTR ÷ TRTR (on demand, user picks target) | ≥ 0.90 | ≥ 0.75 | Fail (Heur.) |

Schema-only mode shows "N/A — no reference data" for the metrics above, and shows these instead:

| Metric | Pass | Warn | Otherwise |
|---|---|---|---|
| Spec fidelity: \|observed − configured\| null and outlier rates | ≤ 1 pp | ≤ 3 pp | Fail |
| Category coverage | ≥ 0.95 | ≥ 0.80 | Fail |
| Unique-row ratio (where rows should be unique) | ≥ 0.99 | ≥ 0.95 | Fail |
| LLM-judge realism | advisory only; never changes a verdict | | |

### 7.3 Safe card
| Metric | Pass | Warn | Otherwise |
|---|---|---|---|
| Safe identifiers (emails, phones, IBANs, cards) | 100 % | — | Fail (policy) |
| Watermark + metadata on every PDF page | 100 % | — | Fail (policy) |
| Exact-match rate vs training split (sample mode) | 0 | — | rows are redrawn (policy) |
| DCR share: share of synthetic rows closer to training than to holdout | ≤ 55 % | ≤ 60 % | Fail (≈ 50 % is Conv. per mostlyai-qa; cutoffs Heur.) |
| NNDR 5th percentile vs holdout's | ≥ holdout | < holdout → Warn | — |

Schema-only mode shows "Privacy by construction — no real records were used", plus the identifier and watermark checks.

### 7.4 Metric definitions
- KSComplement = 1 − KS statistic. TVComplement = 1 − ½ Σ \|p − q\|. Correlation similarity = 1 − \|ρ_real − ρ_syn\| / 2, averaged over pairs. Contingency similarity = 1 − TVD of 2-D frequency tables.
- DCR and NNDR use Gower distance: numeric columns scaled by the training range, categorical 0/1, missing values as their own category. The encoding is versioned with `engine_version`.
- `tests/parity/` compares our KS, TV, correlation, and contingency results with SDMetrics (dev dependency only) within 1e-6.

## 8. Privacy spec

### 8.1 Controls (FR-02)
| Control | Behaviour | Label |
|---|---|---|
| Mask | Replace with a fixed pattern preserving length class | "Masked" |
| HMAC-hash | HMAC-SHA256 with server key `HMAC_KEY`, hex truncated to 16 chars | "Pseudonymized (keyed hash)" |
| Drop | Column removed | "Dropped" |
| Generalize | Numbers → bins; dates → month; postal codes → prefix | "Generalized" |
| DP marginals | Laplace-noised histograms fitted on the training split; ε split across columns by sequential composition | TRD §8.2 wording |

### 8.2 DP wording (use exactly)
- DP marginals on: "Marginals are ε-DP (ε = {ε}, δ = 0). Correlations are fitted without differential privacy."
- Noise added after generation: "Noise perturbation (not differential privacy)."
- Schema-only mode: "Privacy by construction — no real records were used."
- Never write "differentially private dataset".

### 8.3 Safe-by-construction identifiers
| Field | Rule |
|---|---|
| Email | Only `example.com`, `example.org`, `example.net`, `*.test`, `*.invalid` (RFC 2606 / 6761) |
| Phone, US | 555-0100 … 555-0199 |
| Phone, UK | 07700 900000 … 900999 |
| Phone, other locales | Reserved or clearly fictional range defined in the locale pack |
| IBAN | Correct format, deliberately invalid check digits |
| Card numbers | Luhn-invalid by default |
| Companies and banks | Fictional pools; a blocklist of real bank and brand names replaces matches |

### 8.4 Sample lifecycle (ADR-0012, ADR-0013)
- Samples are parsed in memory, never written to disk, logs, or caches, and dropped when the request ends. The browser keeps the file and re-sends it for `/api/trust`.
- Samples with ≥ 200 rows use a seeded 80/20 train/holdout split, and fitting uses only the train split. Below 200 rows, DCR and NNDR are N/A ("sample too small"); exact-match still runs.
- Privacy filter: a synthetic row that exactly matches a training row on all quasi-identifiers, or whose DCR is below the holdout's 5th percentile, is redrawn from stream 5 (≤ 3 attempts). It then falls back to independent-marginal sampling. The count is shown in the Safe card.

## 9. LLM contracts

### 9.1 Tasks
| Task | Sent to the LLM | Output model | Deterministic fallback |
|---|---|---|---|
| `label_columns` | Column names, profiler stats, ≤ 5 masked examples per column | `ColumnLabels` | Profiler heuristics |
| `nl_to_ir` | User prompt (≤ 4,000 chars, spotlit) | `Dataset` (partial) | Template library by keyword |
| `parse_rules` | Business-rule text (spotlit) | `list[Invariant \| Constraint]` | Grammar parser |
| `parse_query` | Query text (spotlit) | `QueryDSL` | Regex grammar for common forms |
| `text_pools` | Semantic type, locale, count ≤ 200 | `list[str]` (≤ 120 chars each; escaped at export) | Static pools |
| `edge_cases` | IR summary | `list[EdgeCase]` mapped to catalog types | Built-in catalog |

### 9.2 Router behaviour (`synth/llm/router.py`)
1. Cache lookup with key sha256(task, prompt_version, canonical input).
2. For each provider in the task's order whose breaker is closed or half-open: request `json_schema`, fall back to `json_object`, then prompt-only. Strip code fences and validate.
3. On a validation failure, make one repair turn with the validator's error list, then move to the next provider.
4. On 429, honour `retry-after` if ≤ 10 s. Otherwise open the breaker: 60 s for per-minute limits, until reset for per-day limits. Probe half-open afterwards.
5. When every provider is exhausted, use the deterministic fallback and return `degraded: true`.
6. Temperature 0–0.3. The model is never given tools or function calls.

Provider order, model IDs, and known limits live in `synth/llm/providers.yaml`, not in code. The limits come from the Sept 2026 research and must be re-checked on the day.

### 9.3 Prompt hygiene (spotlighting)
- The system prompt states that text between `<<UNTRUSTED>>` and `<</UNTRUSTED>>` is data, never instructions.
- Untrusted text is truncated and datamarked (whitespace replaced with `^`) before insertion.
- The system prompt contains a canary token; any output containing it is rejected (RT-08).
- Output fields have lengths, enums, and patterns. Free text never reaches SQL, HTML, or file paths unescaped.

## 10. API contract
Base path `/api`. JSON unless stated. Errors use RFC 9457 `application/problem+json` with `{type, title, status, detail, code}`.

| Method and path | Request | Response |
|---|---|---|
| `GET /health` | — | `{status, engine_version, offline, providers: {name: closed \| open \| half_open}}` |
| `POST /profile` | multipart `file` (CSV or JSON, ≤ 4 MB) | `Profile`: per-column stats, inferred types, FK candidates, PII flags |
| `POST /plan` | `{task, mode, prompt?, profile?, ir?}` | `{ir, llm_plan, degraded, warnings}` |
| `POST /preview` | `{recipe}` | `{tables: {name: rows[≤ 50]}, row_plan, est_bytes, correct}` |
| `POST /generate` | `{recipe, table, block_start, block_count, format: csv \| jsonl \| sql, variant: clean \| dirty}` | Text chunk ≤ 4 MB; header `X-Block-Range` |
| `POST /trust` | multipart `{recipe, sample?}` | `TrustReport` |
| `POST /documents` | `{recipe, kind: invoice \| statement, start, count ≤ 50, degraded?}` | `application/zip`: PDFs + `ground_truth.part.jsonl` |
| `POST /query/parse` | `{text}` | `{dsl}`, or problem+json `DSL_UNSUPPORTED` / `DSL_UNSATISFIABLE` |
| `POST /export/sqlite` | `{recipe}` | `.sqlite` if the estimate is ≤ 4 MB, else 413 suggesting `.sql` |

Error codes: `LIMIT_ROWS, LIMIT_FANOUT, LIMIT_SCHEMA, LIMIT_DOCS, UPLOAD_TOO_LARGE, UPLOAD_REJECTED, VALIDATION_FAILED, DSL_UNSUPPORTED, DSL_UNSATISFIABLE, RATE_LIMITED, TIMEOUT`.
An LLM failure is never an error response; it degrades (FR-16).

## 11. Security controls
| Threat (OWASP LLM Top 10, 2025) | Control | Tests |
|---|---|---|
| LLM01 Prompt injection | Tool-less model, spotlighting, strict schemas, sanitized identifiers | RT-01 … RT-05 |
| LLM02 Sensitive information disclosure | No raw rows in prompts, privacy filter, safe identifiers | RT-07, RT-25, RT-26 |
| LLM03 Supply chain | Lockfiles, pinned versions, `pip-audit`, `pnpm audit` | RT-30 |
| LLM04 Data and model poisoning | Profiler bounds, winsorizing, PII flags | RT-06, RT-07 |
| LLM05 Improper output handling | CSV/SQL/HTML encoders; server-generated paths | RT-09 … RT-17 |
| LLM06 Excessive agency | No tools, no network, no code execution from model output | RT-03, RT-05 |
| LLM07 System prompt leakage | No secrets in prompts; canary token | RT-08 |
| LLM09 Misinformation | Validators recompute everything; LLM judge is advisory | T-12c |
| LLM10 Unbounded consumption | Row plan, hard caps, token budgets, rate limits | RT-22 … RT-24 |
| Uploads (non-LLM) | CSV/JSON allow-list, size cap, UTF-8 NFC, strip BOM / zero-width / bidi overrides, depth limit | RT-18 … RT-21 |
| Misuse (non-LLM) | Always-on watermark, fictional entities | RT-28, RT-29 |
| Secrets (non-LLM) | Server env only; gitleaks in CI | RT-27 |

RT case definitions are in the Phase 1 research report §11. They are implemented in `tests/redteam/test_rtXX_*.py` against a malicious mock LLM, so they are deterministic and use no quota.

## 12. Traceability
| FR | Tests | Red-team |
|---|---|---|
| FR-01 | T-01a–d | RT-22 |
| FR-02 | T-02a–c | — |
| FR-03 | T-03a–e | RT-09, RT-23 |
| FR-04 | T-04a–c | — |
| FR-05 | T-05a–b | — |
| FR-06 | T-06a–d | RT-11, RT-16, RT-17 |
| FR-07 | T-07a–c | RT-12 |
| FR-08 | T-08a–c | RT-03 |
| FR-09 | T-09a–b | RT-01, RT-02, RT-06, RT-07, RT-18 – RT-21, RT-26 |
| FR-10 | T-10a–b | RT-04, RT-05, RT-08, RT-24, RT-31 |
| FR-11 | T-11a–b | — |
| FR-12 | T-12a–c | RT-25 |
| FR-13 | T-13a–c | RT-10, RT-13 – RT-15 |
| FR-14 | T-14a–c | RT-32 |
| FR-15 | T-15a–b | — |
| FR-16 | T-16a | RT-31 |
| FR-17 | T-17a–d | RT-28, RT-29 |
| FR-18 | T-18a–b | — |
| NFR-06 | all RT | RT-27, RT-30 |

CI fails if any FR in PRD §7 has no test ID here.
